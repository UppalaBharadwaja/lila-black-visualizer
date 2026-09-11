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
        if (this.els.playBtn) {
            this.els.playBtn.addEventListener('click', () => this.togglePlay());
        }

        // Backward / Forward transport buttons
        const seekStartBtn = document.getElementById('btn-seek-start');
        if (seekStartBtn) {
            seekStartBtn.addEventListener('click', () => {
                this.seekTo(0);
            });
        }

        const seekEndBtn = document.getElementById('btn-seek-end');
        if (seekEndBtn) {
            seekEndBtn.addEventListener('click', () => {
                this.seekTo(this.maxTime);
            });
        }

        // Zoom in / out buttons on map header
        const zoomInBtn = document.getElementById('btn-zoom-in');
        if (zoomInBtn) {
            zoomInBtn.addEventListener('click', () => {
                if (GameMap.map) GameMap.map.zoomIn();
            });
        }

        const zoomOutBtn = document.getElementById('btn-zoom-out');
        if (zoomOutBtn) {
            zoomOutBtn.addEventListener('click', () => {
                if (GameMap.map) GameMap.map.zoomOut();
            });
        }

        // Hidden slider scrubbing for compatibility
        if (this.els.slider) {
            this.els.slider.addEventListener('input', () => {
                this.currentTime = (this.els.slider.value / 1000) * this.maxTime;
                this.updateDisplay();
                this.onTimeChange();
            });
        }

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
    setMatch(durationMs, matchData = null) {
        this.stop();
        this.maxTime = durationMs;
        this.currentTime = 0;
        if (this.els.slider) this.els.slider.value = 0;
        this.updateDisplay();

        const hTimeEnd = document.getElementById('h-time-end');
        if (hTimeEnd) {
            hTimeEnd.textContent = Utils.formatTime(durationMs);
        }
    },

    /**
     * Seek to a specific timestamp
     */
    seekTo(timeMs) {
        this.currentTime = Math.max(0, Math.min(this.maxTime, timeMs));
        if (this.els.slider && this.maxTime > 0) {
            this.els.slider.value = Math.round((this.currentTime / this.maxTime) * 1000);
        }
        this.updateDisplay();
        this.onTimeChange();
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
        if (this.els.playBtn) {
            this.els.playBtn.textContent = '⏸';
            this.els.playBtn.classList.add('playing');
        }
        this.lastFrameTime = performance.now();
        this.animate();
    },

    /**
     * Pause playback
     */
    pause() {
        this.playing = false;
        if (this.els.playBtn) {
            this.els.playBtn.textContent = '▶';
            this.els.playBtn.classList.remove('playing');
        }
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
        if (this.els.slider) this.els.slider.value = 0;
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
        const playbackScale = this.maxTime / 10000; // 10 second full playback at 1x
        this.currentTime += delta * this.speed * playbackScale;

        if (this.currentTime >= this.maxTime) {
            this.currentTime = this.maxTime;
            this.pause();
        }

        // Update slider position
        if (this.els.slider && this.maxTime > 0) {
            const sliderVal = (this.currentTime / this.maxTime) * 1000;
            this.els.slider.value = Math.round(sliderVal);
        }

        this.updateDisplay();
        this.onTimeChange();

        if (this.playing) {
            this.animationFrame = requestAnimationFrame(() => this.animate());
        }
    },

    /**
     * Update time display text and scrubber pill position
     */
    updateDisplay() {
        const current = Utils.formatTime(this.currentTime);
        const total = Utils.formatTime(this.maxTime);
        if (this.els.timeDisplay) {
            this.els.timeDisplay.textContent = `${current} / ${total}`;
        }

        const pct = this.maxTime > 0 ? Math.min(100, Math.max(0, (this.currentTime / this.maxTime) * 100)) : 0;

        // Update horizontal scrubber track, thumb, and popup (Matches View)
        const hProgress = document.getElementById('h-timeline-progress');
        const hThumb = document.getElementById('h-scrubber-thumb');
        const hPopup = document.getElementById('h-scrubber-popup');
        const hPlayBtn = document.getElementById('h-play-btn');

        if (hProgress) {
            hProgress.style.width = `${pct}%`;
        }
        if (hThumb) {
            hThumb.style.left = `${pct}%`;
        }
        if (hPopup) {
            hPopup.textContent = current;
        }
        if (hPlayBtn) {
            hPlayBtn.textContent = this.playing ? '⏸' : '▶';
        }
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
