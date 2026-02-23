from flask_sqlalchemy import SQLAlchemy
import json

db = SQLAlchemy()

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(120), nullable=False)
    pronouns = db.Column(db.String(200)) # Stored as comma-separated string
    level = db.Column(db.Integer, default=1)
    xp = db.Column(db.Integer, default=0)
    coins = db.Column(db.Integer, default=0)
    chat_history = db.Column(db.Text, default='[]')
    quests = db.Column(db.Text, default='[]')
    owned_skins = db.Column(db.Text, default='["default"]')
    equipped_skin = db.Column(db.String(50), default='default')
    daily_quests = db.Column(db.Text, default='[]')
    last_daily_date = db.Column(db.String(20), default='')

    def __init__(self, username, email, password, pronouns=""):
        self.username = username
        self.email = email
        self.password = password
        self.pronouns = pronouns
        self.level = 1
        self.xp = 0
        self.coins = 0
        self.chat_history = '[]'
        self.quests = '[]'
        self.owned_skins = '["default"]'
        self.equipped_skin = 'default'
        self.daily_quests = '[]'
        self.last_daily_date = ''

    def get_chat_history(self):
        try:
            return json.loads(self.chat_history)
        except Exception:
            return []

    def set_chat_history(self, history_list):
        self.chat_history = json.dumps(history_list)

    def get_quests(self):
        try:
            return json.loads(self.quests)
        except Exception:
            return []

    def set_quests(self, quests_list):
        self.quests = json.dumps(quests_list)

    def get_daily_quests(self):
        try:
            return json.loads(self.daily_quests)
        except Exception:
            return []

    def set_daily_quests(self, daily_list):
        self.daily_quests = json.dumps(daily_list)

    def get_owned_skins(self):
        try:
            return json.loads(self.owned_skins)
        except Exception:
            return ["default"]

    def set_owned_skins(self, skins_list):
        self.owned_skins = json.dumps(skins_list)

    def __repr__(self):
        return f'<User {self.username}>'
