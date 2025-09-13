const audio = document.getElementById("audio");
const seek = document.getElementById("seek");
const current = document.getElementById("current");
const total = document.getElementById("total");
const title = document.getElementById("title");
const thumb = document.getElementById("thumb");

// Audio controls
function togglePlay() {
  if (audio.paused) {
    audio.play();
  } else {
    audio.pause();
  }
}

function stopAudio() {
  audio.pause();
  audio.currentTime = 0;
}

function rewind() {
  audio.currentTime = Math.max(0, audio.currentTime - 10);
}

function forward() {
  audio.currentTime = Math.min(audio.duration, audio.currentTime + 10);
}

function endPlayer() {
  audio.pause();
  alert("Music player ended!");
}

function toggleFav() {
  const favBtn = document.getElementById("favBtn");
  favBtn.textContent = favBtn.textContent === "🤍" ? "❤️" : "🤍";
}

// Update progress
audio.ontimeupdate = () => {
  if (!isNaN(audio.duration)) {
    seek.value = (audio.currentTime / audio.duration) * 100 || 0;
    current.textContent = formatTime(audio.currentTime);
    total.textContent = formatTime(audio.duration);
  }
};

// Seek control
seek.oninput = () => {
  audio.currentTime = (seek.value / 100) * audio.duration;
};

// Format time helper
function formatTime(seconds) {
  if (isNaN(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
}
