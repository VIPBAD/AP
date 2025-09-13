# app.py
import os
from flask import Flask, request, render_template, jsonify, url_for
import db
from urllib.parse import unquote

app = Flask(__name__)
db.init_db()

@app.route("/")
def home():
    # audio, title, thumb query params
    audio_url = request.args.get("audio", "")
    title = request.args.get("title", "Now Playing")
    thumb = request.args.get("thumb", url_for('static', filename='img/default_album.png'))
    artist = request.args.get("artist", "Unknown Artist")
    return render_template("player.html", audio_url=audio_url, title=title, thumb=thumb, artist=artist)

@app.route("/me")
def me():
    uid = request.args.get("uid", "guest")
    plays, favs = db.get_user_data(uid)
    return render_template("profile.html", uid=uid, plays=plays, favs=favs)

# Called by frontend when playback starts (store structured record)
@app.route("/play", methods=["POST"])
def mark_play():
    data = request.get_json() or {}
    uid = data.get("uid", "guest")
    title = data.get("title", "") or ""
    artist = data.get("artist", "") or ""
    audio = data.get("audio", "") or ""
    thumb = data.get("thumb", "") or ""
    # store structured play record
    if audio:
        db.add_play(uid, title, artist, audio, thumb)
        # set current playing in state collection
        db.set_current({"title": title, "artist": artist, "audio": audio, "thumb": thumb})
    return jsonify({"status": "ok"})

@app.route("/favorite", methods=["POST"])
def mark_fav():
    data = request.get_json() or {}
    uid = data.get("uid", "guest")
    title = data.get("title", "") or ""
    artist = data.get("artist", "") or ""
    audio = data.get("audio", "") or ""
    thumb = data.get("thumb", "") or ""
    if audio:
        db.add_favorite(uid, title, artist, audio, thumb)
    return jsonify({"status": "ok"})

# Queue endpoints
@app.route("/queue", methods=["GET"])
def get_queue():
    items = db.get_queue_items()
    return jsonify(items)

@app.route("/enqueue", methods=["POST"])
def enqueue():
    data = request.get_json() or {}
    title = data.get("title","")
    artist = data.get("artist","")
    audio = data.get("audio","")
    thumb = data.get("thumb","")
    if audio:
        db.add_queue_item(title, artist, audio, thumb)
        return jsonify({"status":"ok"})
    return jsonify({"status":"error","reason":"no audio"}), 400

@app.route("/next", methods=["GET"])
def next_song():
    song = db.pop_next()
    if song:
        # set current state to this song
        db.set_current(song)
        return jsonify(song)
    return jsonify({}), 204

# listeners: join/leave/get
@app.route("/join", methods=["POST"])
def join_room():
    data = request.get_json() or {}
    uid = str(data.get("uid", "guest"))
    name = data.get("name", "Unknown")
    photo = data.get("photo", url_for('static', filename='img/avatar.png'))
    db.add_listener(uid, name, photo)
    return jsonify({"status":"ok"})

@app.route("/leave", methods=["POST"])
def leave_room():
    data = request.get_json() or {}
    uid = str(data.get("uid", "guest"))
    db.remove_listener(uid)
    return jsonify({"status":"ok"})

@app.route("/listeners", methods=["GET"])
def listeners():
    users = db.get_listeners()
    return jsonify({"count": len(users), "users": users})

# resume: return current playing (if any)
@app.route("/resume", methods=["GET"])
def resume():
    cur = db.get_current()
    if cur:
        return jsonify(cur)
    return jsonify({}), 204

if __name__ == "__main__":
    PORT = int(os.environ.get("PORT", 5050))
    app.run(host="0.0.0.0", port=PORT, debug=True)
