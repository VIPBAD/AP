import os
from flask import Flask, request, render_template, url_for

app = Flask(__name__)

@app.route("/")
def home():
    # Accept either "url" or "audio" query param for backward compatibility
    url = request.args.get("url", "") or request.args.get("audio", "")
    return render_template("home.html", url=url)
    

@app.route("/player")
def player():
    audio_url = request.args.get("audio", "")
    title = request.args.get("title", "Unknown Title")
    thumb = request.args.get("thumb", url_for('static', filename='img/default_album.png'))
    artist = request.args.get("artist", "Unknown Artist")
    return render_template("player.html", audio_url=audio_url, title=title, thumb=thumb, artist=artist)

if __name__ == "__main__":
    PORT = int(os.environ.get("PORT", 5050))
    app.run(host="0.0.0.0", port=PORT, debug=True)
