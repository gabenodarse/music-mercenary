
import * as wasm from "../pkg/music_mercenary.js";

let g_keyCodeNames = [];
g_keyCodeNames[32] = "Space";
g_keyCodeNames[13] = "Enter";

// !!! does overlay ever have to be resized?
// TODO all these classes have a DOMelement function, can make them all inherit from a DOMWrapper class

// main overlay class. all overlay elements are children, directly or nested
export function Overlay(game, controlsMap){
	this.game;
	this.controlsMap;

	this.overlayDiv;
	this.menu;
	this.capturingComponent;
	this.currentOverlay;
	
	this.game = game;
	this.controlsMap = controlsMap;

	this.overlayDiv = document.createElement("div");
	this.overlayDiv.id = "overlay";

	document.getElementById("screen").appendChild(this.overlayDiv);

	this.goToHomeScreen();
}

// class for the overlay active when the game is running
function GameOverlay(overlayParent){
	this.overlayParent;
	this.div;
	this.score;
	this.fps;

	this.overlayParent = overlayParent;

	this.div = document.createElement("div");
	this.div.className = "game-overlay";
	
	this.score = new Score();
	this.fps = new FPS();
	this.div.appendChild(this.score.domElement());
	this.div.appendChild(this.fps.domElement());
}

// class for the homescreen which holds song selections
function HomeScreen(overlayParent){
	this.overlayParent;
	this.homeScreenDiv;
	this.songSelections;
	this.selectionIdx;
	
	this.overlayParent = overlayParent;

	this.homeScreenDiv = document.createElement("div");
	this.homeScreenDiv.className = "homescreen";
	
	let mmTitle = document.createElement("h1");
	mmTitle.innerHTML = "Music Mercenary";
	this.homeScreenDiv.appendChild(mmTitle);

	this.songSelections = [];
	this.update();
}

// class for song selections which are attached to the home screen
function HomeSelection(id, name, artist, difficulty, duration){
	this.div;
	this.highlighted;
	
	this.songID;
	this.name;
	this.artist;
	this.difficulty;
	this.duration;
	
	this.songID = id;
	this.name = name;
	this.artist = artist;
	this.difficulty = difficulty;
	this.duration = duration;
	
	this.div = document.createElement("div");
	this.div.className = "home-selection";
	
	this.nameField = document.createElement("p");
	this.artistField = document.createElement("p");
	this.infoField = document.createElement("p");
	
	this.nameField.innerHTML = name;
	this.artistField.innerHTML = artist;
	this.infoField.innerHTML = `Difficulty: ${difficulty} -- Duration: ${duration}`;
	
	this.div.appendChild(this.nameField);
	this.div.appendChild(this.artistField);
	this.div.appendChild(this.infoField);
}

// class for the homescreen which holds song selections
function EndGameScreen(overlayParent){
	this.endScreenDiv;
	this.overlayParent;
	this.textDiv;
	this.textElement1;
	this.textElement2;
	this.scoreTextElement;
	this.exitTextElement;
	
	this.endScreenDiv = document.createElement("div");
	this.endScreenDiv.className = "end-game-screen";
	
	this.textDiv = document.createElement("div");
	this.textDiv.className = "end-game-screen-text-div";
	
	this.textElement1 = document.createElement("p");
	this.textElement2 = document.createElement("p");
	this.scoreTextElement = document.createElement("p");
	this.exitTextElement = document.createElement("p");
	
	let game = overlayParent.getGame();
	let songData = game.getSongData();
	
	this.textElement1.innerHTML = songData.name + " - " + songData.artist;
	this.textElement2.innerHTML = "Difficulty: "+ songData.difficulty + " --- time: " + songData.duration;
	this.scoreTextElement.innerHTML = "Score: " + songData.gameData.score + " / " + songData.gameData.max_score;

	this.exitTextElement.innerHTML = "Enter to move on";

	this.textDiv.appendChild(this.textElement1);
	this.textDiv.appendChild(this.textElement2);
	this.textDiv.appendChild(this.scoreTextElement);
	this.textDiv.appendChild(this.exitTextElement);
	this.endScreenDiv.appendChild(this.textDiv);
	
	this.overlayParent = overlayParent;
}

// EditorOverlay class, contains the editor's guiding lines and the editor's controls
// !!! range scroller isn't modified when the song is modified
function EditorOverlay(overlayParent){
	this.div;
	this.editorCanvas;
	this.scroller;
	this.controls;
	
	this.div = document.createElement("div");
	this.div.className = "editor-overlay";
	
	this.editorCanvas = new EditorCanvas(overlayParent);
	this.controls = new EditorControls(overlayParent);
	
	this.div.appendChild(this.editorCanvas.domElement());
	this.div.appendChild(this.controls.domElement());
}

// EditorCanvas class, displays lines that (should) represent beat breakpoints in a song
	// clicking on the canvas adds notes, wheel scrolling changes the song time
function EditorCanvas(overlayParent){
	this.canvas;
	this.beatInterval; // how long between beats in seconds // !!! get from game every time or store as state?
	this.groundPosOffset = wasm.ground_pos();
	this.mouseDown;
	this.changeBrickType;
	this.selectedBrick;
	this.songData;
	this.overlayParent;
	
	this.mouseDown = false;
	this.changeBrickType = false;
	this.selectedBrick = null;
	this.songData = null;
	this.overlayParent = overlayParent;
	
	let dims = wasm.game_dimensions();
	this.canvas = document.createElement("canvas");
	this.canvas.width = dims.x;
	this.canvas.height = dims.y;
	this.canvas.className = "full-sized";
}

// EditorControls class, contains controls which can control EditorCanvas scrolling and game playing/pausing
// TODO add triplet note button to convert editor canvas's selected brick to triplet note
function EditorControls(overlayParent){
	this.div;
	this.rangesDiv;
	this.buttonDiv;
	this.broadRange;
	this.preciseRange;
	this.playPauseButton;
	this.songDuration;
	this.beatInterval;
	
	this.div = document.createElement("div");
	this.div.className = "editor-controls";
	
	this.rangesDiv = document.createElement("div");
	this.rangesDiv.className = "editor-ranges-div";
	
	this.buttonDiv = document.createElement("div");
	this.buttonDiv.className = "editor-buttons-div";
	
	this.broadRange = document.createElement("input");
	this.broadRange.className = "editor-broad-range";
	this.broadRange.type = "range";
	this.broadRange.max = 100;
	this.broadRange.step = 0.1;
	this.broadRange.value = 0;
	
	this.preciseRange = document.createElement("input");
	this.preciseRange.className = "editor-precise-range";
	this.preciseRange.type = "range";
	this.preciseRange.max = 4;
	this.preciseRange.step = 0.05;
	this.preciseRange.value = 0;
	
	this.playPauseButton = document.createElement("button");
	this.playPauseButton.innerHTML = "|> / ||";
	
	/*this.rangesDiv.addEventListener("input", evt => {
        let t = parseFloat(this.broadRange.value) / 100 * this.songDuration 
			+ parseFloat(this.preciseRange.value) * this.beatInterval;
			
		let fn = game => {
			game.seek(t);
		}
		
		eventPropagator.runOnGame(fn, true);
    });
	
	this.playPauseButton.addEventListener("click", evt => {
		// prevent artificial clicks
		if(evt.clientX != 0 || evt.clientY != 0) {
			eventPropagator.togglePlay();
		}
	});*/
	
	this.rangesDiv.appendChild(this.preciseRange);
	this.rangesDiv.appendChild(this.broadRange);
	this.buttonDiv.appendChild(this.playPauseButton);
	this.div.appendChild(this.rangesDiv);
	this.div.appendChild(this.buttonDiv);
}

// Score class, displays a score which may be updated
function Score(){
	this.scoreDiv;
	this.score;
	this.scoreInner;
	
	this.scoreDiv = document.createElement("div");
	this.scoreDiv.className = "score";
	
	this.score = 0;
	this.scoreInner = document.createElement("p");
	
	this.scoreInner.innerHTML = this.score;
	
	this.scoreDiv.appendChild(this.scoreInner);
	document.body.appendChild(this.scoreDiv);
}

// FPS class, displays a fps which may be updated
function FPS(){
	this.fpsDiv;
	this.fps;
	this.fpsInner;
	
	this.fpsDiv = document.createElement("div");
	this.fpsDiv.className = "fps";
	
	this.fps = 0;
	this.fpsInner = document.createElement("p");
	
	this.fpsInner.innerHTML = this.fps;
	
	this.fpsDiv.appendChild(this.fpsInner);
	document.body.appendChild(this.fpsDiv);
}

// Menu class, contains selections and handles up and down keypresses
// !!! add support for hiding buttons (making navigation ignore inactive buttons)
	// !!! once done, make disable editor and enable editor buttons mutually exclusive / non buggy
function Menu(overlayParent){
	this.div;
	this.selections; // the different selections on the menu
	this.selectionIdx; // the index of the currently highlighted selection
	this.overlayParent;
	this.getInputDialog; // optional pop-up dialog to get input from user
	
	this.div = document.createElement("div");
	this.div.className = "menu";
	this.selections = [];
	this.selectionIdx = 0;

	this.getInputDialog = null;

	this.overlayParent = overlayParent;
}

// Menu when accessed from the homescreen. Extends Menu class
function HomeMenu(overlayParent){
	Menu.call(this, overlayParent);

	this.addSelection(() => { 
		this.overlayParent.closeMenu();
		this.overlayParent.openControlsMenu();
		return null;
	}, "Controls");
}
Object.setPrototypeOf(HomeMenu.prototype, Menu.prototype);

// Menu when accessed from the game. Extends Menu class
function GameMenu(overlayParent){
	Menu.call(this, overlayParent);
	
	this.menuKeyPresses = []; // keep track of key presses for opening master menu

	this.addSelection(() => { 
		this.overlayParent.closeMenu();
		this.overlayParent.openControlsMenu();
		return null;
	}, "Controls");
	
	this.addSelection(() => {
		return "restart-song";
	}, "Restart song");
	
	this.addSelection(() => {
		this.overlayParent.closeMenu();
		this.overlayParent.goToHomeScreen();
		return "stop-loop";
	}, "Quit song");
}
Object.setPrototypeOf(GameMenu.prototype, Menu.prototype);

// Menu when accessed from the game and toggled to master. Extends Menu class
function MasterGameMenu(overlayParent){
	Menu.call(this, overlayParent);

	this.addSelection(() => { 
		this.overlayParent.closeMenu();
		this.overlayParent.openControlsMenu();
		return null;
	}, "Controls");

	this.addSelection(() => {
		return "restart-song";
	}, "Restart song");

	this.addSelection(() => {
		this.overlayParent.closeMenu();
		this.overlayDiv.goToHomeScreen();
		return "stop-loop";
	}, "Quit song");

	this.addSelection(() => {
		let game = this.overlayDiv.getGame();
		game = game.toEditor();

		this.overlayDiv.goToEditorOverlay();
		return null;
	}, "Enable Editor");

	this.addSelection(() => {
		let game = this.overlayDiv.getGame();
		game = game.toGame();

		this.overlayDiv.goToGameOverlay();
		return null;
	}, "Disable Editor");

	this.addSelection(() => {
		this.overlayParent.closeMenu();
		this.overlayParent.openSaveLoadMenu();
		return null;
	}, "Save/Load");
}
Object.setPrototypeOf(MasterGameMenu.prototype, Menu.prototype);

// Sub-menu accessed from another menu in order to save/load songs. Extends Menu class
function SaveLoadMenu(overlayParent){
	Menu.call(this, overlayParent);
	
	this.addSelection(() => { 
		this.openDialog(new NewSongDialog(this.overlayParent, this));
		return null;
	}, "New Song");

	this.addSelection(() => { 
		this.openDialog(new ModifySongDialog(this.overlayParent, this));
		return null;
	}, "Modify Song");

	this.addSelection(() => { 
		this.openDialog(new SaveSongDialog(this.overlayParent, this));
		return null;
	}, "Save Song");

	this.addSelection(() => { 
		this.openDialog(new OverwriteSongDialog(this.overlayParent, this));
		return null;
	}, "Overwrite Song");

	this.addSelection(() => { 
		this.openDialog(new LoadSongDialog(this.overlayParent, this));
		return null;
	}, "Load Song");
	
	this.addSelection(() => {
		alert("Not yet implemented"); // !!! load database
		return null;
	}, "Load database");
}
Object.setPrototypeOf(SaveLoadMenu.prototype, Menu.prototype);

// sub-menu accessed from another menu in order to change the controls. Extends Menu class
function ControlsMenu(overlayParent, controlsMap){
	Menu.call(this, overlayParent);
	
	// add a selection for each possible input
	let possible_inputs = wasm.Input;
	let num_inputs = Object.keys(possible_inputs).length
	for(let i = 0; i < num_inputs; ++i){
		let inputName = "";
		let defaultKey = "";
		
		// find the control name mapping to input i (Dash, Slash1, etc.)
		for (const key in possible_inputs){
			if(possible_inputs[key] == i){
				inputName = key;
				break;
			}
		}
		
		// find the default key mapping to input i
		for (const key in controlsMap){
			if(controlsMap[key] == i){
				defaultKey = key;
			}
		}
		
		// add the selection
		let defaultKeyName = g_keyCodeNames[defaultKey] ? g_keyCodeNames[defaultKey] : String.fromCharCode(defaultKey);
		this.addSelection(() => { 
			this.openDialog(new ChangeControlDialog(this.overlayParent, this, defaultKeyName, inputName, controlsMap, i));
			return null;
		}, inputName);
		this.setSelectionText(i,  inputName + " - " + defaultKeyName);
	}
}
Object.setPrototypeOf(ControlsMenu.prototype, Menu.prototype);

// MenuSelection class. Controls highlighting style and the selection function
function MenuSelection(onSelect, text, parentDiv){
	this.div;
	this.selectionText;
	this.onSelect;
	this.highlighted;
	
	this.div = document.createElement("div");
	this.div.className = "menu-selection";
	
	this.selectionText = document.createElement("p");
	this.selectionText.innerHTML = text;
	
	this.onSelect = onSelect;
	this.highlighted = false;
	
	this.div.appendChild(this.selectionText);
	parentDiv.appendChild(this.div);
}

function GetInputDialog(overlayParent, menuParent){
	this.overlayParent;
	this.menuParent;
	this.div;
	this.formDiv;
	this.formTitle;
	this.buttonsDiv;
	this.submitButton;
	this.cancelButton;
	this.submitFunction; // function to run when the submit button is pressed

	this.overlayParent = overlayParent;
	this.menuParent = menuParent;

	this.div = document.createElement("div");
	this.div.className = "get-input-dialog";
	this.formDiv = document.createElement("div");
	this.formDiv.className = ("dialog-form-div");
	this.buttonsDiv = document.createElement("div");
	this.buttonsDiv.className = "dialog-buttons-div";

	this.formTitle = document.createElement("p");
	this.submitButton = document.createElement("button");
	this.cancelButton = document.createElement("button");
	this.submitButton.innerHTML = "Submit";
	this.cancelButton.innerHTML = "Cancel";

	this.formDiv.appendChild(this.formTitle);
	this.buttonsDiv.appendChild(this.submitButton);
	this.buttonsDiv.appendChild(this.cancelButton);
	this.div.appendChild(this.formDiv);
	this.div.appendChild(this.buttonsDiv);

	this.submitFunction = () => {};
}

// class for creating a dialog to change the selected control. extends GetInputDialog
function ChangeControlDialog(overlayParent, menuParent, oldKeyName, controlName, controlsMap, inputID){
	GetInputDialog.call(this, overlayParent, menuParent);

	this.controlLabel;
	this.oldKeyLabel;
	this.newKeyLabel;
	this.newKeyCode;
	this.submitFunction;
	
	this.formTitle.innerHTML = "Change Control";

	this.controlLabel = document.createElement("label");
	this.oldKeyLabel = document.createElement("label");
	this.newKeyLabel = document.createElement("label");

	this.controlLabel.innerHTML = "Set key for: " + controlName;
	this.oldKeyLabel.innerHTML = "Old key: " + oldKeyName;
	this.newKeyLabel.innerHTML = "Enter a new key";
	
	// set the submit function
	this.submitFunction = () => {
		// unbind the previous key for this input
		for (const key in controlsMap){
			if(controlsMap[key] == inputID){
				controlsMap[key] = undefined;
				break;
			}
		}

		// if the new key is mapped to a different input, set that input to have no key mapping to it
		if(controlsMap[this.newKeyCode]){
			let controlID = controlsMap[this.newKeyCode];
			let controlName = wasm.Input[controlID];
			menuParent.setSelectionText(controlID, controlName + " - UNBOUND");
		}

		controlsMap[this.newKeyCode] = inputID;

		let newKeyName = g_keyCodeNames[this.newKeyCode] ? g_keyCodeNames[this.newKeyCode] : String.fromCharCode(this.newKeyCode);
		menuParent.setSelectionText(inputID, controlName + " - " + newKeyName);
	}

	this.formDiv.appendChild(this.controlLabel);
	this.formDiv.appendChild(document.createElement("br"));
	this.formDiv.appendChild(this.oldKeyLabel);
	this.formDiv.appendChild(document.createElement("br"));
	this.formDiv.appendChild(this.newKeyLabel);
}
Object.setPrototypeOf(ChangeControlDialog.prototype, GetInputDialog.prototype);

// class for creating a dialog to create a new song. extends GetInputDialog
function NewSongDialog(overlayParent, menuParent){
	GetInputDialog.call(this, overlayParent, menuParent);
	
	this.nameLabel;
	this.nameField;
	this.artistLabel;
	this.artistField;
	this.difficultyLabel;
	this.difficultyField;
	this.bpmLabel;
	this.bpmField;
	this.brickSpeedLabel;
	this.brickSpeedField;
	this.durationLabel;
	this.durationField;
	this.songStartOffsetLabel;
	this.songStartOffsetField;
	this.fileInput;

	this.formTitle.innerHTML = "New Song";

	let game = overlayParent.getGame();
	let songData = game.getSongData();
	let newLine = () => { return document.createElement("br"); }

	this.nameLabel = document.createElement("label");
	this.nameField = document.createElement("input");
	this.artistLabel = document.createElement("label");
	this.artistField = document.createElement("input");
	this.difficultyLabel = document.createElement("label");
	this.difficultyField = document.createElement("input");
	this.bpmLabel = document.createElement("label");
	this.bpmField = document.createElement("input");
	this.brickSpeedLabel = document.createElement("label");
	this.brickSpeedField = document.createElement("input");
	this.durationLabel = document.createElement("label");
	this.durationField = document.createElement("input");
	this.songStartOffsetLabel = document.createElement("label");
	this.songStartOffsetField = document.createElement("input");

	this.nameLabel.innerHTML = "Name: ";
	this.artistLabel.innerHTML = "Artist: ";
	this.difficultyLabel.innerHTML = "Difficulty(0-10): ";
	this.bpmLabel.innerHTML = "BPM(40-160): ";
	this.brickSpeedLabel.innerHTML = "Brick Speed(100-5000): ";
	this.durationLabel.innerHTML = "Duration(0-600): ";
	this.songStartOffsetLabel.innerHTML = "Song start offset (0-6, use 0 if unknown): ";

	this.nameField.defaultValue = "";
	this.nameField.type = "text";
	this.artistField.defaultValue = "";
	this.artistField.type = "text";
	this.difficultyField.defaultValue = "";
	this.difficultyField.type = "text";
	this.bpmField.defaultValue = "";
	this.bpmField.type = "text";
	this.brickSpeedField.defaultValue = "";
	this.brickSpeedField.type = "text";
	this.durationField.defaultValue = "";
	this.durationField.type = "text";
	this.songStartOffsetField.defaultValue = "";
	this.songStartOffsetField.type = "text";

	this.fileInput = document.createElement("input");
	this.fileInput.innerHTML = "song"
	this.fileInput.type = "file"

	this.submitFunction = () => {
		// validate data
		let name = this.nameField.value;
		let artist = this.artistField.value;
		let difficulty = parseInt(this.difficultyField.value);
			if(isNaN(difficulty) || difficulty < 0){
				difficulty = 0;
			}
			else if(difficulty > 10){
				difficulty = 10;
			}
		let bpm = parseInt(this.bpmField.value);
			if(isNaN(bpm) || bpm < 40){
				bpm = 40;
			}
			else if(bpm > 160){
				bpm = 160;
			}
		let brickSpeed = parseInt(this.brickSpeedField.value);
			if(isNaN(brickSpeed) || brickSpeed < 100){
				brickSpeed = 100;
			}
			else if(brickSpeed > 5000){
				brickSpeed = 5000;
			}
		let duration = parseInt(this.durationField.value);
			if(isNaN(duration) || duration < 0){
				duration = 0;
			}
			else if(duration > 600){
				duration = 600;
			}
		let songStartOffset = parseInt(this.songStartOffsetField.value);
			if(isNaN(songStartOffset) || songStartOffset < 0){
				songStartOffset = 0;
			}
			else if(songStartOffset > 6){
				songStartOffset = 6;
			}
		let file = this.fileInput.files[0];
		
		game.newSong(name, artist, difficulty, bpm, brickSpeed, duration, songStartOffset);
		game.loadMP3(file)
	}

	this.formDiv.appendChild(this.nameLabel);
	this.formDiv.appendChild(this.nameField);
	this.formDiv.appendChild(newLine());
	this.formDiv.appendChild(this.artistLabel);
	this.formDiv.appendChild(this.artistField);
	this.formDiv.appendChild(newLine());
	this.formDiv.appendChild(this.difficultyLabel);
	this.formDiv.appendChild(this.difficultyField);
	this.formDiv.appendChild(newLine());
	this.formDiv.appendChild(this.bpmLabel);
	this.formDiv.appendChild(this.bpmField);
	this.formDiv.appendChild(newLine());
	this.formDiv.appendChild(this.brickSpeedLabel);
	this.formDiv.appendChild(this.brickSpeedField);
	this.formDiv.appendChild(newLine());
	this.formDiv.appendChild(this.durationLabel);
	this.formDiv.appendChild(this.durationField);
	this.formDiv.appendChild(newLine());
	this.formDiv.appendChild(this.songStartOffsetLabel);
	this.formDiv.appendChild(this.songStartOffsetField);
	this.formDiv.appendChild(newLine());
	this.formDiv.appendChild(this.fileInput);
}
Object.setPrototypeOf(NewSongDialog.prototype, GetInputDialog.prototype);

// class for creating a dialog to modify the current song data. extends GetInputDialog
function ModifySongDialog(overlayParent, menuParent){
	GetInputDialog.call(this, overlayParent, menuParent);
	
	this.nameLabel;
	this.nameField;
	this.artistLabel;
	this.artistField;
	this.difficultyLabel;
	this.difficultyField;
	this.bpmLabel;
	this.bpmField;
	this.brickSpeedLabel;
	this.brickSpeedField;
	this.durationLabel;
	this.durationField;
	this.songStartOffsetLabel;
	this.songStartOffsetField;

	this.formTitle.innerHTML = "Modify Song";

	let game = overlayParent.getGame();
	let songData = game.getSongData();
	let newLine = () => { return document.createElement("br"); }

	this.nameLabel = document.createElement("label");
	this.nameField = document.createElement("input");
	this.artistLabel = document.createElement("label");
	this.artistField = document.createElement("input");
	this.difficultyLabel = document.createElement("label");
	this.difficultyField = document.createElement("input");
	this.bpmLabel = document.createElement("label");
	this.bpmField = document.createElement("input");
	this.brickSpeedLabel = document.createElement("label");
	this.brickSpeedField = document.createElement("input");
	this.durationLabel = document.createElement("label");
	this.durationField = document.createElement("input");
	this.songStartOffsetLabel = document.createElement("label");
	this.songStartOffsetField = document.createElement("input");

	this.nameLabel.innerHTML = "Name: ";
	this.artistLabel.innerHTML = "Artist: ";
	this.difficultyLabel.innerHTML = "Difficulty(0-10): ";
	this.bpmLabel.innerHTML = "BPM(40-160): ";
	this.brickSpeedLabel.innerHTML = "Brick Speed(100-5000): ";
	this.durationLabel.innerHTML = "Duration(0-600): ";
	this.songStartOffsetLabel.innerHTML = "Song start offset (0-6): ";

	this.nameField.defaultValue = songData.name;
	this.nameField.type = "text";
	this.artistField.defaultValue = songData.artist;
	this.artistField.type = "text";
	this.difficultyField.defaultValue = songData.difficulty;
	this.difficultyField.type = "text";
	this.bpmField.defaultValue = songData.gameData.bpm;
	this.bpmField.type = "text";
	this.brickSpeedField.defaultValue = songData.gameData.brick_speed;
	this.brickSpeedField.type = "text";
	this.durationField.defaultValue = songData.duration;
	this.durationField.type = "text";
	this.songStartOffsetField.defaultValue = songData.startOffset;
	this.songStartOffsetField.type = "text";

	this.submitFunction = () => {
		// validate data
		let name = this.nameField.value;
		let artist = this.artistField.value;
		let difficulty = parseInt(this.difficultyField.value);
			if(isNaN(difficulty) || difficulty < 0){
				difficulty = 0;
			}
			else if(difficulty > 10){
				difficulty = 10;
			}
		let bpm = parseInt(this.bpmField.value);
			if(isNaN(bpm) || bpm < 40){
				bpm = 40;
			}
			else if(bpm > 160){
				bpm = 160;
			}
		let brickSpeed = parseInt(this.brickSpeedField.value);
			if(isNaN(brickSpeed) || brickSpeed < 100){
				brickSpeed = 100;
			}
			else if(brickSpeed > 5000){
				brickSpeed = 5000;
			}
		let duration = parseInt(this.durationField.value);
			if(isNaN(duration) || duration < 0){
				duration = 0;
			}
			else if(duration > 600){
				duration = 600;
			}
		let songStartOffset = parseInt(this.songStartOffsetField.value);
			if(isNaN(songStartOffset) || songStartOffset < 0){
				songStartOffset = 0;
			}
			else if(songStartOffset > 6){
				songStartOffset = 6;
			}
		
		game.modifySong(name, artist, difficulty, bpm, brickSpeed, duration, songStartOffset);
	}

	this.formDiv.appendChild(this.nameLabel);
	this.formDiv.appendChild(this.nameField);
	this.formDiv.appendChild(newLine());
	this.formDiv.appendChild(this.artistLabel);
	this.formDiv.appendChild(this.artistField);
	this.formDiv.appendChild(newLine());
	this.formDiv.appendChild(this.difficultyLabel);
	this.formDiv.appendChild(this.difficultyField);
	this.formDiv.appendChild(newLine());
	this.formDiv.appendChild(this.bpmLabel);
	this.formDiv.appendChild(this.bpmField);
	this.formDiv.appendChild(newLine());
	this.formDiv.appendChild(this.brickSpeedLabel);
	this.formDiv.appendChild(this.brickSpeedField);
	this.formDiv.appendChild(newLine());
	this.formDiv.appendChild(this.durationLabel);
	this.formDiv.appendChild(this.durationField);
	this.formDiv.appendChild(newLine());
	this.formDiv.appendChild(this.songStartOffsetLabel);
	this.formDiv.appendChild(this.songStartOffsetField);
}
Object.setPrototypeOf(ModifySongDialog.prototype, GetInputDialog.prototype);

// class for creating a dialog to save the current song to the database. extends GetInputDialog
function SaveSongDialog(overlayParent, menuParent){
	GetInputDialog.call(this, overlayParent, menuParent);
	
	this.nameLabel;
	this.artistLabel;
	this.difficultyLabel;
	this.bpmLabel;
	this.brickSpeedLabel;
	this.durationLabel;
	this.songStartOffsetLabel;

	this.formTitle.innerHTML = "Save Song";

	let game = overlayParent.getGame();
	let songData = game.getSongData();
	let newLine = () => { return document.createElement("br"); }

	this.nameLabel = document.createElement("label");
	this.artistLabel = document.createElement("label");
	this.difficultyLabel = document.createElement("label");
	this.bpmLabel = document.createElement("label");
	this.brickSpeedLabel = document.createElement("label");
	this.durationLabel = document.createElement("label");
	this.songStartOffsetLabel = document.createElement("label");

	this.nameLabel.innerHTML = "Name: " + songData.name;
	this.artistLabel.innerHTML = "Artist: " + songData.artist;
	this.difficultyLabel.innerHTML = "Difficulty(0-10): " + songData.difficulty;
	this.bpmLabel.innerHTML = "BPM(40-160): " + songData.gameData.bpm;
	this.brickSpeedLabel.innerHTML = "Brick Speed(100-5000): " + songData.gameData.brickSpeed;
	this.durationLabel.innerHTML = "Duration(0-600): " + songData.duration;
	this.songStartOffsetLabel.innerHTML = "Song start offset (0-6): " + songData.startOffset;

	this.submitFunction = () => {
		game.saveSong(songData);
	}

	this.formDiv.appendChild(this.nameLabel);
	this.formDiv.appendChild(newLine());
	this.formDiv.appendChild(this.artistLabel);
	this.formDiv.appendChild(newLine());
	this.formDiv.appendChild(this.difficultyLabel);
	this.formDiv.appendChild(newLine());
	this.formDiv.appendChild(this.bpmLabel);
	this.formDiv.appendChild(newLine());
	this.formDiv.appendChild(this.brickSpeedLabel);
	this.formDiv.appendChild(newLine());
	this.formDiv.appendChild(this.durationLabel);
	this.formDiv.appendChild(newLine());
	this.formDiv.appendChild(this.songStartOffsetLabel);
}
Object.setPrototypeOf(SaveSongDialog.prototype, GetInputDialog.prototype);

// class for creating a dialog to overwrite the current song in the database. extends GetInputDialog
function OverwriteSongDialog(overlayParent, menuParent){
	GetInputDialog.call(this, overlayParent, menuParent);
	
	this.nameLabel;
	this.artistLabel;
	this.difficultyLabel;
	this.bpmLabel;
	this.brickSpeedLabel;
	this.durationLabel;
	this.songStartOffsetLabel;

	this.formTitle.innerHTML = "Overwrite Song";

	let game = overlayParent.getGame();
	let songData = game.getSongData();
	let newLine = () => { return document.createElement("br"); }

	this.nameLabel = document.createElement("label");
	this.artistLabel = document.createElement("label");
	this.difficultyLabel = document.createElement("label");
	this.bpmLabel = document.createElement("label");
	this.brickSpeedLabel = document.createElement("label");
	this.durationLabel = document.createElement("label");
	this.songStartOffsetLabel = document.createElement("label");

	this.nameLabel.innerHTML = "Name: " + songData.name;
	this.artistLabel.innerHTML = "Artist: " + songData.artist;
	this.difficultyLabel.innerHTML = "Difficulty(0-10): " + songData.difficulty;
	this.bpmLabel.innerHTML = "BPM(40-160): " + songData.gameData.bpm;
	this.brickSpeedLabel.innerHTML = "Brick Speed(100-5000): " + songData.gameData.brickSpeed;
	this.durationLabel.innerHTML = "Duration(0-600): " + songData.duration;
	this.songStartOffsetLabel.innerHTML = "Song start offset (0-6): " + songData.startOffset;

	this.submitFunction = () => {
		game.overwriteSong(songData);
	}

	this.formDiv.appendChild(this.nameLabel);
	this.formDiv.appendChild(newLine());
	this.formDiv.appendChild(this.artistLabel);
	this.formDiv.appendChild(newLine());
	this.formDiv.appendChild(this.difficultyLabel);
	this.formDiv.appendChild(newLine());
	this.formDiv.appendChild(this.bpmLabel);
	this.formDiv.appendChild(newLine());
	this.formDiv.appendChild(this.brickSpeedLabel);
	this.formDiv.appendChild(newLine());
	this.formDiv.appendChild(this.durationLabel);
	this.formDiv.appendChild(newLine());
	this.formDiv.appendChild(this.songStartOffsetLabel);
}
Object.setPrototypeOf(OverwriteSongDialog.prototype, GetInputDialog.prototype);

// class for creating a dialog to load song data from the database. extends GetInputDialog
function LoadSongDialog(overlayParent, menuParent){
	GetInputDialog.call(this, overlayParent, menuParent);

	let songSelector;
	let options;

	let idIDX;
	let nameIDX;
	let artistIDX;
	let difficultyIDX;
	let durationIDX;
	let timeCreatedIDX;
	let timeModifiedIDX;

	this.formTitle.innerHTML = "Load Song";

	songSelector = document.createElement("select");
	options = [];
	
	let game = overlayParent.getGame();
	let songs = game.songs();
	
	if(songs.length != 0){
		songs[0]["columns"].forEach( (columnName, idx) => {
			if(columnName.toUpperCase() === "SONGID"){
				idIDX = idx;
			}
			else if(columnName.toUpperCase() === "NAME"){
				nameIDX = idx;
			}
			else if(columnName.toUpperCase() === "ARTIST"){
				artistIDX = idx;
			}
			else if(columnName.toUpperCase() === "DIFFICULTY"){
				difficultyIDX = idx;
			}
			else if(columnName.toUpperCase() === "DURATION"){
				durationIDX = idx;
			}
			else if(columnName.toUpperCase() === "TIMECREATED"){
				timeCreatedIDX = idx;
			}
			else if(columnName.toUpperCase() === "TIMEMODIFIED"){
				timeModifiedIDX = idx;
			}
		});
		songs[0]["values"].forEach( (song, idx) => {
			let newOption = document.createElement("option");
			let timeCreated = new Date(song[timeCreatedIDX]).toString();
			let timeModified = new Date(song[timeModifiedIDX]).toString();
			newOption.value = song[idIDX];
			newOption.innerHTML = `Name: ${song[nameIDX]}, Artist: ${song[artistIDX]}, Difficulty: ${song[difficultyIDX]}, Duration: ${song[durationIDX]}, Time Created: ${timeCreated}, Time Modified: ${timeModified}`;
			
			options.push(newOption);
		});
	}
	
	options.forEach( o => {
		songSelector.appendChild(o);
	});
	
	this.submitFunction = () => {
		game.loadSong(songSelector.value);
	};
	
	this.formDiv.appendChild(songSelector);
}
Object.setPrototypeOf(LoadSongDialog.prototype, GetInputDialog.prototype);

Overlay.prototype.goToGameOverlay = function(){
	if(this.capturingComponent){
		throw Error("attempting to go to game while a dom component is still capturing events");
	}
	
	this.removeCurrentOverlay();

	let gameOverlay = new GameOverlay(this);
	this.overlayDiv.appendChild(gameOverlay.domElement());
	this.currentOverlay = gameOverlay;
}

Overlay.prototype.goToEditorOverlay = function(){
	this.removeCurrentOverlay();

	let editorOverlay = new EditorOverlay(this);
	this.overlayDiv.appendChild(editorOverlay.domElement());
	this.setCapturingComponent(editorOverlay);
	this.currentOverlay = editorOverlay;
}

Overlay.prototype.goToHomeScreen = function(){
	this.removeCurrentOverlay();

	let homeScreen = new HomeScreen(this);
	this.overlayDiv.appendChild(homeScreen.domElement());
	this.setCapturingComponent(homeScreen);
	this.currentOverlay = homeScreen;
}

Overlay.prototype.goToEndGameScreen = function(){
	this.removeCurrentOverlay();

	let endGameScreen = new EndGameScreen(this);
	this.overlayDiv.appendChild(endGameScreen.domElement());
	this.setCapturingComponent(endGameScreen);
	this.currentOverlay = endGameScreen;
}

Overlay.prototype.removeCurrentOverlay = function(){
	this.removeCapturingComponent();
	if(this.currentOverlay){
		// TODO make sure currentOverlay has a DOM element and is a child of the parent overlay
		this.currentOverlay.domElement().remove();
		this.currentOverlay = null;
	}
}

Overlay.prototype.openHomeMenu = function(){
	if(this.menu){
		throw Error("attempting to open a menu while one is already open");
	}

	this.menu = new HomeMenu(this);
	this.overlayDiv.appendChild(this.menu.domElement());
	this.setCapturingComponent(this.menu);
}

Overlay.prototype.openGameMenu = function(){
	if(this.menu){
		throw Error("attempting to open a menu while one is already open");
	}

	this.menu = new GameMenu(this);
	this.overlayDiv.appendChild(this.menu.domElement())
	this.setCapturingComponent(this.menu);
}

Overlay.prototype.openMasterGameMenu = function(){
	if(this.menu){
		throw Error("attempting to open a menu while one is already open");
	}

	this.menu = new MasterGameMenu(this);
	this.overlayDiv.appendChild(this.menu.domElement())
	this.setCapturingComponent(this.menu);
}

Overlay.prototype.openSaveLoadMenu = function(){
	if(this.menu){
		throw Error("attempting to open a menu while one is already open");
	}

	this.menu = new SaveLoadMenu(this);
	this.overlayDiv.appendChild(this.menu.domElement())
	this.setCapturingComponent(this.menu);
}

Overlay.prototype.openControlsMenu = function(){
	if(this.menu){
		throw Error("attempting to open a menu while one is already open");
	}

	this.menu = new ControlsMenu(this, this.controlsMap);
	this.overlayDiv.appendChild(this.menu.domElement())
	this.setCapturingComponent(this.menu);
}

Overlay.prototype.closeMenu = function(){
	if(this.menu == this.capturingComponent){
		this.removeCapturingComponent();
		if(!(this.currentOverlay instanceof GameOverlay)){
			this.setCapturingComponent(this.currentOverlay);
		}
	} else if(this.menu){
		console.log("Closing a menu that isn't capturing events");
		this.menu.domElement().remove();
	} else {
		console.log("Attempting to close menu when no menu is open");
	}

	this.menu = null;
}

Overlay.prototype.isCapturing = function(){
	if(this.capturingComponent){
		return true;
	} else {
		return false;
	}
}

Overlay.prototype.setCapturingComponent = function(component){
	// !!! check to make sure component is a child of the overlay?
	this.capturingComponent = component;
}

Overlay.prototype.removeCapturingComponent = function(){ 
	if(this.capturingComponent){
		this.capturingComponent.domElement().remove();
	}
	this.capturingComponent = null;
}

Overlay.prototype.passEvent = function(evt){
	if(!this.capturingComponent){
		throw Error("Attempting to pass an event to overlay when there is no capturing component");
	}
	if(!(typeof this.capturingComponent.handleEvent == "function")){
		throw Error("The capturing component in Overlay does not have a handleEvent function");
	}

	return this.capturingComponent.handleEvent(evt);
}

// TODO updating song data should update score?
Overlay.prototype.update = function(fps=null){
	this.currentOverlay.update();

	if(this.currentOverlay instanceof GameOverlay){
		this.currentOverlay.updateFPS(fps);
	}
}

Overlay.prototype.getGame = function(){
	return this.game;
}

GameOverlay.prototype.update = function(){
	let game = this.overlayParent.getGame();
	
	this.score.update(game.getScore());
}

GameOverlay.prototype.updateFPS = function(fps){
	this.fps.update(fps);
}

GameOverlay.prototype.domElement = function(){
	return this.div;
}

HomeScreen.prototype.domElement = function(){
	return this.homeScreenDiv;
}

HomeScreen.prototype.handleEvent = function(evt){
	if(evt.type != "keydown"){
		return null;
	}

	if(evt.keyCode === 27){ // escape key
		let overlay = this.overlayParent;
		overlay.openHomeMenu();

		return null;
	} 
	else if(evt.keyCode == 38 && this.selectionIdx > 0){ // up arrow
		this.songSelections[this.selectionIdx].toggleHighlight();
		--this.selectionIdx;
		this.songSelections[this.selectionIdx].toggleHighlight();

		return null;
	}
	else if(evt.keyCode == 40 && this.selectionIdx + 1 < this.songSelections.length){ // down arrow
		this.songSelections[this.selectionIdx].toggleHighlight();
		++this.selectionIdx;
		this.songSelections[this.selectionIdx].toggleHighlight();

		return null;
	}
	else if(evt.keyCode == 13){ // enter
		if(this.songSelections[this.selectionIdx]){
			let songID = this.songSelections[this.selectionIdx].getSongID();
			let game = this.overlayParent.getGame();
			game.loadSong(songID);

			this.overlayParent.removeCapturingComponent();
			this.overlayParent.goToGameOverlay();
			
			return("start-loop");
		}
		else{
			throw Error("Home Menu song selection idx out of bounds");
		}
	}
}

HomeScreen.prototype.update = function(){
	let songs = this.overlayParent.getGame().songs();

	for(let i = 0; i < this.songSelections.length; ++i){
		this.songSelections[i].domElement().remove();
	}
	
	this.songSelections = [];
	
	let idIDX;
	let nameIDX;
	let artistIDX;
	let difficultyIDX;
	let durationIDX;
	let timeCreatedIDX;
	let timeModifiedIDX;
	
	if(songs.length != 0){
		songs[0]["columns"].forEach( (columnName, idx) => {
			if(columnName.toUpperCase() === "SONGID"){
				idIDX = idx;
			}
			else if(columnName.toUpperCase() === "NAME"){
				nameIDX = idx;
			}
			else if(columnName.toUpperCase() === "ARTIST"){
				artistIDX = idx;
			}
			else if(columnName.toUpperCase() === "DIFFICULTY"){
				difficultyIDX = idx;
			}
			else if(columnName.toUpperCase() === "DURATION"){
				durationIDX = idx;
			}
			else if(columnName.toUpperCase() === "TIMECREATED"){
				timeCreatedIDX = idx;
			}
			else if(columnName.toUpperCase() === "TIMEMODIFIED"){
				timeModifiedIDX = idx;
			}
		});
		
		songs[0]["values"].forEach( (song, idx) => {
			if(song[idIDX] == 8 && song[nameIDX].toUpperCase() === "HIP SHOP COVER"){
				let selection = new HomeSelection(song[idIDX], song[nameIDX], song[artistIDX], song[difficultyIDX], song[durationIDX]);
				this.songSelections.push(selection);
				this.homeScreenDiv.appendChild(selection.domElement());
			}
			if(song[idIDX] == 9 && song[nameIDX].toUpperCase() === "NEW SONG"){
				let selection = new HomeSelection(song[idIDX], song[nameIDX], song[artistIDX], song[difficultyIDX], song[durationIDX]);
				this.songSelections.push(selection);
				this.homeScreenDiv.appendChild(selection.domElement());
			}
		});
	}
	
	if(this.songSelections.length > 0){
		this.selectionIdx = 0;
		this.songSelections[0].toggleHighlight();
	}
}

HomeSelection.prototype.domElement = function(){
	return this.div;
}

HomeSelection.prototype.toggleHighlight = function(){
	if(this.highlighted){
		this.div.className = "home-selection";
		this.highlighted = false;
	}
	else{
		this.div.className = "home-selection highlighted-home-selection";
		this.highlighted = true;
	}
}

HomeSelection.prototype.getSongID = function(){
	return this.songID;
}

EndGameScreen.prototype.domElement = function(){
	return this.endScreenDiv;
}

EndGameScreen.prototype.handleEvent = function(evt){
	if(evt.type == "keydown" && evt.keyCode == 13){ // enter
		this.overlayParent.removeCapturingComponent();
		this.overlayParent.goToHomeScreen();
	}

	return null;
}

EditorOverlay.prototype.update = function(){
	let songData = this.overlayParent.getGame().getSongData();
	
	this.editorCanvas.updateSongData(songData);
	this.controls.updateSongData(songData);
}

EditorOverlay.prototype.domElement = function(){
	return this.div;
}

EditorOverlay.prototype.handleEvent = function(evt){
	if(evt.type == "keydown" && evt.keyCode == 27){
		let overlay = this.overlayParent;
		overlay.openMasterGameMenu();
	}
	return this.editorCanvas.handleEvent(evt);
}

EditorCanvas.prototype.domElement = function(){
	return this.canvas;
}

EditorCanvas.prototype.timeToY = function(time){
	let timeDifference = time - this.songData.gameData.time_running;
	let currentY = wasm.ground_pos() - wasm.player_dimensions().y / 2;
	let newY = currentY + timeDifference * this.songData.gameData.brick_speed;
	return newY;
}

EditorCanvas.prototype.yToTime = function(y){
	let currentY = wasm.ground_pos() - wasm.player_dimensions().y / 2;
	let yDifference = y - currentY;
	let timeDifference = yDifference / this.songData.gameData.brick_speed;
	
	return this.songData.gameData.time_running + timeDifference;
}

EditorCanvas.prototype.xToNotePos = function(x){
	return Math.floor(x / wasm.brick_dimensions().x);
}

EditorCanvas.prototype.notePosToX = function(notePos){
	return x * wasm.brick_dimensions().x;
}

EditorCanvas.prototype.updateSongData = function(songData){
	this.songData = songData;
	
	this.draw();
}

EditorCanvas.prototype.draw = function(){
	let songData = this.songData;
	let ctx = this.canvas.getContext("2d");
	ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
	
	let time = songData.gameData.time_running;
	
	// get the beat positions that mark when lines should start and stop being drawn
	let topScreenTime = time - (wasm.ground_pos() / songData.gameData.brick_speed);
	let bottomScreenTime = time + (wasm.game_dimensions().y / songData.gameData.brick_speed);
	let beginningBeatPos = wasm.BrickData.closest_beat_pos(topScreenTime, songData.gameData.bpm);
	let endBeatPos = wasm.BrickData.closest_beat_pos(bottomScreenTime, songData.gameData.bpm);
	let screenWidth = wasm.game_dimensions().x;
	
	// draw lines at the specified beat positions
	for(let i = beginningBeatPos; i < endBeatPos; ++i) {
		let beatTime = wasm.BrickData.approx_time(i, songData.gameData.bpm);
		let y = this.timeToY(beatTime);
		if(i % 4 == 0){
			ctx.fillRect(0, y-1, this.canvas.width, 3);
			for(let x = 0; x <= screenWidth; x+=wasm.brick_dimensions().x){
				ctx.fillRect(x-1, y-4, 3, 8);
			}
		} else if(i % 2 == 0){
			ctx.fillRect(0, y, this.canvas.width, 1);
		} else {
			ctx.beginPath();
			ctx.setLineDash([6, 16]);
			ctx.lineWidth = 1;
			ctx.moveTo(0, y);
			ctx.lineTo(this.canvas.width, y);
			ctx.stroke();
		}
	}
	
	// draw a highlight box around the selected brick
	if(this.selectedBrick){
		let brickDims = wasm.brick_dimensions();
		let startX = this.selectedBrick.x_pos * brickDims.x;
		let startTime = wasm.BrickData.approx_time(this.selectedBrick.beat_pos, songData.gameData.bpm);
		let endTime = wasm.BrickData.approx_time(this.selectedBrick.end_beat_pos, songData.gameData.bpm);
		let startY = this.timeToY(startTime) - brickDims.y / 2;
		let endY = this.timeToY(endTime) + brickDims.y / 2;
		if(this.selectedBrick.is_leading || this.selectedBrick.is_trailing){
			let minutesPerBeat = 1 / songData.gameData.bpm;
			let secondsPerBeat = 60 * minutesPerBeat;
			let secondsPerEighthBeat = secondsPerBeat / 8;
			let difference = secondsPerEighthBeat * songData.gameData.brick_speed;
			
			if(this.selectedBrick.is_leading){
				startY -= difference;
				if(!this.selectedBrick.is_hold_note){
					endY -= difference;
				}
			}
			if(this.selectedBrick.is_trailing){
				startY += difference;
				if(!this.selectedBrick.is_hold_note){
					endY += difference;
				}
			}
		}
		
		ctx.setLineDash([]);
		ctx.lineWidth = 3;
		ctx.strokeRect(startX, startY, brickDims.x, endY - startY);
	}
}

EditorCanvas.prototype.handleEvent = function(evt){
	if(evt.type == "keydown"){
		return this.handleKeyDown(evt);
	} else if(evt.type == "mousedown"){
		return this.handleMouseDown(evt);
	} else if(evt.type == "mouseup"){
		return this.handleMouseUp(evt);
	} else if(evt.type == "mousemove"){
		return this.handleMouseMove(evt);
	} else if(evt.type == "wheel"){
		return this.handleWheel(evt);
	}

	return null;
}

EditorCanvas.prototype.handleKeyDown = function(evt){
	if(evt.keyCode == 32 || evt.keyCode == 13){ // space or enter
		return("toggle-play");
	}
	
	if(this.selectedBrick){
		let brick = this.selectedBrick;
		let game = this.overlayParent.getGame();
		
		if(evt.keyCode == 46 || evt.keyCode == 8) { // delete or backspace
			let game = this.overlayParent.getGame();
			game.removeBrick(brick.brick_type, brick.beat_pos, brick.end_beat_pos, brick.x_pos, 
				brick.is_triplet, brick.is_trailing, brick.is_leading, brick.is_hold_note);
			this.selectedBrick = null;
		}
		
		if(evt.keyCode == 38){ // up arrow. delete the old brick, move the brick up and recreate
			game.removeBrick(brick.brick_type, brick.beat_pos, brick.end_beat_pos, brick.x_pos, 
				brick.is_triplet, brick.is_trailing, brick.is_leading, brick.is_hold_note);
			
			if(brick.is_trailing){
				brick.is_trailing = false;
			} else if(brick.is_leading){
				brick.is_leading = false;
				brick.beat_pos -= 1;
				brick.end_beat_pos -= 1;
			} else {
				brick.is_leading = true;
			}
			
			game.createBrick(brick.brick_type, brick.beat_pos, brick.end_beat_pos, brick.x_pos, 
				brick.is_triplet, brick.is_trailing, brick.is_leading, brick.is_hold_note);
			this.selectedBrick = game.selectBrick(brick.beat_pos, brick.x_pos);
		}
		
		if(evt.keyCode == 40){ // down arrow. delete the old brick, move the brick down and recreate
			game.removeBrick(brick.brick_type, brick.beat_pos, brick.end_beat_pos, brick.x_pos, 
				brick.is_triplet, brick.is_trailing, brick.is_leading, brick.is_hold_note);
				
			if(brick.is_leading){
				brick.is_leading = false;
			} else if(brick.is_trailing){
				brick.is_trailing = false;
				brick.beat_pos += 1;
				brick.end_beat_pos += 1;
			} else {
				brick.is_trailing = true;
			}
			
			game.createBrick(brick.brick_type, brick.beat_pos, brick.end_beat_pos, brick.x_pos, 
				brick.is_triplet, brick.is_trailing, brick.is_leading, brick.is_hold_note);
			this.selectedBrick = game.selectBrick(brick.beat_pos, brick.x_pos);
		}
		
		if(evt.keyCode == 37){ // left arrow. delete the old brick, move the brick to the left and recreate
			game.removeBrick(brick.brick_type, brick.beat_pos, brick.end_beat_pos, brick.x_pos, 
				brick.is_triplet, brick.is_trailing, brick.is_leading, brick.is_hold_note);
				
			brick.x_pos -= brick.x_pos > 0 ? 1 : 0;
			
			game.createBrick(brick.brick_type, brick.beat_pos, brick.end_beat_pos, brick.x_pos, 
				brick.is_triplet, brick.is_trailing, brick.is_leading, brick.is_hold_note);
			this.selectedBrick = game.selectBrick(brick.beat_pos, brick.x_pos);
		}
		
		if(evt.keyCode == 39){ // right arrow. delete the old brick, move the brick to the right and recreate
			game.removeBrick(brick.brick_type, brick.beat_pos, brick.end_beat_pos, brick.x_pos, 
				brick.is_triplet, brick.is_trailing, brick.is_leading, brick.is_hold_note);
				
			brick.x_pos += brick.x_pos + 1 < wasm.max_notes_per_screen_width() ? 1 : 0;
			
			game.createBrick(brick.brick_type, brick.beat_pos, brick.end_beat_pos, brick.x_pos, 
				brick.is_triplet, brick.is_trailing, brick.is_leading, brick.is_hold_note);
			this.selectedBrick = game.selectBrick(brick.beat_pos, brick.x_pos);
		}
	}
	
	this.draw();
	return null;
}

EditorCanvas.prototype.handleMouseDown = function(evt){
	console.log("event target: " + evt.target + " event type: " + evt.type);
	/*
	let x = evt.clientX - this.canvas.offsetLeft;
	let y = evt.clientY - this.canvas.offsetTop;
	
	let dimFactors = this.eventPropagator.runOnGame( game => { return game.dimensionFactors(); } );
	x = x / dimFactors.xFactor;
	y = y / dimFactors.yFactor;
	let approxTime = this.yToTime(y);
	let xPos = this.xToNotePos(x);
	let beatPos = wasm.BrickData.closest_beat_pos(approxTime, this.songData.gameData.bpm);
	
	let brick = this.eventPropagator.runOnGame( game => { return game.selectBrick(beatPos, xPos); } );
	
	if(brick){
		// if clicking on the selected brick, remove the selected brick and recreate it with new brick type
		if(this.selectedBrick && this.selectedBrick.beat_pos == brick.beat_pos && this.selectedBrick.x_pos == brick.x_pos
		&& this.selectedBrick.is_leading == brick.is_leading && this.selectedBrick.is_trailing == brick.is_trailing
		&& this.selectedBrick.is_triplet == brick.is_triplet){
			this.changeBrickType = true;
		}
	} else {
		this.eventPropagator.runOnGame( game => { game.createDefaultBrick(beatPos, xPos); } );
		brick = this.eventPropagator.runOnGame( game => { return game.selectBrick(beatPos, xPos); } );
	}
	
	this.selectedBrick = brick;
	
	this.mouseDown = true;
	this.draw();
	*/
}

EditorCanvas.prototype.handleMouseUp = function(evt){
	console.log("event target: " + evt.target + " event type: " + evt.type);
	/*
	this.mouseDown = false;
	if(this.changeBrickType){
		let brick = this.selectedBrick;
		this.eventPropagator.runOnGame(game => { game.removeBrick(brick.brick_type, brick.beat_pos, brick.end_beat_pos, brick.x_pos, 
			brick.is_triplet, brick.is_trailing, brick.is_leading, brick.is_hold_note); });
		
		if(brick.brick_type < 2){
			brick.brick_type += 1;
		} else {
			brick.brick_type = 0;
		}
		
		this.eventPropagator.runOnGame(game => { game.createBrick(brick.brick_type, brick.beat_pos, brick.end_beat_pos, brick.x_pos, 
			brick.is_triplet, brick.is_trailing, brick.is_leading, brick.is_hold_note); });
		this.selectedBrick = this.eventPropagator.runOnGame( game => { return game.selectBrick(brick.beat_pos, brick.x_pos); } );
	}
	this.draw();
	*/
}
	
EditorCanvas.prototype.handleMouseMove = function(evt){
	console.log("event target: " + evt.target + " event type: " + evt.type);
	/*
	if(this.mouseDown && this.selectedBrick){
		let x = evt.clientX - this.canvas.offsetLeft;
		let y = evt.clientY - this.canvas.offsetTop;
		
		let dimFactors = this.eventPropagator.runOnGame( game => { return game.dimensionFactors(); } );
		x = x / dimFactors.xFactor;
		y = y / dimFactors.yFactor;
		let approxTime = this.yToTime(y);
		let xPos = this.xToNotePos(x);
		let beatPos = wasm.BrickData.closest_beat_pos(approxTime, this.songData.gameData.bpm);
		
		if(beatPos != this.selectedBrick.end_beat_pos || xPos != this.selectedBrick.x_pos){
			this.changeBrickType = false;
			
			let brick = this.selectedBrick;
			this.eventPropagator.runOnGame(game => { game.removeBrick(brick.brick_type, brick.beat_pos, brick.end_beat_pos, brick.x_pos, 
				brick.is_triplet, brick.is_trailing, brick.is_leading, brick.is_hold_note); });
			
			if(beatPos > brick.beat_pos){
				brick.is_hold_note = true;
				brick.end_beat_pos = beatPos;
			} else {
				brick.is_hold_note = false;
				brick.end_beat_pos = brick.beat_pos;
			}
			
			if(xPos != brick.x_pos){
				brick.x_pos = xPos;
			}
			
			this.eventPropagator.runOnGame(game => { game.createBrick(brick.brick_type, brick.beat_pos, brick.end_beat_pos, brick.x_pos, 
				brick.is_triplet, brick.is_trailing, brick.is_leading, brick.is_hold_note); });
				
			this.selectedBrick = this.eventPropagator.runOnGame( game => { return game.selectBrick(beatPos, xPos); });
		}
	}
	this.draw();
	*/
}

EditorCanvas.prototype.handleWheel = function(evt){
	console.log("event target: " + evt.target + " event type: " + evt.type);
	/*
	let time;
	let getTime = game => {
		return game.getSongData().gameData.time_running;
	}
	let updateTime = game => {
		game.seek(time);
	}
	
	time = this.eventPropagator.runOnGame(getTime);
	time += evt.deltaY / 256;
	
	this.eventPropagator.runOnGame(updateTime, true);
	*/
}

EditorControls.prototype.domElement = function(){
	return this.div;
}

EditorControls.prototype.updateSongData = function(songData){
	let songDuration = songData.gameData.duration;
	let beatInterval = songData.gameData.beat_interval;
	let time = songData.gameData.time_running;
	
	let prevT = parseFloat(this.broadRange.value) / 100 * songDuration 
		+ parseFloat(this.preciseRange.value) * beatInterval;
	if(time - prevT > 0.5 || prevT - time > 0.5){
		this.broadRange.value = time / songDuration * 100;
		this.preciseRange.value = 0;
	}
}

Menu.prototype.addSelection = function(onSelect, selectionText){
	this.selections.push( new MenuSelection(onSelect, selectionText, this.div) );
	if(this.selections.length == 1){
		this.selections[0].toggleHighlight();
	}
}

Menu.prototype.domElement = function(){
	return this.div;
}

Menu.prototype.handleEvent = function(evt){
	if(this.getInputDialog instanceof GetInputDialog){
		return this.getInputDialog.handleEvent(evt);
	}

	if(evt.type == "keydown"){
		if(evt.keyCode == 38 && this.selectionIdx > 0){ // up arrow
			this.selections[this.selectionIdx].toggleHighlight();
			--this.selectionIdx;
			this.selections[this.selectionIdx].toggleHighlight();
		}
		else if(evt.keyCode == 40 && this.selectionIdx + 1 < this.selections.length){ // down arrow
			this.selections[this.selectionIdx].toggleHighlight();
			++this.selectionIdx;
			this.selections[this.selectionIdx].toggleHighlight();
		}
		else if(evt.keyCode == 13){ // enter
			if(this.selections[this.selectionIdx]){
				return this.selections[this.selectionIdx].select();
			}
		}
		else if(evt.keyCode == 27){
			this.overlayParent.closeMenu();
		}
	}

	return null;
}

Menu.prototype.openDialog = function(dialog){
	if(this.getInputDialog){
		throw Error("Menu attempting to open a dialog when one is already open")
	}

	if(dialog instanceof GetInputDialog){
		this.getInputDialog = dialog;
		this.div.appendChild(dialog.domElement());
		return;
	}
	else{
		console.log("Menu.openDialog called with a non-dialog argument");
	}
}

Menu.prototype.removeDialog = function(){
	if(this.getInputDialog instanceof GetInputDialog){
		this.getInputDialog.domElement().remove();
		this.getInputDialog = null;
		return;
	}
	else{
		console.log("Menu attempting to close dialog while none is open");
	}
}

Menu.prototype.setSelectionText = function(selectionID, newText){
	this.selections[selectionID].setText( newText );
}

GameMenu.prototype.handleEvent = function(evt){
	if(evt.type == "keydown" && evt.keyCode == 27){
		this.overlayParent.closeMenu();
		return "toggle-play";
	} 
	else if(evt.type == "keydown"){
		// master menu
		this.menuKeyPresses.unshift(evt);
		if(this.menuKeyPresses.length > 6){
			this.menuKeyPresses.pop();
		}
		if( this.menuKeyPresses.length >= 6 && this.menuKeyPresses[5].keyCode == 77
		&& this.menuKeyPresses[4].keyCode == 65  && this.menuKeyPresses[3].keyCode == 83 
		&& this.menuKeyPresses[2].keyCode == 84 && this.menuKeyPresses[1].keyCode == 69 
		&& this.menuKeyPresses[0].keyCode == 82 ){
			this.overlayParent.closeMenu();
			this.overlayParent.openMasterGameMenu();
			return null;
		}
	} 

	return Menu.prototype.handleEvent.call(this, evt);
}

MenuSelection.prototype.select = function(){
	if(typeof(this.onSelect) == "function"){
		return this.onSelect();
	}
}

MenuSelection.prototype.toggleHighlight = function(){
	if(this.highlighted){
		this.div.className = "menu-selection";
		this.highlighted = false;
	}
	else{
		this.div.className = "highlighted-menu-selection menu-selection";
		this.highlighted = true;
	}
}

MenuSelection.prototype.setSelectionFunction = function(fn){
	this.onSelect = fn;
}

MenuSelection.prototype.setText = function(txt){
	this.selectionText.innerHTML = txt;
}

MenuSelection.prototype.domElement = function(){
	return this.div;
}

MenuSelection.prototype.getValue = function(){
	return this.value;
}

Score.prototype.domElement = function(){
	return this.scoreDiv;
}

Score.prototype.update = function(newScore){
	if(newScore != this.score){
		this.score = newScore;
		this.scoreInner.innerHTML = newScore;
	}
}

FPS.prototype.domElement = function(){
	return this.fpsDiv;
}

FPS.prototype.update = function(newFPS){
	if(newFPS != this.fps){
		this.fps = newFPS;
		this.fpsInner.innerHTML = newFPS;
	}
}

GetInputDialog.prototype.domElement = function(){
	return this.div;
}

GetInputDialog.prototype.handleEvent = function(evt){
	if(evt.type == "keydown"){
		if(evt.keyCode == 27){
			this.menuParent.removeDialog();
		}

		return null;
	}

	if(evt.type == "click"){
		if(evt.target == this.submitButton){
			this.submitFunction();
			this.menuParent.removeDialog();
		}
		else if (evt.target == this.cancelButton){
			this.menuParent.removeDialog();
		}
	}
}

ChangeControlDialog.prototype.handleEvent = function(evt){
	if(evt.type == "keydown" && evt.keyCode != 27){
		this.newKeyCode = evt.keyCode;
		let newKeyName = g_keyCodeNames[this.newKeyCode] ? g_keyCodeNames[this.newKeyCode] : String.fromCharCode(this.newKeyCode);
		this.newKeyLabel.innerHTML = "New Key: " + newKeyName;

		return null;
	}

	GetInputDialog.prototype.handleEvent.call(this, evt);
}
