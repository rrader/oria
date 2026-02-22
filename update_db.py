import sqlite3
import json

def update_database():
    conn = sqlite3.connect('instance/users.db')
    cursor = conn.cursor()

    try:
        cursor.execute("ALTER TABLE user ADD COLUMN level INTEGER DEFAULT 1")
    except sqlite3.OperationalError:
        pass
        
    try:
        cursor.execute("ALTER TABLE user ADD COLUMN xp INTEGER DEFAULT 0")
    except sqlite3.OperationalError:
        pass
        
    try:
        cursor.execute("ALTER TABLE user ADD COLUMN coins INTEGER DEFAULT 0")
    except sqlite3.OperationalError:
        pass
        
    try:
        cursor.execute("ALTER TABLE user ADD COLUMN chat_history TEXT DEFAULT '[]'")
    except sqlite3.OperationalError:
        pass
        
    try:
        cursor.execute("ALTER TABLE user ADD COLUMN quests TEXT DEFAULT '[]'")
    except sqlite3.OperationalError:
        pass

    conn.commit()
    print("Successfully updated the database schema.")
    conn.close()

if __name__ == '__main__':
    update_database()
