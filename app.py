import os
from flask import Flask, request, render_template, jsonify, url_for
from flask_socketio import SocketIO, emit
import db

app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*")

db.init_db()

# In-memory listeners
listeners = {}

@app.route("/")
def home():
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

@app.route("/chat")
def chat():
    return render_template("chatting.html")

@app.route("/join")
def join():
    return render_template("join.html")

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

@socketio.on("join")
def handle_join(data):
    uid = str(data.get("uid", "guest"))
    name = data.get("name", "Unknown")
    photo = data.get("photo", "https://via.placeholder.com/60")
    listeners[uid] = {"name": name, "photo": photo}
    emit("user_joined", {"uid": uid, "name": name, "photo": photo}, broadcast=True)

@socketio.on("leave")
def handle_leave(data):
    uid = str(data.get("uid"))
    if uid in listeners:
        listeners.pop(uid)
        emit("user_left", {"uid": uid}, broadcast=True)

@socketio.on("chat")
def handle_chat(data):
    # Broadcast chat messages to all
    emit("chat", data, broadcast=True)


if __name__ == "__main__":
    PORT = int(os.environ.get("PORT", 5050))
    socketio.run(app, host="0.0.0.0", port=PORT, debug=True)
