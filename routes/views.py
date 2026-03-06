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
        user = db.session.get(User, session['user_id'])
        if user:
            onboarding = {
                'q1': request.form.get('q1', '').strip(),
                'q2': request.form.get('q2', '').strip(),
                'q3': request.form.get('q3', '').strip(),
                'q4': request.form.get('q4', '').strip(),
                'q5': request.form.get('q5', '').strip(),
            }
            user.set_onboarding_data(onboarding)
            db.session.commit()
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
