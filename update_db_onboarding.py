import sqlite3

def update_database():
    conn = sqlite3.connect('instance/users.db')
    cursor = conn.cursor()

    try:
        cursor.execute("ALTER TABLE user ADD COLUMN onboarding_data TEXT DEFAULT '{}'")
        print("Added column: onboarding_data")
    except sqlite3.OperationalError:
        print("Column onboarding_data already exists, skipping.")

    conn.commit()
    print("Database schema updated successfully.")
    conn.close()

if __name__ == '__main__':
    update_database()
