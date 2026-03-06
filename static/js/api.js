import { OriaState } from './state.js';

// ─── Core API wrapper ────────────────────────────────────────────────────────

async function apiFetch(url, options = {}) {
    const res = await fetch(url, options);
    if (!res.ok) {
        // Attempt to read a JSON error body, fall back to status text
        let errMsg = `HTTP ${res.status}`;
        try {
            const errBody = await res.json();
            errMsg = errBody.error || errMsg;
        } catch (_) { /* ignore non-JSON error bodies */ }
        throw new Error(errMsg);
    }
    return res.json();
}

// ─── Exported API functions ──────────────────────────────────────────────────

export async function fetchUserState() {
    return apiFetch('/api/user/state');
}

export async function saveStateAPI() {
    // Only sends quest structure and daily quest state.
    // XP / coins / level are intentionally excluded — they are
    // computed server-side via awardXPActionAPI().
    const payload = {
        quests: OriaState.quests,
        daily_quests: OriaState.daily_quests,
        achievements: OriaState.achievements,
        claimed_rewards: OriaState.claimed_rewards,
        equipped_title: OriaState.equipped_title,
    };
    const data = await apiFetch('/api/user/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

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

/**
 * Award XP via the authoritative server-side endpoint.
 * The backend validates the amount and computes the new xp/coins/level.
 * Returns: { xp, coins, level, leveled_up, new_level }
 */
export async function awardXPActionAPI(amount) {
    return apiFetch('/api/user/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'award_xp', amount })
    });
}

/**
 * Claim a level reward. Backend validates the level requirement and
 * prevents double-claiming. Returns updated coins and claimed_rewards.
 */
export async function claimRewardAPI(level) {
    return apiFetch('/api/rewards/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ level })
    });
}

export async function refreshDailyQuestsAPI() {
    return apiFetch('/api/user/daily_refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    });
}

export async function generateQuizAPI(topic) {
    return apiFetch('/api/quiz/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic })
    });
}

export async function explainQuizAPI(question, user_answer, correct_answer) {
    return apiFetch('/api/quiz/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, user_answer, correct_answer })
    });
}

export async function fetchChatHistoryAPI() {
    return apiFetch('/api/chat/history');
}

export async function sendChatMessageAPI(message, isQuickQuest) {
    return apiFetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: message, quick_quest: isQuickQuest })
    });
}

export async function spinRouletteAPI() {
    return apiFetch('/api/store/roulette', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    });
}

export async function equipSkinAPI(skin_id) {
    return apiFetch('/api/store/equip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skin_id })
    });
}

export async function fetchLeaderboardAPI() {
    return apiFetch('/api/leaderboard');
}
