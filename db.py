# db.py
import sqlite3

DB_FILE = "music.db"

def init_db():
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS plays
                 (user_id TEXT, song TEXT)''')
    c.execute('''CREATE TABLE IF NOT EXISTS favorites
                 (user_id TEXT, song TEXT, title TEXT, artist TEXT, thumb TEXT)''')
    conn.commit()
    conn.close()

def add_play(user_id, song):
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute("INSERT INTO plays VALUES (?,?,?)", (user_id, song, None) if False else (user_id, song))
    # simpler existing table: (user_id, song)
    conn.commit()
    conn.close()

def add_favorite(user_id, song, title=None, artist=None, thumb=None):
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute("INSERT INTO favorites (user_id, song, title, artist, thumb) VALUES (?,?,?,?,?)",
              (user_id, song, title or "", artist or "", thumb or ""))
    conn.commit()
    conn.close()

def remove_favorite(user_id, song):
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute("DELETE FROM favorites WHERE user_id=? AND song=?", (user_id, song))
    conn.commit()
    conn.close()

def get_user_data(user_id):
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute("SELECT song FROM plays WHERE user_id=?", (user_id,))
    plays = [row[0] for row in c.fetchall()]
    c.execute("SELECT song FROM favorites WHERE user_id=?", (user_id,))
    favs = [row[0] for row in c.fetchall()]
    conn.close()
    return plays, favs

def get_all_favorites():
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute("SELECT title, artist, song, thumb FROM favorites")
    rows = c.fetchall()
    conn.close()
    return [{"title": r[0], "artist": r[1], "audio": r[2], "thumb": r[3]} for r in rows]
