import os
from flask import Flask, request, render_template

app = Flask(__name__)

@app.route("/")
def home():
    # Read params from URL
    audio_url = request.args.get("audio", "")
    title = request.args.get("title", "Unknown Title")
    thumb = request.args.get("thumb", "")

    return render_template(
        "index.html",
        audio_url=audio_url,
        title=title,
        thumb=thumb
    )

if __name__ == "__main__":
    # Dynamic port for Render
    PORT = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=PORT)
