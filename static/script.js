const urlParams = new URLSearchParams(window.location.search);
const audioSrc = decodeURIComponent(urlParams.get('url') || '');
const thumb = decodeURIComponent(urlParams.get('thumb') || '');
const title = decodeURIComponent(urlParams.get('title') || 'Unknown Title');

const audio = document.getElementById('audio-player');
const seekBar = document.getElementById('seek-bar');
const currentTime = document.getElementById('current-time');
const totalTime = document.getElementById('total-time');
const playBtn = document.getElementById('play-btn');
const favBtn = document.getElementById('fav-btn');
const volumeControl = document.getElementById('volume');
let stopped = false;

document.getElementById('album-art').src = thumb;
document.getElementById('song-title').innerText = title;
document.getElementById('artist-name').innerText = 'Now Playing...';

audio.src = audioSrc;
audio.volume = 1;

audio.addEventListener('loadedmetadata', () => {
  totalTime.innerText = formatTime(audio.duration);
  seekBar.max = audio.duration;
  audio.play().catch(err => console.warn("Autoplay blocked:", err));
});

audio.addEventListener('timeupdate', () => {
  if (!stopped) {
    seekBar.value = audio.currentTime;
    currentTime.innerText = formatTime(audio.currentTime);
  }
});

seekBar.addEventListener('input', () => {
  audio.currentTime = seekBar.value;
});

volumeControl.addEventListener('input', () => {
  audio.volume = volumeControl.value;
});

function togglePlay() {
  if (stopped) return;
  if (audio.paused) {
    audio.play();
    playBtn.textContent = '⏸️';
  } else {
    audio.pause();
    playBtn.textContent = '▶️';
  }
}

function stopAudio() {
  audio.pause();
  audio.currentTime = 0;
  stopped = true;
  playBtn.textContent = '▶️';
}

function endPlayer() {
  stopAudio();
  alert("🔕 Playback ended. Play a new song from Telegram.");
}

function rewind() {
  if (!stopped) audio.currentTime = Math.max(0, audio.currentTime - 10);
}

function forward() {
  if (!stopped) audio.currentTime = Math.min(audio.duration, audio.currentTime + 10);
}

function toggleFav() {
  favBtn.textContent = favBtn.textContent === '❤️' ? '🤍' : '❤️';
}

function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? '0' + s : s}`;
}
