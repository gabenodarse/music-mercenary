
use crate::*;
use std::collections::VecDeque;
use player::Player;
use brick::Brick;
use objects::Object;
use objects::BrickType;


struct Song {
	notes: BTreeSet<UpcomingNote>,
	game_data: GameData
}

#[wasm_bindgen]
pub struct Game {
	// !!! create a copy of the reference to player and bricks in a data structure for ordering objects
		// the objects either point to subsequently positioned objects or not (Option type)
	player: Player,
	bricks: VecDeque<Brick>,
	// !!! create a song type to hold song notes and meta data
	song: Song, 
	upcoming_note: Option<UpcomingNote>,
	graphics: Vec<PositionedGraphic>,
	bricks_broken: u8
}

#[wasm_bindgen]
impl Game {
	pub fn new(bpm: f32, brick_speed: f32, duration: f32) -> Game {
		
		return Game {
			player: Player::new((GAME_WIDTH / 2) as f32 - objects::PLAYER_WIDTH as f32 / 2.0),
			bricks: VecDeque::new(), // bricks on screen, ordered by time they are meant to be played
			song: Song { 
				notes: BTreeSet::new(),
				game_data: GameData {
					bpm,
					beat_interval: 60.0 / bpm as f32,
					brick_speed,
					time_running: 0.0,
					score: 0,
					max_score: 0,
					duration,
				}
			},
			upcoming_note: None,
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
		
		self.song.game_data.time_running += seconds_passed;
		
		// retrieve necessary data from the next bricks to hit: 
			// the time of the upcoming bricks, the leftmost x of those bricks and the rightmost x
		let bricks_iter = self.bricks.iter();
		self.player.tick(seconds_passed, bricks_iter, &self.song.game_data);
		
		// tick bricks while discarding any bricks off screen 
		// TODO might not need to check on screen for all notes
		let len = self.bricks.len();
		let mut del = 0;
		for i in 0..len {
			if self.bricks[i].bounds().bottom_y < 0.0 {
				del += 1;
			} else {
				self.bricks[i].tick(self.song.game_data.brick_speed, seconds_passed);
				if del > 0 {
					self.bricks.swap(i - del, i);
				}
			}
		}
		if del > 0 {
			self.bricks.truncate(len - del);
		}
		
		// get the destruction bounds for slashing or dashing
		// TODO assumes that the brick type for slashing and dashing are the same
		// >:< move together
		let destruction_type;
		let destruction_bounds = [
			match self.player.hitbox() {
				Some(hb) => {
					destruction_type = Some(hb.brick_type);
					Some(hb.bounds)
				},
				None => {
					destruction_type = None;
					None
				}
			},
		];
		
		
		// check for brick destruction 
		// TODO: might be a little faster to do as bricks are updated
		// TODO more efficient way than checking ALL bricks
		let t = self.song.game_data.time_running;
		let score = &mut self.song.game_data.score;
		let bricks = &mut self.bricks;
		let bricks_broken = &mut self.bricks_broken;
		if let Some(destruction_type) = destruction_type {
			for bounds in destruction_bounds.iter() {
				if let Some(bounds) = bounds {
					bricks.retain(|&brick| -> bool {
						if destruction_type == brick.brick_type() {
							let intersect = objects::intersect(&bounds, &brick.bounds());
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
			}
		}
		
		// !!! detecting end of song?
		self.add_upcoming_notes();
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
		
		graphics.push(self.player.rendering_instruction());
		
		for brick in &self.bricks {
			graphics.push(brick.rendering_instruction());
		}
		
		graphics.append(&mut self.player.lg_rendering_instructions(self.song.game_data.time_running));
		
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
	
	pub fn game_data(&self) -> GameData {
		return self.song.game_data;
	}
	
	// !!! THIS NEEDS TO BE RELIABLE, OR ELSE USER CREATED SONG DATA MAY BE LOST
	// returns the song in json format
	pub fn song_notes_json(&self) -> String {
		let mut res = String::new();
		
		res.push_str("[");
		for note in self.song.notes.iter() {
			res.push_str(&format!("{{\"brickType\": {}, \"time\": {}, \"xPos\": {}}},", 
				note.note_type as u8, 
				note.time, 
				note_pos_from_x(note.x) ));
		}
		res.pop(); // pop trailing comma
		res.push_str("]");
		
		return res;
	}
	
	// takes an input command and passes it forward to be handled
	pub fn input_command (&mut self, input: Input) {
		self.player.input(input, self.song.game_data.time_running);
	}
	
	// takes key release command and passes it forward to be handled
	pub fn stop_command (&mut self, input: Input) {
		self.player.end_input(input);
	}
	
	// TODO create a method load_song (but can't pass normal arrays/vec, moved or borrowed, through wasm_bindgen)
	// TODO separate toggling/rotating through brick types and strictly adding bricks
	// toggles a brick at the position and time specified. If a brick is already there it will toggle the note of the brick
	pub fn toggle_brick (&mut self, bt: BrickType, time: f32, pos: u8) {
		if time > self.song.game_data.duration {
			return;
		}
		
		let brick = UpcomingNote{
			note_type: BrickType::Type1,
			x: note_pos_to_x(pos),
			time
		};
		let brick2 = UpcomingNote{
			note_type: BrickType::Type2,
			x: note_pos_to_x(pos),
			time
		};
		let brick3 = UpcomingNote{
			note_type: BrickType::Type3,
			x: note_pos_to_x(pos),
			time
		};
		
		if self.song.notes.contains( &brick ) == true {
			self.song.notes.remove( &brick );
			self.song.notes.insert( brick2 );
		}
		else if self.song.notes.contains( &brick2 ) == true {
			self.song.notes.remove( &brick2 );
			self.song.notes.insert( brick3 );
		}
		else if self.song.notes.contains( &brick3 ) == true {
			self.song.notes.remove( &brick3 );
		}
		else {
			self.song.notes.insert( UpcomingNote{
				note_type: bt,
				x: note_pos_to_x(pos),
				time
			});	
		}
		
		match self.song.notes.iter().next() {
			Some(note) => self.upcoming_note = Some(*note),
			None => self.upcoming_note = None
		}
		
		self.song.game_data.max_score = 100 * self.song.notes.len() as i32;
	}
	
	// add any bricks from song that have reached the time to appear
		// uses range weirdness because seeking through a B-tree of non-primitives is weird
	fn add_upcoming_notes(&mut self) {
		if let Some(upcoming_note) = &self.upcoming_note {
			// time that notes should be played plus a buffer time where they travel up the screen
			let appearance_buffer = self.song.game_data.time_running + GAME_HEIGHT as f32 / self.song.game_data.brick_speed;
			if upcoming_note.time < appearance_buffer {
				
				let upcoming_notes = self.song.notes.range(*upcoming_note..); // !!! range bounds with a float possible?
				
				for upcoming_note in upcoming_notes {
					if upcoming_note.time > appearance_buffer {
						self.upcoming_note = Some(*upcoming_note);
						return;
					}
					
					let time_difference = appearance_buffer - upcoming_note.time;
					
					let mut brick = Brick::new(
						upcoming_note.note_type,
						upcoming_note.x,
						GAME_HEIGHT as f32 + GROUND_POS - objects::BRICK_HEIGHT as f32,
						upcoming_note.time );
					brick.tick(self.song.game_data.brick_speed, time_difference);
					self.bricks.push_back(brick);
				}
				
				self.upcoming_note = None;
			}
			
		}
	}
	
	// seeks (changes the song time) to the time specified. resets song
		// !!! resetting song uses duplicate code from add_upcoming_notes
	pub fn seek(&mut self, time: f32) {
		self.song.game_data.time_running = time;
		self.bricks = VecDeque::new();
		self.song.game_data.score = 0;
		self.player = Player::new((GAME_WIDTH / 2) as f32 - objects::PLAYER_WIDTH as f32 / 2.0);
		
		let min_time = time - (GROUND_POS / self.song.game_data.brick_speed);
		let appearance_buffer = time + GAME_HEIGHT as f32 / self.song.game_data.brick_speed;
		
		for note in self.song.notes.iter() {
			if note.time > min_time {
				if note.time > appearance_buffer {
					self.upcoming_note = Some(*note);
					return;
				}
				
				let time_difference = appearance_buffer - note.time;
				
				let mut brick = Brick::new(
					note.note_type,
					note.x,
					GAME_HEIGHT as f32 + GROUND_POS - objects::BRICK_HEIGHT as f32,
					note.time);
				brick.tick(self.song.game_data.brick_speed, time_difference);
				self.bricks.push_back(brick);
			}
		}
		
		self.upcoming_note = None;
	}
}

// >:< move to lib
#[wasm_bindgen]
pub fn game_dimensions() -> Position {
	Position {
		x: GAME_WIDTH as f32,
		y: GAME_HEIGHT as f32,
	}
}