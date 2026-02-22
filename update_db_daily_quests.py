import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), 'instance', 'users.db')

def update_database():
    if not os.path.exists(DB_PATH):
        print(f"Error: Database not found at {DB_PATH}. Run the app first.")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    try:
        # Add daily_quests column
        cursor.execute("ALTER TABLE user ADD COLUMN daily_quests TEXT DEFAULT '[]'")
        print("Successfully added 'daily_quests' column.")
    except sqlite3.OperationalError as e:
        print(f"Column 'daily_quests' might already exist: {e}")

    try:
        # Add last_daily_date column
        cursor.execute("ALTER TABLE user ADD COLUMN last_daily_date VARCHAR(20) DEFAULT ''")
        print("Successfully added 'last_daily_date' column.")
    except sqlite3.OperationalError as e:
        print(f"Column 'last_daily_date' might already exist: {e}")

    conn.commit()
    conn.close()
    print("Database update complete.")

if __name__ == '__main__':
    update_database()
