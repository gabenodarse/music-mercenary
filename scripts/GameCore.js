"use strict";

import * as wasm from "../pkg/music_mercenary.js";
import * as load from "./load.js";
import {Editor} from "./Editor.js";
import {Game} from "./Game.js";

export function GameCore () {
	// members
	this.gameObject;
	this.database; 
	this.songData;
	this.isLoaded;
	this.isSongLoaded;
	
	// audio
	this.audioContext;
	this.popAudioBuffer;
	this.audioSource;
	this.audioBuffer;
	this.audioTimeSafetyBuffer;

	// set defaults
	this.isLoaded = false;
	this.isSongLoaded = false;

	// TODO move to init function?
	this.audioContext = new AudioContext();
	this.audioTimeSafetyBuffer = 0.15;
}

GameCore.prototype.init = async function () {
	if(this.isLoaded){ return; }
	
	let loader = new load.Loader();
		
	// load sounds (not songs)
		// !!! once there are more sound effects move to loader
		// TODO error handling when it takes too long
	await fetch("./assets/sounds/pop.wav")
		.then(res => res.arrayBuffer())
		.then(res => this.audioContext.decodeAudioData(res))
		.then(res => this.popAudioBuffer = res)
		.catch(rej => { throw Error("Error loading audio: " + rej) });

	// !!! can happen same time as graphics are loading
	this.database = await loader.loadDatabase();
	
	this.gameObject = wasm.Game.new();
    this.songData = {};
    this.songData.gameData = this.gameObject.game_data();
	
	this.isLoaded = true;
}

GameCore.prototype.getSongLoaded = function(){
	return this.isSongLoaded;
}

GameCore.prototype.getRenderingInstructions = function(){
	return this.gameObject.rendering_instructions();
}

GameCore.prototype.getScore = function(){
	return this.songData.gameData.score;
}

GameCore.prototype.getSongData = function(){
	return this.songData;
}

GameCore.prototype.songs = function(){
	let songs = this.database.searchSong();
	
	return songs;
}

// !!! confirmation on deleted data, this and other song modification methods
GameCore.prototype.newSong = function(name, artist, difficulty, bpm, brickSpeed, duration, songStartOffset){
	this.gameObject = wasm.Game.new(bpm, brickSpeed, duration);
	this.songData = {
		songID: null,
		name: name,
		artist: artist,
		difficulty: difficulty,
		bpm: bpm, // !!! bpm brick speed and duration all also occur in the wasm Game object, consistency not guaranteed
		brickSpeed: brickSpeed,
		duration: duration,
		startOffset: songStartOffset,
		timeCreated: 0,
		timeModified: 0,
		filename: "",
		gameData: this.gameObject.game_data()
	}
}

GameCore.prototype.modifySong = function(name, artist, difficulty, bpm, brickSpeed, duration, songStartOffset){
	let oldSongID = this.songData.songID;
	let notes = this.gameObject.bricks();

	this.gameObject = wasm.Game.new(bpm, brickSpeed, duration);

	notes.forEach( note =>{
		this.gameObject.add_brick(wasm.BrickData.new(
			note.brick_type, note.beat_pos, note.end_beat_pos, note.x_pos, 
			note.is_triplet, note.is_trailing, note.is_leading, note.is_hold_note));
	});
	
	this.songData = {
		songID: oldSongID,
		name: name,
		artist: artist,
		difficulty: difficulty,
		bpm: bpm,
		brickSpeed: brickSpeed,
		duration: duration,
		startOffset: songStartOffset,
		timeCreated: 0,
		timeModified: 0,
		filename: "",
		gameData: this.gameObject.game_data()
	}
}

GameCore.prototype.loadSong = async function(songID){
	// !!! check if current song has been saved (modified flag?) 
		// No need to show a check for regular game usage where songs aren't edited
	// !!! creating a new game to load a new song? Or create a load_song method? wasm garbage collected?
	this.isSongLoaded = false;

	let {bricks, song} = this.database.loadSong(songID);
	
	let name, artist, difficulty, bpm, brickSpeed, duration, startOffset, timeCreated, timeModified, filename;
	song[0]["columns"].forEach( (columnName, idx) => {
		if(columnName.toUpperCase() === "NAME"){
			name = song[0]["values"][0][idx];
		} else if(columnName.toUpperCase() === "ARTIST"){
			artist = song[0]["values"][0][idx];
		} else if(columnName.toUpperCase() === "DIFFICULTY"){
			difficulty = song[0]["values"][0][idx];
		} else if(columnName.toUpperCase() === "BPM"){
			bpm = song[0]["values"][0][idx];
		} else if(columnName.toUpperCase() === "BRICKSPEED"){
			brickSpeed = song[0]["values"][0][idx];
		} else if(columnName.toUpperCase() === "DURATION"){
			duration = song[0]["values"][0][idx];
		} else if(columnName.toUpperCase() === "STARTOFFSET"){
			startOffset = song[0]["values"][0][idx];
		} else if(columnName.toUpperCase() === "TIMECREATED"){
			timeCreated = song[0]["values"][0][idx];
		} else if(columnName.toUpperCase() === "TIMEMODIFIED"){
			timeModified = song[0]["values"][0][idx];
		} else if(columnName.toUpperCase() === "FILENAME"){
			filename = song[0]["values"][0][idx];
		}
	});
	
	this.gameObject = wasm.Game.new(bpm, brickSpeed, duration);
	
	if(bricks[0]){
		let brickTypeIDX, beatPosIDX, endBeatPosIDX, xPosIDX, isTripletIDX, isTrailingIDX, isLeadingIDX, isHoldNoteIDX;
		bricks[0]["columns"].forEach( (columnName, idx) => {
			if(columnName.toUpperCase() === "BRICKTYPE"){
				brickTypeIDX = idx;
			} else if(columnName.toUpperCase() === "BEATPOS"){
				beatPosIDX = idx;
			} else if(columnName.toUpperCase() === "ENDBEATPOS"){
				endBeatPosIDX = idx;
			} else if(columnName.toUpperCase() === "XPOS"){
				xPosIDX = idx;
			} else if(columnName.toUpperCase() === "ISTRIPLET"){
				isTripletIDX = idx;
			} else if(columnName.toUpperCase() === "ISTRAILING"){
				isTrailingIDX = idx;
			} else if(columnName.toUpperCase() === "ISLEADING"){
				isLeadingIDX = idx;
			} else if(columnName.toUpperCase() === "ISHOLDNOTE"){
				isHoldNoteIDX = idx;
			}
		});
		
		bricks[0]["values"].forEach( brick => {
			this.gameObject.add_brick(wasm.BrickData.new( 
				brick[brickTypeIDX], brick[beatPosIDX], brick[endBeatPosIDX], brick[xPosIDX],
				brick[isTripletIDX], brick[isTrailingIDX], brick[isLeadingIDX], brick[isHoldNoteIDX])); 
		});
	}
	
	this.songData = {
		songID: songID,
		name: name,
		artist: artist,
		difficulty: difficulty,
		bpm: bpm,
		brickSpeed: brickSpeed,
		duration: duration,
		startOffset: startOffset,
		timeCreated: timeCreated,
		timeModified: timeModified,
		filename: filename,
		gameData: this.gameObject.game_data()
	}

	// fetch the mp3
		// !!! add error handling 
	await fetch(filename)
		.then(res => res.arrayBuffer())
		.then(res => this.audioContext.decodeAudioData(res))
		.then(res => { this.audioBuffer = res; }
	);
	
	this.isSongLoaded = true;
}

GameCore.prototype.loadMP3 = async function(file){
	this.isSongLoaded = false;

	// !!! add error handling
	await file.arrayBuffer()
		.then(res => this.audioContext.decodeAudioData(res))
		.then(res => { this.audioBuffer = res; }
	);

    this.songData.filename = file;
	this.isSongLoaded = true;
}

GameCore.prototype.saveSong = function(songData, overwrite){
	let notes = this.gameObject.bricks();
	notes.forEach( note => {
		note.approx_time = wasm.BrickData.approx_time(note.beat_pos, this.songData.bpm);
	});
	
	this.database.saveSong(songData, notes);
}

GameCore.prototype.overwriteSong = function(songData, overwrite){
	let notes = this.gameObject.bricks();
	notes.forEach( note => {
		note.approx_time = wasm.BrickData.approx_time(note.beat_pos, this.songData.bpm);
	});
	
	this.database.overwriteSong(songData, notes);
}

GameCore.prototype.toEditor = function(){
	if(this.isLoaded == false) {
		throw Error("game core has not been loaded");
	}
	if(this instanceof Editor){
		return this;
	}
	
	this.gameObject.seek(this.songData.gameData.time_running); 
	Object.setPrototypeOf(this, Editor.prototype);
	
	return this;
}

GameCore.prototype.toGame = function(){
	if(this.isLoaded == false) {
		throw Error("game core has not been loaded");
	}
	if(this instanceof Game){
		return this;
	}

    this.gameObject.seek(this.songData.gameData.time_running); 
	Object.setPrototypeOf(this, Game.prototype);
	
	return this;
}