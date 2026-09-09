/**
 * timeline.js — Playback/timeline controls for the Player Journey Visualization Tool
 */

const Timeline = {
    playing: false,
    speed: 1,
    currentTime: 0,
    maxTime: 0,
    animationFrame: null,
    lastFrameTime: 0,

    // DOM elements
    els: {},

    /**
     * Initialize timeline controls
     */
    init() {
        this.els.playBtn = document.getElementById('play-btn');
        this.els.slider = document.getElementById('timeline-slider');
        this.els.timeDisplay = document.getElementById('time-display');
        this.els.speedBtns = document.querySelectorAll('.speed-btn');

        // Play/Pause button
        this.els.playBtn.addEventListener('click', () => this.togglePlay());

        // Slider scrubbing
        this.els.slider.addEventListener('input', () => {
            this.currentTime = (this.els.slider.value / 1000) * this.maxTime;
            this.updateDisplay();
            this.onTimeChange();
        });

        // Speed buttons
        this.els.speedBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.speed = parseFloat(btn.dataset.speed);
                this.els.speedBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });

        // Set default speed button active
        const defaultBtn = document.querySelector('.speed-btn[data-speed="1"]');
        if (defaultBtn) defaultBtn.classList.add('active');
    },

    /**
     * Set up timeline for a match
     */
    setMatch(durationMs) {
        this.stop();
        this.maxTime = durationMs;
        this.currentTime = 0;
        this.els.slider.value = 0;
        this.updateDisplay();
    },

    /**
     * Toggle play/pause
     */
    togglePlay() {
        if (this.playing) {
            this.pause();
        } else {
            this.play();
        }
    },

    /**
     * Start playback
     */
    play() {
        if (this.maxTime <= 0) return;

        // If at end, restart
        if (this.currentTime >= this.maxTime) {
            this.currentTime = 0;
        }

        this.playing = true;
        this.els.playBtn.textContent = '⏸';
        this.els.playBtn.classList.add('playing');
        this.lastFrameTime = performance.now();
        this.animate();
    },

    /**
     * Pause playback
     */
    pause() {
        this.playing = false;
        this.els.playBtn.textContent = '▶';
        this.els.playBtn.classList.remove('playing');
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
    },

    /**
     * Stop playback and reset
     */
    stop() {
        this.pause();
        this.currentTime = 0;
        this.els.slider.value = 0;
        this.updateDisplay();
    },

    /**
     * Animation loop
     */
    animate() {
        if (!this.playing) return;

        const now = performance.now();
        const delta = now - this.lastFrameTime;
        this.lastFrameTime = now;

        // Advance time (speed multiplier applied)
        // Scale: 1x speed means match plays in roughly 10 seconds
        const playbackScale = this.maxTime / 10000; // 10 second full playback at 1x
        this.currentTime += delta * this.speed * playbackScale;

        if (this.currentTime >= this.maxTime) {
            this.currentTime = this.maxTime;
            this.pause();
        }

        // Update slider position
        const sliderVal = this.maxTime > 0 ? (this.currentTime / this.maxTime) * 1000 : 0;
        this.els.slider.value = Math.round(sliderVal);

        this.updateDisplay();
        this.onTimeChange();

        if (this.playing) {
            this.animationFrame = requestAnimationFrame(() => this.animate());
        }
    },

    /**
     * Update time display text
     */
    updateDisplay() {
        const current = Utils.formatTime(this.currentTime);
        const total = Utils.formatTime(this.maxTime);
        this.els.timeDisplay.textContent = `${current} / ${total}`;
    },

    /**
     * Called when time changes — triggers map re-render
     * Debounced to avoid excessive re-renders during scrubbing
     */
    onTimeChange: Utils.debounce(function() {
        if (typeof App !== 'undefined' && App.onTimeChange) {
            App.onTimeChange(Timeline.currentTime);
        }
    }, 16), // ~60fps
};
