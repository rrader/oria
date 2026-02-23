from app import app, db, User
from werkzeug.security import generate_password_hash

def hash_existing_passwords():
    with app.app_context():
        users = User.query.all()
        updated_count = 0
        
        for user in users:
            # Check if password is already hashed (pbkdf2:sha256 generally starts with pbkdf2)
            if user.password and not user.password.startswith('pbkdf2:'):
                try:
                    hashed_pwd = generate_password_hash(user.password, method='pbkdf2:sha256')
                    user.password = hashed_pwd
                    updated_count += 1
                except Exception as e:
                    print(f"Failed to hash password for user {user.username}: {e}")
        
        if updated_count > 0:
            db.session.commit()
            print(f"Successfully hashed passwords for {updated_count} users.")
        else:
            print("No plaintext passwords found to update.")

if __name__ == "__main__":
    hash_existing_passwords()
