# db.py
from pymongo import MongoClient, ASCENDING
import os
from bson.objectid import ObjectId
from datetime import datetime

# prefer env var; fallback to the URI you provided (update if you want)
MONGO_URI = os.environ.get("MONGO_URI",
    "mongodb+srv://BADMUNDA:BADMYDAD@badhacker.i5nw9na.mongodb.net/?retryWrites=true&w=majority")

client = MongoClient(MONGO_URI)
db = client.get_database("badmusic_app")  # database name

plays_col = db.plays
favs_col = db.favorites
queue_col = db.queue
listeners_col = db.listeners
state_col = db.state  # single doc for current playing state

def init_db():
    # create simple indexes
    plays_col.create_index([("user_id", ASCENDING)])
    favs_col.create_index([("user_id", ASCENDING)])
    queue_col.create_index([("created_at", ASCENDING)])
    listeners_col.create_index([("user_id", ASCENDING)], unique=True)
    # ensure state doc exists
    if state_col.count_documents({}) == 0:
        state_col.insert_one({"current": None, "updated_at": datetime.utcnow()})

# Plays (store structured record)
def add_play(user_id, title, artist, audio, thumb):
    plays_col.insert_one({
        "user_id": str(user_id),
        "title": title or "",
        "artist": artist or "",
        "audio": audio or "",
        "thumb": thumb or "",
        "ts": datetime.utcnow()
    })

# Favorites
def add_favorite(user_id, title, artist, audio, thumb):
    favs_col.insert_one({
        "user_id": str(user_id),
        "title": title or "",
        "artist": artist or "",
        "audio": audio or "",
        "thumb": thumb or "",
        "ts": datetime.utcnow()
    })

def get_user_data(user_id, limit=50):
    uid = str(user_id)
    plays_cursor = plays_col.find({"user_id": uid}).sort("ts", -1).limit(limit)
    favs_cursor = favs_col.find({"user_id": uid}).sort("ts", -1).limit(limit)
    plays = [{"title": r.get("title",""), "artist": r.get("artist",""), "audio": r.get("audio",""), "thumb": r.get("thumb","")} for r in plays_cursor]
    favs = [{"title": r.get("title",""), "artist": r.get("artist",""), "audio": r.get("audio",""), "thumb": r.get("thumb","")} for r in favs_cursor]
    return plays, favs

# Queue: add, list, pop (FIFO)
def add_queue_item(title, artist, audio, thumb):
    queue_col.insert_one({
        "title": title or "",
        "artist": artist or "",
        "audio": audio or "",
        "thumb": thumb or "",
        "created_at": datetime.utcnow()
    })

def get_queue_items(limit=50):
    cur = queue_col.find().sort("created_at", ASCENDING).limit(limit)
    return [{"id": str(r["_id"]), "title": r.get("title",""), "artist": r.get("artist",""), "audio": r.get("audio",""), "thumb": r.get("thumb","")} for r in cur]

def pop_next():
    # grab earliest item and delete it atomically (findOneAndDelete)
    doc = queue_col.find_one_and_delete({}, sort=[("created_at", ASCENDING)])
    if doc:
        return {"title": doc.get("title",""), "artist": doc.get("artist",""), "audio": doc.get("audio",""), "thumb": doc.get("thumb","")}
    return None

# Listeners (in-memory style but persisted in collection)
def add_listener(user_id, name, photo_url):
    uid = str(user_id)
    listeners_col.update_one({"user_id": uid}, {"$set": {"user_id": uid, "name": name or "", "photo_url": photo_url or "", "joined_at": datetime.utcnow()}}, upsert=True)

def remove_listener(user_id):
    uid = str(user_id)
    listeners_col.delete_one({"user_id": uid})

def get_listeners():
    cur = listeners_col.find()
    users = [{"user_id": r.get("user_id"), "name": r.get("name"), "photo_url": r.get("photo_url")} for r in cur]
    return users

# State: current playing song + position (so resume works)
def set_current(song):
    # song is dict or None
    state_col.update_one({}, {"$set": {"current": song, "updated_at": datetime.utcnow()}})

def get_current():
    s = state_col.find_one({})
    if not s:
        return None
    return s.get("current")

# helper to clear collections for debug (optional)
def _clear_all():
    plays_col.delete_many({})
    favs_col.delete_many({})
    queue_col.delete_many({})
    listeners_col.delete_many({})
    state_col.delete_many({})
