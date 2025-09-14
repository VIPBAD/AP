import os
from flask import Flask, request, render_template, jsonify, url_for, redirect
from flask_socketio import SocketIO, emit
import db

app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*")

db.init_db()

# In-memory listeners
listeners = {}

# ---------- ROUTES ----------

@app.route("/")
def home():
    """Join Page"""
    audio_url = request.args.get("audio", "")
    title = request.args.get("title", "Telegram Music")
    thumb = request.args.get("thumb", url_for('static', filename='img/default_album.png'))
    avatar = request.args.get("avatar", url_for('static', filename='img/avatar.png'))
    return render_template("join.html", audio_url=audio_url, title=title, thumb=thumb, avatar=avatar)


@app.route("/player")
def player():
    """Player Page"""
    audio_url = request.args.get("audio", "")
    title = request.args.get("title", "Unknown Title")
    thumb = request.args.get("thumb", url_for('static', filename='img/default_album.png'))
    artist = request.args.get("artist", "YouTube")
    return render_template("player.html", audio_url=audio_url, title=title, thumb=thumb, artist=artist)


@app.route("/me")
def me():
    uid = request.args.get("uid", "guest")
    plays, favs = db.get_user_data(uid)
    return render_template("profile.html", uid=uid, plays=plays, favs=favs)


@app.route("/listeners")
def get_listeners():
    return jsonify({"count": len(listeners), "users": list(listeners.values())})


@app.route("/play", methods=["POST"])
def mark_play():
    data = request.get_json()
    uid = data.get("uid", "guest")
    song = data.get("song", "")
    if song:
        db.add_play(uid, song)
    return jsonify({"status": "ok"})


@app.route("/favorite", methods=["POST"])
def mark_fav():
    data = request.get_json()
    uid = data.get("uid", "guest")
    song = data.get("song", "")
    if song:
        db.add_favorite(uid, song)
    return jsonify({"status": "ok"})


@app.route("/queue")
def get_queue():
    q = db.get_queue()
    return jsonify(q)


# ---------- SOCKET.IO EVENTS ----------

@socketio.on("leave")
def handle_leave(data):
    uid = str(data.get("uid"))
    if uid in listeners:
        listeners.pop(uid)
        emit("user_left", {"uid": uid}, broadcast=True)


# ---------- MAIN ----------

if __name__ == "__main__":
    PORT = int(os.environ.get("PORT", 5050))
    socketio.run(app, host="0.0.0.0", port=PORT, debug=True)
