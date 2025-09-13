// static/script.js
document.addEventListener('DOMContentLoaded', () => {
  const audio = document.getElementById('audio');
  const seek = document.getElementById('seek');
  const current = document.getElementById('current');
  const total = document.getElementById('total');
  const playBtn = document.getElementById('playBtn');
  const volSlider = document.getElementById('volume');
  const volPercent = document.getElementById('volPercent');
  const favBtn = document.getElementById('favBtn');

  // Telegram user (if present)
  const tg = window.Telegram?.WebApp;
  const user = tg?.initDataUnsafe?.user || {};
  const USER_ID = user?.id || "guest";

  // helper to read template-injected values
  function getTemplateValue(name) {
    // Some templates set global inline values, but we rely on DOM content for title/artist/thumb
    return null;
  }

  // Join room: notify backend
  async function joinRoom() {
    try {
      await fetch('/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: USER_ID,
          name: (user?.first_name || 'Guest'),
          photo: (user?.photo_url || '/static/img/avatar.png')
        })
      });
    } catch (e) {
      console.warn('join error', e);
    }
  }

  // Leave room when unloading (best effort)
  window.addEventListener('beforeunload', () => {
    navigator.sendBeacon('/leave', JSON.stringify({ uid: USER_ID }));
  });

  // Poll listeners
  async function loadListeners() {
    try {
      const res = await fetch("/listeners");
      if (!res.ok) return;
      const data = await res.json();
      document.getElementById("listenerCount") && (document.getElementById("listenerCount").textContent = data.count);
      const row = document.getElementById("listenersRow");
      if (row) row.innerHTML = (data.users || []).map(u => `<img src="${u.photo_url}" title="${u.name}" />`).join('');
    } catch (e) { console.warn('listeners fetch', e); }
  }

  // Restore resume (server state) or localStorage lastSong
  async function restoreState() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("audio")) {
      // explicit audio param — template will already set audio tag src
      return;
    }
    // first try server resume
    try {
      const res = await fetch('/resume');
      if (res.status === 200) {
        const s = await res.json();
        if (s && s.audio) {
          setTrackFromObj(s);
          return;
        }
      }
    } catch(e){}

    // fallback to localStorage lastSong
    const saved = localStorage.getItem("lastSong");
    if (saved) {
      try {
        const song = JSON.parse(saved);
        setTrackFromObj(song);
      } catch (e) {
        console.warn('restore error', e);
      }
    }
  }

  function setTrackFromObj(s) {
    if (!s) return;
    document.getElementById('title').textContent = s.title || "Now Playing";
    document.getElementById('artist').textContent = s.artist || "Unknown Artist";
    document.getElementById('player-thumb').src = s.thumb || document.getElementById('player-thumb').src;
    audio.src = s.audio || audio.src;
    audio.load();
  }

  // Call join and then start polling
  joinRoom().then(() => { loadListeners(); setInterval(loadListeners, 5000); });

  // Restore state
  restoreState();

  // ---------- Player logic ----------
  if (audio) {
    // initialize volume
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
    window.rewind = function() { audio.currentTime = Math.max(0, audio.currentTime - 10); };
    window.forward = function() { audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + 10); };

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

    // When playback starts: mark play (structured)
    audio.addEventListener('play', () => {
      const payload = {
        uid: USER_ID,
        title: document.getElementById('title')?.textContent || "",
        artist: document.getElementById('artist')?.textContent || "",
        audio: audio.src || "",
        thumb: document.getElementById('player-thumb')?.src || ""
      };
      fetch("/play", {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify(payload)
      }).catch(err => console.warn("markPlay failed", err));
    });

    // When metadata loaded: save lastSong locally
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

    // When song ends: fetch next from server queue
    audio.addEventListener('ended', async () => {
      try {
        const res = await fetch('/next');
        if (res.status === 200) {
          const next = await res.json();
          if (next && next.audio) {
            // set track and play
            setTrackFromObj(next);
            audio.play().catch(()=>{});
            localStorage.setItem("lastSong", JSON.stringify({
              src: next.audio, title: next.title, artist: next.artist, thumb: next.thumb
            }));
          }
        }
      } catch (e) {
        console.warn('next fetch error', e);
      }
    });
  }

  // volume control
  if (volSlider && audio) {
    volSlider.addEventListener('input', (e) => {
      const v = parseFloat(e.target.value);
      audio.volume = v;
      if (volPercent) volPercent.textContent = Math.round(v * 100) + "%";
    });
  }

  // favorites (structured)
  window.toggleFav = async function() {
    if (!audio) return;
    const payload = {
      uid: USER_ID,
      title: document.getElementById('title')?.textContent || "",
      artist: document.getElementById('artist')?.textContent || "",
      audio: audio.src || "",
      thumb: document.getElementById('player-thumb')?.src || ""
    };
    try {
      await fetch('/favorite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (favBtn) favBtn.textContent = favBtn.textContent === '❤️' ? '♡' : '❤️';
    } catch (e) {
      console.warn('fav error', e);
    }
  };

  // open queue modal (pull from server)
  window.openQueue = async function() {
    try {
      const res = await fetch('/queue');
      const list = await res.json();
      const el = document.getElementById('queueList');
      if (!el) return;
      el.innerHTML = list.map(it => `
        <div class="queue-item" style="display:flex;align-items:center;gap:12px;margin:8px 0">
          <img src="${it.thumb}" width="48" height="48" style="border-radius:8px" />
          <div>
            <div style="font-weight:600">${it.title}</div>
            <div style="color:#aaa;font-size:13px">${it.artist}</div>
          </div>
          <button style="margin-left:auto" onclick="playQueueItem('${encodeURIComponent(it.audio)}','${encodeURIComponent(it.title)}','${encodeURIComponent(it.artist)}','${encodeURIComponent(it.thumb)}')">Play</button>
        </div>`).join('');
      document.getElementById('queueModal').style.display = 'block';
    } catch (e) { console.warn('openQueue error', e); }
  };
  window.closeQueue = () => { document.getElementById('queueModal').style.display = 'none'; };

  window.playQueueItem = (audioEnc, titleEnc, artistEnc, thumbEnc) => {
    const a = decodeURIComponent(audioEnc);
    const t = decodeURIComponent(titleEnc);
    const ar = decodeURIComponent(artistEnc);
    const th = decodeURIComponent(thumbEnc);
    setTrackFromObj({ audio: a, title: t, artist: ar, thumb: th });
    audio.play().catch(()=>{});
    // set as current on server
    fetch('/play', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ uid: USER_ID, title: t, artist: ar, audio: a, thumb: th })
    }).catch(()=>{});
    closeQueue();
  };

});
