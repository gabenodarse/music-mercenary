
import * as wasm from "./pkg/music_mercenary.js";

// !!! finish map
let g_keyCodeNames = [];
g_keyCodeNames[32] = "space";
g_keyCodeNames[188] = ", (<)";
g_keyCodeNames[190] = ". (>)";
g_keyCodeNames[81] = "q";
g_keyCodeNames[87] = "w";
g_keyCodeNames[69] = "e";
g_keyCodeNames[82] = "r";

// >:< 
	// safely send game modifications through eventPropagator so that they don't happen if the game is running
// !!! backspace for menu navigation?
// !!! does overlay ever have to be resized?
// !!! change toggle functions to display/hide functions
// !!! grouping all of overlay here may have been a mistake... 
	// Having the editor overlay included in Editor class would allow game and overlay elements to synchronize more easily
// TODO overlay editor modifies game object directly... should happen through event propagator? 
	// root problem: How is it ensured that editor overlay is never active while the editor is inactive and the game is running?
export function Overlay(game, eventPropagator, controlsMap){
	this.overlayDiv;
	this.score;
	this.menu;
	this.editorOverlay;
	
	let overlayDiv = document.createElement("div");
	let score = new Score();
	let menu = new Menu(eventPropagator, controlsMap);
	let editorOverlay = new EditorOverlay(game, eventPropagator);
	
	overlayDiv.style.width = "100vw";
	overlayDiv.style.height = "100vh";
	overlayDiv.style.position = "absolute";
	overlayDiv.style.left = "0";
	overlayDiv.style.top = "0";
	
	overlayDiv.appendChild(score.domElement());
	overlayDiv.appendChild(menu.domElement());
	overlayDiv.appendChild(editorOverlay.domElement());
	document.body.appendChild(overlayDiv);
	
	this.overlayDiv = overlayDiv;
	this.score = score;
	this.menu = menu;
	this.editorOverlay = editorOverlay;
}

// >:< for when a game object isn't tied to 1 specific song
// >:< scroller doesn't update overlay guiding lines
	// how to send events from member objects up to parent?
// Overlay.prototype.createNewEditor = function(game){
// }

function EditorOverlay(game, eventPropagator){
	this.div;
	this.guidingLines;
	this.scroller;
	this.controls;
	
	this.div = document.createElement("div");
	this.div.style.width = "100vw";
	this.div.style.height = "100vh";
	this.div.style.display = "none";
	
	this.guidingLines = new EditorGuidingLines(game);
	this.controls = new EditorControls(game, eventPropagator);
	
	this.div.appendChild(this.guidingLines.domElement());
	this.div.appendChild(this.controls.domElement());
}

// !!! allow triplet notes
function EditorGuidingLines(game){
	this.canvas;
	this.beatInterval; // how long between beats in seconds // !!! get from game every time or store as state?
	this.beatPixelInterval; // how many pixels between beats
	this.groundPosOffset = wasm.ground_pos();
	this.onclick;
	
	this.canvas = document.createElement("canvas");
	this.canvas.width;
	this.canvas.height;
	this.canvas.style.width = "100%";
	this.canvas.style.height = "100%";
	
	let dims = wasm.game_dimensions();
	this.canvas.width = dims.x;
	this.canvas.height = dims.y;
	
	let songData = game.songData();
	this.beatInterval = songData.beatInterval;
	this.beatPixelInterval = this.beatInterval * songData.brickSpeed;
	
	this.onclick = evt => {
		let x = evt.clientX - this.canvas.offsetLeft;
		let y = evt.clientY - this.canvas.offsetTop;
		let t = game.songData().songTime;
		game.createNote(x, y, t);
	}
	
	this.canvas.addEventListener("click", this.onclick);
	
}

// !!! can move even when song is playing
function EditorControls(game, eventPropagator){
	this.div;
	this.rangesDiv;
	this.buttonDiv;
	this.broadRange;
	this.preciseRange;
	this.playPauseButton;
	this.songDuration;
	this.beatInterval;
	
	let songData = game.songData();
	this.songDuration = songData.songDuration;
	this.beatInterval = songData.beatInterval;
	
	this.div = document.createElement("div");
	this.div.style.position = "absolute";
	this.div.style.bottom = "0";
	this.div.style.width = "100%";
	this.div.style.zIndex = "200";
	this.div.style.backgroundColor = "rgba(100, 100, 100, 0.4)";
	
	this.rangesDiv = document.createElement("div");
	this.rangesDiv.style.width = "90%";
	this.rangesDiv.style.marginLeft = "5%";
	
	this.buttonDiv = document.createElement("div");
	this.buttonDiv.style.position = "absolute";
	this.buttonDiv.style.width = "5%";
	this.buttonDiv.style.left = "0";
	this.buttonDiv.style.top = "0";
	this.buttonDiv.style.height = "100%";
	
	this.broadRange = document.createElement("input");
	this.broadRange.style.width = "100%";
	this.broadRange.style.display = "block";
	this.broadRange.type = "range";
	this.broadRange.max = 100;
	this.broadRange.step = 0.1;
	this.broadRange.value = 0;
	
	this.preciseRange = document.createElement("input");
	this.preciseRange.style.width = "25%";
	this.preciseRange.style.display = "block";
	this.preciseRange.type = "range";
	this.preciseRange.max = 4;
	this.preciseRange.step = 0.05;
	this.preciseRange.value = 0;
	
	this.playPauseButton = document.createElement("button");
	this.playPauseButton.innerHTML = "|> / ||";
	
	this.rangesDiv.addEventListener("input", evt => {
        let t = parseFloat(this.broadRange.value) / 100 * this.songDuration 
			+ parseFloat(this.preciseRange.value) * this.beatInterval;
		game.seek(t);
		game.renderGame();
    });
	
	this.playPauseButton.addEventListener("click", evt => {
		eventPropagator.togglePlay();
	});
	
	this.rangesDiv.appendChild(this.preciseRange);
	this.rangesDiv.appendChild(this.broadRange);
	this.buttonDiv.appendChild(this.playPauseButton);
	this.div.appendChild(this.rangesDiv);
	this.div.appendChild(this.buttonDiv);
}

function Score(){
	this.scoreDiv;
	this.score;
	this.scoreInner;
	
	this.scoreDiv = document.createElement("div");
	this.score = 0;
	this.scoreInner = document.createElement("p");
	
	this.scoreDiv.style.display = "none";
	this.scoreDiv.style.position = "absolute";
	this.scoreDiv.style.top = "0";
	this.scoreDiv.style.right = "0";
	this.scoreDiv.style.height = "3vw";
	this.scoreDiv.style.width = "9vw";
	this.scoreDiv.style.fontSize = "2em";
	this.scoreDiv.style.zIndex = "200";
	this.scoreInner.style.margin = "0";
	this.scoreInner.style.userSelect = "none";
	this.scoreInner.innerHTML = this.score;
	
	this.scoreDiv.appendChild(this.scoreInner);
	document.body.appendChild(this.scoreDiv);
}

function Menu(eventPropagator, controlsMap){
	this.menuDiv;
	this.currentDisplayed;
	this.mainMenu; // each sub div contains an array of selections, each selection contains a select function
	this.controlsMenu;
	this.saveLoadMenu;
	
	this.menuDiv = document.createElement("div");
	this.menuDiv.style.display = "none";
	this.menuDiv.style.position = "absolute";
	this.menuDiv.style.top = "10vh";
	this.menuDiv.style.left = "40vw";
	this.menuDiv.style.height = "70vh";
	this.menuDiv.style.width = "20vw";
	this.menuDiv.style.fontSize = "3em";
	this.menuDiv.style.zIndex = "200";
	this.menuDiv.style.backgroundColor = "#9999ff";
	
	this.mainMenu = new MenuPanel();
	this.controlsMenu = new ControlsMenu(controlsMap);
	this.saveLoadMenu = new MenuPanel();
	
	// main menu items
	this.mainMenu.addSelection(() => { 
		this.mainMenu.deactivate();
		this.controlsMenu.activate();
		this.currentDisplayed = this.controlsMenu;
	}, "Controls");
	
	this.mainMenu.addSelection(() => {
		eventPropagator.restartSong();
	}, "Restart song");
	
	this.mainMenu.addSelection(() => {
		// !!! 
	}, "Quit song");
	
	this.mainMenu.addSelection(() => {
		eventPropagator.enableEditor();
	}, "Enable Editor");
	
	this.mainMenu.addSelection(() => {
		eventPropagator.disableEditor();
	}, "Disable Editor");
	
	this.mainMenu.addSelection(() => {
		this.mainMenu.deactivate();
		this.saveLoadMenu.activate();
		this.currentDisplayed = this.saveLoadMenu;
	}, "Save/Load");
	
	// save load menu items
	this.saveLoadMenu.addSelection(() => {
		saveSongDialog(eventPropagator);
	}, "Save song");
	
	this.saveLoadMenu.addSelection(() => {
		loadSongDialog(eventPropagator);
	}, "Load song");
	
	this.saveLoadMenu.addSelection(() => {
		alert("Not yet implemented"); // >:< this and Load database button
	}, "Load mp3");
	
	this.saveLoadMenu.addSelection(() => {
		alert("Not yet implemented");
	}, "Load database");

	
	this.menuDiv.appendChild(this.mainMenu.domElement());
	this.menuDiv.appendChild(this.controlsMenu.domElement());
	this.menuDiv.appendChild(this.saveLoadMenu.domElement());
}

// !!! add support for hiding buttons (making navigation ignore inactive buttons)
	// !!! once done, make disable editor and enable editor buttons mutually exclusive / non buggy
function MenuPanel(){
	this.div;
	this.eventListener;
	this.selections;
	this.selectionIdx;
	
	this.div = document.createElement("div");
	this.div.style.width = "100%";
	this.div.style.display = "none";
	this.selections = [];
	this.selectionIdx = 0;
	
	this.eventListener = evt => {
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
		else if(evt.keyCode == 13){
			if(this.selections[this.selectionIdx]){
				this.selections[this.selectionIdx].select();
			}
		}
	};
}

// !!! note to user that holding down arrow keys disable other keys on many keyboards
// !!! redundancy check that the buttons are named correctly on menu panel activation.
// TODO does control menu have to be a special subclass of MenuPanel? 
function ControlsMenu(controlsMap){
	MenuPanel.call(this);
	this.selectionsNames = [];
	
	let possible_inputs = wasm.Input;
	let num_inputs = Object.keys(possible_inputs).length
	for(let i = 0; i < num_inputs; ++i){
		let name = "";
		let currentKey = "";
		
		let controlSelection;
		
		// find the control name mapping to i
		for (const key in possible_inputs){
			if(possible_inputs[key] == i){
				name = key;
				break;
			}
		}
		
		// find the current key mapping to i
		for (const key in controlsMap){
			if(controlsMap[key] == i){
				currentKey = key;
			}
		}
		
		// create callback for when the selection is selected
		let callback = (keyCode) => {
			if(keyCode == 27){
				return;
			}
			
			let prevKey = null;
			let newKeyName = g_keyCodeNames[keyCode] ? g_keyCodeNames[keyCode] : keyCode;
			for (const key in controlsMap){
				if(controlsMap[key] == i){
					controlsMap[key] = undefined;
					break;
				}
			}
			
			// reset name if a key is rebound
			if(controlsMap[keyCode] != undefined){
				let controlID = controlsMap[keyCode];
				this.setSelectionName(controlID, "");
			}
			controlsMap[keyCode] = i;
			this.setSelectionName(i, newKeyName);
		}
		
		this.selectionsNames.push(name);
		this.addSelection(null, "");
		this.selections[i].setSelectionFunction(() => { changeControlDialog(callback); });
		let currentKeyName = g_keyCodeNames[currentKey] ? g_keyCodeNames[currentKey] : currentKey;
		this.setSelectionName(i, currentKeyName);
	}
}

Object.setPrototypeOf(ControlsMenu.prototype, MenuPanel.prototype);

function MenuSelection(onSelect, selectionText, parentPanelDiv){
	this.div;
	this.selectionText;
	this.onSelect;
	this.highlighted;
	
	this.div = document.createElement("div");
	this.div.style.width = "100%";
	this.div.style.height = "20%";
	
	this.selectionText = document.createElement("p");
	this.selectionText.innerHTML = selectionText;
	this.selectionText.style.margin = "0";
	this.selectionText.style.userSelect = "none";
	this.onSelect = onSelect;
	this.highlighted = false;
	
	this.div.appendChild(this.selectionText);
	parentPanelDiv.appendChild(this.div);
}


Overlay.prototype.updateEditor = function(time){
	this.editorOverlay.updateTime(time);
}

Overlay.prototype.toggleElement = function(elementName){
	if(this[elementName] != undefined){
		this[elementName].toggle();
	}
	else{
		console.log("the overlay does not have member \"" + elementName + "\"");
	}
}

Overlay.prototype.updateScore = function(newScore){
	this.score.update(newScore);
}

EditorOverlay.prototype.toggle = function(){
	if(this.div.style.display != "none"){
		this.div.style.display = "none";
	}
	else{
		this.div.style.display = "block";
	}
}

EditorOverlay.prototype.updateTime = function(time){
	this.guidingLines.updateTime(time);
	this.controls.updateTime(time);
}

EditorOverlay.prototype.domElement = function(){
	return this.div;
}

EditorGuidingLines.prototype.domElement = function(){
	return this.canvas;
}

// TODO faster if the canvas stays the same and is just repositioned on time changes. 
	// However, if the game height is not the full screen height, lines would show outside the game's boundaries
EditorGuidingLines.prototype.updateTime = function(time){
	if(time < 0){
		console.log("can't update to a negative time");
		return;
	}
	
	let ctx = this.canvas.getContext("2d");
	ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
	
	let quarterBeatInterval = this.beatInterval / 4;
	let quarterBeatPixelInterval = this.beatPixelInterval / 4;
	let timeIntoBeat = time % this.beatInterval;
	let timeIntoQuarterBeat = time % quarterBeatInterval;
	// round to next quarter beat interval
	let posOffset = this.groundPosOffset;
	posOffset -= timeIntoQuarterBeat / quarterBeatInterval * quarterBeatPixelInterval;
	let quarterBeatCounter = Math.floor(timeIntoBeat / quarterBeatInterval);
	for(let y = posOffset; y < this.canvas.height; y += quarterBeatPixelInterval){
		if(quarterBeatCounter % 4 == 0){ // beat line
			ctx.fillRect(0, y, this.canvas.width, 3);
		}
		else if(quarterBeatCounter % 4 == 2){ // half beat line
			ctx.fillRect(0, y, this.canvas.width, 1);
		}
		else{ // quarter beat line
			ctx.beginPath();
			ctx.setLineDash([6, 16]);
			ctx.moveTo(0, y);
			ctx.lineTo(this.canvas.width, y);
			ctx.stroke();
		}
		++quarterBeatCounter;
	}
}

EditorControls.prototype.domElement = function(){
	return this.div;
}

EditorControls.prototype.updateTime = function(time){
	let prevT = parseFloat(this.broadRange.value) / 100 * this.songDuration 
		+ parseFloat(this.preciseRange.value) * this.beatInterval;
	if(time - prevT > 0.5 || prevT - time > 0.5){
		this.broadRange.value = time / this.songDuration * 100;
		this.preciseRange.value = 0;
	}
}

MenuPanel.prototype.activate = function(){
	if(this.selectionIdx != 0){
		this.selections[this.selectionIdx].toggleHighlight();
		this.selections[0].toggleHighlight();
		this.selectionIdx = 0;
	}
	document.addEventListener("keydown", this.eventListener);
	this.div.style.display = "block";
}

MenuPanel.prototype.deactivate = function(){
	document.removeEventListener("keydown", this.eventListener);
	this.div.style.display = "none";
}

MenuPanel.prototype.addSelection = function(onSelect, selectionText){
	this.selections.push( new MenuSelection(onSelect, selectionText, this.div) );
	if(this.selections.length == 1){
		this.selections[0].toggleHighlight();
	}
}

MenuPanel.prototype.domElement = function(){
	return this.div;
}

Score.prototype.domElement = function(){
	return this.scoreDiv;
}

Score.prototype.toggle = function(){
	if(this.scoreDiv.style.display != "none"){
		this.scoreDiv.style.display = "none";
	}
	else{
		this.scoreDiv.style.display = "block";
	}
}

Score.prototype.update = function(newScore){
	if(newScore != this.score){
		this.score = newScore;
		this.scoreInner.innerHTML = newScore;
	}
}

Menu.prototype.domElement = function(){
	return this.menuDiv;
}

Menu.prototype.toggle = function(){
	if(this.menuDiv.style.display != "none"){
		this.menuDiv.style.display = "none";
		if(this.currentDisplayed){
			this.currentDisplayed.deactivate();
			this.currentDisplayed = null;
		}
	}
	else{
		this.menuDiv.style.display = "block";
		if(this.currentDisplayed){
			this.currentDisplayed.deactivate();
		}
		this.currentDisplayed = this.mainMenu;
		this.mainMenu.activate();
	}
}

ControlsMenu.prototype.setSelectionName = function(selectionID, controlName){
	this.selections[selectionID].setText( this.selectionsNames[selectionID] + " - " + controlName);
}

MenuSelection.prototype.select = function(){
	if(typeof(this.onSelect) == "function"){
		this.onSelect();
	}
}

MenuSelection.prototype.toggleHighlight = function(){
	if(this.highlighted){
		this.div.style.outline = "";
		this.highlighted = false;
	}
	else{
		this.div.style.outline = "4px solid cyan";
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

function changeControlDialog(callback){
	let enterKeyDiv = document.createElement("div");
	let enterKeyText = document.createElement("p");
	
	enterKeyDiv.style.position = "absolute";
	enterKeyDiv.style.width = "20vw";
	enterKeyDiv.style.height = "12vw";
	enterKeyDiv.style.left = "40vw";
	enterKeyDiv.style.top = "20vh";
	enterKeyDiv.style.zIndex = "300";
	
	enterKeyText.innerHTML = "Enter Key";
	enterKeyText.fontSize = "3.5em";
	
	enterKeyDiv.appendChild(enterKeyText);
	document.body.appendChild(enterKeyDiv);
	
	document.addEventListener("keydown", evt => {
		evt.preventDefault(); // !!! doesn't even capture
		callback(evt.keyCode);
		enterKeyDiv.remove();
	},{once: true, capture: true});
}

// TODO less ugly, this and loadSongDialog
function saveSongDialog(eventPropagator){
	let div = document.createElement("div");
	let submitButton = document.createElement("button");
	let nameLabel = document.createElement("label");
	let nameField = document.createElement("input");
	let artistLabel = document.createElement("label");
	let artistField = document.createElement("input");
	let difficultyLabel = document.createElement("label");
	let difficultyField = document.createElement("input");
	let bpmLabel = document.createElement("label");
	let bpmField = document.createElement("input");
	let brickSpeedLabel = document.createElement("label"); // >:< modify brick speed in editor
	let brickSpeedField = document.createElement("input");
	let durationLabel = document.createElement("label");
	let durationField = document.createElement("input");
	
	div.style.position = "absolute";
	div.style.top = "10px";
	div.style.left = "40%";
	div.style.width = "20%";
	div.style.backgroundColor = "rgb(180, 180, 180)";
	div.style.zIndex = "300";
	
	nameLabel.innerHTML = "Song name";
	artistLabel.innerHTML = "Artist";
	difficultyLabel.innerHTML = "Difficulty";
	bpmLabel.innerHTML = "BPM";
	brickSpeedLabel.innerHTML = "Brick Speed"; // >:< modify brick speed in editor
	durationLabel.innerHTML = "Song Duration";
	
	nameField.type = "text";
	artistField.type = "text";
	difficultyField.type = "text";
	bpmField.type = "text";
	brickSpeedField.type = "text";
	durationField.type = "text";
	
	submitButton.innerHTML = "Save";
	
	div.appendChild(nameLabel);
	div.appendChild(nameField);
	div.appendChild(artistLabel);
	div.appendChild(artistField);
	div.appendChild(difficultyLabel);
	div.appendChild(difficultyField);
	div.appendChild(bpmLabel);
	div.appendChild(bpmField);
	div.appendChild(brickSpeedLabel);
	div.appendChild(brickSpeedField);
	div.appendChild(durationLabel);
	div.appendChild(durationField);
	div.appendChild(submitButton);
	
	document.body.appendChild(div);
	submitButton.addEventListener("click", () => {
		let songData = {
			name: nameField.value,
			artist: artistField.value,
			difficulty: difficultyField.value,
			bpm: bpmField.value,
			brickSpeed: brickSpeedField.value,
			duration: durationField.value
		}
		let fn = game => {
			game.saveSong(songData);
		}
		
		eventPropagator.runOnGame(fn); // !!! handle response?
		div.remove();
	}, {once: true});
}

function loadSongDialog(eventPropagator){
	let div = document.createElement("div");
	let songSelector = document.createElement("select");
	let submitButton = document.createElement("button");
	let options = [];
	
	div.style.position = "absolute";
	div.style.top = "10px";
	div.style.left = "40%";
	div.style.width = "20%";
	div.style.backgroundColor = "rgb(180, 180, 180)";
	div.style.zIndex = "300";
	
	submitButton.innerHTML = "Load song";
	
	let retrieveSongs = game => {
		return game.songs();
	}
	
	let songs = eventPropagator.runOnGame(retrieveSongs); // !!! handle bad response?
	let idIDX;
	let nameIDX;
	let artistIDX;
	let difficultyIDX;
	let durationIDX;
	let timeCreatedIDX;
	
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
		});
		songs[0]["values"].forEach( (song, idx) => {
			let newOption = document.createElement("option");
			let timeCreated = Date(song[timeCreatedIDX]).toString();
			newOption.value = song[idIDX];
			newOption.innerHTML = `Name: ${song[nameIDX]}, Artist: ${song[artistIDX]}, Difficulty: ${song[difficultyIDX]}, Duration: ${song[durationIDX]}, Time Created: ${timeCreated}`;
			
			options.push(newOption);
		});
	}
	
	options.forEach( option => {
		songSelector.appendChild(option);
	});
	div.appendChild(songSelector);
	div.appendChild(submitButton);
	document.body.appendChild(div);
	
	submitButton.addEventListener("click", () => {
		let fn = game => {
			game.loadSong(parseInt(songSelector.value));
		}
		
		eventPropagator.runOnGame(fn); // !!! handle response?
		div.remove();
	}, {once: true});
}

