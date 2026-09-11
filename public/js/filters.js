/**
 * filters.js — Filter panel logic for the Player Journey Visualization Tool
 */

const Filters = {
    matches: [],           // All match metadata
    filteredMatches: [],   // After applying map/date filters
    selectedMatch: null,   // Currently selected match

    // DOM elements
    els: {},

    /**
     * Initialize filter controls
     */
    init(matches) {
        this.matches = matches;

        // Cache DOM elements
        this.els.mapFilter = document.getElementById('map-filter');
        this.els.dateFilter = document.getElementById('date-filter');
        this.els.matchFilter = document.getElementById('match-filter');
        this.els.quickMatchSelect = document.getElementById('matches-quick-select');
        this.els.matchInfo = document.getElementById('match-info');

        // Populate date dropdown from data
        const dates = [...new Set(matches.map(m => m.date))].sort();
        dates.forEach(d => {
            const opt = document.createElement('option');
            opt.value = d;
            opt.textContent = d;
            this.els.dateFilter.appendChild(opt);
        });

        // Map list for arrow carousel navigation
        this.maps = ['AmbroseValley', 'GrandRift', 'Lockdown'];

        // Attach event listeners
        this.els.mapFilter.addEventListener('change', () => this.onFilterChange());
        this.els.dateFilter.addEventListener('change', () => this.onFilterChange());
        this.els.matchFilter.addEventListener('change', () => this.onMatchSelect());

        if (this.els.quickMatchSelect) {
            this.els.quickMatchSelect.addEventListener('change', (e) => {
                this.els.matchFilter.value = e.target.value;
                this.onMatchSelect();
            });
        }

        // Wire map pill buttons (Mockup 1 & 3)
        const mapPills = document.querySelectorAll('.map-pill-btn');
        mapPills.forEach(pill => {
            pill.addEventListener('click', () => {
                const mapVal = pill.dataset.map;
                this.els.mapFilter.value = mapVal;
                mapPills.forEach(p => p.classList.remove('active'));
                pill.classList.add('active');
                this.onFilterChange();
            });
        });

        // Wire apply filters button
        const applyBtn = document.getElementById('btn-apply-filters');
        if (applyBtn) {
            applyBtn.addEventListener('click', () => {
                this.onFilterChange();
            });
        }

        // Wire Player Type toggle switch & radio options
        const playerTypeRadios = document.querySelectorAll('input[name="player-type-filter"]');
        const humansVsBotsToggle = document.getElementById('humans-vs-bots-toggle');

        playerTypeRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                if (typeof Heatmap !== 'undefined') {
                    Heatmap.setPlayerFilter(radio.value);
                }
                if (typeof App !== 'undefined' && App.refreshDisplay) {
                    App.refreshDisplay();
                }
            });
        });

        if (humansVsBotsToggle) {
            humansVsBotsToggle.addEventListener('change', () => {
                const isEnabled = humansVsBotsToggle.checked;
                const pType = isEnabled ? (document.querySelector('input[name="player-type-filter"]:checked')?.value || 'both') : 'both';
                if (typeof Heatmap !== 'undefined') {
                    Heatmap.setPlayerFilter(pType);
                }
                if (typeof App !== 'undefined' && App.refreshDisplay) {
                    App.refreshDisplay();
                }
            });
        }

        // Arrow navigation buttons (sidebar + on-map viewport carousel)
        const bindArrow = (id, delta) => {
            const btn = document.getElementById(id);
            if (btn) {
                btn.addEventListener('click', () => this.cycleMap(delta));
            }
        };
        bindArrow('map-prev-btn', -1);
        bindArrow('map-next-btn', 1);
        bindArrow('viewport-map-prev-btn', -1);
        bindArrow('viewport-map-next-btn', 1);

        // Initialize draggable resizer handle & font size controls
        this.initPanelResizer();

        // Initial filter
        this.onFilterChange();
    },

    /**
     * Initialize draggable resizer handle & font size controls for the filter panel
     */
    initPanelResizer() {
        const sidebar = document.querySelector('.app-sidebar-filters');
        const resizer = document.getElementById('sidebar-resizer');
        const btnInc = document.getElementById('btn-filter-font-inc');
        const btnDec = document.getElementById('btn-filter-font-dec');
        const btnReset = document.getElementById('btn-filter-font-reset');
        const btnToggle = document.getElementById('btn-filter-expand-toggle');

        if (!sidebar) return;

        const MIN_WIDTH = 220;
        const DEFAULT_WIDTH = 260;

        const applyWidth = (width, save = true) => {
            const maxWidth = Math.min(window.innerWidth * 0.55, 680);
            const clampedWidth = Math.round(Math.max(MIN_WIDTH, Math.min(width, maxWidth)));
            // Calculate proportional font scale: 1.0 at 260px, up to ~1.45 at 620px
            const fontScale = (1 + Math.max(0, clampedWidth - DEFAULT_WIDTH) / 360 * 0.45).toFixed(2);

            sidebar.style.setProperty('--filter-width', `${clampedWidth}px`);
            sidebar.style.setProperty('--filter-font-scale', fontScale);

            if (btnReset) {
                const pct = Math.round(parseFloat(fontScale) * 100);
                btnReset.textContent = `${pct}%`;
            }

            if (save) {
                try {
                    localStorage.setItem('lila_filter_width', clampedWidth);
                } catch (e) {}
            }

            if (typeof GameMap !== 'undefined' && GameMap.map) {
                GameMap.map.invalidateSize();
            }
        };

        // Restore saved preference if any
        try {
            const savedWidth = localStorage.getItem('lila_filter_width');
            if (savedWidth) {
                applyWidth(parseFloat(savedWidth), false);
            }
        } catch (e) {}

        // Drag to resize horizontally (left / right)
        if (resizer) {
            let isDragging = false;

            const onPointerDown = (e) => {
                isDragging = true;
                resizer.classList.add('is-dragging');
                document.body.classList.add('is-resizing-sidebar');
                if (e.pointerId && resizer.setPointerCapture) {
                    try { resizer.setPointerCapture(e.pointerId); } catch (err) {}
                }
                e.preventDefault();
            };

            const onPointerMove = (e) => {
                if (!isDragging) return;
                const sidebarRect = sidebar.getBoundingClientRect();
                const newWidth = e.clientX - sidebarRect.left;
                applyWidth(newWidth, false);
            };

            const onPointerUp = (e) => {
                if (!isDragging) return;
                isDragging = false;
                resizer.classList.remove('is-dragging');
                document.body.classList.remove('is-resizing-sidebar');
                if (e.pointerId && resizer.releasePointerCapture) {
                    try { resizer.releasePointerCapture(e.pointerId); } catch (err) {}
                }
                const currentWidth = parseFloat(sidebar.style.getPropertyValue('--filter-width')) || DEFAULT_WIDTH;
                try {
                    localStorage.setItem('lila_filter_width', currentWidth);
                } catch (err) {}
                if (typeof GameMap !== 'undefined' && GameMap.map) {
                    GameMap.map.invalidateSize();
                }
            };

            resizer.addEventListener('pointerdown', onPointerDown);
            window.addEventListener('pointermove', onPointerMove);
            window.addEventListener('pointerup', onPointerUp);
            window.addEventListener('pointercancel', onPointerUp);
        }

        // Header quick buttons
        if (btnInc) {
            btnInc.addEventListener('click', () => {
                const currentWidth = parseFloat(sidebar.style.getPropertyValue('--filter-width')) || DEFAULT_WIDTH;
                applyWidth(currentWidth + 40, true);
            });
        }

        if (btnDec) {
            btnDec.addEventListener('click', () => {
                const currentWidth = parseFloat(sidebar.style.getPropertyValue('--filter-width')) || DEFAULT_WIDTH;
                applyWidth(currentWidth - 40, true);
            });
        }

        if (btnReset) {
            btnReset.addEventListener('click', () => {
                applyWidth(DEFAULT_WIDTH, true);
            });
        }

        if (btnToggle) {
            btnToggle.addEventListener('click', () => {
                const currentWidth = parseFloat(sidebar.style.getPropertyValue('--filter-width')) || DEFAULT_WIDTH;
                if (currentWidth > 320) {
                    applyWidth(DEFAULT_WIDTH, true);
                } else {
                    applyWidth(440, true);
                }
            });
        }
    },

    /**
     * Cycle between maps via arrow buttons
     */
    cycleMap(delta) {
        let currentMap = this.els.mapFilter.value;
        let currentIndex = this.maps.indexOf(currentMap);
        if (currentIndex === -1) {
            currentIndex = delta > 0 ? -1 : 0;
        }

        let nextIndex = (currentIndex + delta + this.maps.length) % this.maps.length;
        const nextMap = this.maps[nextIndex];

        this.els.mapFilter.value = nextMap;
        this.onFilterChange();
    },

    /**
     * Handle map or date filter change — update match dropdown
     */
    onFilterChange() {
        const mapVal = this.els.mapFilter.value;
        const dateVal = this.els.dateFilter.value;

        // Filter matches
        this.filteredMatches = this.matches.filter(m => {
            if (mapVal && m.map !== mapVal) return false;
            if (dateVal && m.date !== dateVal) return false;
            return true;
        });

        // Sort by: most events first (more interesting matches on top)
        this.filteredMatches.sort((a, b) => b.total_events - a.total_events);

        // Update match dropdown
        this.els.matchFilter.innerHTML = '<option value="">Select Match (' + this.filteredMatches.length + ' available)</option>';
        if (this.els.quickMatchSelect) {
            this.els.quickMatchSelect.innerHTML = '<option value="">Select Match (' + this.filteredMatches.length + ')</option>';
        }

        this.filteredMatches.forEach(m => {
            const opt = document.createElement('option');
            opt.value = m.id;
            const humanIcon = '👤'.repeat(Math.min(m.humans, 5));
            const killCount = m.events.kills;
            opt.textContent = `${m.id.substring(0, 8)}… | ${m.map.substring(0, 7)} | ${humanIcon} ${m.humans}H/${m.bots}B | ${killCount}K`;
            this.els.matchFilter.appendChild(opt);

            if (this.els.quickMatchSelect) {
                const quickOpt = document.createElement('option');
                quickOpt.value = m.id;
                quickOpt.textContent = `Match #${m.id.substring(0, 4)} (${m.map}, ${m.humans + m.bots}P)`;
                this.els.quickMatchSelect.appendChild(quickOpt);
            }
        });

        // Update map if a specific map is selected
        if (mapVal) {
            GameMap.loadMap(mapVal);
        }

        // Keep Heatmap in sync with map, date, and player type filters.
        // Using the setters ensures re-render is triggered automatically.
        if (typeof Heatmap !== 'undefined') {
            const pType = document.querySelector('input[name="player-type-filter"]:checked')?.value || 'both';
            Heatmap.currentPlayerFilter = pType;

            // setMap and setDate each re-render if a mode is active,
            // so call them last to avoid two renders on simultaneous map+date change.
            if (mapVal) Heatmap.currentMap = mapVal;
            Heatmap.currentDate = dateVal || null;

            if (Heatmap.currentMode !== 'none') {
                Heatmap.render();
            }
        }

        // Sync map pill active states
        document.querySelectorAll('.map-pill-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.map === mapVal);
        });

        // Update on-map carousel header title
        const carouselMapNameEl = document.getElementById('carousel-map-name');
        const formatMapName = {
            'AmbroseValley': 'AMBROSE VALLEY',
            'GrandRift': 'GRAND RIFT',
            'Lockdown': 'LOCKDOWN'
        };
        const displayName = formatMapName[mapVal] || (mapVal ? mapVal.toUpperCase() : 'AMBROSE VALLEY');
        if (carouselMapNameEl) {
            carouselMapNameEl.textContent = displayName;
        }

        // Update hero badges
        const heroMapBadge = document.getElementById('badge-map-name');
        if (heroMapBadge) {
            heroMapBadge.textContent = displayName;
        }

        // Auto-select first match if available so player route map renders immediately
        if (this.filteredMatches.length > 0) {
            const firstMatch = this.filteredMatches[0];
            this.els.matchFilter.value = firstMatch.id;
            this.onMatchSelect();
        } else {
            this.updateMatchInfo(null);
            if (typeof App !== 'undefined' && App.onFilterChange) {
                App.onFilterChange();
            }
        }
    },

    /**
     * Handle match selection
     */
    onMatchSelect() {
        const matchId = this.els.matchFilter.value;
        if (!matchId) {
            this.selectedMatch = null;
            this.updateMatchInfo(null);
            if (typeof App !== 'undefined') App.onMatchSelect(null);
            return;
        }

        // Find match metadata
        this.selectedMatch = this.filteredMatches.find(m => m.id === matchId);
        this.updateMatchInfo(this.selectedMatch);

        if (this.els.quickMatchSelect && this.els.quickMatchSelect.value !== matchId) {
            this.els.quickMatchSelect.value = matchId;
        }

        // Update hero breadcrumbs & badges
        if (this.selectedMatch) {
            const shortId = this.selectedMatch.id.substring(0, 4);
            const mapMatchTitle = document.getElementById('map-match-title');
            if (mapMatchTitle) {
                mapMatchTitle.innerHTML = `${this.selectedMatch.map} — Match <span class="match-highlight-badge">#${shortId}</span>`;
            }
            const breadcrumbTitle = document.getElementById('breadcrumb-match-title');
            if (breadcrumbTitle) {
                breadcrumbTitle.innerHTML = `Match <span class="match-highlight-badge">#${shortId}</span> — <span class="match-highlight-text">${this.selectedMatch.map}</span> — ${this.selectedMatch.date}`;
            }
            const dateBadge = document.getElementById('badge-date');
            if (dateBadge) {
                dateBadge.textContent = this.selectedMatch.date;
            }
            const playersBadge = document.getElementById('badge-players');
            if (playersBadge) {
                playersBadge.textContent = `${this.selectedMatch.humans + this.selectedMatch.bots} Players (${this.selectedMatch.humans}H/${this.selectedMatch.bots}B)`;
            }
            const mainHeading = document.getElementById('matches-main-heading');
            if (mainHeading) {
                mainHeading.innerHTML = `Match <span class="match-highlight-badge">#${shortId}</span>`;
            }
            const durationBadge = document.getElementById('badge-duration');
            if (durationBadge) {
                durationBadge.textContent = `${Utils.formatTime(this.selectedMatch.duration_ms)} Duration`;
            }
        }

        // Load the map for this match
        if (this.selectedMatch) {
            GameMap.loadMap(this.selectedMatch.map);
            const carouselMapNameEl = document.getElementById('carousel-map-name');
            if (carouselMapNameEl) {
                const formatMapName = {
                    'AmbroseValley': 'AMBROSE VALLEY',
                    'GrandRift': 'GRAND RIFT',
                    'Lockdown': 'LOCKDOWN'
                };
                carouselMapNameEl.textContent = formatMapName[this.selectedMatch.map] || this.selectedMatch.map.toUpperCase();
            }
            const heroMapBadge = document.getElementById('badge-map-name');
            if (heroMapBadge) {
                heroMapBadge.textContent = this.selectedMatch.map;
            }
        }

        // Notify app
        if (typeof App !== 'undefined') App.onMatchSelect(this.selectedMatch);
        // Ensure heatmap updates when match changes
        if (typeof Heatmap !== 'undefined' && Heatmap.currentMode !== 'none') {
            Heatmap.render();
        }
    },

    /**
     * Update the match info panel
     */
    updateMatchInfo(match) {
        if (!match) {
            this.els.matchInfo.innerHTML = '<p class="dim">Select a match to see details</p>';
            return;
        }

        const duration = Utils.formatTime(match.duration_ms);
        
        let totalKills = 0;
        let humanKills = 0;
        let botKills = 0;
        let stormDeaths = 0;
        let lootEvents = 0;

        if (match.events && Array.isArray(match.events)) {
            // Full detail match JSON loaded
            const kills = match.events.filter(e => e.type === 'Kill' || e.type === 'BotKill');
            totalKills = kills.length;
            humanKills = kills.filter(e => {
                if (e.is_human !== undefined) return e.is_human;
                const p = match.players && match.players[e.user_id];
                return p ? p.human : false;
            }).length;
            botKills = totalKills - humanKills;
            stormDeaths = match.events.filter(e => e.type === 'KilledByStorm').length;
            lootEvents = match.events.filter(e => e.type === 'Loot').length;
        } else if (match.players) {
            // Detailed match object before events array was flattened
            Object.values(match.players).forEach(p => {
                if (p.events && Array.isArray(p.events)) {
                    p.events.forEach(e => {
                        if (e.type === 'Kill' || e.type === 'BotKill') {
                            totalKills++;
                            if (p.human) humanKills++;
                            else botKills++;
                        } else if (e.type === 'KilledByStorm') {
                            stormDeaths++;
                        } else if (e.type === 'Loot') {
                            lootEvents++;
                        }
                    });
                }
            });
        } else if (match.events) {
            // Index match metadata from matches.json
            totalKills = match.events.kills || 0;
            stormDeaths = match.events.storm_deaths || 0;
            lootEvents = match.events.loots || 0;
            const humans = match.humans || 0;
            const bots = match.bots || 0;
            if (humans > 0 && bots === 0) {
                humanKills = totalKills;
                botKills = 0;
            } else if (bots > 0 && humans === 0) {
                humanKills = 0;
                botKills = totalKills;
            } else if (humans + bots > 0) {
                humanKills = Math.round(totalKills * (humans / (humans + bots)));
                botKills = totalKills - humanKills;
            } else {
                humanKills = 0;
                botKills = totalKills;
            }
        }

        this.els.matchInfo.innerHTML = `
            <div class="match-kpi-grid">
                <div class="match-kpi-pill">
                    <span class="pill-icon">💀</span>
                    <div class="pill-text">
                        <span class="pill-title">Total Kills</span>
                        <span class="pill-number text-white">(${totalKills})</span>
                    </div>
                </div>
                <div class="match-kpi-pill">
                    <span class="pill-icon pill-icon-human">👤</span>
                    <div class="pill-text">
                        <span class="pill-title">Human Kills</span>
                        <span class="pill-number text-white">(${humanKills})</span>
                    </div>
                </div>
                <div class="match-kpi-pill">
                    <span class="pill-icon">🤖</span>
                    <div class="pill-text">
                        <span class="pill-title">Bot Kills</span>
                        <span class="pill-number text-white">(${botKills})</span>
                    </div>
                </div>
                <div class="match-kpi-pill">
                    <span class="pill-icon pill-icon-storm">🌧</span>
                    <div class="pill-text">
                        <span class="pill-title">Storm Deaths</span>
                        <span class="pill-number text-white">(${stormDeaths})</span>
                    </div>
                </div>
                <div class="match-kpi-pill">
                    <span class="pill-icon pill-icon-loot">📦</span>
                    <div class="pill-text">
                        <span class="pill-title">Loot Events</span>
                        <span class="pill-number text-white">(${lootEvents})</span>
                    </div>
                </div>
                <div class="match-kpi-pill">
                    <span class="pill-icon">🕒</span>
                    <div class="pill-text">
                        <span class="pill-title">Match Duration</span>
                        <span class="pill-number text-white">(${duration})</span>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Get current display filter state
     */
     getDisplayFilters() {
        // Evaluate player type radio & toggle switch
        const selectedRadio = document.querySelector('input[name="player-type-filter"]:checked');
        const radioVal = selectedRadio ? selectedRadio.value : 'both';
        const toggleSwitch = document.getElementById('humans-vs-bots-toggle');
        const isToggleActive = toggleSwitch ? toggleSwitch.checked : true;

        let showHumans = true;
        let showBots = true;

        if (!isToggleActive) {
            // If toggle is off, show humans by default
            showBots = false;
        } else if (radioVal === 'humans') {
            showBots = false;
        } else if (radioVal === 'bots') {
            showHumans = false;
        }

        const getCheck = (id) => {
            const el = document.getElementById(id);
            return el ? el.checked : true;
        };

        return {
            showHumans: showHumans,
            showBots: showBots,
            showKills: getCheck('toggle-kills'),
            showDeaths: getCheck('toggle-deaths'),
            showLoot: getCheck('toggle-loot'),
            showStorm: getCheck('toggle-storm'),
        };
    },
};
