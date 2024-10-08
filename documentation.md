# Documentation:

# Rust source code

## src/lib.rs
contains some types and functions common to multiple files, and exports to wasm

## src/objects.rs
contains types and constants common to different objects

## src/game.rs
contains the Game class. Game is exported to wasm and through Game all functionality in the game runs

## src/player.rs
contains the Player class. Controls player movement and action, one of the main components of the Game class

## src/brick.rs
contains the Brick class. Information on bricks travelling up the screen

# javascript scripts

## conventions

classes are uppercase snake case.\
files with an uppercase name hold a class of the same name. Files with a lower case name hold multiple classes/functions. \
snake case is used for variables/functions. variables/functions coming from the wasm binding retain their snake case from the rust source\
class members are supposed to be directly accessed only by the class itself. External functions should only access/modify a classes members through the classes methods.\
class members are often named at the head of the class before being initialized

## scripts/Game.js

Game.js holds Game class and a subclass Editor. \
Contains logic and controls for running and querying the game\
interacts heavily with web assembly bindings\
plays and pauses audio

## scripts/Overlay.js

contains Overlay class, which contains majority of DOM components overlayed on top of the game\
contains logic for interacting with overlay (components such as menu and home screen) and instructions for what happens when interactions occur\
overlay components are destroyed and reconstructed

## scripts/EventPropagator.js

contains EventPropagator class, which effectively is an umbrella over both the game and overlay\
passes events to the overlay when an overlay element is set to capture events\
updates overlay based on game state\
contains the fundamental game loop

## scripts/index.js and scripts/main.js

entry point, creates and initializes components

## scripts/graphics.js

contains logic for rendering graphics

## scripts/load.js

contains function for loading graphics\
contains glue code for interacting with sqlite database

## scripts/readMIDI.js

remnant file that is kept around in case it is useful in the future

# resources.json / src/resources.rs / graphics

each key in the resources.json file represents 1 graphic or animation. \
to add a graphic or animation, add the key to the resources.json file and create an array with the associated images\
then, modify resources.rs such that: \
	- keys have a corresponding GraphicGroup. Names must be identical\
	- the offset dimensions of the graphic are specified\
	- the size of the graphic is specified\
	- max count of the new graphic/animation are specified\
The offset dimensions define how much offset the graphic has from the object it represents. \
	- For example, if a graphic represents a person, the offset defines how much space around the person is also included in the graphic\
	- offsets therefore should be relative to the object's size\
	- offsets are added to both sides of the object (i.e. an x offset is added to both the left and right side) to determine the graphic size

animation frames are cycled through at 120 fps

graphics are displayed by passing the graphic id and frame number (along with transformation flags) to js\
when the frame number is passed to js, the script does a modulus with the total number of frames in the animation to determine which frame to present

render() functions within graphics.js:\
graphic instructions are accessed by the script through a direct pointer to memory (may cause bugs later, but is performant)\
graphics can be displayed with WebGL or with canvases. WebGL uses the gpu, so is better for some computers

# data

data is stored as songs and notes.\

the time notes are meant to be played is described by the "beat position", i.e. the beat value when the note is meant to be played.
	together with the beats per minute (bpm) value of the song, the beat position describes an exact time to play the note 
	e.g. a beat pos of 16 means 16 quarter beats since the song start. At 60 bpm this is at 4 seconds

songs contain metadata about the song (song name, artist, time created, time modified, file name, difficulty) \
	- difficulty meant to be between 0-10
songs also contain data that is used to play the game or run the editor (beats per minute, brick speed, song duration, song start offset)\
	- beats per minute describes the interval of time between beats, which effects when notes are meant to be played. Value meant to be within 40-160\
	- brick speed describes how fast notes travel up the screen in pixels per second. Value meant to be within 100-5000\
	- song start offset describes how much offset (in seconds) is added to the song time before it starts playing
this is for editor purposes, so that the audio aligns with beat markers. Value meant to be within 0 to 6 seconds (6 seconds is 4 beats at the slowest 40 bpm)\
	- duration meant to be between 0-600 (10 minute limit)

notes indicate what song they belong to, and contains data about the note\
(note type, beat position, end beat position, x position, isTriplet boolean, isTrailing boolean, isLeading boolean, isHoldNote boolean)\
	- note type is one of the three note types\
	- beat position is the beat value that the note is set to show up at (together with bpm describes the time the note is meant to be played)\
	- end beat position is the beat value when the note ends\
	- x position is the x position of the note\
	- isTriplet is not implemented, may be implemented in the future for easy support of triplet notes\
	- isTrailing boolean indicates whether the note shows up very slightly after the time specified by the beat pos\
	- isLeading boolean indicates whether the note shows up very slightly before the time specified by the beat pos\
	- isHoldNote boolean indicates whether the notes is meant to be held down when played

