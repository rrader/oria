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

