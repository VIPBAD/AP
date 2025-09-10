// Shared client script: player controls, volume, favorites, settings
document.addEventListener('DOMContentLoaded', () => {
  const audio = document.getElementById('audio');
  const seek = document.getElementById('seek');
  const current = document.getElementById('current');
  const total = document.getElementById('total');
  const playBtn = document.getElementById('playBtn');
  const volSlider = document.getElementById('volume');
  const volPercent = document.getElementById('volPercent');
  const favBtn = document.getElementById('favBtn');

  // ✅ Get song data from URL params
  const urlParams = new URLSearchParams(window.location.search);
  const audioSrc = decodeURIComponent(urlParams.get('audio') || '');
  const songTitle = decodeURIComponent(urlParams.get('title') || 'Unknown Song');
  const songArtist = decodeURIComponent(urlParams.get('artist') || 'Unknown Artist');
  const songThumb = decodeURIComponent(urlParams.get('thumb') || 'https://via.placeholder.com/280');

  // ✅ Apply values into DOM
  if (audio && audioSrc) {
    audio.src = audioSrc;
  }
  const titleEl = document.getElementById('title');
  const artistEl = document.getElementById('artist');
  const thumbEl = document.getElementById('player-thumb');

  if (titleEl) titleEl.textContent = songTitle;
  if (artistEl) artistEl.textContent = songArtist;
  if (thumbEl) thumbEl.src = songThumb;

  // Player related
  if (audio) {
    // Initialize volume from slider or default
    const initialVolume = volSlider ? parseFloat(volSlider.value) : 0.8;
    audio.volume = initialVolume;
    if (volPercent) volPercent.textContent = Math.round(initialVolume * 100) + "%";

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

    window.togglePlay = function() {
      if (audio.paused) {
        audio.play().catch(()=>{});
      } else {
        audio.pause();
      }
      updatePlayButton();
    };

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
  }

  // Volume slider behavior
  if (volSlider && audio) {
    volSlider.addEventListener('input', (e) => {
      const v = parseFloat(e.target.value);
      audio.volume = v;
      if (volPercent) volPercent.textContent = Math.round(v * 100) + "%";
    });
  }

  // Favorites: toggle from player
  window.toggleFav = async function() {
    if (!audio) return;
    const item = {
      title: document.getElementById('title')?.textContent || "Unknown",
      artist: document.getElementById('artist')?.textContent || "",
      audio: audio.src || "",
      thumb: document.getElementById('player-thumb')?.src || ""
    };
    // optimistic UI toggle
    const isFav = favBtn && favBtn.textContent === "❤️";
    if (isFav) {
      // delete via API
      await fetch('/api/favorites', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audio: item.audio })
      });
      if (favBtn) favBtn.textContent = "♡";
    } else {
      await fetch('/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item })
      });
      if (favBtn) favBtn.textContent = "❤️";
    }
  };

  // Add favorite from search result (used by search.html)
  window.addFavoriteFromSearch = async function(evt, title, artist, audioUrl, thumb) {
    evt.stopPropagation();
    evt.preventDefault && evt.preventDefault();
    const item = { title, artist, audio: audioUrl, thumb };
    await fetch('/api/favorites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item })
    });
    alert("Added to favorites");
  };

  // Profile page: show favorites from server or initialFavorites
  window.showFavorites = async function() {
    const panel = document.getElementById('favoritesPanel');
    const list = document.getElementById('favoritesList');
    panel.style.display = 'block';
    list.innerHTML = '<div style="color:var(--muted);padding:12px">Loading...</div>';
    const res = await fetch('/api/favorites');
    const data = await res.json();
    if (!data || data.length === 0) {
      list.innerHTML = '<div style="color:var(--muted);padding:12px">No favorites yet</div>';
      return;
    }
    list.innerHTML = data.map(it => `
      <a class="result-item" href="/player?audio=${encodeURIComponent(it.audio)}&title=${encodeURIComponent(it.title)}&thumb=${encodeURIComponent(it.thumb)}">
        <img src="${it.thumb}" />
        <div class="r-info">
          <div class="r-title">${it.title}</div>
          <div class="r-sub">${it.artist}</div>
        </div>
        <div class="r-actions">
          <button onclick="removeFavorite(event,'${it.audio}')">Remove</button>
        </div>
      </a>`).join('');
  };

  window.removeFavorite = async function(evt, audio) {
    evt.stopPropagation();
    await fetch('/api/favorites', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audio })
    });
    await showFavorites();
  };

  // Settings: load/save playback sync and data saver in localStorage
  const syncRange = document.getElementById('syncRange');
  const syncValue = document.getElementById('syncValue');
  const dataSaver = document.getElementById('dataSaver');
  if (syncRange && syncValue) {
    const stored = localStorage.getItem('playback_sync') || '5';
    syncRange.value = stored;
    syncValue.textContent = stored + 's';
    syncRange.addEventListener('input', () => {
      syncValue.textContent = syncRange.value + 's';
      localStorage.setItem('playback_sync', syncRange.value);
    });
  }
  if (dataSaver) {
    const saved = localStorage.getItem('data_saver') === 'true';
    dataSaver.checked = saved;
    dataSaver.addEventListener('change', () => {
      localStorage.setItem('data_saver', dataSaver.checked);
    });
  }
});
