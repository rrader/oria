from flask import Blueprint, render_template, request, redirect, url_for, session, flash
from werkzeug.security import generate_password_hash, check_password_hash
from models import db, User

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/register', methods=['GET', 'POST'])
def register():
    if 'user_id' in session:
        return redirect(url_for('views.home'))

    if request.method == 'POST':
        name = request.form.get('name')
        email = request.form.get('e-mail')
        password = request.form.get('password')
        pronouns_list = request.form.getlist('pronoun')
        pronouns = ", ".join(pronouns_list)
        
        existing_user = User.query.filter((User.username == name) | (User.email == email)).first()
        if existing_user:
            if check_password_hash(existing_user.password, password):
                session['user_id'] = existing_user.id
                session['username'] = existing_user.username
                return redirect(url_for('views.home'))
            flash("User with this name or email already exists!", "error")
            return redirect(url_for('auth.register'))

        hashed_password = generate_password_hash(password, method='pbkdf2:sha256')
        new_user = User(username=name, email=email, password=hashed_password, pronouns=pronouns)
        db.session.add(new_user)
        db.session.commit()

        session['user_id'] = new_user.id
        session['username'] = new_user.username
        return redirect(url_for('views.onboarding'))

    return render_template('register.html')

@auth_bp.route('/login', methods=['GET', 'POST'])
def login():
    if 'user_id' in session:
        return redirect(url_for('views.home'))

    if request.method == 'POST':
        email = request.form.get('e-mail')
        password = request.form.get('password')
        
        user = User.query.filter_by(email=email).first()
        if user and check_password_hash(user.password, password):
            session['user_id'] = user.id
            session['username'] = user.username
            return redirect(url_for('views.home'))
        else:
            flash("Invalid email or password!", "error")
            return redirect(url_for('auth.login'))

    return render_template('login.html')

@auth_bp.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('auth.register'))
