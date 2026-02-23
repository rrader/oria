from flask import Blueprint, render_template, redirect, url_for, session
from models import db, User

views_bp = Blueprint('views', __name__)

@views_bp.route('/')
def index():
    if 'user_id' in session:
        return redirect(url_for('views.home'))
    return render_template('landing.html')

@views_bp.route('/onboarding', methods=['GET', 'POST'])
def onboarding():
    from flask import request
    if 'user_id' not in session:
        return redirect(url_for('auth.register'))
    
    if request.method == 'POST':
        return redirect(url_for('views.home'))

    return render_template('onboarding.html')

@views_bp.route('/home')
def home():
    if 'user_id' not in session:
        return redirect(url_for('auth.register'))
    
    user = db.session.get(User, session['user_id'])
    if not user:
        session.clear()
        return redirect(url_for('auth.register'))

    return render_template('homes.html', user=user)
