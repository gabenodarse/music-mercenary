
import {Game, Editor} from "./Game.js";

// !!! resizing resizes both overlay and screen div, prompt "your screen has been resized. OK to adjust"
	// resizing retains aspect ratio, attempts to size sidebar to accommodate
	
export function EventPropagator(){
	this.game;
	this.overlay;
	
	this.controls;
	
	this.isRunning;
	this.isEditor;
	this.stopFlag;
	
	this.loop;
	
	this.handleKeyDown;
	this.handleKeyUp;
	this.resize;
}

// !!! moving functions to prototype means more difficult removal of listeners? or should some/all of this go to prototype?
EventPropagator.prototype.init = function(game, overlay, controls){
	this.game = game;
	this.overlay = overlay;
	this.controls = controls;
	
	// !!! keep these 3 closures as members? addClosures function to cleanup init?
	
	this.handleKeyUp = evt => {
		if(typeof(this.controls[evt.keyCode]) === "number" && this.isRunning){
			this.game.stopControl(this.controls[evt.keyCode]);
		}
	}
	
	let resizeRefresher = true;
	this.resize = () => {
		const delay = 50; // minimum delay between screen size refreshes
		if(resizeRefresher){
			resizeRefresher = false;
			let game = this.game;
			setTimeout(async function(){
				resizeRefresher = true;
				game.resize();
			},delay);
		}
	}
	
	this.loop = () => this.gameLoop();
	this.resize();
	
	this.stopFlag = false;
	this.isRunning = false;
	this.isEditor = false;
	
	window.addEventListener("keydown", evt => {	this.handleKeyDown(evt) });
	window.addEventListener("keyup", this.handleKeyUp);
	window.addEventListener("resize", this.resize);
}

EventPropagator.prototype.togglePlay = function(){
	if(this.isRunning){
		this.stopFlag = true;
	} else {
		this.stopFlag = false;
		this.start();
	}
}

EventPropagator.prototype.start = function(){
	this.overlay.hideElement("menu");
	this.overlay.hideElement("homeScreen");
	this.overlay.showElement("score");
	
	if(this.isRunning){
		throw Error("Attempting to start game when the game is already running");
	}
	
	this.startLoop();
}

EventPropagator.prototype.pause = function(){
	// >:< show menu?
	this.stopFlag = true;
}

EventPropagator.prototype.restartSong = function(){
	this.game.restart(); // !!! should synchronize with game loop or no? Probably
}

EventPropagator.prototype.exitToHomeScreen = function(){
	this.stopFlag = true;
	this.overlay.hideElement("menu");
	this.overlay.hideElement("score");
	this.overlay.hideElement("editorOverlay");
	this.overlay.showElement("homeScreen");
}

EventPropagator.prototype.enableEditor = function(){
	if(!this.isEditor){
		this.overlay.showElement("editorOverlay");
		this.overlay.hideElement("score");
		
		this.game = this.game.toEditor();
		
		this.overlay.updateSongData(this.game.songData());
		
		this.loop = () => this.editorLoop();
		this.isEditor = true;
	}
}

EventPropagator.prototype.disableEditor = function(){
	if(this.isEditor){
		this.overlay.hideElement("editorOverlay");
		this.overlay.showElement("score");
		
		this.game = this.game.toGame();
		
		this.overlay.updateSongData(this.game.songData());
		
		this.loop = () => this.gameLoop();
		this.isEditor = false;
	}
}

EventPropagator.prototype.runOnGame = function(functionToRun, updateEditor){
	this.stopFlag = true;
	
	let ret = functionToRun(this.game);
	
	this.game.renderGame();
	if(updateEditor === true) {
		this.overlay.updateSongData(this.game.songData());
	}
	
	return ret;
}

EventPropagator.prototype.handleKeyDown = function(evt){
	this.overlay.handleEvent(evt);
	if (evt.keyCode === 27){
		// if the game is not in editor mode, pause/unpause
		if(!this.isEditor && !this.overlay.inHomeScreen()){
			this.togglePlay();
		}
	}
	else if(typeof(this.controls[evt.keyCode]) === "number" && this.isRunning){
		this.game.startControl(this.controls[evt.keyCode]);
	}
}

EventPropagator.prototype.gameLoop = function(){
	if(this.stopFlag){
		this.stopLoop();
	} else {
		this.game.tick();
		this.overlay.updateScore(this.game.score());
		requestAnimationFrame(this.loop);
	}
}

EventPropagator.prototype.editorLoop = function(){
	if(this.stopFlag) {
		this.stopLoop();
	} else {
		this.game.tick();
		this.overlay.updateSongData(this.game.songData());
		requestAnimationFrame(this.loop);
	}
}

// sends the loop to the game as a callback, starting a new loop.
EventPropagator.prototype.startLoop = function(){
	this.isRunning = true;
	this.stopFlag = false;
	
	this.game.start(this.loop);
}

// only called from within the asynchronous game/editor loop
EventPropagator.prototype.stopLoop = function(){
	this.isRunning = false;
	this.stopFlag = false;
	
	// !!! handle game key states on both pause/unpause (as of now fires key up events on pause)
	for(const key in this.controls) {
		let evt = new KeyboardEvent("keyup", {
			keyCode: key,
		});
		this.handleKeyUp(evt);
	}
	
	this.game.pause();
}