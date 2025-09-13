import os
from flask import Flask, request, render_template, jsonify, url_for
import db

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

if __name__ == "__main__":
    PORT = int(os.environ.get("PORT", 5050))
    app.run(host="0.0.0.0", port=PORT, debug=True)
