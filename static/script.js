document.addEventListener('DOMContentLoaded', () => {
  const audio = document.getElementById('audio');
  const seek = document.getElementById('seek');
  const current = document.getElementById('current');
  const total = document.getElementById('total');
  const playBtn = document.getElementById('playBtn');
  const volSlider = document.getElementById('volume');
  const volPercent = document.getElementById('volPercent');
  const favBtn = document.getElementById('favBtn');

  // ---------- PLAYER CONTROLS ----------
  if (audio) {
    // Initialize volume
    const initialVolume = volSlider ? parseFloat(volSlider.value) : 0.8;
    audio.volume = initialVolume;
    if (volPercent) volPercent.textContent = Math.round(initialVolume * 100) + "%";

    // Time update
    audio.ontimeupdate = () => {
      if (!isNaN(audio.duration)) {
        if (seek) seek.value = (audio.currentTime / audio.duration) * 100 || 0;
        if (current) current.textContent = formatTime(audio.currentTime);
        if (total) total.textContent = formatTime(audio.duration);
      }
      updatePlayButton();
    };

    // Seek
    if (seek) {
      seek.oninput = () => {
        if (!isNaN(audio.duration)) {
          audio.currentTime = (seek.value / 100) * audio.duration;
        }
      };
    }

    // Play / Pause toggle
    window.togglePlay = function() {
      if (audio.paused) {
        audio.play().catch(()=>{});
      } else {
        audio.pause();
      }
      updatePlayButton();
    };

    // Rewind / Forward
    window.rewind = function() {
      audio.currentTime = Math.max(0, audio.currentTime - 10);
    };
    window.forward = function() {
      audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + 10);
    };

    function updatePlayButton() {
      if (!playBtn) return;
      playBtn.textContent = audio.paused ? "⏵" : "⏸";
    }

    function formatTime(seconds) {
      if (isNaN(seconds)) return "0:00";
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
    }

    // ---------- AUTO SAVE RECENT PLAY ----------
    audio.addEventListener('play', () => {
      const userId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id || "guest";
      fetch("/play", {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({uid: userId, song: audio.src})
      }).catch(err => console.warn("markPlay failed", err));
    });

    // ---------- SAVE LAST SONG ----------
    audio.addEventListener('loadeddata', () => {
      if (audio.src) {
        const lastSong = {
          src: audio.src,
          title: document.getElementById('title')?.textContent || "Unknown Song",
          artist: document.getElementById('artist')?.textContent || "Unknown Artist",
          thumb: document.getElementById('player-thumb')?.src || ""
        };
        localStorage.setItem("lastSong", JSON.stringify(lastSong));
      }
    });

    // ---------- RESTORE LAST SONG ----------
    (function restoreLastSong() {
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
          } catch (e) {
            console.warn("Error restoring last song", e);
          }
        }
      }
    })();
  }

  // ---------- VOLUME ----------
  if (volSlider && audio) {
    volSlider.addEventListener('input', (e) => {
      const v = parseFloat(e.target.value);
      audio.volume = v;
      if (volPercent) volPercent.textContent = Math.round(v * 100) + "%";
    });
  }

  // ---------- FAVORITES ----------
  window.toggleFav = async function() {
    if (!audio) return;
    const item = {
      title: document.getElementById('title')?.textContent || "Unknown",
      artist: document.getElementById('artist')?.textContent || "",
      audio: audio.src || "",
      thumb: document.getElementById('player-thumb')?.src || ""
    };
    const isFav = favBtn && favBtn.textContent === "❤️";
    if (isFav) {
      await fetch('/favorite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: "guest", song: item.audio })
      });
      favBtn.textContent = "♡";
    } else {
      await fetch('/favorite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: "guest", song: item.audio })
      });
      favBtn.textContent = "❤️";
    }
  };

});
