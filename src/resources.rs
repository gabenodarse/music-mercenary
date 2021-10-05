
use wasm_bindgen::prelude::*;

use macros::EnumVariantCount;

use crate::player;
use crate::objects;
use crate::Position;
use crate::GAME_WIDTH;
use crate::GAME_HEIGHT;

#[wasm_bindgen]
#[repr(u8)]
#[derive(Clone, Copy, Debug, EnumVariantCount)]
pub enum GraphicGroup {
	Background,
	Walking,
	Running,
	Brick1,
	Brick2,
	Brick3,
	Slash1,
	Slash2,
	Slash3,
	Dash0,
	Dash1,
	Dash2,
	Dash3,
}

// the maximum amount of the graphic that can appear on screen
#[wasm_bindgen]
pub fn max_graphics(g: GraphicGroup) -> u32 {
	match g {
		GraphicGroup::Background => 1,
		GraphicGroup::Walking => 5,
		GraphicGroup::Running => 5,
		GraphicGroup::Brick1 | GraphicGroup::Brick2 | GraphicGroup::Brick3 => 32,
		GraphicGroup::Slash1 | GraphicGroup::Slash2 | GraphicGroup::Slash3 => 1,
		GraphicGroup::Dash0 => 1,
		GraphicGroup::Dash1 => 1,
		GraphicGroup::Dash2 => 1,
		GraphicGroup::Dash3 => 1,
		
	}
}

// returns the intended size of different graphics
#[wasm_bindgen]
pub fn graphic_size(g: GraphicGroup) -> Position {
	return match g {
		GraphicGroup::Background => { Position {
			x: GAME_WIDTH as i32,
			y: GAME_HEIGHT as i32,
		}},
		GraphicGroup::Walking => { Position {
			x: objects::PLAYER_WIDTH as i32,
			y: objects::PLAYER_HEIGHT as i32,
		}},
		GraphicGroup::Running => { Position {
			x: objects::PLAYER_WIDTH as i32,
			y: objects::PLAYER_HEIGHT as i32,
		}},
		GraphicGroup::Brick1 | GraphicGroup::Brick2 | GraphicGroup::Brick3 => { Position {
			x: objects::BRICK_WIDTH as i32,
			y: objects::BRICK_HEIGHT as i32,
		}},
		GraphicGroup::Slash1 | GraphicGroup::Slash2 | GraphicGroup::Slash3 => { 
			Position {
				x: objects::SLASH_WIDTH as i32,
				y: objects::SLASH_HEIGHT as i32
			}
		},
		GraphicGroup::Dash0 | GraphicGroup::Dash1 | GraphicGroup::Dash2 | GraphicGroup::Dash3 => { Position {
			x: objects::DASH_WIDTH as i32,
			y: objects::DASH_HEIGHT as i32
		}},
	};
}

#[wasm_bindgen]
pub fn num_graphic_groups() -> usize {
	return GraphicGroup::num_variants();
}