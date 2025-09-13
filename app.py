import os
from flask import Flask, request, render_template, jsonify, send_file, abort
from db import init_db, add_play, add_favorite, delete_favorite, get_user_data, get_favorites_for_user

app = Flask(__name__)
init_db()


@app.route("/")
def home():
    # Prefer `audio` query param (used by client). Keep backwards-compatible `url` param.
    audio_url = request.args.get("audio") or request.args.get("url", "")
    title = request.args.get("title", "")
    artist = request.args.get("artist", "")
    thumb = request.args.get("thumb", "")
    return render_template("room.html", audio=audio_url, title=title, artist=artist, thumb=thumb)


@app.route("/stream")
def stream_audio():
    # Local audio file path (not typically used in online deployment)
    filepath = request.args.get("path")
    if not filepath:
        return "Missing file path", 400
    if not os.path.isfile(filepath):
        return "File not found", 404
    # NOTE: in production you should validate path to avoid directory traversal
    return send_file(filepath, mimetype="audio/mpeg")


@app.route("/me")
def me():
    user_id = request.args.get("uid", "guest")
    plays, favs = get_user_data(user_id)
    return render_template("me.html", plays=plays, favs=favs, uid=user_id)


@app.route("/play", methods=["POST"])
def play_song():
    data = request.get_json(silent=True) or {}
    user_id = data.get("uid", "guest")
    song = data.get("song", "unknown")
    add_play(user_id, song)
    return jsonify({"status": "ok"})


# Keep older single favorite endpoint for backward compatibility
@app.route("/favorite", methods=["POST"])
def favorite_song_old():
    data = request.get_json(silent=True) or {}
    user_id = data.get("uid", "guest")
    song = data.get("song", "unknown")
    # If the client only sends song (URL), store it as favorite minimally
    add_favorite(user_id=user_id, title=None, artist=None, audio=song, thumb=None)
    return jsonify({"status": "ok"})


# New RESTful favorites API used by the modern client code
@app.route("/api/favorites", methods=["GET", "POST", "DELETE"])
def api_favorites():
    user_id = request.args.get("uid", "guest")
    if request.method == "GET":
        favs = get_favorites_for_user(user_id)
        # return a list of favorite objects
        return jsonify(favs)

    data = request.get_json(silent=True) or {}
    if request.method == "POST":
        # Expect an object: { uid, title, artist, audio, thumb }
        add_favorite(
            user_id=data.get("uid", user_id),
            title=data.get("title"),
            artist=data.get("artist"),
            audio=data.get("audio"),
            thumb=data.get("thumb"),
        )
        return jsonify({"status": "ok"}), 201

    if request.method == "DELETE":
        # Expect { uid, audio } to delete a favorite by audio URL for that user
        audio = data.get("audio")
        if not audio:
            return jsonify({"error": "audio required"}), 400
        deleted = delete_favorite(user_id=user_id, audio=audio)
        if deleted:
            return jsonify({"status": "deleted"})
        else:
            return jsonify({"status": "not found"}), 404


if __name__ == "__main__":
    PORT = int(os.environ.get("PORT", 8000))
    app.run(host="0.0.0.0", port=PORT, debug=True)
