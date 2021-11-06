
extern crate console_error_panic_hook; // !!! set when a new game is created. Move to its own initialization

use std::collections::btree_set::BTreeSet; 
use std::collections::VecDeque;
use std::cmp::Ordering;

use crate::objects;

use crate::player::Player;
use crate::brick::Brick;
use crate::BrickData;
use crate::GameData;
use crate::Input;
use crate::GraphicGroup;
use crate::Graphic;
use crate::PositionedGraphic;
use crate::RenderingInstructions;
use objects::Object;
use objects::BrickType;
use objects::ObjectBounds;

use wasm_bindgen::prelude::*;
use js_sys::Array;

use crate::GAME_HEIGHT;
use crate::GAME_WIDTH;
use objects::BRICK_HEIGHT;
use objects::BRICK_SEGMENT_HEIGHT;
use objects::BRICK_WIDTH;

const MAX_TIME_BETWEEN_TICKS: f32 = 0.025;

#[derive(Clone, Copy)]
struct UpcomingBrick {
	graphic_group: GraphicGroup,
	brick_type: BrickType,
	x: f32,
	// the y value at which the note should appear. At time = 0 the top of the screen is y = 0
		// and a note that should be hit at time = 0 has appearance_y of GROUND_POS - BRICK_HEIGHT
		// notes off the bottom of the screen have appearance_y's corresponding to how much has to be scrolled before they show up
	appearance_y: f32, 
	height: f32,
	is_hold_note: bool
}

#[wasm_bindgen]
pub struct Game {
	player: Player,
	// !!! better data structures than VecDeques. Indexable BTrees
	bricks: VecDeque<UpcomingBrick>, // all bricks of the song, ordered
	// uses a vec instead of a btree because std lib btreeset is unindexable
	current_bricks: VecDeque<Brick>, // current bricks that are on screen or about to appear on screen, ordered
	upcoming_brick_idx: usize,
	scrolled_y: f32,
	end_appearance_y: f32,
	game_data: GameData, 
	notes: BTreeSet<BrickData>,
	graphics: Vec<PositionedGraphic>,
	bricks_broken: u8
}

#[wasm_bindgen]
impl Game {
	pub fn new(bpm: f32, brick_speed: f32, duration: f32) -> Game {
		console_error_panic_hook::set_once();
		
		return Game {
			player: Player::new((BRICK_WIDTH * 2) as f32 - objects::PLAYER_WIDTH as f32 / 2.0),
			bricks: VecDeque::new(), // bricks on screen, ordered by time they are meant to be played
			current_bricks: VecDeque::new(),
			upcoming_brick_idx: 0,
			scrolled_y: 0.0,
			end_appearance_y: Game::end_appearance_y(0.0, brick_speed),
			game_data: GameData {
				bpm,
				beat_interval: 60.0 / bpm as f32,
				brick_speed,
				time_running: 0.0,
				score: 0,
				max_score: 0,
				duration,
			},
			notes: BTreeSet::new(),
			graphics: Vec::with_capacity(512), // TODO what should the upper limit be? Make it a hard limit
			bricks_broken: 0
		};
	}
			
	// tick the game state by the given amount of time
	pub fn tick(&mut self, mut seconds_passed: f32) {
		
		// prevent disproportionally long ticks
		if seconds_passed > MAX_TIME_BETWEEN_TICKS {
			self.tick(seconds_passed - MAX_TIME_BETWEEN_TICKS);
			seconds_passed = MAX_TIME_BETWEEN_TICKS;
		}
		
		let delta_y = seconds_passed * self.game_data.brick_speed;
		self.game_data.time_running += seconds_passed;
		self.scrolled_y += delta_y;
		self.end_appearance_y += delta_y;
		
		let bricks_iter = self.current_bricks.iter();
		self.player.tick(seconds_passed, bricks_iter, &self.game_data);
		
		// discard any bricks that are offscreen
		loop {
			if self.current_bricks.len() > 0 && self.current_bricks[0].bounds().bottom_y < 0.0 {
				self.current_bricks.pop_front();
				continue;
			} else {
				break;
			}
		}
		
		// tick all current bricks
		for brick in &mut self.current_bricks {
			brick.bounds.top_y -= delta_y;
			brick.bounds.bottom_y -= delta_y;
		}
		
		// check for brick destruction 
		// TODO might be a little faster to do as bricks are updated
		// TODO more efficient way than checking all bricks, check only bricks that have reached a threshold height
		let score = &mut self.game_data.score;
		let bricks = &mut self.current_bricks;
		let bricks_broken = &mut self.bricks_broken;
		for hitbox in self.player.hitboxes() {
			bricks.retain(|&brick| -> bool {
				if hitbox.brick_type == brick.brick_type() {
					let intersect = objects::intersect(&hitbox.bounds, &brick.bounds());
					if intersect {
						*score += 100;
						*bricks_broken += 1;
						return false;
					}
					return true;
				}
				return true;
			});
		}
		
		self.add_to_current_bricks();
	}
	
	// updates the displayed graphics and returns rendering instructions in the form of a pointer
	pub fn rendering_instructions(&mut self) -> RenderingInstructions {
		let graphics = &mut self.graphics;
		
		graphics.clear();
		
		graphics.push(
			PositionedGraphic {
				g: Graphic{ g: GraphicGroup::Background, frame: 0, flags: 0, arg: 0},
				x: 0.0,
				y: 0.0
			},
		);
		
		graphics.append(&mut self.player.rendering_instructions(self.game_data.time_running));
		
		for brick in &self.current_bricks {
			graphics.push(brick.rendering_instruction());
		}
		
		graphics.append(&mut self.player.lg_rendering_instructions(self.game_data.time_running));
		
		return RenderingInstructions {
			num_graphics: graphics.len(),
			graphics_ptr: graphics.as_ptr()
		}
	}
	
	// returns the number of bricks broken since the last check
	pub fn bricks_broken(&mut self) -> u8 {
		let bb = self.bricks_broken;
		self.bricks_broken = 0;
		return bb;
	}
	
	// returns the songs game data
	pub fn game_data(&self) -> GameData {
		return self.game_data;
	}
	
	// returns all bricks of the song
	pub fn bricks(&self) -> Array {
		let array = Array::new_with_length(self.notes.len() as u32);
		
		let mut i = 0;
		for brick in &self.notes {
			array.set(i, JsValue::from(brick.clone()));
			i += 1;
		}
		return array;
	}
	
	// takes an input command and passes it forward to be handled
	pub fn input_command (&mut self, input: Input) {
		self.player.input(input, self.game_data.time_running);
	}
	
	// takes key release command and passes it forward to be handled
	pub fn stop_command (&mut self, input: Input) {
		self.player.end_input(input);
	}
	
	// select the brick which overlaps with the given brick pos and x pos
	pub fn select_brick(&self, beat_pos: i32, x_pos: i32) -> Option<BrickData> {
		for brick_data in &self.notes {
			if x_pos == brick_data.x_pos {
				if beat_pos == brick_data.beat_pos || (beat_pos > brick_data.beat_pos && beat_pos <= brick_data.end_beat_pos) {
					return Some(brick_data.clone());
				}
			}
			
			if beat_pos < brick_data.beat_pos {
				break;
			}
		}
		
		return None;
	}
	
	// TODO return true/false on success/failure add_brick and remove_brick
	// adds a brick according to the brick's brick data
	pub fn add_brick(&mut self, brick_data: BrickData) {
		self.notes.insert( brick_data );
		
		// !!! alternative data structure to avoid flushing and repopulating vec on each added note
		// !!! on initial load, expensive to do this for each brick
		self.prepare_song();
		self.seek(self.game_data.time_running);
	}
	
	// removes the brick equal to brick_data
	pub fn remove_brick(&mut self, brick_data: BrickData) {
		self.notes.remove( &brick_data ); // TODO alert/log when a value was already there and the brick wasn't updated
		
		// !!! alternative data structure to avoid flushing and repopulating vec on each removed note
		self.prepare_song();
		self.seek(self.game_data.time_running);
	}
	
	fn prepare_song(&mut self) {
		self.bricks = VecDeque::new();
		// reverse ordered vec containing the component bricks of hold notes which have appeared.
			// hold notes are stored here temporarily so that self.bricks can retain its order as bricks are added
			// e.g. if there are two hold notes appearing at the same time, instead of adding all of 1 hold note
			// and then all of the other, they can be added alternating 1 brick at a time, the tops of each added first
		let mut hold_notes: Vec<UpcomingBrick> = Vec::new(); 
		
		for brick_data in &self.notes {
			let appearance_y = brick_data.appearance_y(self.game_data.bpm, self.game_data.brick_speed);
			
			// add hold notes which have passed
			while let Some(upcoming_brick) = hold_notes.last() {
				if upcoming_brick.appearance_y < appearance_y {
					self.bricks.push_back(hold_notes.pop().unwrap());
				} else {
					break;
				}
			}
			
			let (graphic_group, hold_graphic_group) = match brick_data.brick_type {
				BrickType::Type1 => (GraphicGroup::Brick1, GraphicGroup::Brick1Segment),
				BrickType::Type2 => (GraphicGroup::Brick2, GraphicGroup::Brick2Segment),
				BrickType::Type3 => (GraphicGroup::Brick3, GraphicGroup::Brick3Segment)
			};
			
			self.bricks.push_back( UpcomingBrick {
				graphic_group,
				brick_type: brick_data.brick_type, 
				x: brick_data.x(),
				appearance_y,
				height: BRICK_HEIGHT as f32,
				is_hold_note: brick_data.is_hold_note
			});
			
			if brick_data.is_hold_note && brick_data.end_beat_pos > brick_data.beat_pos {
				let end_appearance_y = brick_data.end_appearance_y(self.game_data.bpm, self.game_data.brick_speed);
				let end_y = end_appearance_y + BRICK_HEIGHT as f32 - BRICK_SEGMENT_HEIGHT as f32;
				let mut appearance_y = appearance_y + BRICK_HEIGHT as f32;
				
				while(appearance_y < end_y) {
					hold_notes.push( UpcomingBrick {
						graphic_group: hold_graphic_group,
						brick_type: brick_data.brick_type, 
						x: brick_data.x(),
						appearance_y,
						height: BRICK_SEGMENT_HEIGHT as f32,
						is_hold_note: true
					});
					appearance_y += 50.0;
				}
				
				hold_notes.push( UpcomingBrick {
					graphic_group: hold_graphic_group,
					brick_type: brick_data.brick_type, 
					x: brick_data.x(),
					appearance_y: end_y,
					height: BRICK_SEGMENT_HEIGHT as f32,
					is_hold_note: true
				});
				
				hold_notes.sort_by(|a, b| b.cmp(a)); // sort in reverse order
			}
		}
		
		for i in 1 .. self.bricks.len() {
			assert!(self.bricks[i-1] <= self.bricks[i]);
		}
		self.game_data.max_score = self.notes.len() as i32 * 100;
	}
	
	// add bricks to current_bricks
	fn add_to_current_bricks(&mut self) {
		while(self.upcoming_brick_idx < self.bricks.len()) {
			let idx = self.upcoming_brick_idx;
			if self.bricks[idx].appearance_y < self.end_appearance_y {
				let graphic_group = self.bricks[idx].graphic_group;
				let brick_type = self.bricks[idx].brick_type;

				let x = self.bricks[idx].x;
				let y = self.bricks[idx].appearance_y - self.scrolled_y;
				let bounds = ObjectBounds { left_x: x, top_y: y, right_x: x + BRICK_WIDTH as f32, bottom_y: y + self.bricks[idx].height };
				
				let is_hold_note = self.bricks[idx].is_hold_note;
				
				self.current_bricks.push_back( Brick::new(graphic_group, brick_type, bounds, is_hold_note) );
				self.upcoming_brick_idx += 1;
			} else {
				break;
			}
		}
	}
	
	// seeks (changes the song time) to the time specified. resets song
	pub fn seek(&mut self, time: f32) {
		self.player = Player::new((BRICK_WIDTH * 2) as f32 - objects::PLAYER_WIDTH as f32 / 2.0);
		self.scrolled_y = self.game_data.brick_speed * time;
		self.end_appearance_y = Game::end_appearance_y(self.scrolled_y, self.game_data.brick_speed);
		self.game_data.time_running = time;
		self.game_data.score = 0;
		self.bricks_broken = 0;
		
		self.current_bricks = VecDeque::new();
		self.upcoming_brick_idx = 0;
		let mut i = 0;
		while(i < self.bricks.len()) {
			// if the appearance y is greater than the scrolled y, with -BRICK_HEIGHT buffer for notes off the top of the screen
			if self.bricks[i].appearance_y - self.scrolled_y > -BRICK_HEIGHT as f32 {
				self.add_to_current_bricks();
				break;
			}
			
			i += 1;
			self.upcoming_brick_idx = i;
		}
	}
	
	fn end_appearance_y(scrolled_y: f32, brick_speed: f32) -> f32 {
		return scrolled_y + GAME_HEIGHT as f32 + brick_speed * 2.0; // 2 second window after bricks are off the screen
	}
}


// Equality and Order are determined only on the appearance y of bricks
impl PartialEq for UpcomingBrick {
	fn eq(&self, other: &UpcomingBrick) -> bool {
		return self.appearance_y == other.appearance_y;
	}
}
impl Eq for UpcomingBrick {}

impl PartialOrd for UpcomingBrick {
	fn partial_cmp(&self, other: &UpcomingBrick) -> Option<Ordering> {
		Some(self.cmp(other))
	}
}

impl Ord for UpcomingBrick {
	fn cmp(&self, other: &UpcomingBrick) -> Ordering {
		if self.appearance_y < other.appearance_y { Ordering::Less }
		else if self.appearance_y == other.appearance_y { Ordering::Equal }
		else { Ordering::Greater }
	}
}