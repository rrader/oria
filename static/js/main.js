import { OriaState, setState } from './state.js';
import { fetchUserState, fetchChatHistoryAPI, sendChatMessageAPI, saveStateAPI } from './api.js';
import {
    OriaMascot, updateDOMState, renderQuests, renderDailyQuests,
    renderProfileQuests, updateGlobalMascot, renderInventory
} from './ui.js';

console.log('ORIA initialized via ES Modules');

document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize Mascot
    const mascotImg = document.querySelector('.mascot-home, .mascot-register');
    if (mascotImg) {
        mascotImg.id = 'oria-mascot';
        new OriaMascot('oria-mascot', {
            default: '/static/img/IMG_8442.PNG',
            blinking: '/static/img/IMG_8435.PNG',
            talking: '/static/img/IMG_8441.PNG'
        });
    }

    // 2. Load History & Gamification State
    fetchUserState().then(data => {
        if (!data.error) {
            setState(data);
            updateDOMState();
            renderQuests();
            renderDailyQuests();
            renderInventory();
            renderProfileQuests();
            loadChatHistory();
        }
    });

    // 3. Chat Initialization
    const chatInput = document.getElementById('chat-input-text');
    const btnSend = document.getElementById('btn-send-chat');
    const messagesContainer = document.getElementById('chat-messages');
    const typingIndicator = document.getElementById('chat-typing');

    function loadChatHistory() {
        if (!messagesContainer) return;

        fetchChatHistoryAPI()
            .then(data => {
                if (data.history && data.history.length > 0) {
                    messagesContainer.innerHTML = '';
                    data.history.forEach(msg => {
                        const isUser = msg.role === 'user';
                        appendChatDOM(msg.content, isUser);
                    });
                }
            })
            .catch(err => console.error("Error loading chat:", err));
    }

    function appendChatDOM(text, isUser) {
        if (!messagesContainer) return;
        const div = document.createElement('div');
        div.className = `chat-bubble p-3 shadow-sm ${isUser ? 'user ms-auto text-white' : 'ai'}`;

        if (isUser) {
            div.style.background = 'var(--primary-gradient)';
            div.style.borderBottomRightRadius = '4px';
            div.style.maxWidth = '85%';
            div.textContent = text;
        } else {
            div.style.background = 'white';
            div.style.borderBottomLeftRadius = '4px';
            div.style.maxWidth = '85%';
            if (window.marked && window.marked.parse) {
                div.innerHTML = window.marked.parse(text);
            } else {
                div.innerHTML = text.replace(/\n/g, '<br>');
            }
        }
        messagesContainer.appendChild(div);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    function sendChatMessage() {
        const text = chatInput.value.trim();
        if (!text) return;

        appendChatDOM(text, true);
        chatInput.value = '';
        typingIndicator.classList.remove('d-none');

        sendChatMessageAPI(text, false)
            .then(data => {
                typingIndicator.classList.add('d-none');
                if (data.reply) {
                    appendChatDOM(data.reply, false);
                    if (data.quest_added && data.quest) {
                        OriaState.quests.push(data.quest);
                        renderQuests();
                        appendChatDOM(`SYSTEM ALERT: Saved new quest "${data.quest.title}" to your active quests!`, false);
                    }
                } else {
                    appendChatDOM("Error communicating with Neural Link.", false);
                }
            })
            .catch(err => {
                typingIndicator.classList.add('d-none');
                appendChatDOM("Connection lost. Neural link severed.", false);
            });
    }

    if (btnSend) btnSend.addEventListener('click', sendChatMessage);
    if (chatInput) {
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendChatMessage();
        });
    }

    // 4. Quick Quest Logic
    const qqInput = document.getElementById('quick-quest-input');
    const qqBtn = document.getElementById('btn-quick-quest');

    function generateQuickQuest() {
        const goal = qqInput.value.trim();
        if (!goal) {
            alert("Please enter a short goal to generate a quest!");
            return;
        }

        const originalText = qqBtn.innerText;
        qqBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>';
        qqBtn.disabled = true;

        sendChatMessageAPI(goal, true)
            .then(data => {
                qqBtn.innerHTML = originalText;
                qqBtn.disabled = false;
                qqInput.value = '';

                if (data.quest) {
                    OriaState.quests.push(data.quest);
                    saveStateAPI();
                    renderQuests();
                } else {
                    alert('Failed to generate quest from neural link.');
                }
            })
            .catch(err => {
                qqBtn.innerHTML = originalText;
                qqBtn.disabled = false;
                alert('Error generating quest. Re-establishing link...');
            });
    }

    if (qqBtn) qqBtn.addEventListener('click', generateQuickQuest);
    if (qqInput) {
        qqInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') generateQuickQuest();
        });
    }
});
