# app.py
import os
import requests
from flask import Flask, request, render_template, jsonify, send_file, Response, stream_with_context
from db import init_db, add_play, add_favorite, remove_favorite, get_user_data, get_all_favorites

app = Flask(__name__)
init_db()

@app.route("/")
def home():
    # Accept either "url" or "audio" query param for backward compatibility
    url = request.args.get("url", "") or request.args.get("audio", "")
    return render_template("room.html", url=url)

@app.route("/stream")
def stream_audio():
    # Keep for local file streaming if you pass ?path=/some/local/file.mp3
    filepath = request.args.get("path")
    if not filepath or not os.path.isfile(filepath):
        return "Invalid or missing file", 404
    return send_file(filepath, mimetype="audio/mpeg", conditional=True)

@app.route("/proxy_audio")
def proxy_audio():
    """
    Proxy a remote direct audio file URL to the browser.
    Example: /proxy_audio?url=https://example.com/some.mp3
    NOTE: This proxies *direct* audio file URLs (mp3/ogg). It will not make
    YouTube watch pages playable.
    """
    remote = request.args.get("url")
    if not remote:
        return "Missing url param", 400

    # Simple safety: only http/https
    if not (remote.startswith("http://") or remote.startswith("https://")):
        return "Invalid URL", 400

    try:
        r = requests.get(remote, stream=True, timeout=10)
    except Exception as e:
        return f"Failed to fetch remote: {e}", 502

    # Determine content-type fallback
    content_type = r.headers.get("Content-Type", "audio/mpeg")

    def generate():
        try:
            for chunk in r.iter_content(chunk_size=8192):
                if chunk:
                    yield chunk
        finally:
            r.close()

    return Response(stream_with_context(generate()), content_type=content_type)

# --- API endpoints used by the frontend (normalized paths) ---
@app.route("/api/play", methods=["POST"])
def api_play():
    data = request.get_json() or {}
    user_id = data.get("uid", "guest")
    song = data.get("song", data.get("audio", "unknown"))
    add_play(user_id, song)
    return jsonify({"status": "ok"})

@app.route("/api/favorites", methods=["GET", "POST", "DELETE"])
def api_favorites():
    if request.method == "GET":
        # return all favorites (simple demo)
        favs = get_all_favorites()
        return jsonify(favs)
    data = request.get_json() or {}
    user_id = data.get("uid", "guest")
    # for POST expect { title, artist, audio, thumb }
    if request.method == "POST":
        song = data.get("audio") or data.get("song") or ""
        add_favorite(user_id, song)
        return jsonify({"status": "ok"})
    # DELETE expects { audio: "..." } or { song: "..." }
    if request.method == "DELETE":
        audio = data.get("audio") or data.get("song")
        if not audio:
            return jsonify({"status": "missing audio"}), 400
        remove_favorite(user_id, audio)
        return jsonify({"status": "deleted"})

@app.route("/me")
def me():
    user_id = request.args.get("uid", "guest")
    plays, favs = get_user_data(user_id)
    return render_template("me.html", plays=plays, favs=favs, uid=user_id)

if __name__ == "__main__":
    PORT = int(os.environ.get("PORT", 8000))
    app.run(host="0.0.0.0", port=PORT, debug=True)
