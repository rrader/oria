import { OriaState, storeItems } from './state.js';
import {
    saveStateAPI, refreshDailyQuestsAPI, generateQuizAPI, explainQuizAPI,
    spinRouletteAPI, equipSkinAPI
} from './api.js';

export class OriaMascot {
    constructor(elementId, frames) {
        this.element = document.getElementById(elementId);
        if (!this.element) return;

        this.frames = frames;
        this.isAnimating = false;

        this.element.addEventListener('click', () => this.talk());

        this.scheduleBlink();
        this.scheduleTalk();
    }

    setFrame(type) {
        if (!this.element) return;
        if (OriaState && OriaState.equipped_skin !== 'default') return;
        if (this.frames[type]) {
            this.element.src = this.frames[type];
        }
    }

    async blink() {
        if (this.isAnimating) return;
        this.isAnimating = true;

        if (!OriaState || OriaState.equipped_skin === 'default') {
            this.setFrame('blinking');
            await new Promise(r => setTimeout(r, 150));
            this.setFrame('default');
        }

        this.isAnimating = false;
    }

    async talk() {
        if (this.isAnimating) return;
        this.isAnimating = true;

        if (OriaState && OriaState.equipped_skin !== 'default') {
            this.element.classList.add('rocking-animation');
            await new Promise(r => setTimeout(r, 400));
            this.element.classList.remove('rocking-animation');
        } else {
            for (let i = 0; i < 2; i++) {
                this.setFrame('talking');
                await new Promise(r => setTimeout(r, 200));
                this.setFrame('default');
                await new Promise(r => setTimeout(r, 150));
            }
        }

        this.isAnimating = false;
    }

    scheduleBlink() {
        const nextBlink = Math.random() * 3000 + 2000;
        setTimeout(() => {
            this.blink().then(() => this.scheduleBlink());
        }, nextBlink);
    }

    scheduleTalk() {
        const nextTalk = Math.random() * 10000 + 5000;
        setTimeout(() => {
            if (Math.random() > 0.6) {
                this.talk().then(() => this.scheduleTalk());
            } else {
                this.scheduleTalk();
            }
        }, nextTalk);
    }
}

export function updateDOMState() {
    const xpBar = document.getElementById('user-xp-bar');
    const levelEl = document.getElementById('user-level');
    const coinsEl = document.getElementById('user-coins');
    const profLevelEl = document.getElementById('profile-level');
    const profCoinsEl = document.getElementById('profile-coins');
    const profXpBar = document.getElementById('profile-xp-bar');
    const profXpText = document.getElementById('profile-xp-text');

    if (xpBar) {
        xpBar.style.width = OriaState.xp + '%';
        xpBar.setAttribute('aria-valuenow', OriaState.xp);
    }
    if (levelEl) levelEl.textContent = OriaState.level;
    if (coinsEl) coinsEl.textContent = OriaState.coins;

    if (profLevelEl) profLevelEl.textContent = OriaState.level;
    if (profCoinsEl) profCoinsEl.textContent = OriaState.coins;
    if (profXpBar) profXpBar.style.width = OriaState.xp + '%';
    if (profXpText) profXpText.textContent = OriaState.xp;

    updateGlobalMascot();
}

export function addXP(amount) {
    OriaState.xp += amount;
    OriaState.coins += Math.floor(amount / 2);

    if (OriaState.xp >= 100) {
        OriaState.level += Math.floor(OriaState.xp / 100);
        OriaState.xp = OriaState.xp % 100;

        const newLevelEl = document.getElementById('newLevelText');
        if (newLevelEl) {
            newLevelEl.textContent = OriaState.level;
            const levelModalEl = document.getElementById('levelUpModal');
            if (window.bootstrap) {
                let levelModal = window.bootstrap.Modal.getInstance(levelModalEl);
                if (!levelModal) levelModal = new window.bootstrap.Modal(levelModalEl);
                levelModal.show();
            }
        }
    }

    updateDOMState();
    saveStateAPI();
}

export function renderQuests() {
    const container = document.getElementById('quests-container');
    const emptyStateHTML = `
        <div class="empty-state text-center p-5 mt-4" style="background: var(--card-bg-solid); border: 1px dashed var(--glass-border-solid); border-radius: var(--radius-lg);">
            <img src="/static/img/IMG_8435.PNG" alt="Sleeping Mascot" width="100" style="opacity: 0.7; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.05));" class="mb-3">
            <h5 class="fw-bold" style="color: var(--text-main);">The opossum is playing dead...</h5>
            <p class="text-muted small mb-0 fw-semibold">No active quests found. Enter a quick goal above to wake him up and earn XP!</p>
        </div>
    `;

    if (!OriaState.quests || OriaState.quests.length === 0) {
        container.innerHTML = emptyStateHTML;
        return;
    }

    container.innerHTML = '';
    let activeQuestsCount = 0;

    OriaState.quests.forEach((quest, index) => {
        const completedTasks = quest.sub_tasks.filter(t => t.completed).length;
        const totalTasks = quest.sub_tasks.length;
        const progress = Math.round((completedTasks / totalTasks) * 100) || 0;

        if (progress >= 100) return;
        activeQuestsCount++;

        const card = document.createElement('div');
        card.className = 'quest-card p-3 mb-2 shadow-sm rounded-3 border';
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

    if (activeQuestsCount === 0) {
        container.innerHTML = emptyStateHTML;
    }
}

export function renderDailyQuests() {
    const container = document.getElementById('daily-quests-container');
    if (!container) return;

    container.innerHTML = '';
    const dailyQuests = OriaState.daily_quests || [];

    if (dailyQuests.length === 0) {
        container.innerHTML = '<p class="text-muted small text-center my-2">No daily quests generated yet.</p>';
        return;
    }

    dailyQuests.forEach((quest) => {
        const item = document.createElement('div');
        item.className = `daily-quest-item d-flex align-items-center p-2 rounded-3 ${quest.completed ? 'completed-daily' : ''}`;
        item.style.transition = 'all 0.3s ease';

        const isChecked = quest.completed ? 'checked disabled' : '';

        item.innerHTML = `
            <div class="form-check m-0 p-0 d-flex align-items-center w-100" style="cursor: ${quest.completed ? 'default' : 'pointer'};">
                <input class="form-check-input me-3" type="checkbox" value="" id="dailyCheck_${quest.id}" style="width: 1.25em; height: 1.25em; cursor: pointer; flex-shrink: 0;" ${isChecked}>
                <label class="form-check-label flex-grow-1 daily-task-label ${quest.completed ? 'text-decoration-line-through text-muted' : 'fw-semibold text-dark'}" 
                       for="dailyCheck_${quest.id}" 
                       style="cursor: ${quest.completed ? 'default' : 'pointer'}; font-size: 0.95rem; user-select: none;">
                    ${quest.task}
                </label>
                <span class="badge rounded-pill ms-2" style="background: var(--accent-blue); font-size: 0.75rem;">+${quest.xp_reward} XP</span>
            </div>
        `;

        if (!quest.completed) {
            item.addEventListener('click', (e) => {
                if (item.classList.contains('processing-complete')) return;
                const checkbox = item.querySelector('input');
                if (e.target.tagName !== 'INPUT') {
                    checkbox.checked = !checkbox.checked;
                }
                if (checkbox.checked) {
                    item.classList.add('processing-complete');
                    completeDailyQuest(quest.id, item);
                }
            });
        }

        container.appendChild(item);
    });
}

function completeDailyQuest(questId, itemElement) {
    const dailyQuests = OriaState.daily_quests;
    const questIndex = dailyQuests.findIndex(q => q.id === questId);

    if (questIndex > -1 && !dailyQuests[questIndex].completed) {
        const label = itemElement.querySelector('.daily-task-label');
        label.classList.remove('text-dark', 'fw-semibold');
        label.classList.add('text-muted', 'text-decoration-line-through');

        setTimeout(() => {
            dailyQuests[questIndex].completed = true;
            addXP(dailyQuests[questIndex].xp_reward);
            renderDailyQuests();
        }, 400);
    }
}

export function refreshDailyQuestsHandler(btnElement) {
    if (btnElement) {
        btnElement.disabled = true;
        const icon = btnElement.querySelector('svg');
        if (icon) icon.classList.add('fa-spin', 'text-primary');
        btnElement.style.transform = 'rotate(180deg)';
        btnElement.style.transition = 'transform 0.5s ease';
    }

    const container = document.getElementById('daily-quests-container');
    if (container) container.innerHTML = '<p class="text-muted small text-center my-2">Regenerating quests...</p>';

    refreshDailyQuestsAPI()
        .then(data => {
            if (data.success) {
                OriaState.daily_quests = data.daily_quests;
            }
        })
        .catch(err => console.error(err))
        .finally(() => {
            if (btnElement) {
                btnElement.disabled = false;
                btnElement.style.transform = 'rotate(360deg)';
                const icon = btnElement.querySelector('svg');
                if (icon) icon.classList.remove('text-primary');
                setTimeout(() => { btnElement.style.transform = 'none'; btnElement.style.transition = 'none'; }, 500);
            }
            renderDailyQuests();
        });
}

export function openQuestModal(index) {
    const quest = OriaState.quests[index];
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

        let descHtml = task.task_description ? `<p class="text-muted small mb-3 px-2 border-start border-primary border-3 ms-1">${task.task_description}</p>` : '';
        let quizHtml = descHtml;

        if (task.quiz_data) {
            if (task.quiz_score !== undefined) {
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
                ${quizHtml}
            </div>
        `;
        list.appendChild(item);
    });

    list.querySelectorAll('.btn-complete-task').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const qIdx = parseInt(e.target.getAttribute('data-qindex'));
            const tIdx = parseInt(e.target.getAttribute('data-tindex'));
            completeTask(qIdx, tIdx);
            openQuestModal(qIdx);
        });
    });

    list.querySelectorAll('.btn-generate-quiz').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const target = e.currentTarget;
            const qIdx = parseInt(target.getAttribute('data-qindex'));
            const tIdx = parseInt(target.getAttribute('data-tindex'));

            const originalText = target.innerHTML;
            target.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>';
            target.disabled = true;

            const subTask = OriaState.quests[qIdx].sub_tasks[tIdx];

            generateQuizAPI(subTask.task)
                .then(data => {
                    if (data.quiz && data.quiz.length > 0) {
                        OriaState.quests[qIdx].sub_tasks[tIdx].quiz_data = data.quiz;
                        saveStateAPI();
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

    list.querySelectorAll('.btn-submit-test').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const qIdx = parseInt(e.target.getAttribute('data-qindex'));
            const tIdx = parseInt(e.target.getAttribute('data-tindex'));
            const task = OriaState.quests[qIdx].sub_tasks[tIdx];

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

            saveStateAPI();
            openQuestModal(qIdx);
        });
    });

    list.querySelectorAll('.btn-new-test').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const qIdx = parseInt(e.target.getAttribute('data-qindex'));
            const tIdx = parseInt(e.target.getAttribute('data-tindex'));
            const task = OriaState.quests[qIdx].sub_tasks[tIdx];

            delete task.quiz_data;
            delete task.quiz_score;
            delete task.user_answers;

            saveStateAPI();
            openQuestModal(qIdx);
        });
    });

    list.querySelectorAll('.btn-explain').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const target = e.currentTarget;
            const qIdx = parseInt(target.getAttribute('data-qindex'));
            const tIdx = parseInt(target.getAttribute('data-tindex'));
            const questionIdx = parseInt(target.getAttribute('data-questionidx'));

            const task = OriaState.quests[qIdx].sub_tasks[tIdx];
            const qData = task.quiz_data[questionIdx];
            const userAnswerText = qData.options[task.user_answers[questionIdx]];
            const correctAnswerText = qData.options[qData.correct_option_index];

            const explainBox = document.getElementById(`explain-box-${qIdx}-${tIdx}-${questionIdx}`);

            target.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';
            target.disabled = true;

            explainQuizAPI(qData.question, userAnswerText, correctAnswerText)
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
    if (window.bootstrap) {
        let modal = window.bootstrap.Modal.getInstance(modalEl);
        if (!modal) {
            modal = new window.bootstrap.Modal(modalEl);
        }
        if (!modalEl.classList.contains('show')) {
            modal.show();
        }
    }
}

export function completeTask(qIndex, tIndex) {
    const task = OriaState.quests[qIndex].sub_tasks[tIndex];
    if (task && !task.completed) {
        task.completed = true;
        addXP(task.xp_reward || 50);
        renderQuests();
        renderProfileQuests();
    }
}

export function renderProfileQuests() {
    const container = document.getElementById('completed-quests-container');
    if (!container) return;

    const allQuests = OriaState.quests.map((q, idx) => ({ ...q, originalIndex: idx }));
    const completedQuests = allQuests.filter(q => q.sub_tasks && q.sub_tasks.length > 0 && q.sub_tasks.every(t => t.completed));

    if (completedQuests.length === 0) {
        container.innerHTML = `
            <div class="empty-state text-center p-5 mt-4" style="background: var(--card-bg-solid); border: 1px dashed var(--glass-border-solid); border-radius: var(--radius-lg);">
                <div class="mb-3" style="font-size: 2.5rem; color: var(--accent-blue); opacity: 0.5;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mb-2"><line x1="22" y1="12" x2="2" y2="12"></line><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"></path><line x1="6" y1="16" x2="6.01" y2="16"></line><line x1="10" y1="16" x2="10.01" y2="16"></line></svg>
                </div>
                <h6 class="fw-bold" style="color: var(--text-main);">No Records</h6>
                <p class="text-muted small mb-0 fw-semibold">No completed objectives found in the databanks.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = '';
    completedQuests.forEach(quest => {
        const completedTasks = quest.sub_tasks.filter(t => t.completed).length;
        const totalTasks = quest.sub_tasks.length;
        const progress = Math.round((completedTasks / totalTasks) * 100) || 0;

        const card = document.createElement('div');
        card.className = 'quest-card p-3 mb-2 shadow-sm rounded-3 border';
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

        card.addEventListener('click', () => openQuestModal(quest.originalIndex));

        container.appendChild(card);
    });
}

export function updateGlobalMascot() {
    const equipped = OriaState.equipped_skin || "default";
    const currentSkin = storeItems.find(s => s.id === equipped);
    if (currentSkin) {
        document.querySelectorAll('.mascot-home').forEach(img => {
            img.src = currentSkin.image;
        });
    }
}

export function renderInventory() {
    const container = document.getElementById('inventory-grid');
    if (!container) return;

    container.innerHTML = '';
    const owned = OriaState.owned_skins || ["default"];
    const equipped = OriaState.equipped_skin || "default";

    updateGlobalMascot();

    const ownedItems = storeItems.filter(item => owned.includes(item.id));

    ownedItems.forEach(item => {
        const isEquipped = equipped === item.id;

        const card = document.createElement('div');
        card.className = `store-card ${isEquipped ? 'border-primary' : ''}`;
        if (isEquipped) card.style.borderWidth = '2px';

        let btnHtml = '';
        if (isEquipped) {
            btnHtml = `<button class="btn btn-sm btn-success w-100 rounded-pill fw-bold disabled">Equipped</button>`;
        } else {
            btnHtml = `<button class="btn btn-sm btn-outline-primary w-100 rounded-pill fw-bold" onclick="window.equipSkin('${item.id}')">Equip</button>`;
        }

        card.innerHTML = `
            <div class="store-card-img-wrapper" style="background: var(--gradient-card);">
               <img src="${item.image}" alt="${item.name}" class="store-card-img">
            </div>
            <div>
               <div class="store-card-title">${item.name}</div>
               ${btnHtml}
            </div>
        `;
        container.appendChild(card);
    });
}

let isSpinning = false;
export function spinRouletteHandler(cost) {
    if (isSpinning) return;
    if (OriaState.coins < cost) {
        alert('Not enough coins to spin!');
        return;
    }

    isSpinning = true;
    const msgEl = document.getElementById('roulette-msg');
    const imgEl = document.getElementById('roulette-display-img');
    const btnEl = document.getElementById('btn-spin-roulette');

    msgEl.textContent = 'Spinning...';
    msgEl.className = 'text-primary small mt-2 mb-0 fw-bold';
    btnEl.disabled = true;

    imgEl.style.filter = 'none';

    let spinCount = 0;
    const spinInterval = setInterval(() => {
        imgEl.src = storeItems[spinCount % storeItems.length].image;
        spinCount++;
    }, 50);

    spinRouletteAPI()
        .then(data => {
            setTimeout(() => {
                clearInterval(spinInterval);
                isSpinning = false;
                btnEl.disabled = false;

                if (data.success) {
                    OriaState.coins = data.coins;
                    OriaState.owned_skins.push(data.unlocked_skin);

                    const wonSkinObj = storeItems.find(s => s.id === data.unlocked_skin);
                    if (wonSkinObj) imgEl.src = wonSkinObj.image;

                    msgEl.textContent = `You unlocked ${wonSkinObj ? wonSkinObj.name : data.unlocked_skin}! 🎉`;
                    msgEl.className = 'text-success small mt-2 mb-0 fw-bold';

                    updateDOMState();
                    updateGlobalMascot();
                    renderInventory();
                } else {
                    imgEl.src = '/static/img/IMG_8435.PNG';
                    imgEl.style.filter = 'brightness(0) invert(0.8)';
                    msgEl.textContent = data.error;
                    msgEl.className = 'text-danger small mt-2 mb-0 fw-bold';
                }
            }, 1000);
        })
        .catch(err => {
            clearInterval(spinInterval);
            isSpinning = false;
            btnEl.disabled = false;
            msgEl.textContent = 'Error connecting to system.';
            msgEl.className = 'text-danger small mt-2 mb-0 fw-bold';
            console.error(err);
        });
}

export function equipSkinHandler(id) {
    const previousSkin = OriaState.equipped_skin;
    OriaState.equipped_skin = id;
    updateGlobalMascot();
    renderInventory();

    equipSkinAPI(id)
        .then(data => {
            if (!data.success) {
                OriaState.equipped_skin = previousSkin;
                updateGlobalMascot();
                renderInventory();
                alert(data.error || 'Failed to equip skin');
            }
        })
        .catch(err => {
            OriaState.equipped_skin = previousSkin;
            updateGlobalMascot();
            renderInventory();
            console.error('Error equipping skin:', err);
        });
}

// Global scope attachments for inline HTML onClick handlers
window.spinRoulette = spinRouletteHandler;
window.refreshDailyQuests = refreshDailyQuestsHandler;
window.equipSkin = equipSkinHandler;

window.showDashboard = function (e) {
    if (e) e.preventDefault();
    document.getElementById('dashboard-view').classList.remove('d-none');
    document.getElementById('profile-view').classList.add('d-none');
    document.getElementById('header-gamification-stats').classList.remove('d-none');
    document.getElementById('nav-btn-home').classList.add('active');
    document.getElementById('nav-btn-profile').classList.remove('active');
};

window.showProfile = function (e) {
    if (e) e.preventDefault();
    document.getElementById('dashboard-view').classList.add('d-none');
    document.getElementById('profile-view').classList.remove('d-none');
    document.getElementById('header-gamification-stats').classList.add('d-none');
    document.getElementById('nav-btn-home').classList.remove('active');
    document.getElementById('nav-btn-profile').classList.add('active');
    renderInventory();
    renderProfileQuests();
};
