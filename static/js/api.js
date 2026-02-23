import { OriaState } from './state.js';

export async function fetchUserState() {
    const res = await fetch('/api/user/state');
    return await res.json();
}

export function saveStateAPI() {
    return fetch('/api/user/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(OriaState)
    });
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
