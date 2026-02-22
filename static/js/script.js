// ORIA client-side logic
console.log('ORIA initialized');

class OriaMascot {
    constructor(elementId, frames) {
        this.element = document.getElementById(elementId);
        if (!this.element) return;

        this.frames = frames; // { default, blinking, talking }
        this.isAnimating = false;

        // Add click interaction
        this.element.addEventListener('click', () => this.talk());

        // Start random blinking
        this.scheduleBlink();
        // Start random talking/reacting
        this.scheduleTalk();
    }

    setFrame(type) {
        if (this.element && this.frames[type]) {
            this.element.src = this.frames[type];
        }
    }

    async blink() {
        if (this.isAnimating) return;
        this.isAnimating = true;
        this.setFrame('blinking');
        await new Promise(r => setTimeout(r, 150));
        this.setFrame('default');
        this.isAnimating = false;
    }

    async talk() {
        if (this.isAnimating) return;
        this.isAnimating = true;

        // Quick "mlem" or talk movement
        for (let i = 0; i < 2; i++) {
            this.setFrame('talking');
            await new Promise(r => setTimeout(r, 200));
            this.setFrame('default');
            await new Promise(r => setTimeout(r, 150));
        }

        this.isAnimating = false;
    }

    scheduleBlink() {
        const nextBlink = Math.random() * 3000 + 2000; // 2-5 seconds
        setTimeout(() => {
            this.blink().then(() => this.scheduleBlink());
        }, nextBlink);
    }

    scheduleTalk() {
        const nextTalk = Math.random() * 10000 + 5000; // 5-15 seconds
        setTimeout(() => {
            if (Math.random() > 0.6) { // 40% chance to talk
                this.talk().then(() => this.scheduleTalk());
            } else {
                this.scheduleTalk();
            }
        }, nextTalk);
    }
}

// Initialize mascot when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const mascotImg = document.querySelector('.mascot-home, .mascot-register');
    if (mascotImg) {
        mascotImg.id = 'oria-mascot';
        new OriaMascot('oria-mascot', {
            default: '/static/img/IMG_8442.PNG',
            blinking: '/static/img/IMG_8435.PNG',
            talking: '/static/img/IMG_8441.PNG'
        });
    }
});

// --- ORIA NEW FEATURES LOGIC ---

window.OriaState = {
    level: 1,
    xp: 0,
    coins: 0,
    quests: [],
    owned_skins: ["default"],
    equipped_skin: "default"
};

function initGamification() {
    fetch('/api/user/state')
        .then(res => res.json())
        .then(data => {
            if (!data.error) {
                window.OriaState = data;
                updateDOMState();
                renderQuests();
                if (window.renderStore) window.renderStore();
                if (window.renderProfileQuests) window.renderProfileQuests();

                // Load existing chat history
                if (typeof window.loadChatHistory === 'function') {
                    window.loadChatHistory();
                }
            }
        });
}

function updateDOMState() {
    const xpBar = document.getElementById('user-xp-bar');
    const levelEl = document.getElementById('user-level');
    const coinsEl = document.getElementById('user-coins');
    const profLevelEl = document.getElementById('profile-level');
    const profCoinsEl = document.getElementById('profile-coins');
    const profXpBar = document.getElementById('profile-xp-bar');
    const profXpText = document.getElementById('profile-xp-text');

    if (xpBar) {
        xpBar.style.width = window.OriaState.xp + '%';
        xpBar.setAttribute('aria-valuenow', window.OriaState.xp);
    }
    if (levelEl) levelEl.textContent = window.OriaState.level;
    if (coinsEl) coinsEl.textContent = window.OriaState.coins;

    if (profLevelEl) profLevelEl.textContent = window.OriaState.level;
    if (profCoinsEl) profCoinsEl.textContent = window.OriaState.coins;
    if (profXpBar) profXpBar.style.width = window.OriaState.xp + '%';
    if (profXpText) profXpText.textContent = window.OriaState.xp;
}

function addXP(amount) {
    window.OriaState.xp += amount;
    window.OriaState.coins += Math.floor(amount / 2); // 1 coin for every 2 XP

    // Level up logic (every 100 XP)
    if (window.OriaState.xp >= 100) {
        window.OriaState.level += Math.floor(window.OriaState.xp / 100);
        window.OriaState.xp = window.OriaState.xp % 100;

        // Show rich Level Up Modal
        const newLevelEl = document.getElementById('newLevelText');
        if (newLevelEl) {
            newLevelEl.textContent = window.OriaState.level;
            const levelModalEl = document.getElementById('levelUpModal');
            let levelModal = bootstrap.Modal.getInstance(levelModalEl);
            if (!levelModal) levelModal = new bootstrap.Modal(levelModalEl);
            levelModal.show();
        }
    }

    updateDOMState();
    saveState();
}

function saveState() {
    fetch('/api/user/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(window.OriaState)
    });
}

// --- QUESTS LOGIC ---

function renderQuests() {
    const container = document.getElementById('quests-container');
    const noQuestsMsg = document.getElementById('no-quests-msg');
    if (!container) return;

    if (!window.OriaState.quests || window.OriaState.quests.length === 0) {
        container.innerHTML = '';
        if (noQuestsMsg) container.appendChild(noQuestsMsg);
        return;
    }

    container.innerHTML = '';
    let activeQuestsCount = 0;

    window.OriaState.quests.forEach((quest, index) => {
        const completedTasks = quest.sub_tasks.filter(t => t.completed).length;
        const totalTasks = quest.sub_tasks.length;
        const progress = Math.round((completedTasks / totalTasks) * 100) || 0;

        // Hide fully completed quests from the dashboard
        if (progress >= 100) return;
        activeQuestsCount++;

        const card = document.createElement('div');
        card.className = 'quest-card p-3 mb-2 shadow-sm bg-white rounded-3 border';
        card.style.cursor = 'pointer';
        card.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-2">
                <h6 class="fw-bold mb-0 text-dark">${quest.title}</h6>
                <span class="badge" style="background: var(--accent-blue);">${quest.difficulty}</span>
            </div>
            <div class="progress mt-2 border" style="height: 6px; box-shadow: inset 0 1px 2px rgba(0,0,0,0.05);">
              <div class="progress-bar" role="progressbar" style="width: ${progress}%; background: var(--accent-blue);"></div>
            </div>
            <div class="d-flex justify-content-between mt-2 small text-muted">
                <span>${completedTasks}/${totalTasks} Tasks</span>
                <span class="fw-bold">${progress}%</span>
            </div>
        `;

        card.addEventListener('click', () => openQuestModal(index));
        container.appendChild(card);
    });

    if (activeQuestsCount === 0 && noQuestsMsg) {
        container.appendChild(noQuestsMsg);
    }
}

function openQuestModal(index) {
    const quest = window.OriaState.quests[index];
    document.getElementById('questModalTitle').textContent = quest.title;
    document.getElementById('questModalDifficulty').textContent = quest.difficulty;

    const completedTasks = quest.sub_tasks.filter(t => t.completed).length;
    const totalTasks = quest.sub_tasks.length;
    const progress = Math.round((completedTasks / totalTasks) * 100) || 0;

    document.getElementById('questProgressText').textContent = `${progress}% Completed`;
    document.getElementById('questModalProgress').style.width = `${progress}%`;

    const list = document.getElementById('questChainList');
    list.innerHTML = '';

    quest.sub_tasks.forEach((task, tIndex) => {
        const item = document.createElement('div');
        item.className = `quest-chain-item ${task.completed ? 'completed' : ''}`;

        // Build Quiz HTML if quiz data exists
        let descHtml = task.task_description ? `<p class="text-muted small mb-3 px-2 border-start border-primary border-3 ms-1">${task.task_description}</p>` : '';
        let quizHtml = descHtml;

        if (task.quiz_data) {
            if (task.quiz_score !== undefined) {
                // Completed Quiz View
                quizHtml += `<div class="quiz-container shadow-sm border-success">
                    <h6 class="text-success fw-bold text-center mb-3">Quiz Completed! Score: ${task.quiz_score}%</h6>
                    ${task.quiz_data.map((q, qIdx) => {
                    const userAnsIdx = task.user_answers[qIdx];
                    const isCorrect = userAnsIdx === q.correct_option_index;
                    return `
                        <div class="mb-4">
                            <div class="quiz-question-title">${qIdx + 1}. ${q.question}</div>
                            <div class="quiz-options-list">
                                ${q.options.map((opt, oIdx) => `
                                    <input type="radio" id="q-${index}-${tIndex}-${qIdx}-o-${oIdx}-done" ${oIdx === userAnsIdx ? 'checked' : ''} disabled class="quiz-option-input d-none">
                                    <label for="q-${index}-${tIndex}-${qIdx}-o-${oIdx}-done" class="quiz-option-label ${oIdx === q.correct_option_index ? 'correct-answer' : (oIdx === userAnsIdx ? 'wrong-answer' : '')}" style="opacity: 0.8; cursor: default;">
                                        ${opt}
                                    </label>
                                `).join('')}
                            </div>
                            ${!isCorrect ? `<button class="btn btn-sm btn-outline-primary mt-2 rounded-pill px-3 fw-bold btn-explain" data-qindex="${index}" data-tindex="${tIndex}" data-questionidx="${qIdx}">Explain Why</button>` : ''}
                            <div class="ai-explanation-box" id="explain-box-${index}-${tIndex}-${qIdx}"></div>
                        </div>
                        `;
                }).join('')}
                    <div class="text-center mt-3 border-top pt-3">
                        <button class="btn btn-sm btn-outline-danger rounded-pill fw-bold px-4 btn-new-test" data-qindex="${index}" data-tindex="${tIndex}">Generate New Test</button>
                    </div>
                </div>`;
            } else {
                // Active Quiz View
                quizHtml += `<div class="quiz-container shadow-sm">
                    <h6 class="fw-bold mb-3 text-primary text-center">AI generated Mini-Test</h6>
                    <div id="quiz-form-${index}-${tIndex}">
                        ${task.quiz_data.map((q, qIdx) => `
                        <div class="mb-4 quiz-question" data-correct="${q.correct_option_index}">
                            <div class="quiz-question-title">${qIdx + 1}. ${q.question}</div>
                            <div class="quiz-options-list">
                                ${q.options.map((opt, oIdx) => `
                                    <input type="radio" name="q-${index}-${tIndex}-${qIdx}" id="q-${index}-${tIndex}-${qIdx}-o-${oIdx}" value="${oIdx}" class="quiz-option-input d-none">
                                    <label for="q-${index}-${tIndex}-${qIdx}-o-${oIdx}" class="quiz-option-label">
                                        ${opt}
                                    </label>
                                `).join('')}
                            </div>
                        </div>
                        `).join('')}
                        <button class="btn btn-primary w-100 rounded-pill fw-bold mt-2 btn-submit-test" data-qindex="${index}" data-tindex="${tIndex}">Submit Test</button>
                    </div>
                </div>`;
            }
        } else if (!task.completed) {
            quizHtml += `
                <div class="text-center mt-3 pt-3 border-top">
                    <button class="btn btn-sm btn-outline-primary rounded-pill px-4 fw-bold btn-generate-quiz" data-qindex="${index}" data-tindex="${tIndex}">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="me-1"><path d="M12 2v20"></path><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
                        Generate Mini-Test
                    </button>
                </div>
            `;
        }


        item.innerHTML = `
            <div class="d-flex justify-content-between align-items-center" style="cursor: pointer;" onclick="this.parentElement.classList.toggle('expanded')">
                <div>
                    <h6 class="fw-bold mb-1 ${task.completed ? 'text-decoration-line-through text-muted' : 'text-dark'}">${task.task}</h6>
                    <small class="text-muted fw-bold" style="color: var(--accent-pink) !important;">+${task.xp_reward || 50} XP • Tap to expand</small>
                </div>
                ${!task.completed ? `<button class="btn btn-sm text-white rounded-pill px-3 btn-complete-task fw-bold shadow-sm" style="background: var(--primary-gradient);" data-qindex="${index}" data-tindex="${tIndex}" onclick="event.stopPropagation();">Complete</button>` : '<span class="text-success fw-bold">✓ Done</span>'}
            </div>
            <div class="quest-accordion-body" onclick="event.stopPropagation();">
                <!-- Inner task detail injection -->
                ${quizHtml}
            </div>
        `;
        list.appendChild(item);
    });

    // Attach Complete Task Event
    list.querySelectorAll('.btn-complete-task').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const qIdx = parseInt(e.target.getAttribute('data-qindex'));
            const tIdx = parseInt(e.target.getAttribute('data-tindex'));
            completeTask(qIdx, tIdx);
            openQuestModal(qIdx);
        });
    });

    // Attach Generate Quiz Event
    list.querySelectorAll('.btn-generate-quiz').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const target = e.currentTarget;
            const qIdx = parseInt(target.getAttribute('data-qindex'));
            const tIdx = parseInt(target.getAttribute('data-tindex'));

            const originalText = target.innerHTML;
            target.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>';
            target.disabled = true;

            const subTask = window.OriaState.quests[qIdx].sub_tasks[tIdx];

            fetch('/api/quiz/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ topic: subTask.task })
            })
                .then(res => res.json())
                .then(data => {
                    if (data.quiz && data.quiz.length > 0) {
                        window.OriaState.quests[qIdx].sub_tasks[tIdx].quiz_data = data.quiz;
                        saveState();
                        openQuestModal(qIdx);
                    } else {
                        alert('Error generating quiz.');
                        target.innerHTML = originalText;
                        target.disabled = false;
                    }
                })
                .catch(err => {
                    alert('Connection error.');
                    target.innerHTML = originalText;
                    target.disabled = false;
                });
        });
    });

    // Attach Submit Quiz Event
    list.querySelectorAll('.btn-submit-test').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const qIdx = parseInt(e.target.getAttribute('data-qindex'));
            const tIdx = parseInt(e.target.getAttribute('data-tindex'));
            const task = window.OriaState.quests[qIdx].sub_tasks[tIdx];

            const container = document.getElementById(`quiz-form-${qIdx}-${tIdx}`);
            const questions = container.querySelectorAll('.quiz-question');

            let correctCount = 0;
            let userAnswers = [];
            let allAnswered = true;

            questions.forEach((qDiv, idx) => {
                const selected = qDiv.querySelector(`input[name="q-${qIdx}-${tIdx}-${idx}"]:checked`);
                if (!selected) {
                    allAnswered = false;
                } else {
                    const selVal = parseInt(selected.value);
                    const correctVal = parseInt(qDiv.getAttribute('data-correct'));
                    userAnswers.push(selVal);
                    if (selVal === correctVal) correctCount++;
                }
            });

            if (!allAnswered) {
                alert('Please answer all questions before submitting.');
                return;
            }

            const percentage = Math.round((correctCount / questions.length) * 100);
            task.quiz_score = percentage;
            task.user_answers = userAnswers;

            saveState();
            openQuestModal(qIdx);
        });
    });

    // Attach Generate New Test Event
    list.querySelectorAll('.btn-new-test').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const qIdx = parseInt(e.target.getAttribute('data-qindex'));
            const tIdx = parseInt(e.target.getAttribute('data-tindex'));
            const task = window.OriaState.quests[qIdx].sub_tasks[tIdx];

            delete task.quiz_data;
            delete task.quiz_score;
            delete task.user_answers;

            saveState();
            openQuestModal(qIdx);
        });
    });

    // Attach Explain Event
    list.querySelectorAll('.btn-explain').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const target = e.currentTarget;
            const qIdx = parseInt(target.getAttribute('data-qindex'));
            const tIdx = parseInt(target.getAttribute('data-tindex'));
            const questionIdx = parseInt(target.getAttribute('data-questionidx'));

            const task = window.OriaState.quests[qIdx].sub_tasks[tIdx];
            const qData = task.quiz_data[questionIdx];
            const userAnswerText = qData.options[task.user_answers[questionIdx]];
            const correctAnswerText = qData.options[qData.correct_option_index];

            const explainBox = document.getElementById(`explain-box-${qIdx}-${tIdx}-${questionIdx}`);

            target.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';
            target.disabled = true;

            fetch('/api/quiz/explain', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    question: qData.question,
                    user_answer: userAnswerText,
                    correct_answer: correctAnswerText
                })
            })
                .then(res => res.json())
                .then(data => {
                    target.style.display = 'none';
                    explainBox.innerHTML = `<strong>ORIA:</strong> ${data.explanation}`;
                    explainBox.classList.add('show');
                })
                .catch(err => {
                    target.innerHTML = 'Explain Why';
                    target.disabled = false;
                });
        });
    });

    const modalEl = document.getElementById('questChainModal');
    let modal = bootstrap.Modal.getInstance(modalEl);
    if (!modal) {
        modal = new bootstrap.Modal(modalEl);
    }
    if (!modalEl.classList.contains('show')) {
        modal.show();
    }
}

function completeTask(qIndex, tIndex) {
    const task = window.OriaState.quests[qIndex].sub_tasks[tIndex];
    if (task && !task.completed) {
        task.completed = true;
        addXP(task.xp_reward || 50);
        renderQuests();
        if (window.renderProfileQuests) window.renderProfileQuests();
    }
}

// --- CHAT & QUICK QUEST LOGIC ---
document.addEventListener('DOMContentLoaded', () => {

    const chatInput = document.getElementById('chat-input-text');
    const btnSend = document.getElementById('btn-send-chat');
    const messagesContainer = document.getElementById('chat-messages');
    const typingIndicator = document.getElementById('chat-typing');

    window.loadChatHistory = function () {
        if (!messagesContainer) return;

        fetch('/api/chat/history')
            .then(res => res.json())
            .then(data => {
                if (data.history && data.history.length > 0) {
                    messagesContainer.innerHTML = ''; // Clear default message

                    data.history.forEach(msg => {
                        const isUser = msg.role === 'user';
                        const text = msg.content;

                        const div = document.createElement('div');
                        div.className = `chat-bubble p-3 shadow-sm ${isUser ? 'user ms-auto text-white' : 'ai'}`;

                        if (isUser) {
                            div.style.background = 'var(--primary-gradient)';
                            div.style.borderBottomRightRadius = '4px';
                            div.style.maxWidth = '85%';
                            div.textContent = text;
                        } else {
                            // If it's AI, use white bg and try to format newlines
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
                    });

                    messagesContainer.scrollTop = messagesContainer.scrollHeight;
                }
            })
            .catch(err => console.error("Error loading chat history:", err));
    };

    initGamification();

    function appendMessage(text, isUser) {
        const div = document.createElement('div');
        div.className = `chat-bubble p-3 shadow-sm ${isUser ? 'user ms-auto' : 'ai'}`;
        div.textContent = text;
        messagesContainer.appendChild(div);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    function sendChatMessage() {
        const text = chatInput.value.trim();
        if (!text) return;

        appendMessage(text, true);
        chatInput.value = '';
        typingIndicator.classList.remove('d-none');

        fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: text, quick_quest: false })
        })
            .then(res => res.json())
            .then(data => {
                typingIndicator.classList.add('d-none');
                if (data.reply) {
                    appendMessage(data.reply, false);
                    if (data.quest_added && data.quest) {
                        window.OriaState.quests.push(data.quest);
                        renderQuests();
                        appendMessage(`SYSTEM ALERT: Saved new quest "${data.quest.title}" to your active quests!`, false);
                    }
                } else {
                    appendMessage("Error communicating with Neural Link.", false);
                }
            })
            .catch(err => {
                typingIndicator.classList.add('d-none');
                appendMessage("Connection lost. Neural link severed.", false);
            });
    }

    if (btnSend) btnSend.addEventListener('click', sendChatMessage);
    if (chatInput) {
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendChatMessage();
        });
    }

    // --- QUICK QUEST LOGIC ---
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

        fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: goal, quick_quest: true })
        })
            .then(res => res.json())
            .then(data => {
                qqBtn.innerHTML = originalText;
                qqBtn.disabled = false;
                qqInput.value = '';

                if (data.quest) {
                    window.OriaState.quests.push(data.quest);
                    saveState();
                    renderQuests();
                    // Optionally open the chat or modal to show the user
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

    // --- SPA ROUTING LOGIC ---
    window.showDashboard = function (e) {
        if (e) e.preventDefault();
        document.getElementById('dashboard-view').classList.remove('d-none');
        document.getElementById('profile-view').classList.add('d-none');
        document.getElementById('nav-btn-home').classList.add('active');
        document.getElementById('nav-btn-profile').classList.remove('active');
    };

    window.showProfile = function (e) {
        if (e) e.preventDefault();
        document.getElementById('dashboard-view').classList.add('d-none');
        document.getElementById('profile-view').classList.remove('d-none');
        document.getElementById('nav-btn-home').classList.remove('active');
        document.getElementById('nav-btn-profile').classList.add('active');
        window.renderStore();
        window.renderProfileQuests();
    };

    window.renderProfileQuests = function () {
        const container = document.getElementById('completed-quests-container');
        if (!container) return;

        // Create an array mapping original index to the quest object to ensure openQuestModal gets the right index
        const allQuests = window.OriaState.quests.map((q, idx) => ({ ...q, originalIndex: idx }));
        const completedQuests = allQuests.filter(q => q.sub_tasks && q.sub_tasks.length > 0 && q.sub_tasks.every(t => t.completed));

        if (completedQuests.length === 0) {
            container.innerHTML = '<p class="text-muted small text-center my-3 fw-bold" id="no-completed-quests-msg">No completed quests yet.</p>';
            return;
        }

        container.innerHTML = '';
        completedQuests.forEach(quest => {
            const completedTasks = quest.sub_tasks.filter(t => t.completed).length;
            const totalTasks = quest.sub_tasks.length;
            const progress = Math.round((completedTasks / totalTasks) * 100) || 0;

            const card = document.createElement('div');
            card.className = 'quest-card p-3 mb-2 shadow-sm bg-white rounded-3 border';
            card.style.cursor = 'pointer';
            card.innerHTML = `
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <h6 class="fw-bold mb-0 text-dark">${quest.title}</h6>
                    <span class="badge" style="background: var(--accent-blue);">${quest.difficulty}</span>
                </div>
                <div class="progress mt-2 border" style="height: 6px; box-shadow: inset 0 1px 2px rgba(0,0,0,0.05);">
                  <div class="progress-bar" role="progressbar" style="width: ${progress}%; background: var(--accent-blue);"></div>
                </div>
                <div class="d-flex justify-content-between mt-2 small text-muted">
                    <span>${completedTasks}/${totalTasks} Tasks</span>
                    <span class="fw-bold">${progress}%</span>
                </div>
            `;

            // Add click listener to open the modal using the original index
            card.addEventListener('click', () => openQuestModal(quest.originalIndex));

            container.appendChild(card);
        });
    };

    // --- STORE LOGIC ---
    const storeItems = [
        { id: 'default', name: 'Original', cost: 0, image: '/static/img/IMG_8442.PNG' },
        { id: 'cyber', name: 'Cyber Mode', cost: 500, image: '/static/img/IMG_8435.PNG' },
        { id: 'ninja', name: 'Focus Ninja', cost: 1000, image: '/static/img/IMG_8441.PNG' }
    ];

    window.renderStore = function () {
        const container = document.getElementById('store-grid');
        if (!container) return;

        container.innerHTML = '';
        const owned = window.OriaState.owned_skins || ["default"];
        const equipped = window.OriaState.equipped_skin || "default";

        // Update mascot globally
        const currentSkin = storeItems.find(s => s.id === equipped);
        if (currentSkin) {
            document.querySelectorAll('.mascot-home').forEach(img => {
                img.src = currentSkin.image;
            });
        }

        storeItems.forEach(item => {
            const isOwned = owned.includes(item.id);
            const isEquipped = equipped === item.id;

            const card = document.createElement('div');
            card.className = `store-card ${isEquipped ? 'border-primary' : ''}`;
            if (isEquipped) card.style.borderWidth = '2px';

            let btnHtml = '';
            if (isEquipped) {
                btnHtml = `<button class="btn btn-sm btn-success w-100 disabled rounded-pill fw-bold">Equipped</button>`;
            } else if (isOwned) {
                btnHtml = `<button class="btn btn-sm btn-outline-primary w-100 rounded-pill fw-bold" onclick="window.equipSkin('${item.id}')">Equip</button>`;
            } else {
                btnHtml = `<button class="btn btn-sm ${window.OriaState.coins >= item.cost ? 'btn-primary' : 'btn-secondary disabled'} w-100 rounded-pill fw-bold" onclick="window.buySkin('${item.id}', ${item.cost})">Buy (🪙 ${item.cost})</button>`;
            }

            card.innerHTML = `
                <img src="${item.image}" alt="${item.name}">
                <div>
                   <div class="store-card-title">${item.name}</div>
                   ${!isOwned ? `<div class="store-card-price">🪙 ${item.cost}</div>` : ''}
                   ${btnHtml}
                </div>
            `;
            container.appendChild(card);
        });
    };

    window.buySkin = function (id, cost) {
        if (window.OriaState.coins < cost) return;

        fetch('/api/store/buy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ skin_id: id, price: cost })
        })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    window.OriaState.coins = data.coins;
                    window.OriaState.owned_skins.push(id);
                    window.OriaState.equipped_skin = id;
                    updateDOMState();
                    window.renderStore();
                } else {
                    alert(data.error);
                }
            });
    };

    window.equipSkin = function (id) {
        fetch('/api/store/equip', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ skin_id: id })
        })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    window.OriaState.equipped_skin = id;
                    window.renderStore();
                }
            });
    };
});
