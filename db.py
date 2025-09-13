import sqlite3

DB_FILE = "music.db"

def init_db():
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS plays
                 (user_id TEXT, song TEXT)''')
    c.execute('''CREATE TABLE IF NOT EXISTS favorites
                 (user_id TEXT, song TEXT)''')
    conn.commit()
    conn.close()

def add_play(user_id, song):
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute("INSERT INTO plays VALUES (?,?)", (user_id, song))
    conn.commit()
    conn.close()

def add_favorite(user_id, song):
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute("INSERT INTO favorites VALUES (?,?)", (user_id, song))
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
