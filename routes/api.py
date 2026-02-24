import os
import json
import datetime
import random
from flask import Blueprint, request, jsonify, session
from openai import OpenAI
from models import db, User

api_bp = Blueprint('api', __name__, url_prefix='/api')

def _generate_daily_quests(user):
    today_str = datetime.date.today().isoformat()
    active_quests = [q for q in user.get_quests() if q.get('status') != 'completed']
    all_incomplete_subtasks = []
    for quest in active_quests:
        for sub_task in quest.get('sub_tasks', []):
            if not sub_task.get('completed', False):
                all_incomplete_subtasks.append(sub_task.get('task', 'Unknown Task'))

    static_tasks_pool = [
        "drink water",
        "do a 5 minute warm-up",
        "air out the room",
        "read 10 pages of a book",
        "go for a 15 minute walk",
        "write down three things you're grateful for today"
    ]

    if len(all_incomplete_subtasks) >= 2:
        chosen_tasks = random.sample(all_incomplete_subtasks, 2)
    elif len(all_incomplete_subtasks) == 1:
        chosen_tasks = [all_incomplete_subtasks[0], random.choice(static_tasks_pool)]
    else:
        chosen_tasks = random.sample(static_tasks_pool, 2)
    
    daily_quests = [
        {"id": "daily_1", "task": chosen_tasks[0], "completed": False, "xp_reward": 20},
        {"id": "daily_2", "task": chosen_tasks[1], "completed": False, "xp_reward": 20}
    ]

    try:
        client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": f'You are ORIA, a Cyberpunk System Guide. Here are two daily tasks the user already has: "{chosen_tasks[0]}" and "{chosen_tasks[1]}". Generate a 3rd unique, very simple daily physical/mental wellbeing task (e.g., "do a 2-minute eye rest exercise", "stretch your neck and shoulders", "do 10 squats"). The new task MUST BE WRITTEN IN ENGLISH. Return ONLY a valid JSON object: {{"task": "Task name here", "completed": false, "xp_reward": 20}}'}
            ],
            temperature=0.7
        )
        ai_data = json.loads(response.choices[0].message.content.strip("```json\n "))
        ai_data["id"] = "daily_3"
        if "completed" not in ai_data: ai_data["completed"] = False
        if "xp_reward" not in ai_data: ai_data["xp_reward"] = 20
        daily_quests.append(ai_data)
    except Exception as e:
        print(f"Error generating AI daily task: {e}")
        daily_quests.append({"id": "daily_3", "task": "Smile at your reflection", "completed": False, "xp_reward": 20})

    user.set_daily_quests(daily_quests)
    user.last_daily_date = today_str
    db.session.commit()

@api_bp.route('/user/state', methods=['GET'])
def get_user_state():
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    user = db.session.get(User, session['user_id'])
    if not user:
        return jsonify({'error': 'User not found'}), 404
        
    today_date = datetime.date.today()
    today_str = today_date.isoformat()
    
    if user.last_daily_date != today_str:
        _generate_daily_quests(user)

    # Streak logic
    if user.last_active_date != today_str:
        if user.last_active_date:
            try:
                last_active = datetime.date.fromisoformat(user.last_active_date)
                if last_active == today_date - datetime.timedelta(days=1):
                    user.current_streak += 1
                else:
                    user.current_streak = 1
            except ValueError:
                user.current_streak = 1
        else:
            user.current_streak = 1
            
        user.last_active_date = today_str
        db.session.commit()

    return jsonify({
        'level': user.level,
        'xp': user.xp,
        'coins': user.coins,
        'quests': user.get_quests(),
        'daily_quests': user.get_daily_quests(),
        'owned_skins': user.get_owned_skins(),
        'equipped_skin': user.equipped_skin,
        'current_streak': user.current_streak,
        'achievements': user.get_achievements()
    })

@api_bp.route('/user/daily_refresh', methods=['POST'])
def refresh_daily_quests():
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    user = db.session.get(User, session['user_id'])
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    _generate_daily_quests(user)
    
    return jsonify({
        'success': True,
        'daily_quests': user.get_daily_quests()
    })

@api_bp.route('/user/update', methods=['POST'])
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
    if 'achievements' in data:
        user.set_achievements(data['achievements'])
        
    current_achievements = user.get_achievements()
    newly_unlocked = []
    
    # Check Initiate Achievement
    if 'initiate' not in current_achievements:
        has_completed_task = False
        if 'quests' in data:
            for q in data['quests']:
                if q.get('status') == 'completed' or any(st.get('completed') for st in q.get('sub_tasks', [])):
                    has_completed_task = True
                    break
                    
        # Consider an achievement granted if they gained any progression
        if has_completed_task or user.xp > 0 or user.level > 1 or user.coins > 0:
            current_achievements.append('initiate')
            newly_unlocked.append('initiate')
            
    # Check On Fire Achievement
    if 'on_fire' not in current_achievements:
        if user.current_streak >= 3:
            current_achievements.append('on_fire')
            newly_unlocked.append('on_fire')
            
    if newly_unlocked:
        user.set_achievements(current_achievements)
        
    db.session.commit()
    
    response_data = {'success': True}
    if newly_unlocked:
        response_data['newly_unlocked'] = newly_unlocked
        
    return jsonify(response_data)

@api_bp.route('/chat', methods=['POST'])
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
    
    system_prompt = {
        "role": "system",
        "content": (
            "You are ORIA, a opossum and Productivity Assistant and girl. "
            "You are an AI connected to the user's chat, helping them level up in real life. "
            "You act slightly edgy but deeply supportive, breaking tasks into actionable step-by-step quests. "
            "Your persona should shine through in every response. "
            "IMPORTANT: If the user asks you to create a quest, or if you suggest a quest and the user agrees, "
            "you MUST call the `create_rpg_quest` tool to save it to the system. Do not just output it as plain text. "
            "CRITICAL: You have full access to the user's past messages provided in this conversation context. "
            "NEVER say that you do not have memory of past dialogues. Use the history to provide personalized answers."
        )
    }
    
    if is_quick_quest:
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
                            "title": {"type": "string", "description": "The title of the quest."},
                            "difficulty": {"type": "string", "description": "Difficulty level: Easy, Medium, or Hard."},
                            "progress": {"type": "integer", "description": "Initial progress, should always be 0."},
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
            if response_message.tool_calls:
                tool_call = response_message.tool_calls[0]
                if tool_call.function.name == "create_rpg_quest":
                    quest_args = json.loads(tool_call.function.arguments)
                    
                    user_quests = user.get_quests()
                    user_quests.append(quest_args)
                    user.set_quests(user_quests)
                    
                    chat_history.append({"role": "user", "content": user_msg})
                    chat_history.append({
                        "role": "assistant", 
                        "content": "",
                        "tool_calls": [{
                            "id": tool_call.id,
                            "type": "function",
                            "function": {
                                "name": "create_rpg_quest",
                                "arguments": tool_call.function.arguments
                            }
                        }]
                    })
                    chat_history.append({
                        "role": "tool",
                        "tool_call_id": tool_call.id,
                        "name": "create_rpg_quest",
                        "content": "Quest successfully saved to database."
                    })
                    
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
                chat_history.append({"role": "user", "content": user_msg})
                chat_history.append({"role": "assistant", "content": ai_msg})
                
                if len(chat_history) > 20:
                    chat_history = chat_history[-20:]
                    
                user.set_chat_history(chat_history)
                db.session.commit()
                
                return jsonify({'reply': ai_msg})
        else:
            ai_msg = response_message.content
            quest_data = json.loads(ai_msg)
            return jsonify({'quest': quest_data})
            
    except Exception as e:
        print(f"OpenAI Error: {e}")
        return jsonify({'error': str(e)}), 500

@api_bp.route('/chat/history', methods=['GET'])
def api_chat_history():
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    user = db.session.get(User, session['user_id'])
    if not user:
        return jsonify({'error': 'User not found'}), 404
        
    raw_history = user.get_chat_history()
    
    clean_history = []
    for msg in raw_history:
        if msg.get("role") in ["user", "assistant"]:
            if msg.get("role") == "assistant" and not msg.get("content"):
                continue
            clean_history.append({
                "role": msg.get("role"),
                "content": msg.get("content")
            })
            
    return jsonify({'history': clean_history})

@api_bp.route('/quiz/generate', methods=['POST'])
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

@api_bp.route('/quiz/explain', methods=['POST'])
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
                "You are ORIA, a opossum System Guide. Provide a short, punchy, 1-2 sentence explanation. "
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

@api_bp.route('/store/roulette', methods=['POST'])
def api_store_roulette():
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    user = db.session.get(User, session['user_id'])
    if not user:
        return jsonify({'error': 'User not found'}), 404
        
    ROULETTE_COST = 100
    UNLOCKABLE_SKINS = ['skin_1', 'skin_2', 'skin_3', 'skin_4', 'skin_5', 'skin_6']
    
    if user.coins < ROULETTE_COST:
        return jsonify({'error': 'Not enough coins'}), 400
        
    owned_skins = user.get_owned_skins()
    locked_skins = [s for s in UNLOCKABLE_SKINS if s not in owned_skins]
    
    if not locked_skins:
        return jsonify({'error': 'All currently available skins are already unlocked!'}), 400
        
    user.coins -= ROULETTE_COST
    chosen_skin = random.choice(locked_skins)
    owned_skins.append(chosen_skin)
    user.set_owned_skins(owned_skins)
    
    # Unlock cyber_spender achievement if it's the user's first purchase
    newly_unlocked = []
    current_achievements = user.get_achievements()
    if 'cyber_spender' not in current_achievements:
        current_achievements.append('cyber_spender')
        user.set_achievements(current_achievements)
        newly_unlocked.append('cyber_spender')
    
    db.session.commit()
    
    response_data = {'success': True, 'coins': user.coins, 'unlocked_skin': chosen_skin}
    if newly_unlocked:
        response_data['newly_unlocked'] = newly_unlocked
        
    return jsonify(response_data)

@api_bp.route('/store/equip', methods=['POST'])
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

@api_bp.route('/leaderboard', methods=['GET'])
def api_leaderboard():
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
        
    top_users = User.query.order_by(User.level.desc(), User.xp.desc()).limit(10).all()
    leaderboard = []
    
    for u in top_users:
        leaderboard.append({
            "username": u.username,
            "level": u.level,
            "xp": u.xp,
            "current_streak": u.current_streak,
            "is_current_user": u.id == session['user_id']
        })
        
    return jsonify({'leaderboard': leaderboard})
