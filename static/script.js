const audio = document.getElementById('audio');
const playBtn = document.getElementById('playBtn');
const seek = document.getElementById('seek');
const cur = document.getElementById('current');
const total = document.getElementById('total');
const vol = document.getElementById('volume');

function togglePlay() {
  if (audio.paused) {
    audio.play().then(() => {
      playBtn.textContent = '⏸';
    }).catch(() => {
      playBtn.textContent = '💿';
    });
  } else {
    audio.pause();
    playBtn.textContent = '⏵';
  }
}

function setVolume(v) {
  audio.volume = parseFloat(v);
}

audio.addEventListener('timeupdate', () => {
  if (!audio.duration) return;
  seek.value = (audio.currentTime / audio.duration) * 100;
  cur.textContent = format(audio.currentTime);
  total.textContent = format(audio.duration);
});

seek.addEventListener('input', () => {
  if (!audio.duration) return;
  audio.currentTime = (seek.value / 100) * audio.duration;
});

function format(s) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec < 10 ? "0" : ""}${sec}`;
}
