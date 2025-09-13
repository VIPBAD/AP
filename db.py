import sqlite3
from typing import List, Tuple, Dict

DB_FILE = "music.db"


def _connect():
    return sqlite3.connect(DB_FILE)


def init_db():
    conn = _connect()
    c = conn.cursor()
    # plays: keep simple (user_id, song)
    c.execute('''CREATE TABLE IF NOT EXISTS plays
                 (user_id TEXT, song TEXT)''')
    # favorites: store metadata so the client can render titles/thumbs
    c.execute('''CREATE TABLE IF NOT EXISTS favorites
                 (user_id TEXT, title TEXT, artist TEXT, audio TEXT, thumb TEXT)''')
    conn.commit()
    conn.close()


def add_play(user_id: str, song: str):
    conn = _connect()
    c = conn.cursor()
    c.execute("INSERT INTO plays VALUES (?,?,?)", (user_id, song, None)) if False else None
    # simpler insert
    c.execute("INSERT INTO plays (user_id, song) VALUES (?, ?)", (user_id, song))
    conn.commit()
    conn.close()


def add_favorite(user_id: str, title: str = None, artist: str = None, audio: str = None, thumb: str = None):
    conn = _connect()
    c = conn.cursor()
    c.execute(
        "INSERT INTO favorites (user_id, title, artist, audio, thumb) VALUES (?, ?, ?, ?, ?)",
        (user_id, title, artist, audio, thumb),
    )
    conn.commit()
    conn.close()


def delete_favorite(user_id: str, audio: str) -> bool:
    conn = _connect()
    c = conn.cursor()
    c.execute("DELETE FROM favorites WHERE user_id=? AND audio=?", (user_id, audio))
    changed = c.rowcount
    conn.commit()
    conn.close()
    return changed > 0


def get_user_data(user_id: str) -> Tuple[List[str], List[Dict]]:
    conn = _connect()
    c = conn.cursor()
    c.execute("SELECT song FROM plays WHERE user_id=?", (user_id,))
    plays = [row[0] for row in c.fetchall()]
    c.execute("SELECT title, artist, audio, thumb FROM favorites WHERE user_id=?", (user_id,))
    favs = [
        {"title": row[0], "artist": row[1], "audio": row[2], "thumb": row[3]} for row in c.fetchall()
    ]
    conn.close()
    return plays, favs


def get_favorites_for_user(user_id: str):
    conn = _connect()
    c = conn.cursor()
    c.execute("SELECT title, artist, audio, thumb FROM favorites WHERE user_id=?", (user_id,))
    favs = [
        {"title": row[0], "artist": row[1], "audio": row[2], "thumb": row[3]} for row in c.fetchall()
    ]
    conn.close()
    return favs
