
use std::collections::VecDeque;
use std::collections::vec_deque;
use std::collections::btree_set::BTreeSet;

use crate::log;

use crate::PositionedGraphic;
use crate::resources::GraphicGroup;
use crate::Graphic;
use crate::GraphicFlags;
use crate::LingeringGraphic;

use crate::objects::Object;
use crate::objects::Direction;
use crate::objects::ObjectBounds;
use crate::objects::BrickType;
use crate::objects::HitBox;

use crate::slash::Slash;
use crate::dash::Dash;
use crate::brick::Brick;

use crate::GROUND_POS;
use crate::objects::PLAYER_WIDTH;
use crate::objects::PLAYER_HEIGHT;
use crate::objects::BRICK_WIDTH;
use crate::objects::DASH_WIDTH;
use crate::objects::SLASH_WIDTH;

const SLASH_TIME: f32 = 0.028; // delay dash/slash by a tiny amount so they can be pressed at the same time
const GRAPHIC_LINGER_TIME: f32 = 0.05;

pub struct Player {
	graphic: Graphic, // !!! all objects store Graphic
	state: PlayerState,
	
	bounds: ObjectBounds,
	dx: f32, // in pixels per second
	
	target: Option<TargetInfo>,
	face_dir: Direction,
	hit_dir: Direction,
	
	slash: Option<Slash>,
	dash: Option<Dash>,
	hit_type: Option<BrickType>,
	
	lingering_graphics: Vec<LingeringGraphic>
}

enum PlayerState {
	Running,
	Walking,
	Slashing(f32), // init time of slash/dash, to insert very short delay before becoming active
	Dashing(f32),
	SlashDashing(f32)
}

struct TargetInfo {
	time: f32,
	pos: f32
}

impl Object for Player {
	
	fn bounds(&self) -> ObjectBounds {
		self.bounds
	}
}

impl Player {
	
	pub fn new(x: f32) -> Player {
		Player {
			graphic: Graphic { g: GraphicGroup::Walking, frame: 0, flags: 0 },
			state: PlayerState::Walking,
			
			bounds: ObjectBounds {
				left_x: x,
				top_y: GROUND_POS as f32 - PLAYER_HEIGHT as f32,
				right_x: x + PLAYER_WIDTH as f32, 
				bottom_y: GROUND_POS as f32
			},
			
			dx: 0.0,
			face_dir: Direction::Right,
			hit_dir: Direction::Right,
			target: None,
			
			slash: None,
			dash: None,
			hit_type: None,
			lingering_graphics: Vec::new()
		}
	}
	
	pub fn input_slash (&mut self, brick_type: BrickType, time_running: f32) {
		match self.state {
			PlayerState::Slashing(_) => (),
			PlayerState::Dashing(t) => {
				self.state = PlayerState::SlashDashing(t);
				self.hit_type = Some(brick_type);
			},
			_ => {
				self.state = PlayerState::Slashing(time_running);
				self.hit_type = Some(brick_type);
			}
		}
	}
	
	pub fn input_dash (&mut self, time_running: f32) {
		match self.state {
			PlayerState::Dashing(_) => (),
			PlayerState::Slashing(t) => {
				self.state = PlayerState::SlashDashing(t);
			}
			_ => {
				self.state = PlayerState::Dashing(time_running);
			}
		}
	}
	
	pub fn slash_hitbox(&self) -> Option<HitBox> {
		match &self.slash {
			None => return None,
			Some(slash) => {
				return Some( HitBox {
					brick_type: slash.brick_type,
					bounds: slash.bounds
				});
			}
		}
	}
	
	pub fn dash_hitbox(&self) -> Option<HitBox> {
		match &self.dash {
			None => return None,
			Some(dash) => {
				match dash.brick_type {
					None => return None,
					Some(bt) => {
						return Some( HitBox {
							brick_type: bt,
							bounds: dash.bounds
						});
					}
				}
			}
		}
	}
	
	// tick the players state
	pub fn tick(&mut self, seconds_passed: f32, bricks_iter: vec_deque::Iter<Brick>, time_running: f32) {
		
		if let Some(slash) = &self.slash {
			self.slash = None;
		}
		if let Some(dash) = &self.dash {
			self.dash = None;
		}
		
		self.get_target_info(bricks_iter, time_running);
		self.regular_move(seconds_passed, time_running);
		self.update_state(time_running);
		self.update_graphics(time_running);
	}
	
	pub fn lg_rendering_instructions(&self) -> Vec<PositionedGraphic> {
		let mut positioned_graphics = Vec::new();
		for lg in &self.lingering_graphics {
			positioned_graphics.push(lg.positioned_graphic.clone());
		}
		return positioned_graphics;
	}
	
	fn update_graphics(&mut self, time_running: f32) {
		let g;
		let frame;
		let flags;
		match self.state {
			PlayerState::Running => {
				g = GraphicGroup::Running;
				frame = ((time_running / 0.01667) % 256.0) as u8;
			}
			_ => {
				g = GraphicGroup::Walking;
				frame = 0;
			}
		}
		flags = match self.face_dir {
			Direction::Right => 0,
			Direction::Left => GraphicFlags::HorizontalFlip as u8
		};
		
		self.graphic = Graphic { g, frame, flags };
		
		// TODO would prefer if cloning the lingering graphics before removing them was unnecessary
		let new_set: Vec<LingeringGraphic> = self.lingering_graphics.iter().filter(|lg| lg.end_t > time_running).cloned().collect();
		self.lingering_graphics = new_set;
	}
	
	fn update_state(&mut self, time_running: f32) {
		match self.state {
			PlayerState::Running => {
				match &self.target {
					None => self.state = PlayerState::Walking,
					Some(ti) => {
						if ti.pos == self.bounds.left_x { // >:< comparison against F32_ZERO is more robust
							self.state = PlayerState::Walking;
						} else {
							self.state = PlayerState::Running;
						}
					}
				}
			},
			PlayerState::Walking => {
				match &self.target {
					None => self.state = PlayerState::Walking,
					Some(ti) => {
						if ti.pos == self.bounds.left_x { // >:< comparison against F32_ZERO is more robust
							self.state = PlayerState::Walking;
						} else {
							self.state = PlayerState::Running;
						}
					}
				}
			},
			PlayerState::Slashing(t) => {
				if time_running - t > SLASH_TIME {
					let brick_type;
					if let Some(bt) = self.hit_type {
						brick_type = bt;
					} else { panic!(); }
					self.hit_type = None;
					
					self.slash(brick_type, time_running);
					self.state = PlayerState::Walking;
				}
			},
			PlayerState::Dashing(t) => {
				if time_running - t > SLASH_TIME {
					self.dash(None, time_running);
					self.state = PlayerState::Walking;
				}
			},
			PlayerState::SlashDashing(t) => {
				if time_running - t > SLASH_TIME {
					let brick_type;
					if let Some(bt) = self.hit_type {
						brick_type = bt;
					} else { panic!(); }
					self.hit_type = None;
					
					self.dash(Some(brick_type), time_running);
					self.slash(brick_type, time_running);
					
					self.state = PlayerState::Walking;
				}
			}
		}
	}
	
	fn slash(&mut self, brick_type: BrickType, time_running: f32) {
		if let None = self.slash { 
			let slash = match self.hit_dir {
				Direction::Right => {
					Slash::new( self.bounds.right_x, self.bounds.top_y, brick_type, Direction::Right)
				},
				Direction::Left => {
					Slash::new( self.bounds.left_x - SLASH_WIDTH as f32, self.bounds.top_y, brick_type, Direction::Left)
				}
			};
			
			self.lingering_graphics.push( LingeringGraphic {
				positioned_graphic: slash.rendering_instruction(),
				start_t: time_running,
				end_t: time_running + GRAPHIC_LINGER_TIME
			});
			self.slash = Some(slash);
		}
	}
	
	fn dash(&mut self, brick_type: Option<BrickType>, time_running: f32) {
		if let None = self.dash {
			let dash = match self.hit_dir {
				Direction::Right => {
					Dash::new( self.bounds.right_x, self.bounds.top_y, brick_type, self.hit_dir) // >:< this constructor
				},
				Direction::Left => {
					Dash::new( self.bounds.left_x - DASH_WIDTH as f32, self.bounds.top_y, brick_type, self.hit_dir)
				}
			};
			
			match self.hit_dir {
				Direction::Right => {
					self.bounds.left_x = dash.bounds.right_x;
					self.bounds.right_x = self.bounds.left_x + PLAYER_WIDTH as f32;
				},
				Direction::Left => {
					self.bounds.right_x = dash.bounds.left_x;
					self.bounds.left_x = self.bounds.right_x - PLAYER_WIDTH as f32;
				}
			}
			
			self.lingering_graphics.push( LingeringGraphic {
				positioned_graphic: dash.rendering_instruction(),
				start_t: time_running,
				end_t: time_running + GRAPHIC_LINGER_TIME
			});
			self.dash = Some(dash);
		}		
	}
	
	fn regular_move(&mut self, seconds_passed: f32, time_running: f32) {
		// get nearest brick, run to it
		
		const RUN_SPEED: f32 = 480.0; // in pixels per second
		
		match &self.target {
			None => {
				
			},
			Some(ti) => {
				// >:< can shorten
				match self.face_dir {
					Direction::Left => {
						let end_pos = self.bounds.left_x - seconds_passed * RUN_SPEED;
						if end_pos < ti.pos {
							self.bounds.left_x = ti.pos;
						} else {
							self.bounds.left_x = end_pos;
						}
					},
					Direction::Right => {
						let end_pos = self.bounds.left_x + seconds_passed * RUN_SPEED;
						if end_pos > ti.pos {
							self.bounds.left_x = ti.pos;
						} else {
							self.bounds.left_x = end_pos;
						}
					}
				}
				
				self.bounds.right_x = self.bounds.left_x + PLAYER_WIDTH as f32;
			}
		}
	}
	
	fn get_target_info(&mut self, mut bricks_iter: vec_deque::Iter<Brick>, time_running: f32) {
		
		const TIME_BUFFER: f32 = 0.025; // maximum time difference between bricks appearing at same time (difference should be 0.0)
		let mut bricks_info = None;
		
		struct UpcomingBricks {
			time: f32,
			left_brick: f32,
			right_brick: f32
		}
		
		for brick in bricks_iter {
			if brick.time < time_running {
				continue;
			} 
			
			match &mut bricks_info {
				None => {
					bricks_info = Some( UpcomingBricks {
						time: brick.time,
						left_brick: brick.bounds.left_x,
						right_brick: brick.bounds.left_x
					});
				},
				Some(bi) => {
					if bi.time + TIME_BUFFER < brick.time {
						break; // >:< always chases the highest brick after time running
					}
					
					if brick.bounds.left_x < bi.left_brick {
						bi.left_brick = brick.bounds.left_x;
					} else if brick.bounds.left_x > bi.right_brick {
						bi.right_brick = brick.bounds.left_x;
					}
				}
			}
		}
		
		match bricks_info {
			None => {
				self.target = None;
			}
			Some(bi) => {
				let left_target = bi.left_brick - PLAYER_WIDTH as f32;
				let right_target = bi.right_brick + BRICK_WIDTH as f32;
				
				// if left of target, right of target, in between targets
				if left_target - self.bounds.left_x >= 0.0 {
					self.face_dir = Direction::Right;
					self.target = Some( TargetInfo { time: bi.time, pos: left_target} )
				} else if self.bounds.left_x - right_target >= 0.0 {
					self.face_dir = Direction::Left;
					self.target = Some( TargetInfo { time: bi.time, pos: right_target} )
				} else if left_target - self.bounds.left_x > self.bounds.left_x - right_target {
					self.face_dir = Direction::Left;
					self.target = Some ( TargetInfo { time: bi.time, pos: left_target} )
				} else {
					self.face_dir = Direction::Right;
					self.target = Some ( TargetInfo { time: bi.time, pos: right_target} )
				}
				
				self.hit_dir = self.face_dir; // >:< 
			}
		}
	}
	
	pub fn rendering_instruction(&self) -> PositionedGraphic {
		PositionedGraphic {
			g: self.graphic,
			x: self.bounds.left_x as i32,
			y: self.bounds.top_y as i32,
		}
	}
}