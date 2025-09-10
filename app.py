import os
import sqlite3
from flask import Flask, request, render_template, redirect, url_for, jsonify

app = Flask(__name__)

DB_FILE = "music.db"

# 🔹 Database init
def init_db():
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS plays
                 (user_id TEXT, song TEXT)''')
    c.execute('''CREATE TABLE IF NOT EXISTS favorites
                 (user_id TEXT, song TEXT)''')
    conn.commit()
    conn.close()

init_db()

@app.route("/")
def splash():
    return render_template("index.html")

@app.route("/room")
def room():
    # sample song
    song = {
        "title": "AADAT - Sucha Yaar",
        "artist": "Sucha Yaar",
        "url": "/static/songs/sample.mp3",
        "cover": "https://i.ibb.co/s9Zz7mY/sample.jpg"
    }
    return render_template("room.html", song=song)

@app.route("/me")
def me():
    user_id = request.args.get("uid", "guest")
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute("SELECT song FROM plays WHERE user_id=?", (user_id,))
    plays = [row[0] for row in c.fetchall()]
    c.execute("SELECT song FROM favorites WHERE user_id=?", (user_id,))
    favs = [row[0] for row in c.fetchall()]
    conn.close()
    return render_template("me.html", plays=plays, favs=favs, uid=user_id)

@app.route("/play", methods=["POST"])
def play_song():
    data = request.json
    user_id = data.get("uid")
    song = data.get("song")
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute("INSERT INTO plays VALUES (?,?)", (user_id, song))
    conn.commit()
    conn.close()
    return jsonify({"status": "ok"})

@app.route("/favorite", methods=["POST"])
def favorite_song():
    data = request.json
    user_id = data.get("uid")
    song = data.get("song")
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute("INSERT INTO favorites VALUES (?,?)", (user_id, song))
    conn.commit()
    conn.close()
    return jsonify({"status": "ok"})

if __name__ == "__main__":
    PORT = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=PORT)
