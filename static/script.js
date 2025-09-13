// static/script.js (edited)
document.addEventListener('DOMContentLoaded', () => {
  const audio = document.getElementById('audio');
  const seek = document.getElementById('seek');
  const current = document.getElementById('current');
  const total = document.getElementById('total');
  const playBtn = document.getElementById('playBtn');
  const volSlider = document.getElementById('volume');
  const volPercent = document.getElementById('volPercent');
  const favBtn = document.getElementById('favBtn');

  function formatTime(seconds) {
    if (isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  }

  if (audio) {
    // load src from either ?audio= or ?url= or server template variable
    try {
      const params = new URLSearchParams(window.location.search);
      let src = params.get('audio') || params.get('url') || '';
      if (!src) {
        const tpl = "{{ url }}";
        if (tpl && tpl !== "{{ url }}") src = tpl;
      }

      if (src) {
        // If the src is a remote direct audio url, you can optionally route through proxy:
        // e.g. audio.src = '/proxy_audio?url=' + encodeURIComponent(src);
        audio.src = src;
        audio.load();
      } else {
        console.warn('No audio source found');
      }
    } catch (err) {
      console.warn('Error parsing params', err);
    }

    // volume
    const initialVolume = volSlider ? parseFloat(volSlider.value) || 0.8 : 0.8;
    audio.volume = initialVolume;
    if (volPercent) volPercent.textContent = Math.round(initialVolume * 100) + "%";

    // events
    audio.addEventListener('loadedmetadata', () => {
      total.textContent = formatTime(audio.duration || 0);
      // try play recording of "play" to server
      fetch('/api/play', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: 'guest', song: audio.src })
      }).catch(()=>{});
    });

    audio.addEventListener('timeupdate', () => {
      if (!isNaN(audio.duration) && audio.duration > 0) {
        if (seek) seek.value = (audio.currentTime / audio.duration) * 100 || 0;
        if (current) current.textContent = formatTime(audio.currentTime);
      }
      playBtn && (playBtn.textContent = audio.paused ? "⏵" : "⏸");
    });

    audio.addEventListener('play', () => playBtn && (playBtn.textContent = '⏸'));
    audio.addEventListener('pause', () => playBtn && (playBtn.textContent = '⏵'));
  }

  if (volSlider && audio) {
    volSlider.addEventListener('input', (e) => {
      const v = parseFloat(e.target.value);
      audio.volume = isNaN(v) ? 0.8 : v;
      if (volPercent) volPercent.textContent = Math.round(audio.volume * 100) + "%";
    });
  }

  window.togglePlay = function() {
    if (!audio) return;
    if (audio.paused) {
      audio.play().catch(e => console.warn('Play prevented', e));
    } else {
      audio.pause();
    }
  };

  window.rewind = function() {
    if (!audio) return;
    try { audio.currentTime = Math.max(0, audio.currentTime - 10); } catch {}
  };
  window.forward = function() {
    if (!audio) return;
    try { audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + 10); } catch {}
  };

  // FAVORITES: use /api/favorites endpoints to match Flask
  async function postFavorite(item) {
    try {
      const res = await fetch('/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item)
      });
      return res.ok;
    } catch (e) {
      console.error(e); return false;
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
      console.error(e); return false;
    }
  }

  window.toggleFav = async function() {
    if (!audio) return;
    const favBtn = document.getElementById('favBtn');
    if (!favBtn) return;
    const isFav = favBtn.dataset.fav === 'true';
    const item = {
      uid: 'guest',
      title: document.getElementById('title')?.textContent || '',
      artist: document.getElementById('artist')?.textContent || '',
      audio: audio.src || '',
      thumb: document.getElementById('player-thumb')?.src || ''
    };
    if (isFav) {
      const ok = await deleteFavorite(item.audio);
      if (ok) { favBtn.dataset.fav = 'false'; favBtn.textContent = '♡'; }
      else { alert('Failed to remove favorite'); }
    } else {
      const ok = await postFavorite(item);
      if (ok) { favBtn.dataset.fav = 'true'; favBtn.textContent = '❤️'; }
      else { alert('Failed to add favorite'); }
    }
  };

  // showFavorites (calls /api/favorites GET)
  window.showFavorites = async function() {
    const panel = document.getElementById('favoritesPanel');
    const list = document.getElementById('favoritesList');
    if (!panel || !list) return;
    panel.style.display = 'block';
    list.innerHTML = '<div style="padding:12px;color:var(--muted)">Loading...</div>';
    try {
      const res = await fetch('/api/favorites');
      if (!res.ok) throw new Error('Failed to get favorites');
      const data = await res.json();
      if (!data || data.length === 0) {
        list.innerHTML = '<div style="padding:12px;color:var(--muted)">No favorites yet</div>';
        return;
      }
      list.innerHTML = data.map(it => {
        const audioEsc = encodeURIComponent(it.audio || '');
        const titleSafe = it.title ? escapeHtml(it.title) : 'Unknown';
        const artistSafe = it.artist ? escapeHtml(it.artist) : '';
        return `<a class="result-item" href="/?url=${audioEsc}&title=${encodeURIComponent(titleSafe)}&thumb=${encodeURIComponent(it.thumb||'')}">
                  <img src="${it.thumb||''}" alt="${titleSafe}" />
                  <div class="r-info">
                    <div class="r-title">${titleSafe}</div>
                    <div class="r-sub">${artistSafe}</div>
                  </div>
                  <div class="r-actions">
                    <button onclick="removeFavorite(event,'${audioEsc}')">Remove</button>
                  </div>
                </a>`;
      }).join('');
    } catch (e) {
      console.error(e);
      list.innerHTML = '<div style="padding:12px;color:var(--muted)">Unable to load favorites</div>';
    }
  };

  window.removeFavorite = async function(evt, audioEncoded) {
    evt && evt.preventDefault();
    const audioUrl = decodeURIComponent(audioEncoded || '');
    await deleteFavorite(audioUrl);
    await window.showFavorites();
  };

  function escapeHtml(unsafe) {
    return String(unsafe)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
});
