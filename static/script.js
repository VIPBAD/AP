const urlParams = new URLSearchParams(window.location.search);
const audioSrc = decodeURIComponent(urlParams.get('audio') || '');
const thumb = decodeURIComponent(urlParams.get('thumb') || '');
const title = decodeURIComponent(urlParams.get('title') || 'Unknown Title');

const audio = document.getElementById('audio');
const seek = document.getElementById('seek');
const currentTime = document.getElementById('current');
const totalTime = document.getElementById('total');
const favBtn = document.getElementById('favBtn');

let stopped = false;

document.getElementById('thumb').src = thumb || 'default-thumbnail.jpg';
document.getElementById('title').innerText = title;
document.getElementById('artist').innerText = 'Now Playing...';

audio.src = audioSrc || '';
audio.preload = 'metadata';
audio.controls = false; // Removed default controls to use custom ones
audio.loop = false;

audio.addEventListener('loadedmetadata', () => {
  totalTime.innerText = formatTime(audio.duration);
  if (audio.duration && !isNaN(audio.duration)) {
    seek.max = audio.duration;
  }
  tryAutoPlay();
});

audio.addEventListener('timeupdate', () => {
  if (!stopped && audio.duration) {
    seek.value = audio.currentTime;
    currentTime.innerText = formatTime(audio.currentTime);
  }
});

seek.addEventListener('input', () => {
  audio.currentTime = seek.value;
});

function tryAutoPlay() {
  if (!stopped && audio.src) {
    audio.play().catch(err => {
      console.warn("Autoplay blocked:", err);
      alert("Please click play to start the audio.");
    });
  }
}

function togglePlay() {
  if (stopped) {
    stopped = false;
    audio.currentTime = 0;
  }
  if (audio.paused) {
    audio.play().catch(err => console.warn("Play error:", err));
  } else {
    audio.pause();
  }
}

function stopAudio() {
  audio.pause();
  audio.currentTime = 0;
  stopped = true;
  currentTime.innerText = '0:00';
  seek.value = 0;
}

function endPlayer() {
  stopAudio();
  alert("🔕 Playback ended. Play a new song from Telegram.");
}

function rewind() {
  if (!stopped && audio.currentTime > 10) {
    audio.currentTime -= 10;
  } else {
    audio.currentTime = 0;
  }
}

function forward() {
  if (!stopped && audio.currentTime < audio.duration - 10) {
    audio.currentTime += 10;
  } else {
    audio.currentTime = audio.duration;
  }
}

function toggleFav() {
  favBtn.textContent = favBtn.textContent === '❤️' ? '🤍' : '❤️';
}

function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? '0' + s : s}`;
}
