import { OriaState } from './state.js';

export async function fetchUserState() {
    const res = await fetch('/api/user/state');
    return await res.json();
}

export async function saveStateAPI() {
    const res = await fetch('/api/user/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(OriaState)
    });
    const data = await res.json();

    if (data.newly_unlocked && data.newly_unlocked.length > 0) {
        data.newly_unlocked.forEach(ach => {
            if (!OriaState.achievements) OriaState.achievements = [];
            if (!OriaState.achievements.includes(ach)) {
                OriaState.achievements.push(ach);
            }
            window.dispatchEvent(new CustomEvent('achievementUnlocked', { detail: { id: ach } }));
        });
    }

    return data;
}

export async function refreshDailyQuestsAPI() {
    const res = await fetch('/api/user/daily_refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    });
    return await res.json();
}

export async function generateQuizAPI(topic) {
    const res = await fetch('/api/quiz/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic })
    });
    return await res.json();
}

export async function explainQuizAPI(question, user_answer, correct_answer) {
    const res = await fetch('/api/quiz/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, user_answer, correct_answer })
    });
    return await res.json();
}

export async function fetchChatHistoryAPI() {
    const res = await fetch('/api/chat/history');
    return await res.json();
}

export async function sendChatMessageAPI(message, isQuickQuest) {
    const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: message, quick_quest: isQuickQuest })
    });
    return await res.json();
}

export async function spinRouletteAPI() {
    const res = await fetch('/api/store/roulette', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    });
    return await res.json();
}

export async function equipSkinAPI(skin_id) {
    const res = await fetch('/api/store/equip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skin_id })
    });
    return await res.json();
}

export async function fetchLeaderboardAPI() {
    const res = await fetch('/api/leaderboard');
    return await res.json();
}
