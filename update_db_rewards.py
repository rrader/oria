import sqlite3

def update_database():
    conn = sqlite3.connect('instance/users.db')
    cursor = conn.cursor()

    for col, definition in [
        ('claimed_rewards', "TEXT DEFAULT '[1]'"),
        ('equipped_title',  "TEXT DEFAULT ''"),
    ]:
        try:
            cursor.execute(f"ALTER TABLE user ADD COLUMN {col} {definition}")
            print(f"Added column: {col}")
        except sqlite3.OperationalError:
            print(f"Column {col} already exists, skipping.")

    # Ensure existing users have [1] as claimed_rewards (not NULL)
    cursor.execute("UPDATE user SET claimed_rewards = '[1]' WHERE claimed_rewards IS NULL OR claimed_rewards = ''")
    cursor.execute("UPDATE user SET equipped_title = '' WHERE equipped_title IS NULL")

    conn.commit()
    print("Database schema updated successfully.")
    conn.close()

if __name__ == '__main__':
    update_database()
