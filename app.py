import os
from flask import Flask, request, render_template, send_file

app = Flask(__name__)

@app.route("/")
def home():
    # Optional audio URL from query parameter
    url = request.args.get("url", "")
    return render_template("index.html", url=url)

@app.route("/stream")
def stream_audio():
    # Local audio file path (not typically used in online deployment)
    filepath = request.args.get("path")
    if not filepath or not os.path.isfile(filepath):
        return "Invalid or missing file", 404
    return send_file(filepath, mimetype="audio/mpeg")

if __name__ == "__main__":
    # Use dynamic port for Render hosting
    PORT = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=PORT)
