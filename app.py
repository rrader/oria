from flask import Flask, render_template, request, redirect, url_for, session, jsonify, flash
from flask_sqlalchemy import SQLAlchemy
import os
import json
from dotenv import load_dotenv
from openai import OpenAI

# Load environment variables
load_dotenv('config.env')

app = Flask(__name__)
app.secret_key = 'oria_very_secret_key' # In production, use a secure random key

# Database Configuration
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'sqlite:///users.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# User Model
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(120), nullable=False)
    pronouns = db.Column(db.String(200)) # Stored as comma-separated string
    level = db.Column(db.Integer, default=1)
    xp = db.Column(db.Integer, default=0)
    coins = db.Column(db.Integer, default=0)
    chat_history = db.Column(db.Text, default='[]')
    quests = db.Column(db.Text, default='[]')
    owned_skins = db.Column(db.Text, default='["default"]')
    equipped_skin = db.Column(db.String(50), default='default')

    def __init__(self, username, email, password, pronouns=""):
        self.username = username
        self.email = email
        self.password = password
        self.pronouns = pronouns
        self.level = 1
        self.xp = 0
        self.coins = 0
        self.chat_history = '[]'
        self.quests = '[]'
        self.owned_skins = '["default"]'
        self.equipped_skin = 'default'

    def get_chat_history(self):
        try:
            return json.loads(self.chat_history)
        except Exception:
            return []

    def set_chat_history(self, history_list):
        self.chat_history = json.dumps(history_list)

    def get_quests(self):
        try:
            return json.loads(self.quests)
        except Exception:
            return []

    def set_quests(self, quests_list):
        self.quests = json.dumps(quests_list)

    def get_owned_skins(self):
        try:
            return json.loads(self.owned_skins)
        except Exception:
            return ["default"]

    def set_owned_skins(self, skins_list):
        self.owned_skins = json.dumps(skins_list)

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
            flash("User with this name or email already exists!", "error")
            return redirect(url_for('register'))

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
            flash("Invalid email or password!", "error")
            return redirect(url_for('login'))

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

# --- API ROUTES --- #

@app.route('/api/user/state', methods=['GET'])
def get_user_state():
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    user = db.session.get(User, session['user_id'])
    if not user:
        return jsonify({'error': 'User not found'}), 404
        
    return jsonify({
        'level': user.level,
        'xp': user.xp,
        'coins': user.coins,
        'quests': user.get_quests(),
        'owned_skins': user.get_owned_skins(),
        'equipped_skin': user.equipped_skin
    })

@app.route('/api/user/update', methods=['POST'])
def update_user_state():
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    user = db.session.get(User, session['user_id'])
    if not user:
        return jsonify({'error': 'User not found'}), 404
        
    data = request.json
    if not data:
        return jsonify({'error': 'Invalid payload'}), 400
        
    if 'xp' in data:
        user.xp = data['xp']
    if 'level' in data:
        user.level = data['level']
    if 'coins' in data:
        user.coins = data['coins']
    if 'quests' in data:
        user.set_quests(data['quests'])
        
    db.session.commit()
    return jsonify({'success': True})

@app.route('/api/chat', methods=['POST'])
def api_chat():
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    user = db.session.get(User, session['user_id'])
    if not user:
        return jsonify({'error': 'User not found'}), 404
        
    data = request.json
    if not data or 'message' not in data:
        return jsonify({'error': 'Invalid payload'}), 400
        
    user_msg = data['message']
    is_quick_quest = data.get('quick_quest', False)
    
    chat_history = user.get_chat_history()
    
    # Base system prompt for persona
    system_prompt = {
        "role": "system",
        "content": (
            "You are ORIA, a Cyberpunk System Guide and Productivity Assistant. "
            "You are an AI connected to the user's neural link, helping them level up in real life. "
            "You act slightly edgy but deeply supportive, breaking tasks into actionable step-by-step quests. "
            "Your persona should shine through in every response. "
            "IMPORTANT: If the user asks you to create a quest, or if you suggest a quest and the user agrees, "
            "you MUST call the `create_rpg_quest` tool to save it to the system. Do not just output it as plain text. "
            "CRITICAL: You have full access to the user's past messages provided in this conversation context. "
            "NEVER say that you do not have memory of past dialogues. Use the history to provide personalized answers."
        )
    }
    
    if is_quick_quest:
        # Strict constraint for QUICK QUEST
        quick_quest_prompt = {
            "role": "user",
            "content": (
                f"Break down this goal into a structured quest with sub-tasks: '{user_msg}'. "
                "You MUST bypass normal conversation and return the result STRICTLY as a valid JSON object. "
                "The JSON must have the following structure: "
                '{"title": "Quest Title", "difficulty": "Hard/Medium/Easy", "progress": 0, "sub_tasks": [{"id": 1, "task": "Short Subtask Name", "task_description": "A detailed explanation of what this entails.", "completed": false, "xp_reward": 50}]} '
                "ALL text values in the JSON (titles, difficulty, task descriptions) MUST be strictly in English."
            )
        }
        
        messages = [system_prompt, quick_quest_prompt]
    else:
        # Standard conversation
        messages = [system_prompt] + chat_history
        messages.append({"role": "user", "content": user_msg})
        
    try:
        api_key = os.environ.get("OPENAI_API_KEY")
        if not api_key:
            return jsonify({'error': 'OpenAI API key missing in config.env'}), 500
            
        client = OpenAI(api_key=api_key)
        
        tools = [
            {
                "type": "function",
                "function": {
                    "name": "create_rpg_quest",
                    "description": "Create a structured RPG quest and save it to the user's active quests.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "title": {
                                "type": "string",
                                "description": "The title of the quest."
                            },
                            "difficulty": {
                                "type": "string",
                                "description": "Difficulty level: Easy, Medium, or Hard."
                            },
                            "progress": {
                                "type": "integer",
                                "description": "Initial progress, should always be 0."
                            },
                            "sub_tasks": {
                                "type": "array",
                                "items": {
                                    "type": "object",
                                    "properties": {
                                        "id": {"type": "integer", "description": "Subtask ID, starting from 1."},
                                        "task": {"type": "string", "description": "Short name of the sub-task."},
                                        "task_description": {"type": "string", "description": "Detailed explanation and engaging lore of the sub-task requirements."},
                                        "completed": {"type": "boolean", "description": "Should be false."},
                                        "xp_reward": {"type": "integer", "description": "XP received for completing this sub-task."}
                                    },
                                    "required": ["id", "task", "task_description", "completed", "xp_reward"]
                                }
                            }
                        },
                        "required": ["title", "difficulty", "progress", "sub_tasks"]
                    }
                }
            }
        ]

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            response_format={"type": "json_object"} if is_quick_quest else None,
            tools=None if is_quick_quest else tools,
            tool_choice="auto" if not is_quick_quest else None
        )
        
        response_message = response.choices[0].message
        
        if not is_quick_quest:
            # Check if the model called a tool
            if response_message.tool_calls:
                tool_call = response_message.tool_calls[0]
                if tool_call.function.name == "create_rpg_quest":
                    quest_args = json.loads(tool_call.function.arguments)
                    
                    # Save the quest to the user's database
                    user_quests = user.get_quests()
                    user_quests.append(quest_args)
                    user.set_quests(user_quests)
                    
                    # Append interaction to chat history CORRECTLY ordered
                    chat_history.append({"role": "user", "content": user_msg})
                    chat_history.append({
                        "role": "assistant", 
                        "content": "",
                        "tool_calls": [
                            {
                                "id": tool_call.id,
                                "type": "function",
                                "function": {
                                    "name": "create_rpg_quest",
                                    "arguments": tool_call.function.arguments
                                }
                            }
                        ]
                    })
                    chat_history.append({
                        "role": "tool",
                        "tool_call_id": tool_call.id,
                        "name": "create_rpg_quest",
                        "content": "Quest successfully saved to database."
                    })
                    
                    # Get final conversational response from AI
                    second_response = client.chat.completions.create(
                        model="gpt-4o-mini",
                        messages=[system_prompt] + chat_history
                    )
                    final_reply = second_response.choices[0].message.content
                    chat_history.append({"role": "assistant", "content": final_reply})
                    
                    if len(chat_history) > 20:
                        chat_history = chat_history[-20:]
                    
                    user.set_chat_history(chat_history)
                    db.session.commit()
                    
                    return jsonify({'reply': final_reply, 'quest_added': True, 'quest': quest_args})
            else:
                ai_msg = response_message.content
                # Save standard chat history
                chat_history.append({"role": "user", "content": user_msg})
                chat_history.append({"role": "assistant", "content": ai_msg})
                
                if len(chat_history) > 20:
                    chat_history = chat_history[-20:]
                    
                user.set_chat_history(chat_history)
                db.session.commit()
                
                return jsonify({'reply': ai_msg})
        else:
            # Quick Quest: Parse JSON and return
            ai_msg = response_message.content
            quest_data = json.loads(ai_msg)
            return jsonify({'quest': quest_data})
            
    except Exception as e:
        print(f"OpenAI Error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/chat/history', methods=['GET'])
def api_chat_history():
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    user = db.session.get(User, session['user_id'])
    if not user:
        return jsonify({'error': 'User not found'}), 404
        
    raw_history = user.get_chat_history()
    
    # Filter out internal tool/function calls so the UI only gets standard chat bubbles
    clean_history = []
    for msg in raw_history:
        if msg.get("role") in ["user", "assistant"]:
            # If it's an assistant message with NO content, it was a hidden tool invocation
            if msg.get("role") == "assistant" and not msg.get("content"):
                continue
            clean_history.append({
                "role": msg.get("role"),
                "content": msg.get("content")
            })
            
    return jsonify({'history': clean_history})

@app.route('/api/quiz/generate', methods=['POST'])
def api_quiz_generate():
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
        
    data = request.json
    if not data or 'topic' not in data:
        return jsonify({'error': 'Invalid payload'}), 400
        
    topic = data['topic']
    
    try:
        api_key = os.environ.get("OPENAI_API_KEY")
        if not api_key:
            return jsonify({'error': 'OpenAI API key missing'}), 500
            
        client = OpenAI(api_key=api_key)
        
        system_prompt = {
            "role": "system",
            "content": (
                "You are an educational AI assistant that creates engaging multiple-choice quizzes. "
                "Generate a quiz strictly based on the provided topic. Return ONLY a valid JSON object. "
                "The JSON MUST have the structure: "
                '{"questions": [{"question": "...", "options": ["...", "...", "...", "..."], "correct_option_index": 0}]}'
                "Ensure there are exactly 4 options for each question, and the correct_option_index is between 0 and 3."
            )
        }
        
        user_prompt = {
            "role": "user",
            "content": f"Create a 3-5 question multiple-choice quiz about this specific sub-quest topic: '{topic}'"
        }
        
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[system_prompt, user_prompt],
            response_format={"type": "json_object"}
        )
        
        quiz_data = json.loads(response.choices[0].message.content)
        return jsonify({'quiz': quiz_data.get('questions', [])})
        
    except Exception as e:
        print(f"OpenAI Error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/quiz/explain', methods=['POST'])
def api_quiz_explain():
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
        
    data = request.json
    if not data or 'question' not in data or 'user_answer' not in data or 'correct_answer' not in data:
        return jsonify({'error': 'Invalid payload'}), 400
        
    question = data['question']
    user_answer = data['user_answer']
    correct_answer = data['correct_answer']
    
    try:
        api_key = os.environ.get("OPENAI_API_KEY")
        if not api_key:
            return jsonify({'error': 'OpenAI API key missing'}), 500
            
        client = OpenAI(api_key=api_key)
        
        system_prompt = {
            "role": "system",
            "content": (
                "You are ORIA, a Cyberpunk System Guide. Provide a short, punchy, 1-2 sentence explanation. "
                "Explain why the user's answer was wrong (if it was) and why the correct answer is right. "
                "Keep the tone encouraging but slightly edgy."
            )
        }
        
        user_prompt = {
            "role": "user",
            "content": f"Question: {question}\nUser's Answer: {user_answer}\nCorrect Answer: {correct_answer}\nPlease explain."
        }
        
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[system_prompt, user_prompt]
        )
        
        explanation = response.choices[0].message.content
        return jsonify({'explanation': explanation})
        
    except Exception as e:
        print(f"OpenAI Error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/store/buy', methods=['POST'])
def api_store_buy():
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    user = db.session.get(User, session['user_id'])
    if not user:
        return jsonify({'error': 'User not found'}), 404
        
    data = request.json
    if not data or 'skin_id' not in data or 'price' not in data:
        return jsonify({'error': 'Invalid payload'}), 400
        
    skin_id = data['skin_id']
    price = int(data['price'])
    
    owned_skins = user.get_owned_skins()
    
    if skin_id in owned_skins:
        return jsonify({'error': 'Skin already owned'}), 400
        
    if user.coins < price:
        return jsonify({'error': 'Not enough coins'}), 400
        
    user.coins -= price
    owned_skins.append(skin_id)
    user.set_owned_skins(owned_skins)
    user.equipped_skin = skin_id
    
    db.session.commit()
    return jsonify({'success': True, 'coins': user.coins, 'equipped_skin': skin_id})

@app.route('/api/store/equip', methods=['POST'])
def api_store_equip():
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    user = db.session.get(User, session['user_id'])
    if not user:
        return jsonify({'error': 'User not found'}), 404
        
    data = request.json
    if not data or 'skin_id' not in data:
        return jsonify({'error': 'Invalid payload'}), 400
        
    skin_id = data['skin_id']
    owned_skins = user.get_owned_skins()
    
    if skin_id not in owned_skins:
        return jsonify({'error': 'Skin not owned'}), 400
        
    user.equipped_skin = skin_id
    db.session.commit()
    return jsonify({'success': True, 'equipped_skin': skin_id})

if __name__ == '__main__':
    app.run(debug=True, port=5001)
