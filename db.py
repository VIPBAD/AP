from pymongo import MongoClient

MONGO_URI = "mongodb+srv://BADMUNDA:BADMYDAD@badhacker.i5nw9na.mongodb.net/"
client = MongoClient(MONGO_URI)
db = client["music_app"]

plays_col = db["plays"]
favs_col = db["favorites"]
queue_col = db["queue"]
listeners_col = db["listeners"]

def init_db():
    # Ensure indexes
    plays_col.create_index("user_id")
    favs_col.create_index("user_id")

def add_play(user_id, song):
    plays_col.insert_one({
        "user_id": user_id,
        "title": song.get("title"),
        "artist": song.get("artist"),
        "audio": song.get("audio"),
        "thumb": song.get("thumb")
    })

def add_favorite(user_id, song):
    favs_col.insert_one({
        "user_id": user_id,
        "title": song.get("title"),
        "artist": song.get("artist"),
        "audio": song.get("audio"),
        "thumb": song.get("thumb")
    })

def get_user_data(user_id):
    plays = list(plays_col.find({"user_id": user_id}, {"_id": 0}))
    favs = list(favs_col.find({"user_id": user_id}, {"_id": 0}))
    return plays, favs

# --- Queue ---
def add_queue(song):
    queue_col.insert_one(song)

def get_queue():
    return list(queue_col.find({}, {"_id": 0}))

def pop_next():
    song = queue_col.find_one()
    if song:
        queue_col.delete_one({"_id": song["_id"]})
        del song["_id"]
    return song

# --- Listeners ---
def join_listener(user_id, name, photo):
    listeners_col.update_one(
        {"user_id": user_id},
        {"$set": {"name": name, "photo": photo}},
        upsert=True
    )

def get_listeners():
    users = list(listeners_col.find({}, {"_id": 0}))
    return {"count": len(users), "users": users}
