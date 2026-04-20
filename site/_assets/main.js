// general Howler config
Howler.autoSuspend = false;
if ('audioSession' in navigator) {
	if ( (/iPad|iPhone/.test(navigator.userAgent)) || ((navigator.platform === 'MacIntel') && (navigator.maxTouchPoints > 1)) ) {
		// bypass mute switch
		navigator.audioSession.type = 'playback';
		window.onunload = () => navigator.audioSession.type = 'auto';
	}
}
const otherSprite = {
	alarm: [496, 4005],
	switchOn: [4724, 400],
	switchOff: [5334, 400],
	breach1: [6211, 15088],
	breach2: [21702, 2314],
	breach3: [25281, 7800],
	guard: [34620, 14917],
	maintenance1: [51583, 3605],
	maintenance2: [55771, 9174],
	typing1: [66341, 3304],
	typing2: [69909, 2794],
	clear1: [72975, 1221],
	clear2: [74442, 904],
	cough1: [75591, 894],
	cough2: [76760, 691],
	cough3: [77651, 1294],
	cough4: [79114, 748],
	sigh: [80036, 945],
	ai1: [81168, 1153],
	ai2: [82481, 1035],
	ai3: [83642, 900],
	ai4: [84726, 934],
	data1: [85784, 920],
	data2: [86880, 837],
	server1: [87864, 978],
	server2: [89014, 1014],
	server3: [90307, 927]
};


// Tesco Value jQuery
const $ = (s, d = document) => d.querySelector(s);
const $$ = (s, d = document) => d.querySelectorAll(s);


// tweakable settings
const config = {
	servers1Volume: 0.15,
	servers1Rate: 0.82,
	servers2Volume: 0.1,
	servers2Rate: 0.9,
	gpuRate: 0.65,
	cooling1Volume: 0.25,
	cooling2Volume: 0.25,
	generatorsStereo: 0.4,
	generators1Volume: 0.125,
	generators2Volume: 0.2,
	generators3Volume: 0.15,
	expansionVolume: 0.25,
	switchVolume: 0.33,
	sentienceIncrease: 0.0006,
	staffingSounds: ['guard', 'maintenance1', 'typing1', 'maintenance2', 'typing2', 'sigh', 'server3', 'ai1', 'ai3', 'data1', 'ai2', 'server1', 'ai4', 'data2', 'server2'],
	staffingSoundsCough: ['clear1', 'clear2', 'cough1', 'cough2', 'cough3', 'cough4'],
	staffingSoundsVolume: 0.25,
	staffingSoundsCoughVolume: 0.3,
	staffingSoundsBreachVolume: 1
};

const sfx = {}; // Howls
const playing = {}; // ids of sounds playing
let loops; // audio files to load
let loopsProgress = -1;

// for tracking volume
let analyser;
let dataArray;
let bufferLength;
let volume = 0;
let count = 32;
const canvas = $('#db canvas');
const context = canvas.getContext('2d');
context.beginPath();
context.rect(0, 0, canvas.width, 64);
context.fillStyle = '#ccccc4';
context.fill();
context.beginPath();
context.moveTo(0, 64);
context.lineTo(canvas.width - 1, 64);
context.setLineDash([3, 3]);
context.lineWidth = 2;
context.strokeStyle = '#ccccc4';
context.stroke();

// persistent indicators
let power = 0;
let powerLow = false;
let temperature = 0;
let sentience = 0;
let staffingSoundsCount = 150 + 100*Math.random();
let staffingSoundsLast = '';
let water = 25;
let breachSliders = [-1, 1, -1, 1];


// update sounds
const update = () => {
	let v, vNew, r, rNew;
	
	count ++;
	
	// servers1 maxes out at halfway along slider
	const serversLinear = (sentience === 1) ? 1 : parseFloat($('input[name="servers"]').value)/1000000;
	const servers = (sentience === 1) ? 1 : Math.sqrt(parseFloat($('input[name="servers"]').value))/1000;
	v = sfx.servers1.volume(playing.servers1);
	vNew = Math.min(config.servers1Volume, config.servers1Volume*servers/0.7);
	sfx.servers1.volume(0.96*v + 0.04*vNew, playing.servers1);
	// servers2 starts coming in before halfway
	v = sfx.servers2.volume(playing.servers2);
	vNew = Math.min(config.servers2Volume, config.servers2Volume*Math.max(0, servers - 0.5)/0.5);
	sfx.servers2.volume(0.97*v + 0.03*vNew, playing.servers2);
	// more stereo separation for high settings
	sfx.servers1.stereo(-0.5*v/config.servers2Volume, playing.servers1);
	sfx.servers2.stereo(0.5*v/config.servers2Volume, playing.servers2);
	
	// gpu increases rate of servers
	const constraints = 1 - 0.1*Math.random()*powerLow - 0.1*Math.random()*($('#warningsTemperature').className === 'on');
	const gpu = (sentience === 1) ? 1.1 : Math.min(constraints, parseFloat($('input[name="gpu"]').value)/100 );
	r = sfx.servers1.rate(playing.servers1);
	rNew = (1 + gpu*config.gpuRate)*config.servers1Rate;
	if (constraints === 1) {
		sfx.servers1.rate(0.97*r + 0.03*rNew, playing.servers1);
	} else {
		sfx.servers1.rate(0.5*r + 0.5*rNew, playing.servers1);
	}
	r = sfx.servers2.rate(playing.servers2);
	rNew = (1 + gpu*config.gpuRate)*config.servers2Rate;
	if (constraints === 1) {
		sfx.servers2.rate(0.98*r + 0.02*rNew, playing.servers2);
	} else {
		sfx.servers2.rate(0.5*r + 0.5*rNew, playing.servers2);
	}
	const gpuDisplay = (sentience === 1) ? ' AI' : String(Math.min(199, 100 + parseInt($('input[name="gpu"]').value, 10)));
	$('#gpuDisplay .digit:nth-child(1)').setAttribute('data-num', gpuDisplay.charAt(1));
	$('#gpuDisplay .digit:nth-child(2)').setAttribute('data-num', gpuDisplay.charAt(2));
	
	// cooling1 maxes out at halfway along slider
	const cooling = (sentience === 1) ? 1.19 : parseFloat($('input[name="cooling"]').value)/100;
	v = sfx.cooling1.volume(playing.cooling1);
	vNew = Math.min(config.cooling1Volume, config.cooling1Volume*cooling/0.7);
	sfx.cooling1.volume(0.96*v + 0.04*vNew, playing.cooling1);
	// cooling2 starts coming in before halfway
	v = sfx.cooling2.volume(playing.cooling2);
	vNew = Math.min(config.cooling2Volume, config.cooling2Volume*Math.max(0, cooling - 0.5)/0.5);
	sfx.cooling2.volume(0.97*v + 0.03*vNew, playing.cooling2);
	// slightly higher pitch
	sfx.cooling1.rate(0.95 + 0.1*cooling, playing.cooling1);
	sfx.cooling2.rate(0.95 + 0.1*cooling, playing.cooling2);
	// more stereo separation for high settings
	sfx.cooling1.stereo(0.5*v/config.cooling2Volume, playing.cooling1);
	sfx.cooling2.stereo(-0.5*v/config.cooling2Volume, playing.cooling2);
	const coolingDisplay = (sentience === 1) ? ' AI' : String(Math.min(199, 100 + parseInt($('input[name="cooling"]').value, 10)));
	$('#coolingDisplay .digit:nth-child(1)').setAttribute('data-num', coolingDisplay.charAt(1));
	$('#coolingDisplay .digit:nth-child(2)').setAttribute('data-num', coolingDisplay.charAt(2));
	
	// water supply
	water = Math.min(25, Math.max(0, water + 0.9 - cooling));
	
	// generators spin up/down as needed
	const generators = (sentience === 1) ? 3.3 : ($('input[name="generators1"]').checked ? 1 : 0) + ($('input[name="generators2"]').checked ? 1 : 0) + ($('input[name="generators3"]').checked ? 1 : 0);
	for (let i = 1; i < 4; i ++) {
		const g = `generators${i}`;
		v = sfx[g].volume(playing[g]);
		r = sfx[g].rate(playing[g]);
		if (generators >= i) {
			sfx[g].volume(Math.min(config[g + 'Volume'], v + config[g + 'Volume']/10), playing[g]);
			sfx[g].rate(Math.min(1, r + 0.5/10), playing[g]);
		} else {
			sfx[g].volume(Math.max(0, v - config[g + 'Volume']/20), playing[g]);
			sfx[g].rate(Math.max(0.5, r - 0.5/20), playing[g]);
		}
	}
	
	// staffing
	const staffing = (sentience === 1) ? 0 : parseFloat($('input[name="staffing"]').value)/100;

	// fade in/out construction noise
	const expansion = (sentience === 1) ? false : $('input[name="expansion"]').checked;
	v = sfx.expansion.volume(playing.expansion);
	if (expansion) {
		sfx.expansion.volume(Math.min(config.expansionVolume, v + config.expansionVolume/20), playing.expansion);
	} else {
		sfx.expansion.volume(Math.max(0, v - config.expansionVolume/10), playing.expansion);
	}
	
	// power
	const powerTarget = Math.min(1, Math.max(0, (serversLinear*(0.1 + 0.9*gpu) + 0.5*cooling + 0.1*expansion + 0.1*staffing)/(1 + 0.315*generators) ));
	power = 0.97*power + 0.03*powerTarget;
	$('#power div').style.transform = `rotate(${-46 + 85*power}deg)`;
	
	// temperature
	const temperatureTarget = Math.min(1, Math.max(0, 2.1*serversLinear*(0.1 + 0.9*gpu) - 1.225*cooling ));
	temperature += Math.min(0.005, Math.max(-0.0025, (temperatureTarget - temperature)/20));
	$('#temperature div').style.transform = `rotate(${-46 + 85*temperature}deg)`;
	
	// sentience
	sentience = Math.min(1, sentience + config.sentienceIncrease*serversLinear*gpu);
	$('#sentience div').style.left = `${3 + 96*sentience}%`;
	
	// low voltage
	if (power > 0.87) {
		powerLow = true;
		$('#dimmed').className = 'on';
	}
	if (power < 0.855) {
		powerLow = false;
		$('main').className = '';
		$('#dimmed').className = '';
	}
	if (powerLow) {
		$('main').className = `flicker${Math.floor(3*Math.random())}`;
	}
	// heat warning
	if (temperature > 0.87) {
		if ($('#warningsTemperature').className !== 'on') {
			$('#warningsTemperature').className = 'on';
			playOther('alarm', 0.33);
		}
	}
	if (temperature < 0.845) {
		$('#warningsTemperature').className = '';
	}
	// low water
	if (water < 5) {
		$('#warningsCooling').className = 'on';
	}
	if (water > 10) {
		$('#warningsCooling').className = '';
	}
	// containment breach
	if (sentience === 1) {
		$('#dimmed').className = '';
		if ($('#warningsSentience').className !== 'on') {
			$('#breach').className = 'on';
			$('#warningsSentience').className = 'on';
			staffingSoundsCount = count;
		}
		
		let serversValue = Number($('input[name="servers"]').value);
		serversValue = Math.min(1000000, Math.max(10000, serversValue + 1723*breachSliders[0]));
		if ( (serversValue === 10000) || (serversValue === 1000000) ) {
			breachSliders[0] = -breachSliders[0];
		}
		$('input[name="servers"]').value = serversValue;
		
		let gpuValue = Number($('input[name="gpu"]').value);
		gpuValue = Math.min(100, Math.max(0, gpuValue + 0.23*breachSliders[1]));
		if ( (gpuValue === 0) || (gpuValue === 100) ) {
			breachSliders[1] = -breachSliders[1];
		}
		$('input[name="gpu"]').value = gpuValue;
		
		let staffingValue = Number($('input[name="staffing"]').value);
		staffingValue = Math.min(100, Math.max(0, staffingValue + 0.53*breachSliders[2]));
		if ( (staffingValue === 0) || (staffingValue === 100) ) {
			breachSliders[2] = -breachSliders[2];
		}
		$('input[name="staffing"]').value = staffingValue;
		
		let coolingValue = Number($('input[name="cooling"]').value);
		coolingValue = Math.min(100, Math.max(0, coolingValue + 0.31*breachSliders[3]));
		if ( (coolingValue === 0) || (coolingValue === 100) ) {
			breachSliders[3] = -breachSliders[3];
		}
		$('input[name="cooling"]').value = coolingValue;
	}
	
	// show volume
	analyser.getByteTimeDomainData(dataArray);
	let sum = 0;
	for (let i = 0; i < bufferLength; i++) {
		const v = (dataArray[i] - 128) / 128;
		sum += v * v;
	}
	const rms = (sentience === 1) ? (1 + Math.sin(count/50))/16 : Math.sqrt(sum / bufferLength);
	const volumeLast = volume;
	volume = 0.98*volume + 0.02*rms;
	// scroll down 2px
	context.drawImage(canvas, 0, 0, canvas.width, canvas.height - 2, 0, 2, canvas.width, canvas.height - 2);
	context.beginPath();
	context.rect(0, 0, canvas.width, 2);
	context.fillStyle = '#ccccc4';
	context.fill();
	// occasional line
	if (count % 50 === 0) {
		context.beginPath();
		context.moveTo(0, 0);
		context.lineTo(canvas.width - 1, 0);
		context.setLineDash([]);
		context.lineWidth = 1;
		context.lineCap = 'round';
		context.strokeStyle = 'rgb(0 0 0 / 0.25)';
		context.stroke();
	}
	// draw line
	context.beginPath();
	context.moveTo(Math.min(canvas.width - 11, Math.max(10, canvas.width*8*volumeLast)), 2);
	context.lineTo(Math.min(canvas.width - 11, Math.max(10, canvas.width*8*volume)), 0);
	context.setLineDash([]);
	context.lineWidth = 3;
	context.lineCap = 'round';
	context.strokeStyle = `rgb(0 80 0 / ${0.2 + 0.3*Math.random()})`;
	context.stroke();
	
	// staff sounds
	if (count < staffingSoundsCount) {
		return;
	}
	let s;
	if (sentience === 1) {
		switch (staffingSoundsLast) {
			case 'breach1': s = 'breach2'; break;
			case 'breach2': s = 'breach3'; break;
			default: s = 'breach1'; break;
		}
		playOther(s, config.staffingSoundsBreachVolume);
		staffingSoundsLast = s;
		staffingSoundsCount = count + otherSprite[s][1]/100 + 100*(0.5 + 0.5*Math.random());
		return;
	}
	if (sentience > 0.97) {
		return;
	}
	const pollution = 0.5 + 1*($('#warningsTemperature').className === 'on') + 1*expansion + 0.5*generators;
	if (10*Math.random() < pollution) {
		s = config.staffingSoundsCough[Math.floor(6*Math.random())];
		if (s === staffingSoundsLast) {
			return;
		}
		playOther(s, config.staffingSoundsCoughVolume);
	} else {
		s = config.staffingSounds[Math.floor((5 + 10*staffing)*Math.random())];
		if (s === staffingSoundsLast) {
			return;
		}
		playOther(s, config.staffingSoundsVolume);
	}
	staffingSoundsLast = s;
	staffingSoundsCount = count + otherSprite[s][1]/100 + 200*(1.05 - staffing)*(0.5 + 0.5*Math.random());
};


// let's get this party started
$('header button').addEventListener('click', () => {
	$('header').className = 'off';

	playing.servers1 = sfx.servers1.play();
	sfx.servers1.rate(config.servers1Rate, playing.servers1);
	playing.servers2 = sfx.servers2.play();
	sfx.servers2.rate(config.servers2Rate, playing.servers2);
	
	playing.cooling1 = sfx.cooling1.play();
	playing.cooling2 = sfx.cooling2.play();
	
	playing.generators1 = sfx.generators1.play();
	sfx.generators1.rate(0.5, playing.generators1);
	sfx.generators1.stereo(config.generatorsStereo, playing.generators1);
	playing.generators2 = sfx.generators2.play();
	sfx.generators2.rate(0.5, playing.generators2);
	sfx.generators2.stereo(config.generatorsStereo, playing.generators2);
	playing.generators3 = sfx.generators3.play();
	sfx.generators3.rate(0.5, playing.generators3);
	sfx.generators3.stereo(config.generatorsStereo, playing.generators3);
	
	playing.expansion = sfx.expansion.play();
	
	$$('input').forEach(el => el.disabled = false);
	
	analyser = Howler.ctx.createAnalyser();
	analyser.fftSize = 256;
	Howler.masterGain.connect(analyser);
	bufferLength = analyser.fftSize;
	dataArray = new Uint8Array(bufferLength);
	
	update();
	setInterval(update, 100);
});


// play a non-looped sound
const playOther = (name, volume) => {
	const s = sfx.other.play(name);
	sfx.other.volume(volume, s);
};

// switch sounds
$$('input[type="checkbox"]').forEach((el) => {
	el.addEventListener('input', function() {
		playOther(this.checked ? 'switchOn' : 'switchOff', config.switchVolume);
	});
});


// audio loading
const loadLoop = () => {
	loopsProgress ++;
	if (loopsProgress >= loops.length) {
		loadSfx();
		return;
	}
	let l = loops[loopsProgress].split(':');
	sfx[l[0]] = new Howl({
		src: [l[1]],
		loop: true,
		volume: 0,
		onload: loadLoop,
		onloaderror: () => alert('Loading error')
	});
};
const loadSfx = () => {
	sfx.other = new Howl({
		src: [$('main').dataset.other],
		sprite: otherSprite,
		onload: () => $('header button').disabled = false,
		onloaderror: () => alert('Loading error')
	});
};
window.addEventListener('load', () => {
	loops = $('main').dataset.loops.split(',');
	loadLoop();
});
