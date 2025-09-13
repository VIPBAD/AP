// script.js
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

  // helper: safe get element text
  const getElText = (id) => document.getElementById(id)?.textContent || '';

  // If there's an audio element, wire up player behavior
  if (audio) {
    // If URL has audio param, use it (user suggested)
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const audioParam = urlParams.get('audio');
      const audioSrc = audioParam ? decodeURIComponent(audioParam) : '';
      if (audioSrc) {
        audio.src = audioSrc;
        // If there are title/thumb params, update UI if present
        const titleParam = urlParams.get('title');
        if (titleParam && document.getElementById('title')) {
          document.getElementById('title').textContent = decodeURIComponent(titleParam);
        }
        const thumbParam = urlParams.get('thumb');
        if (thumbParam && document.getElementById('player-thumb')) {
          document.getElementById('player-thumb').src = decodeURIComponent(thumbParam);
        }
        // Load the new source
        audio.load();
      }
    } catch (err) {
      // ignore malformed URL params
      console.warn('Error parsing audio URL param', err);
    }

    // Initialize volume from slider or default 0.8
    const initialVolume = volSlider ? parseFloat(volSlider.value) || 0.8 : 0.8;
    audio.volume = initialVolume;
    if (volPercent) volPercent.textContent = Math.round(initialVolume * 100) + "%";

    // Update play button state (initial)
    function updatePlayButton() {
      if (!playBtn) return;
      playBtn.textContent = audio.paused ? "⏵" : "⏸";
      // store a clearer state for favorites checks
      if (favBtn) {
        // keep existing fav appearance — nothing changes here
      }
    }
    updatePlayButton();

    // Format time helper
    function formatTime(seconds) {
      if (isNaN(seconds)) return "0:00";
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
    }

    // ontimeupdate: update UI
    audio.ontimeupdate = () => {
      if (!isNaN(audio.duration) && audio.duration > 0) {
        if (seek) seek.value = (audio.currentTime / audio.duration) * 100 || 0;
        if (current) current.textContent = formatTime(audio.currentTime);
        if (total) total.textContent = formatTime(audio.duration);
      } else {
        if (total) total.textContent = "0:00";
      }
      updatePlayButton();
    };

    // seek control
    if (seek) {
      seek.addEventListener('input', () => {
        if (!isNaN(audio.duration) && audio.duration > 0) {
          audio.currentTime = (seek.value / 100) * audio.duration;
        }
      });
    }

    // Attach play button (if present)
    if (playBtn) {
      playBtn.addEventListener('click', () => {
        togglePlay();
      });
    }

    // Global controls
    window.togglePlay = function() {
      if (audio.paused) {
        audio.play().catch((e) => {
          // Autoplay may be blocked by browser — fail silently
          console.warn('Play prevented:', e);
        });
      } else {
        audio.pause();
      }
      updatePlayButton();
    };

    window.rewind = function() {
      try {
        audio.currentTime = Math.max(0, audio.currentTime - 10);
      } catch (e) { /* ignore if not seekable */ }
    };

    window.forward = function() {
      try {
        audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + 10);
      } catch (e) { /* ignore if not seekable */ }
    };

    // try to update button when playback state changes outside our controls
    audio.addEventListener('play', updatePlayButton);
    audio.addEventListener('pause', updatePlayButton);
    audio.addEventListener('loadedmetadata', () => {
      if (total) total.textContent = formatTime(audio.duration);
    });
  } // end if(audio)

  // Volume slider behavior
  if (volSlider && audio) {
    volSlider.addEventListener('input', (e) => {
      const v = parseFloat(e.target.value);
      audio.volume = isNaN(v) ? 0.8 : v;
      if (volPercent) volPercent.textContent = Math.round(audio.volume * 100) + "%";
    });
  }

  // FAVORITES
  // Use data-fav attribute to track state instead of text content
  async function postFavorite(item) {
    try {
      const res = await fetch('/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item })
      });
      return res.ok;
    } catch (e) {
      console.error('Failed to add favorite', e);
      return false;
    }
  }
  async function deleteFavorite(audioUrl) {
    try {
      const res = await fetch('/api/favorites', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audio: audioUrl })
      });
      return res.ok;
    } catch (e) {
      console.error('Failed to delete favorite', e);
      return false;
    }
  }

  window.toggleFav = async function() {
    if (!audio) return;
    const item = {
      title: document.getElementById('title')?.textContent || "Unknown",
      artist: document.getElementById('artist')?.textContent || "",
      audio: audio.src || "",
      thumb: document.getElementById('player-thumb')?.src || ""
    };
    if (!favBtn) return;

    const isFav = favBtn.dataset.fav === 'true';
    // optimistic UI
    if (isFav) {
      favBtn.dataset.fav = 'false';
      favBtn.textContent = "♡";
      const ok = await deleteFavorite(item.audio);
      if (!ok) {
        // revert on failure
        favBtn.dataset.fav = 'true';
        favBtn.textContent = "❤️";
        alert('Could not remove favorite. Try again.');
      }
    } else {
      favBtn.dataset.fav = 'true';
      favBtn.textContent = "❤️";
      const ok = await postFavorite(item);
      if (!ok) {
        // revert on failure
        favBtn.dataset.fav = 'false';
        favBtn.textContent = "♡";
        alert('Could not add favorite. Try again.');
      }
    }
  };

  // Add favorite from search result (used by search.html)
  window.addFavoriteFromSearch = async function(evt, title, artist, audioUrl, thumb) {
    try {
      evt && evt.stopPropagation();
      evt && evt.preventDefault && evt.preventDefault();
      const item = { title, artist, audio: audioUrl, thumb };
      const ok = await postFavorite(item);
      if (ok) {
        alert("Added to favorites");
      } else {
        alert("Failed to add favorite");
      }
    } catch (e) {
      console.error(e);
      alert("Failed to add favorite");
    }
  };

  // Profile page: show favorites from server or initialFavorites
  window.showFavorites = async function() {
    const panel = document.getElementById('favoritesPanel');
    const list = document.getElementById('favoritesList');
    if (!panel || !list) return;
    panel.style.display = 'block';
    list.innerHTML = '<div style="color:var(--muted);padding:12px">Loading...</div>';
    try {
      const res = await fetch('/api/favorites');
      if (!res.ok) throw new Error('Server returned ' + res.status);
      const data = await res.json();
      if (!data || data.length === 0) {
        list.innerHTML = '<div style="color:var(--muted);padding:12px">No favorites yet</div>';
        return;
      }
      // build HTML safely using template strings
      list.innerHTML = data.map(it => {
        const audioEsc = encodeURIComponent(it.audio || '');
        const titleEsc = encodeURIComponent(it.title || '');
        const thumbEsc = encodeURIComponent(it.thumb || '');
        return `<a class="result-item" href="/player?audio=${audioEsc}&title=${titleEsc}&thumb=${thumbEsc}">
                  <img src="${it.thumb || ''}" alt="${it.title || ''}" />
                  <div class="r-info">
                    <div class="r-title">${escapeHtml(it.title || '')}</div>
                    <div class="r-sub">${escapeHtml(it.artist || '')}</div>
                  </div>
                  <div class="r-actions">
                    <button onclick="removeFavorite(event,'${encodeURIComponent(it.audio || '')}')">Remove</button>
                  </div>
                </a>`;
      }).join('');
    } catch (e) {
      console.error('Failed to load favorites', e);
      list.innerHTML = '<div style="color:var(--muted);padding:12px">Unable to load favorites</div>';
    }
  };

  // removeFavorite expects encoded audio param
  window.removeFavorite = async function(evt, audioEncoded) {
    try {
      evt && evt.stopPropagation();
      const audioUrl = decodeURIComponent(audioEncoded || '');
      await deleteFavorite(audioUrl);
      // refresh the list (call the function defined above)
      if (typeof window.showFavorites === 'function') {
        await window.showFavorites();
      }
    } catch (e) {
      console.error('Failed to remove favorite', e);
    }
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

  // small helper to avoid XSS when injecting title/artist into innerHTML
  function escapeHtml(unsafe) {
    return String(unsafe)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
});
        
