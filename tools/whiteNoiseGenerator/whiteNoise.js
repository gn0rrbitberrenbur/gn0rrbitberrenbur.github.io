// white noise vars
let audioContext;
let whiteNoise;
let gainNode;
let filterNode;
let isPlaying = false;

// countdown vars
let countdownInterval;
let isTimerRunning = false;

// event listeners
document.getElementById('startStopButton').addEventListener('click', () => {
    if (!isPlaying) {
        startWhiteNoise();
        document.getElementById('startStopButton').textContent = "Stop White Noise";
        isPlaying = true;
    } else {
        stopWhiteNoise();
        document.getElementById('startStopButton').textContent = "Start White Noise";
        isPlaying = false;
    }
});

function createWhiteNoise() {
    const bufferSize = 10 * 44100; // 10 sec buffer
    const noiseBuffer = new Float32Array(bufferSize);
    for (let i = 0; i < bufferSize; i++) {
        noiseBuffer[i] = Math.random() * 2 - 1;
    }

    const noise = audioContext.createBufferSource();
    const noiseBufferAudio = audioContext.createBuffer(1, bufferSize, 44100);
    noiseBufferAudio.copyToChannel(noiseBuffer, 0);
    noise.buffer = noiseBufferAudio;
    noise.loop = true;

    return noise;
}

function startWhiteNoise() {
    if (!isPlaying) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        audioContext.resume().then(() => {
            gainNode = audioContext.createGain();
            filterNode = audioContext.createBiquadFilter();
            filterNode.type = 'bandpass';

            const initialFrequency = document.getElementById('frequency').value;
            filterNode.frequency.setValueAtTime(initialFrequency, audioContext.currentTime);

            whiteNoise = createWhiteNoise();
            whiteNoise.connect(filterNode);
            filterNode.connect(gainNode);
            gainNode.connect(audioContext.destination);
            whiteNoise.start(0);
            isPlaying = true;
        }).catch(err => {
            console.error("AudioContext konnte nicht gestartet werden:", err);
        });
    }
}

function stopWhiteNoise() {
    if (whiteNoise) {
        whiteNoise.stop();
        isPlaying = false;
    }
}

// volume
document.getElementById('volume').addEventListener('input', (event) => {
    const volumeValue = event.target.value;
    if (gainNode) {
        gainNode.gain.setValueAtTime(volumeValue, audioContext.currentTime);
    }
});

document.getElementById('frequency').addEventListener('input', (event) => {
    const frequencyValue = event.target.value;
    if (filterNode) {
        filterNode.frequency.setValueAtTime(frequencyValue, audioContext.currentTime);
    }
    document.getElementById('frequencyValue').innerText = frequencyValue + ' Hz';
});

document.getElementById('startButton').addEventListener('click', () => {
    if (isTimerRunning) {
        resetCountdown();
    } else {
        startCountdown();
    }
});

// start countdown
function startCountdown() {
    let inputMinutes = parseInt(document.getElementById('timerInput').value);
    inputMinutes = Math.min(59, Math.max(1, inputMinutes));

    let totalSeconds = inputMinutes * 60;

    isTimerRunning = true;

    countdownInterval = setInterval(function() {
        let minutes = Math.floor(totalSeconds / 60);
        let seconds = totalSeconds % 60;

        document.getElementById('countdownDisplay').textContent = 
            String(minutes).padStart(2, '0') + ":" + String(seconds).padStart(2, '0');
        document.getElementById('title').textContent =
            String(minutes).padStart(2, '0') + ":" + String(seconds).padStart(2, '0');
        document.getElementById('startButton').textContent = "Reset";
        
        totalSeconds--;

        if (totalSeconds < 0) {
            clearInterval(countdownInterval);
            document.getElementById('countdownDisplay').textContent = "Countdown ran out!";
            document.getElementById('title').textContent = "Countdown ran out!";
            isTimerRunning = false;
            if (whiteNoise) {
                whiteNoise.stop();
                isPlaying = false;
            }
        }
    }, 1000);

    startWhiteNoise();
}

// reset countdown
function resetCountdown() {
    clearInterval(countdownInterval);
    let inputMinutes = parseInt(document.getElementById('timerInput').value);
    inputMinutes = Math.min(59, Math.max(1, inputMinutes));
    document.getElementById('countdownDisplay').textContent = String(inputMinutes).padStart(2, '0') + ":00";
    document.getElementById('title').textContent = String(inputMinutes).padStart(2, '0') + ":00";
    document.getElementById('startButton').textContent = "Start Countdown";

    if (whiteNoise) {
        whiteNoise.stop();
        isPlaying = false;
    }

    isTimerRunning = false;
}
