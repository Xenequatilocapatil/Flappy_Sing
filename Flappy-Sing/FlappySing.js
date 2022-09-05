"use strict";
//import { autoCorrelate } from "./AutoCorrelate";

let audioContext = null; //will be created on page load
//Filter section: 9s - 1k bandpass
let filterNode1 = null; //created on page load
let filterNode2 = null; //created on page load
let analyser = null; //for pitch detection
let mediaStreamSource = null; //mic input node
let noteElem = null;
let freqElem = null;
let buflen = 2048;
let buf = new Float32Array( buflen );
let noteStrings = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
let noteString2 = ["G", "G#", "A", "A#", "B", "C", "C#", "D", "D#", "E", "F", "F#"];
let charElem = null;											//MIDI
let ObTElem = null;			// G2:0, G#2:1, A2:2, A#2:3, B2:4, C3:5, C#3:6, D3:7, D#3:8, E3:9, F3:10, F#3:11, G3: 12.
let ObBElem = null;
let ObT2Elem = null;
let ObB2Elem = null;
let scoreElem = null;
let scoreElem_2 = null;
let targetNoteElem = null;
let targetNote2Elem = null;
let score = 0;
let insideObstacle = false;
let series = 0;
let temp_score = 0;
let oldBuff = [];
let allowMovement = 0
let oldNote = 14;
let gameover = null;
let home = null;
let retry = null;
let plant = null;
let cicada1 = null;
let cicada2 = null;
let cicada3 = null;
let carnivorous = null;
let flappy_sing_title = null;
let song_btn = null;
let random_btn = null;
let option_btn = null;
let firstNote = null;
let guidedStart = true;
let max_gain = 0.3;
let checkbox_disable_collision = null;
let checkbox_guided_start = null;


//Pitch guiding
let pitchGuiding = false; //activation flag
let oscStorage = null; //global oscillator node variable
let gainStorage = null; //global gain node variable
let pitch1 = null; 

//PARAMETRI
const maxFreq = 622.25;//D#5
const maxPitch = Math.log10(maxFreq);//D#5
let charFallVelocity = 4;
let charToTargetVelocity = 0.3;
let ObVel = 4; //Obstacle velocity in random mode
let canvasHeight = 572;
let charHeight = 110;
let charWidth = 110;
let PxSemitone = 16; //pixxel a semitono
let errorMargin = 20; //pixxel che separano il personaggio dagli ostacoli supponendo una perfetta intonazione
let lowerNoteLimit = 5; //G2 = 0; default to B2 = 4
let noteExtension = 22; //default to B2+24 = B4; Max possible note is G5
let maxInterval = 12;
let collisionDetection = true; //Disables collision flag
let intervalsVector = [];

//Songs library  // il primo elemento rappresenta la ObVel
let fraMartino = [2, 5, 7, 9, 5, 5, 7, 9, 5, 9, 10, 12, "*", 9, 10, 12, "*", 12, 14, 12, 10, 9, 5, 12, 14, 12, 10, 9, 5, 7, 12, 5, "*", 7, 12, 5, "*"]; //"*" => pausa
let perElisa = [1.5, 21, 20, 21, 20, 21, 16, 19, 17, 14, "*", 5, 9, 14, 16, "*", 9, 13, 16, 17, "*", 9];
let halo = [2, 9, 11, 12, 11, 14, 12, 11, 9, "*", 16, 17, 19, "*", 17, 14, 17, 16, "*", "*", 4, 7, 9, 12, 14, 11, "*", 9, 12, 11, 9, 11, 7, "*", 9, "*"]

//Game mode
let choosenSong = fraMartino; 
let mode = false; // if true => random mode, if false => songs
let songTitle = null; // will be the text to print in the game over menù
let difficulty = null; // will be the text to print in the game over menù


//Elements gets
noteElem = document.getElementById( "note" );
freqElem = document.getElementById( "freq" );
targetNoteElem = document.getElementById( "targetNote" );
targetNote2Elem = document.getElementById( "targetNote2" );
charElem = document.getElementById( "character" );
ObTElem = document.getElementById("obstacleT");
ObBElem = document.getElementById("obstacleB");
ObT2Elem = document.getElementById("obstacleT2");
ObB2Elem = document.getElementById("obstacleB2");
scoreElem = document.getElementById("score");
scoreElem_2 = document.getElementById("score_2");
gameover = document.getElementById("gameover");
home = document.getElementById("home");
retry = document.getElementById("retry");
plant = document.getElementById("plant");
cicada1 = document.getElementById("cicada1");
cicada2 = document.getElementById("cicada2");
cicada3 = document.getElementById("cicada3");
carnivorous = document.getElementById("carnivorous");
flappy_sing_title = document.getElementById("flappy_sing_title");
song_btn = document.getElementById("song");
random_btn = document.getElementById("random");
option_btn = document.getElementById("option");
checkbox_disable_collision = document.getElementById('disable_collision');
checkbox_guided_start = document.getElementById('guided_start');

//Autocorrelation algorithm
function autoCorrelate(buf, sampleRate) {
	// Implements the ACF2+ algorithm
	let SIZE = buf.length;
	let rms = 0;

	for (let i = 0; i < SIZE; i++) {
		const val = buf[i];
		rms += val * val;
	}
	rms = Math.sqrt(rms / SIZE);
	if (rms < 0.01) // not enough signal
		return -1;

	var r1 = 0, r2 = SIZE - 1, thres = 0.2;
	for (var i = 0; i < SIZE / 2; i++)
		if (Math.abs(buf[i]) < thres) { r1 = i; break; }
	for (var i = 1; i < SIZE / 2; i++)
		if (Math.abs(buf[SIZE - i]) < thres) { r2 = SIZE - i; break; }

	buf = buf.slice(r1, r2);
	SIZE = buf.length;

	let c = new Array(SIZE).fill(0);
	for (var i = 0; i < SIZE; i++)
		for (let j = 0; j < SIZE - i; j++)
			c[i] = c[i] + buf[j] * buf[j + i];

	let d = 0; while (c[d] > c[d + 1])
		d++;
	let maxval = -1, maxpos = -1;
	for (let i = d; i < SIZE; i++) {
		if (c[i] > maxval) {
			maxval = c[i];
			maxpos = i;
		}
	}
	let T0 = maxpos;

	let x1 = c[T0 - 1], x2 = c[T0], x3 = c[T0 + 1];
	let a = (x1 + x3 - 2 * x2) / 2;
	let b = (x3 - x1) / 2;
	if (a)
		T0 = T0 - b / (2 * a);

	return sampleRate / T0;
}


function gameOverReset(refreshIntervalID,intervalOb1,intervalOb2,timeOutOb2){

	oscStop();
	//Intervals stopping
	clearTimeout(timeOutOb2); //Clear the timeout for the generation of obstacle 2 (if still running)
	clearInterval(refreshIntervalID); //Stop the refreshing
	clearInterval(intervalOb1); //Stop Ob1 generation
	clearInterval(intervalOb2); //Stop Ob2 generation

	//Obstacle style manual reset
	ObTElem.style.left = 950 + "px";
	ObBElem.style.left = 950 + "px";
	ObT2Elem.style.left = 950 + "px";
	ObB2Elem.style.left = 950 + "px";

	ObTElem.style.animation = 'none';
	ObBElem.style.animation = 'none'
	ObTElem.offsetHeight;
	ObBElem.offsetHeight;

	ObT2Elem.style.animation = 'none';
	ObB2Elem.style.animation = 'none'
	ObT2Elem.offsetHeight;
	ObB2Elem.offsetHeight;

	targetNoteElem.innerHTML = null;
	targetNote2Elem.innerHTML = null;
	
	//Variables reset
	insideObstacle = false;
	allowMovement = 0;
	series = 1;
	oldNote = 14;
	scoreElem.innerHTML = `${score}`;
	
	//Screen toggling
	toGameOverMenu();

}

//Obstacles and Holes generation
function GenerationHoleRandom(ObB, ObT, targetNote){
	ObT.style.animation = 'none';
	ObB.style.animation = 'none';
	ObT.offsetHeight;
	ObB.offsetHeight;
	ObT.style.animation = 'obstacle ' + ObVel + 's linear';
	ObB.style.animation = 'obstacle ' + ObVel + 's linear';

	let randomInterval = intervalsVector[Math.round(Math.random() * (intervalsVector.length-1))]
	let randomNote = oldNote + randomInterval ;
	if ((randomNote < lowerNoteLimit) || (randomNote > (lowerNoteLimit + noteExtension))){
		randomNote = oldNote - randomInterval;
	}

	ObB.style.height = randomNote * PxSemitone - errorMargin + "px";
	ObT.style.height = canvasHeight - randomNote * PxSemitone - charHeight - errorMargin + "px";
	ObB.style.width = Math.max((randomNote * PxSemitone - errorMargin)/1.7, 80) + "px";
	ObT.style.width = Math.max((canvasHeight - randomNote * PxSemitone - charHeight - errorMargin)/1.7, 80) + "px";
	ObB.style.marginLeft = - Math.max((randomNote * PxSemitone - errorMargin)/1.7, 80)/2 + "px";
	ObT.style.marginLeft = - Math.max((canvasHeight - randomNote * PxSemitone - charHeight - errorMargin)/1.7, 80)/2 + "px";

	if (randomNote > 23){
		ObT.style.backgroundImage = "url('images/SmallPlant_Top.png')";
		ObB.style.backgroundImage = "url('images/ObsB1.png')";
	}
	if(randomNote < 8){
		ObT.style.backgroundImage = "url('images/ObsT2.png')";
		ObB.style.backgroundImage = "url('images/SmallPlant_Bottom.png')";
	}
	if(randomNote < 23 && randomNote > 8){
		if(Math.random() > 0.5){
			ObB.style.backgroundImage = "url('images/ObsB1.png')";
			ObT.style.backgroundImage = "url('images/ObsT1.png')";
		}else{
			ObB.style.backgroundImage = "url('images/ObsB2.png')";
			ObT.style.backgroundImage = "url('images/ObsT2.png')";
		}
	}

	oldNote = randomNote;
	targetNote.innerHTML = noteString2[randomNote%12];
	targetNote.style.animation = 'none';
	targetNote.offsetHeight;
	targetNote.style.animation = 'obstacle ' + ObVel + 's linear';
	targetNote.style.bottom = randomNote * PxSemitone  + charHeight/2 - 30 +  "px";

	let randomPitch = 98*Math.pow(2,randomNote/12);

	return randomPitch;

}


function GenerationHoleSeries(ObB, ObT, song, targetNote){
	if(song[series] != "*"){//per pausa
		ObT.style.animation = 'none';
		ObB.style.animation = 'none';
		ObT.offsetHeight;
		ObB.offsetHeight;
		ObT.style.animation = 'obstacle ' + ObVel + 's linear';
		ObB.style.animation = 'obstacle ' + ObVel + 's linear';
		ObB.style.height = song[series]*PxSemitone - errorMargin + "px";
		ObT.style.height = canvasHeight - song[series]*PxSemitone - charHeight - errorMargin + "px";
		ObB.style.width = Math.max((song[series] * PxSemitone - errorMargin)/1.7, 80) + "px";
		ObT.style.width = Math.max((canvasHeight - song[series] * PxSemitone - charHeight - errorMargin)/1.7, 80) + "px";
		ObB.style.marginLeft = - Math.max((song[series] * PxSemitone - errorMargin)/1.7, 80)/2 + "px";
		ObT.style.marginLeft = - Math.max((canvasHeight - song[series] * PxSemitone - charHeight - errorMargin)/1.7, 80)/2 + "px";
	
		if (song[series] > 23){
			ObT.style.backgroundImage = "url('images/SmallPlant_Top.png')";
			ObB.style.backgroundImage = "url('images/ObsB1.png')";
		}
		if(song[series] < 8){
			ObT.style.backgroundImage = "url('images/ObsT2.png')";
			ObB.style.backgroundImage = "url('images/SmallPlant_Bottom.png')";
		}
		if(song[series] < 23 && song[series] > 8){
			if(Math.random() > 0.5){
				ObB.style.backgroundImage = "url('images/ObsB1.png')";
				ObT.style.backgroundImage = "url('images/ObsT1.png')";
			}else{
				ObB.style.backgroundImage = "url('images/ObsB2.png')";
				ObT.style.backgroundImage = "url('images/ObsT2.png')";
			}
		}
		targetNote.innerHTML = noteString2[song[series]%12];
		targetNote.style.animation = 'none';
		targetNote.offsetHeight;
		targetNote.style.animation = 'obstacle ' + ObVel + 's linear';
		targetNote.style.bottom = song[series] * PxSemitone + charHeight/2 - 30  + "px";
	}
	series++;
	if(series == song.length){
		series = 1;
	}

	let seriesPitch = null;

	if(song[series] != '*'){
		seriesPitch = 98*Math.pow(2,song[series]/12);
	}
		
	return seriesPitch;

}


function GenerationObstacle(song, mode){
	if (mode){
		pitch1 = GenerationHoleRandom(ObBElem, ObTElem, targetNoteElem);
		if(firstNote){
			oscPlay(pitch1);
			firstNote = false;
		}
	}else{
		ObVel = song[0];
		pitch1 = GenerationHoleSeries(ObBElem, ObTElem, song, targetNoteElem);
		if(firstNote){
			oscPlay(98*Math.pow(2,song[1]/12));
			firstNote = false;
		}
	}
}

function GenerationObstacle2(song, mode){
	if (mode){
		GenerationHoleRandom(ObB2Elem, ObT2Elem, targetNote2Elem);
		oscStop();
	}else{
		ObVel = song[0];
		GenerationHoleSeries(ObB2Elem, ObT2Elem, song, targetNote2Elem);
		oscStop();
	}
}


//Main function
function starting() {

	toStartingScreen();
	series = 1;
	charElem.style.bottom = 256 + "px"; //Reposition character

	GenerationObstacle(choosenSong, mode); //initial call

	setTimeout(function(){ //second obstacle call
		GenerationObstacle2(choosenSong, mode);
	}, ObVel/2 * 1000);

	var intervalOb1 = setInterval(function(){ 
		GenerationObstacle(choosenSong, mode)
	}, ObVel*1000);

	let intervalOb2 = null;
	var timeOutOb2 = setTimeout(function(){
		intervalOb2 = setInterval(function(){
			GenerationObstacle2(choosenSong, mode)
		}, ObVel*1000);
	}, ObVel/2 * 1000); 


	var refreshIntervalID = setInterval(function(){ 
		let ObstacleTLeft = parseInt(window.getComputedStyle(ObTElem).getPropertyValue("left"));
		let ObstacleBLeft = parseInt(window.getComputedStyle(ObBElem).getPropertyValue("left"));
		let ObstacleTBottom = parseInt(window.getComputedStyle(ObTElem).getPropertyValue("height"))-15;
		let ObstacleBTop = parseInt(window.getComputedStyle(ObBElem).getPropertyValue("height"))-15;
		let ObstacleT2Left = parseInt(window.getComputedStyle(ObT2Elem).getPropertyValue("left"));
		let ObstacleB2Left = parseInt(window.getComputedStyle(ObB2Elem).getPropertyValue("left"));
		let ObstacleT2Bottom = parseInt(window.getComputedStyle(ObT2Elem).getPropertyValue("height"))-15;
		let ObstacleB2Top = parseInt(window.getComputedStyle(ObB2Elem).getPropertyValue("height"))-15;
		let charY = parseInt(window.getComputedStyle(charElem).getPropertyValue("bottom"));

		if(((ObstacleTLeft < 100) && (ObstacleTLeft > 50) && (charY > ObstacleBTop - 15) && (charY < canvasHeight - charHeight - ObstacleTBottom + 15)) || ((ObstacleT2Left < 100) && (ObstacleT2Left > 50) && (charY > ObstacleB2Top - 15) && (charY < canvasHeight - charHeight - ObstacleT2Bottom + 15))){
			insideObstacle = true;
		}else{
			if(insideObstacle){//score incrementation
				score += 1;
				scoreElem.innerHTML = `${score}`;
				insideObstacle = false;
			}
		}
		if (ObstacleTLeft < 110){//gettone preso
			targetNoteElem.innerHTML = null;
		}else if(ObstacleT2Left < 110) {
			targetNote2Elem.innerHTML = null;
		}

		//COLLISION DETECTION:
		if(collisionDetection){
			if(((ObstacleTLeft && ObstacleBLeft) < 50 + charWidth) && ((ObstacleTLeft && ObstacleBLeft) > 100)) {
				if((charY < ObstacleBTop - 15) || (charY > canvasHeight - charHeight - ObstacleTBottom + 15)){
					gameOverReset(refreshIntervalID,intervalOb1,intervalOb2,timeOutOb2);
					temp_score = score;
					if (mode){
						scoreElem_2.innerHTML = "Score in " + difficulty + " : " + temp_score;
					}
					else {
						scoreElem_2.innerHTML = "Score in " + songTitle +" : " + temp_score;
					}					
					score = 0;
					scoreElem.innerHTML = `${score}`;
				}
			}
			if(((ObstacleT2Left && ObstacleB2Left) < 50 + charWidth) && ((ObstacleT2Left && ObstacleB2Left) > 100)) {
				if((charY < ObstacleB2Top - 15) || (charY > canvasHeight-charHeight - ObstacleT2Bottom + 15)){
					gameOverReset(refreshIntervalID,intervalOb1,intervalOb2,timeOutOb2);
					temp_score = score;
					if (mode){
						scoreElem_2.innerHTML = "Score in " + difficulty + " : " + temp_score;
					}
					else {
						scoreElem_2.innerHTML = "Score in " + songTitle +" : " + temp_score;
					}
					score = 0;
					scoreElem.innerHTML = `${score}`;
				}
			}
		}	
	},10);
}

//Input stream management
function noteFromPitch( frequency ) {
	let noteNum = 12 * (Math.log( frequency / 440 )/Math.log(2) );
	return Math.round( noteNum ) + 69;
}

function updatePitch() {//it also update the character y position
	analyser.getFloatTimeDomainData(buf);
	let pitch = autoCorrelate( buf, audioContext.sampleRate );
	
    if ((pitch == -1) || (pitch < 98)){ //Note too low or pitch not found
        noteElem.innerHTML = "--"
		freqElem.innerHTML = "--Hz";
		charElem.style.transition = "bottom " + charFallVelocity +  "s";
		charElem.style.bottom = 0;
    }else{
        let note =  noteFromPitch( pitch );
		freqElem.innerHTML = Math.round(pitch) + "Hz";
		let pitchCor = Math.max(Math.log10(98), Math.log10(pitch))
		let buff1 = Math.min(pitchCor, maxPitch)-Math.log10(98);
		let buff2 = maxPitch - Math.log10(98);
		let consistencySamples = 3;

		for (let i=0; i<consistencySamples; i++){
			if(Math.abs(oldBuff[consistencySamples-1-i] - buff1) < 0.02){
				allowMovement++;

			}else{
				allowMovement = 0;
			}
		}
		
		if (allowMovement > 2){
			charElem.style.transition = "bottom " + charToTargetVelocity + "s linear"; 
			charElem.style.bottom =  buff1/buff2 * (canvasHeight-charHeight) + 25 + "px";
			noteElem.innerHTML = noteStrings[note%12];
			allowMovement = 0;
			
		}
		if(oldBuff.length == consistencySamples){
			oldBuff.shift();
		}
		oldBuff.push(buff1);
    }
}



function oscPlay(pitch){
	const o = new OscillatorNode(audioContext);
	o.frequency.value = pitch;
	var gain = new GainNode(audioContext);
	gain.connect(audioContext.destination);
	o.connect(gain);
	const now = audioContext.currentTime;
	gain.gain.setValueAtTime(0,now);
	let attack = 0.5;

	if(pitch < 200){
		max_gain = 0.7;
		if(pitch < 150){
			max_gain = 1;
		}
	} else{
		if(pitch > 400)
			max_gain = 0.2;
	}

	gain.gain.linearRampToValueAtTime(max_gain,now + attack);
	o.start();
	oscStorage = o;
	gainStorage = gain;
}

function oscFreq(pitch){
	oscStorage.frequency.value = pitch;
}

function oscStop(){
	const now = audioContext.currentTime;
	let decay = 0.5;
	gainStorage.gain.setValueAtTime(max_gain, now);
	gainStorage.gain.linearRampToValueAtTime(0, now + decay);
	oscStorage.stop(now + decay);
}


function gotStream(stream) {

	//Creation
	audioContext = new AudioContext();
	filterNode1 = new BiquadFilterNode(audioContext);
	filterNode2 = new BiquadFilterNode(audioContext);
	
	//Filter settings
	filterNode1.type = 'highpass';
	filterNode2.type = 'lowpass';
	filterNode1.frequency.value = 90;
	filterNode2.frequency.value = 1000;

	//Mic input config
	mediaStreamSource = audioContext.createMediaStreamSource(stream);
	analyser = audioContext.createAnalyser();
	analyser.fftSize = buflen;

	//Connections
	mediaStreamSource.connect( filterNode1 );
	filterNode1.connect( filterNode2 );
	filterNode2.connect( analyser );

	setInterval(updatePitch, 50);
}

window.addEventListener("load", () => {
	navigator.mediaDevices.getUserMedia({audio: true}).then(gotStream);
});

window.addEventListener("DOMContentLoaded", () => {
	toMainMenu();
});

//Screen functions
function toggleScreen(id,toggle){
	let element = document.getElementById(id);
	let display = ( toggle ) ? 'block' : 'none' ;
	element.style.display = display;
}

function toStartingScreen(){
	toggleScreen('gameover',false);
	toggleScreen('game',true);
	toggleScreen('indicators', true);
	toggleScreen('options-screen',false);
	toggleScreen('mode-screen',false);
	toggleScreen('song-screen',false);
	toggleScreen('diff-screen',false);
	toggleScreen('starting-screen',false);

	if(!collisionDetection){
		toggleScreen('quit', true);
	}

	if(guidedStart){
		firstNote = true;
	}else{
		firstNote = false;
	}
}

function toMainMenu(){
	toggleScreen('gameover',false);
	toggleScreen('game',false);
	toggleScreen('indicators', false);
	toggleScreen('options-screen',false);
	toggleScreen('mode-screen',false);
	toggleScreen('song-screen',false);
	toggleScreen('diff-screen',false);
	toggleScreen('starting-screen',true);
	toggleScreen('quit', false);
	cicada1.style.animation = 'anim_cic1 2s linear';
	cicada2.style.animation = 'anim_cic2 2s linear';
	cicada3.style.animation = 'anim_cic3 2s linear';
	carnivorous.style.animation = 'anim_carnivorous 3s linear'
	flappy_sing_title.style.animation = 'fade_in 3s linear';
	song_btn.style.animation = 'fade_in 3s linear';
	random_btn.style.animation = 'fade_in 3s linear';
	option_btn.style.animation = 'fade_in 3s linear';
}

function toOptionsMenu(){
	toggleScreen('gameover',false);
	toggleScreen('game',false);
	toggleScreen('indicators', false);
	toggleScreen('options-screen',true);
	toggleScreen('mode-screen',false);
	toggleScreen('song-screen',false);
	toggleScreen('diff-screen',false);
	toggleScreen('starting-screen',false);
	toggleScreen('quit', false);
}

function toGameOverMenu(){
	toggleScreen('gameover',true);
	toggleScreen('game',true);
	toggleScreen('indicators', false);
	toggleScreen('options-screen',false);
	toggleScreen('mode-screen',false);
	toggleScreen('song-screen',false);
	toggleScreen('diff-screen',false);
	toggleScreen('starting-screen',false);
	toggleScreen('quit', false);
	gameover.style.animation = 'scrolling 1.5s linear';
	home.style.animation = 'scrollButtonHome 1.5s linear';
	retry.style.animation = 'scrollButtonRetry 1.5s linear';
	scoreElem_2.style.animation = 'scrollTitle 1.5s linear';
	plant.style.animation = 'animPlant 1.5s linear';
	if(guidedStart){
		firstNote = true;
	}else{
		firstNote = false;
	}
  }

function toModeMenu(){
	toggleScreen('gameover',false);
	toggleScreen('game',false);
	toggleScreen('indicators', false);
	toggleScreen('options-screen',false);
	toggleScreen('mode-screen',true);
	toggleScreen('song-screen',false);
	toggleScreen('diff-screen',false);
	toggleScreen('starting-screen',false);
	toggleScreen('quit', false);
}
function toDiffMenu(){
	toggleScreen('gameover',false);
	toggleScreen('game',false);
	toggleScreen('indicators', false);
	toggleScreen('options-screen',false);
	toggleScreen('mode-screen',false);
	toggleScreen('song-screen',false);
	toggleScreen('diff-screen',true);
	toggleScreen('starting-screen',false);
	toggleScreen('quit', false);
}

function toSongMenu(){
	toggleScreen('gameover',false);
	toggleScreen('game',false);
	toggleScreen('indicators', false);
	toggleScreen('options-screen',false);
	toggleScreen('mode-screen',false);
	toggleScreen('song-screen',true);
	toggleScreen('diff-screen',false);
	toggleScreen('starting-screen',false);
	toggleScreen('quit', false);
}


function selectDifficulty(diff){
	mode = true;
	switch(diff){
		case 1 : //EASY
			ObVel = 5.5;
			charToTargetVelocity = 0.5;
			errorMargin = 30;
			maxInterval = 7;
			intervalsVector = [0,1,2,3,4,5,7,12,-1,-2,-3,-4,-5,-7,-12];
			difficulty = "Easy mode";
			break;
		case 2: //NORMAL
			ObVel = 4;
			charToTargetVelocity = 0.4;
			errorMargin = 22;
			maxInterval = 12;
			intervalsVector = [0,1,2,3,4,5,7,9,11,12,-1,-2,-3,-4,-5,-7,-9,-11,-12];
			difficulty = "Normal mode";
			break;
		case 3: //HARD
			ObVel = 3;
			charToTargetVelocity = 0.2;
			errorMargin = 14;
			intervalsVector = [0,1,2,3,4,5,6,7,8,9,10,11,12,-1,-2,-3,-4,-5,-6,-7,-8,-9,-10,-11,-12];
			difficulty = "Hard mode";
			break;
		case 4: //SPEEDFREAK
			ObVel = 2;
			charToTargetVelocity = 0.1;
			errorMargin = 16;
			intervalsVector = [0,1,2,3,4,5,6,7,8,9,10,11,12,-1,-2,-3,-4,-5,-6,-7,-8,-9,-10,-11,-12];
			difficulty = "Speedfreak mode";
			break;
		case 5: //PERFECTPITCH
			ObVel = 4;
			charToTargetVelocity = 0.25;
			errorMargin = 4;
			intervalsVector = [0,1,2,3,4,5,6,7,8,9,10,11,12,-1,-2,-3,-4,-5,-6,-7,-8,-9,-10,-11,-12];
			difficulty = "Perfectpitch mode";
			break;
		default:
			ObVel = 4;
			charToTargetVelocity = 0.4;
			errorMargin = 30;
	}
	starting();
}

function selectSong(song_number){
	mode = false;
	switch (song_number){
		case 1 :
			choosenSong = fraMartino;
			songTitle = "Fra Martino";
			break;
		case 2 :
			choosenSong = perElisa;
			songTitle = "Per Elisa";
			break;
		case 3 :
			choosenSong = halo;
			songTitle = "Halo";
			break;
		default:
			choosenSong = fraMartino;
	}
	starting();
}

function charSpeedUpdate(value){
	charFallVelocity = value;
	charToTargetVelocity = charFallVelocity/14;
}

function obstacleSpeedUpdate(value){
	ObVel = value;
}
  
function updateDisableCollision(){
	if (checkbox_disable_collision.checked){
	  collisionDetection = false;
	}else{
	  collisionDetection = true;
	}
}
  
function updateGuidedStart(){
	if (checkbox_guided_start.checked){
	  guidedStart = true;
	}else{
	  guidedStart = false;
	}
}

