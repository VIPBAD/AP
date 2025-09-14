document.addEventListener('DOMContentLoaded', () => {
  const audio = document.getElementById('audio');
  const seek = document.getElementById('seek');
  const current = document.getElementById('current');
  const total = document.getElementById('total');
  const playBtn = document.getElementById('playBtn');
  const volSlider = document.getElementById('volume');
  const volPercent = document.getElementById('volPercent');
  const favBtn = document.getElementById('favBtn');

  // Get Telegram user info
  const user = window.Telegram?.WebApp?.initDataUnsafe?.user || { id: "guest", first_name: "Guest", photo_url: "https://via.placeholder.com/60" };
  const socket = io();
  socket.emit("join", { uid: user.id, name: user.first_name, photo: user.photo_url });

  if (audio) {
    audio.volume = volSlider ? parseFloat(volSlider.value) : 0.8;

    audio.ontimeupdate = () => {
      if (!isNaN(audio.duration)) {
        if (seek) seek.value = (audio.currentTime / audio.duration) * 100 || 0;
        if (current) current.textContent = formatTime(audio.currentTime);
        if (total) total.textContent = formatTime(audio.duration);
      }
      updatePlayButton();
    };

    if (seek) {
      seek.oninput = () => {
        if (!isNaN(audio.duration)) {
          audio.currentTime = (seek.value / 100) * audio.duration;
        }
      };
    }

    window.togglePlay = function () {
      if (audio.paused) audio.play().catch(() => {});
      else audio.pause();
      updatePlayButton();
    };

    window.rewind = () => audio.currentTime = Math.max(0, audio.currentTime - 10);
    window.forward = () => audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + 10);

    function updatePlayButton() {
      if (playBtn) playBtn.textContent = audio.paused ? "⏵" : "⏸";
    }

    function formatTime(seconds) {
      if (isNaN(seconds)) return "0:00";
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
    }

    // Auto save play
    audio.addEventListener('play', () => {
      const song = {
        title: document.getElementById('title')?.textContent || "Unknown Song",
        artist: document.getElementById('artist')?.textContent || "Unknown Artist",
        audio: audio.src,
        thumb: document.getElementById('player-thumb')?.src || ""
      };
      fetch("/play", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: user.id, song })
      });
    });

    // Save favorite
    if (favBtn) {
      favBtn.addEventListener('click', () => {
        const song = {
          title: document.getElementById('title')?.textContent || "Unknown Song",
          artist: document.getElementById('artist')?.textContent || "Unknown Artist",
          audio: audio.src,
          thumb: document.getElementById('player-thumb')?.src || ""
        };
        fetch("/favorite", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ uid: user.id, song })
        });
      });
    }

    // Save lastSong in localStorage
    audio.addEventListener('loadeddata', () => {
      const song = {
        src: audio.src,
        title: document.getElementById('title')?.textContent || "Unknown Song",
        artist: document.getElementById('artist')?.textContent || "Unknown Artist",
        thumb: document.getElementById('player-thumb')?.src || ""
      };
      localStorage.setItem("lastSong", JSON.stringify(song));
    });

    // Restore last song
    (() => {
      const urlParams = new URLSearchParams(window.location.search);
      if (!urlParams.get("audio")) {
        const saved = localStorage.getItem("lastSong");
        if (saved) {
          try {
            const song = JSON.parse(saved);
            document.getElementById('title').textContent = song.title;
            document.getElementById('artist').textContent = song.artist;
            document.getElementById('player-thumb').src = song.thumb;
            audio.src = song.src;
            audio.load();
          } catch {}
        }
      }
    })();
  }

  // Volume
  if (volSlider && audio) {
    volSlider.addEventListener('input', (e) => {
      const v = parseFloat(e.target.value);
      audio.volume = v;
      if (volPercent) volPercent.textContent = Math.round(v * 100) + "%";
    });
  }

  // Handle page unload
  window.addEventListener('beforeunload', () => {
    socket.emit("leave", { uid: user.id });
  });
});
