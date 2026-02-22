import sqlite3
import json

def update_db():
    conn = sqlite3.connect('instance/users.db') # Flask-SQLAlchemy defaults to instance/
    cursor = conn.cursor()

    try:
        # Check if owned_skins already exists to avoid errors on multiple runs
        cursor.execute("PRAGMA table_info(user)")
        columns = [info[1] for info in cursor.fetchall()]
        
        if 'owned_skins' not in columns:
            default_skins = json.dumps(["default"])
            print("Adding owned_skins column...")
            cursor.execute(f"ALTER TABLE user ADD COLUMN owned_skins TEXT DEFAULT '{default_skins}'")
            
        if 'equipped_skin' not in columns:
            print("Adding equipped_skin column...")
            cursor.execute("ALTER TABLE user ADD COLUMN equipped_skin VARCHAR DEFAULT 'default'")
            
        conn.commit()
        print("Database update successful!")
    except Exception as e:
        print(f"Error updating database: {e}")
    finally:
        conn.close()

if __name__ == '__main__':
    update_db()
