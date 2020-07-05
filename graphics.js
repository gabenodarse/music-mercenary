
import * as wasm from "./pkg/music_mercenary.js";

// !!!
// deleting shaders and program helpful?
// webgl vs. webgl2?

function SizedTexture(texture, width, height){
	this.texture = texture;
	this.width = width;
	this.height = height;
}

const vertexShader = `
    attribute vec2 a_position;
	attribute vec2 a_texCoord;
	
	varying vec2 v_texCoord;
     
    void main() {
		gl_Position = vec4(a_position, 0.0, 1.0);
		
		// update v_texCoord for fragment shader
		v_texCoord = a_texCoord;
    }
`;

const fragmentShader = `
	// fragment shaders don't have a default precision so we need to pick one
	precision mediump float;
	uniform sampler2D u_image;
	varying vec2 v_texCoord;

	void main() {
		gl_FragColor = texture2D(u_image, v_texCoord);
	}
`;

export function WebGLGraphics(images){
	// members
	this.canvas = document.createElement("canvas");;
	this.gl = this.canvas.getContext("webgl");;
	this.program;
	this.positionBuffer;
	this.textures = new Array(images.length);
	
	const canvas = this.canvas;
	const gl = this.gl;
	let gameDim = wasm.game_dimensions();
	canvas.width = gameDim.x;;
	canvas.height = gameDim.y;
	canvas.style.position = "absolute";
	document.body.appendChild(canvas);
	
	if(!gl){
		alert("Unable to initialize WebGL. Your browser or machine may not support it.");
		throw Error("Unable to initialize WebGL. Your browser or machine may not support it.");
	}
	gl.clearColor(0.0, 0.0, 0.0, 0.0);
	gl.clear(gl.COLOR_BUFFER_BIT);
	
	const program = initShaderProgram(gl, vertexShader, fragmentShader);
	const positionLoc = gl.getAttribLocation(program, 'a_position');
	const texLoc = gl.getAttribLocation(program, 'a_texCoord');
	
	gl.useProgram(program);
	gl.enableVertexAttribArray(positionLoc);
	gl.enableVertexAttribArray(texLoc);
	
	// set view port to convert clip space to pixels
	gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
	
	// create a buffer to put the points of two triangles which will comprise the rectangle to be rendered
	this.positionBuffer = gl.createBuffer();
	const positionBuffer = this.positionBuffer;
	
	// create a buffer to put texture coordinates
	var texcoordBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
		0.0,  0.0,
		1.0,  0.0,
		0.0,  1.0,
		0.0,  1.0,
		1.0,  0.0,
		1.0,  1.0,
	]), gl.STATIC_DRAW);
	
	// Tell the attribute how to get data out of positionBuffer (ARRAY_BUFFER)
	gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
	var size = 2;          // 2 components per iteration
	var type = gl.FLOAT;   // the data is 32bit floats
	var normalize = false; // don't normalize the data
	var stride = 0;        // 0 = move forward size * sizeof(type) each iteration to get the next position
	var offset = 0;        // start at the beginning of the buffer
	gl.vertexAttribPointer( positionLoc, size, type, normalize, stride, offset);
	
	// Tell the texcoord attribute how to get data out of texcoordBuffer (ARRAY_BUFFER)
	gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);
	var size = 2;          // 2 components per iteration
	var type = gl.FLOAT;   // the data is 32bit floats
	var normalize = false; // don't normalize the data
	var stride = 0;        // 0 = move forward size * sizeof(type) each iteration to get the next position
	var offset = 0;        // start at the beginning of the buffer
	gl.vertexAttribPointer( texLoc, size, type, normalize, stride, offset);
	
	// create textures for each image
	// >:< make transparent pixels for textures work
	images.forEach( (img,idx) => {
		const texture = gl.createTexture();
		const dimensions = wasm.graphic_size(idx);
		gl.bindTexture(gl.TEXTURE_2D, texture);

		// Set the parameters so we can render any size image (not only powers of 2)
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

		// Upload the image into the texture.
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
		
		this.textures[idx] = new SizedTexture(texture, dimensions.x, dimensions.y);
	});
}

WebGLGraphics.prototype.resize = function(xFactor, yFactor){
	let gameDim = wasm.game_dimensions();
	this.canvas.width = gameDim.x * xFactor;
	this.canvas.height = gameDim.y * yFactor;
	this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
}

WebGLGraphics.prototype.renderTextures = function(instructions, xFactor, yFactor){
	const gl = this.gl;
	const positionBuffer = this.positionBuffer;
	const textures = this.textures;
	const pointCount = 6; // Always drawing 2 triangles to make a rectangle (6 points)
	
	gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
	let positions = new Float32Array(12);
	
	instructions.forEach( instruction => {
		let graphicIdx = instruction.g;
		
		let sizedTexture = textures[graphicIdx];
		
		gl.bindTexture(gl.TEXTURE_2D, sizedTexture.texture);
		let startX = instruction.x * xFactor / 1100 * 2.0 - 1.0;
		let startY = -(instruction.y * yFactor / 600 * 2.0 - 1.0);
		let endX = startX + sizedTexture.width * xFactor / 1100 * 2.0;
		let endY = startY - sizedTexture.height * yFactor / 600 * 2.0;
		positions[0] = startX; positions[1] = startY;
		positions[2] = endX;   positions[3] = startY;
		positions[4] = startX; positions[5] = endY;
		positions[6] = startX; positions[7] = endY;
		positions[8] = endX;   positions[9] = startY;
		positions[10] = endX;  positions[11] = endY;
		gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
		
		gl.drawArrays(gl.TRIANGLES, 0, pointCount);
	});
}

function initShaderProgram(gl, vsSource, fsSource) {
	const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
	const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

	const shaderProgram = gl.createProgram();
	gl.attachShader(shaderProgram, vertexShader);
	gl.attachShader(shaderProgram, fragmentShader);
	gl.linkProgram(shaderProgram);

	if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
		throw new Error(gl.getProgramParameter(shaderProgram));
	};

	return shaderProgram;
}

function loadShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    alert('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }

  return shader;
}