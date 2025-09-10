import os
from flask import Flask, request, render_template, jsonify, send_file
from db import init_db, add_play, add_favorite, get_user_data

app = Flask(__name__)
init_db()

@app.route("/")
def home():
    # Optional audio URL from query parameter
    url = request.args.get("url", "")
    return render_template("room.html", url=url)

@app.route("/stream")
def stream_audio():
    # Local audio file path (not typically used in online deployment)
    filepath = request.args.get("path")
    if not filepath or not os.path.isfile(filepath):
        return "Invalid or missing file", 404
    return send_file(filepath, mimetype="audio/mpeg")

@app.route("/me")
def me():
    user_id = request.args.get("uid", "guest")
    plays, favs = get_user_data(user_id)
    return render_template("me.html", plays=plays, favs=favs, uid=user_id)

@app.route("/play", methods=["POST"])
def play_song():
    data = request.json
    user_id = data.get("uid", "guest")
    song = data.get("song", "unknown")
    add_play(user_id, song)
    return jsonify({"status": "ok"})

@app.route("/favorite", methods=["POST"])
def favorite_song():
    data = request.json
    user_id = data.get("uid", "guest")
    song = data.get("song", "unknown")
    add_favorite(user_id, song)
    return jsonify({"status": "ok"})

if __name__ == "__main__":
    PORT = int(os.environ.get("PORT", 8000))
    app.run(host="0.0.0.0", port=PORT)
