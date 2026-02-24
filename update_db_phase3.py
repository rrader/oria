import sqlite3

def upgrade_db():
    try:
        conn = sqlite3.connect('instance/users.db')
        cursor = conn.cursor()

        # Add current_streak
        try:
            cursor.execute("ALTER TABLE user ADD COLUMN current_streak INTEGER DEFAULT 0")
            print("Added 'current_streak' column.")
        except sqlite3.OperationalError as e:
            if "duplicate column name" in str(e).lower():
                print("'current_streak' column already exists.")
            else:
                print(f"Error adding 'current_streak': {e}")
                
        # Add last_active_date
        try:
            cursor.execute("ALTER TABLE user ADD COLUMN last_active_date VARCHAR(20) DEFAULT ''")
            print("Added 'last_active_date' column.")
        except sqlite3.OperationalError as e:
            if "duplicate column name" in str(e).lower():
                print("'last_active_date' column already exists.")
            else:
                print(f"Error adding 'last_active_date': {e}")

        # Add achievements
        try:
            cursor.execute("ALTER TABLE user ADD COLUMN achievements TEXT DEFAULT '[]'")
            print("Added 'achievements' column.")
        except sqlite3.OperationalError as e:
            if "duplicate column name" in str(e).lower():
                print("'achievements' column already exists.")
            else:
                print(f"Error adding 'achievements': {e}")

        conn.commit()
    except Exception as e:
        print(f"Database error: {e}")
    finally:
        if 'conn' in locals():
            conn.close()

if __name__ == '__main__':
    upgrade_db()
