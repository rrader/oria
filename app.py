from flask import Flask, render_template, request, redirect, url_for, session
from flask_sqlalchemy import SQLAlchemy
import os

app = Flask(__name__)
app.secret_key = 'oria_very_secret_key' # In production, use a secure random key

# Database Configuration
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///users.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# User Model
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(120), nullable=False)
    pronouns = db.Column(db.String(200)) # Stored as comma-separated string

    def __init__(self, username, email, password, pronouns=""):
        self.username = username
        self.email = email
        self.password = password
        self.pronouns = pronouns

    def __repr__(self):
        return f'<User {self.username}>'

# Create database tables
with app.app_context():
    db.create_all()

@app.route('/')
def index():
    if 'user_id' in session:
        return redirect(url_for('home'))
    return redirect(url_for('register'))

@app.route('/register', methods=['GET', 'POST'])
def register():
    if 'user_id' in session:
        return redirect(url_for('home'))

    if request.method == 'POST':
        # Get data from form
        name = request.form.get('name')
        email = request.form.get('e-mail')
        password = request.form.get('password')
        pronouns_list = request.form.getlist('pronoun')
        pronouns = ", ".join(pronouns_list)
        
        # Check if user already exists
        existing_user = User.query.filter((User.username == name) | (User.email == email)).first()
        if existing_user:
            if existing_user.password == password:
                session['user_id'] = existing_user.id
                session['username'] = existing_user.username
                return redirect(url_for('home'))
            return "User with this name or email already exists!"

        # Create and save new user
        new_user = User(username=name, email=email, password=password, pronouns=pronouns)
        db.session.add(new_user)
        db.session.commit()

        # Save user to session to "remember" them
        session['user_id'] = new_user.id
        session['username'] = new_user.username

        print(f"User saved to DB and logged in: {new_user}")
        return redirect(url_for('onboarding'))

    return render_template('register.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if 'user_id' in session:
        return redirect(url_for('home'))

    if request.method == 'POST':
        email = request.form.get('e-mail')
        password = request.form.get('password')
        
        user = User.query.filter_by(email=email).first()
        if user and user.password == password:
            session['user_id'] = user.id
            session['username'] = user.username
            return redirect(url_for('home'))
        else:
            return "Invalid email or password!"

    return render_template('login.html')

@app.route('/onboarding', methods=['GET', 'POST'])
def onboarding():
    if 'user_id' not in session:
        return redirect(url_for('register'))
    
    if request.method == 'POST':
        return redirect(url_for('home'))

    return render_template('onboarding.html')

@app.route('/home')
def home():
    if 'user_id' not in session:
        return redirect(url_for('register'))
    
    # Retrieve user from DB to ensure they still exist
    user = db.session.get(User, session['user_id'])
    if not user:
        session.clear()
        return redirect(url_for('register'))

    return render_template('homes.html', user=user)

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('register'))

if __name__ == '__main__':
    app.run(debug=True)
