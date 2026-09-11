/**
 * app.js — Main application orchestration for the Player Journey Visualization Tool
 */

const App = {
    matchData: null,       // Currently loaded match detail
    matchIndex: [],        // All match metadata

    /**
     * Initialize the application
     */
    async init() {
        console.log('LILA BLACK — Player Journey Visualizer initializing...');

        // Initialize map
        GameMap.init();

        // Initialize timeline
        Timeline.init();

        // Initialize heatmaps
        Heatmap.init();

        // Load match index
        this.matchIndex = await Utils.fetchJSON('data/matches.json');
        if (!this.matchIndex) {
            console.error('Failed to load match index');
            return;
        }

        console.log(`Loaded ${this.matchIndex.length} matches`);

        // Initialize filters with match data
        Filters.init(this.matchIndex);

        // Update stats bar
        this.updateStatsBar();

        // Attach toggle listeners
        document.querySelectorAll('#toggle-humans, #toggle-bots, #toggle-kills, #toggle-deaths, #toggle-loot, #toggle-storm')
            .forEach(el => {
                el.addEventListener('change', () => this.refreshDisplay());
            });

        const poiToggle = document.getElementById('toggle-poi');
        if (poiToggle) {
            poiToggle.addEventListener('change', (e) => {
                GameMap.toggleAnnotations(e.target.checked);
            });
        }

        const fitMapBtn = document.getElementById('btn-fit-map');
        if (fitMapBtn) {
            fitMapBtn.addEventListener('click', () => {
                GameMap.zoomToFit(true);
            });
        }

        // Top Navigation Tabs (.nav-tab-btn)
        const navTabBtns = document.querySelectorAll('.nav-tab-btn');
        navTabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                navTabBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                const tab = btn.dataset.tab;
                this.switchTab(tab);
            });
        });

        // Initialize Horizontal Playback Scrubber Bar for Matches View
        this.initHorizontalScrubber();

        // Initialize Draggable Matches Right Panel Resizer
        this.initMatchesResizer();

        // ── Heatmap pill buttons (all `input[name="heatmap-mode"]` across all tabs) ──
        // Using `change` on the radio inputs is the correct approach — avoids the
        // label-click double-fire bug where the click handler and radio change both fire.
        const syncAllPills = (activeValue) => {
            document.querySelectorAll('.heatmap-filter-pill').forEach(pill => {
                const input = pill.querySelector('input[type="radio"]');
                pill.classList.toggle('active', input && input.value === activeValue);
            });
        };

        document.querySelectorAll('input[name="heatmap-mode"]').forEach(radio => {
            radio.addEventListener('change', () => {
                if (radio.checked) {
                    Heatmap.setMode(radio.value);
                    syncAllPills(radio.value);
                    // Mirror count badge to overview label if present
                    const overviewBadge = document.getElementById('heatmap-points-count-overview');
                    if (overviewBadge) {
                        const mainBadge = document.getElementById('heatmap-points-count');
                        if (mainBadge) overviewBadge.textContent = mainBadge.textContent;
                    }
                }
            });
        });

        // Clear / deactivate button on Overview bar
        const overviewClearBtn = document.getElementById('btn-overview-heatmap-clear');
        if (overviewClearBtn) {
            overviewClearBtn.addEventListener('click', () => {
                // Uncheck all radios
                document.querySelectorAll('input[name="heatmap-mode"]').forEach(r => r.checked = false);
                syncAllPills(null);
                Heatmap.setMode('none');
                const overviewBadge = document.getElementById('heatmap-points-count-overview');
                if (overviewBadge) overviewBadge.textContent = '';
            });
        }

        // Set default heatmap map
        Heatmap.setMap('AmbroseValley');

        // Activate view matching active tab button (Matches View by default)
        const activeNavBtn = document.querySelector('.nav-tab-btn.active');
        if (activeNavBtn && activeNavBtn.dataset.tab) {
            this.switchTab(activeNavBtn.dataset.tab);
        }

        console.log('Initialization complete');
    },

    /**
     * Switch view between Overview and Matches tabs seamlessly
     */
    switchTab(tab) {
        const overviewViews = document.querySelectorAll('.view-overview-only');
        const matchesViews = document.querySelectorAll('.view-matches-only');
        const mapEl = document.getElementById('map');
        const viewportOverview = document.getElementById('viewport-overview');
        const viewportMatches = document.getElementById('viewport-matches');

        if (tab === 'tab-matches') {
            // Show Matches Layout
            overviewViews.forEach(el => el.style.display = 'none');
            matchesViews.forEach(el => el.style.display = 'flex');

            if (mapEl && viewportMatches && mapEl.parentElement !== viewportMatches) {
                viewportMatches.appendChild(mapEl);
            }

            Heatmap.setMode('none');
            document.querySelectorAll('.heatmap-filter-pill').forEach(p => p.classList.remove('active'));
        } else {
            // Show Overview Layout (default)
            matchesViews.forEach(el => el.style.display = 'none');
            overviewViews.forEach(el => {
                if (el.classList.contains('bottom-heatmap-density-bar')) {
                    el.style.display = (tab === 'tab-heatmaps') ? 'flex' : 'none';
                } else if (el.classList.contains('map-and-progression-split') || 
                    el.classList.contains('app-sidebar-filters') ||
                    el.classList.contains('sidebar-resizer')) {
                    el.style.display = 'flex';
                } else if (el.classList.contains('kpi-metric-cards-row')) {
                    el.style.display = 'grid';
                } else {
                    el.style.display = '';
                }
            });

            if (mapEl && viewportOverview && mapEl.parentElement !== viewportOverview) {
                viewportOverview.appendChild(mapEl);
            }

            if (tab === 'tab-heatmaps') {
                const mapVal = document.getElementById('map-filter')?.value || 'AmbroseValley';
                const dateVal = document.getElementById('date-filter')?.value || null;
                const pType = document.querySelector('input[name="player-type-filter"]:checked')?.value || 'both';

                // Sync heatmap state from current filter values
                Heatmap.currentMap = mapVal;
                Heatmap.currentDate = dateVal;
                Heatmap.currentPlayerFilter = pType;

                if (Heatmap.currentMode === 'none') {
                    Heatmap.currentMode = 'kills';
                }
                // Sync radio checked state so pills reflect current mode
                document.querySelectorAll('input[name="heatmap-mode"]').forEach(r => {
                    r.checked = (r.value === Heatmap.currentMode);
                });
                GameMap.clearAll();
                Heatmap.render();
                syncAllPills(Heatmap.currentMode);
            } else if (tab === 'tab-overview') {
                // Overview shows heatmap off by default (user can turn it on via the bar)
                Heatmap.setMode('none');
                syncAllPills(null);
            } else {
                Heatmap.setMode('none');
                syncAllPills(null);
            }
        }

        // Invalidate map size and refit
        setTimeout(() => {
            if (GameMap.map) {
                GameMap.map.invalidateSize();
                GameMap.zoomToFit(false);
            }
        }, 50);
    },

    /**
     * Initialize draggable resizer handle & font size controls for the matches right panel
     */
    initMatchesResizer() {
        const sidebar = document.querySelector('.matches-sidebar-column');
        const resizer = document.getElementById('matches-sidebar-resizer');
        const btnInc = document.getElementById('btn-matches-font-inc');
        const btnDec = document.getElementById('btn-matches-font-dec');
        const btnReset = document.getElementById('btn-matches-font-reset');
        const btnToggle = document.getElementById('btn-matches-expand-toggle');

        if (!sidebar) return;

        const MIN_WIDTH = 250;
        const DEFAULT_WIDTH = 365;

        const applyMatchesWidth = (width, save = true) => {
            const maxWidth = Math.min(window.innerWidth * 0.65, 850);
            const clampedWidth = Math.round(Math.max(MIN_WIDTH, Math.min(width, maxWidth)));
            // Calculate proportional font scale: 1.0 at 365px, up to ~1.45 at 750px
            const fontScale = (1 + Math.max(0, clampedWidth - DEFAULT_WIDTH) / 380 * 0.45).toFixed(2);

            sidebar.style.setProperty('--matches-sidebar-width', `${clampedWidth}px`);
            sidebar.style.setProperty('--matches-font-scale', fontScale);

            if (btnReset) {
                const pct = Math.round(parseFloat(fontScale) * 100);
                btnReset.textContent = `${pct}%`;
            }

            if (save) {
                try {
                    localStorage.setItem('lila_matches_sidebar_width', clampedWidth);
                } catch (e) {}
            }

            if (typeof GameMap !== 'undefined' && GameMap.map) {
                GameMap.map.invalidateSize();
            }
        };

        // Restore saved preference if any
        try {
            const savedWidth = localStorage.getItem('lila_matches_sidebar_width');
            if (savedWidth) {
                applyMatchesWidth(parseFloat(savedWidth), false);
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
                // Since this sidebar is on the RIGHT side, moving cursor left increases its width
                const newWidth = sidebarRect.right - e.clientX;
                applyMatchesWidth(newWidth, false);
            };

            const onPointerUp = (e) => {
                if (!isDragging) return;
                isDragging = false;
                resizer.classList.remove('is-dragging');
                document.body.classList.remove('is-resizing-sidebar');
                if (e.pointerId && resizer.releasePointerCapture) {
                    try { resizer.releasePointerCapture(e.pointerId); } catch (err) {}
                }
                const currentWidth = parseFloat(sidebar.style.getPropertyValue('--matches-sidebar-width')) || DEFAULT_WIDTH;
                try {
                    localStorage.setItem('lila_matches_sidebar_width', currentWidth);
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
                const currentWidth = parseFloat(sidebar.style.getPropertyValue('--matches-sidebar-width')) || DEFAULT_WIDTH;
                applyMatchesWidth(currentWidth + 50, true);
            });
        }

        if (btnDec) {
            btnDec.addEventListener('click', () => {
                const currentWidth = parseFloat(sidebar.style.getPropertyValue('--matches-sidebar-width')) || DEFAULT_WIDTH;
                applyMatchesWidth(currentWidth - 50, true);
            });
        }

        if (btnReset) {
            btnReset.addEventListener('click', () => {
                applyMatchesWidth(DEFAULT_WIDTH, true);
            });
        }

        if (btnToggle) {
            btnToggle.addEventListener('click', () => {
                const currentWidth = parseFloat(sidebar.style.getPropertyValue('--matches-sidebar-width')) || DEFAULT_WIDTH;
                if (currentWidth > 420) {
                    applyMatchesWidth(DEFAULT_WIDTH, true);
                } else {
                    applyMatchesWidth(540, true);
                }
            });
        }
    },

    /**
     * Wire horizontal playback controls & scrubber
     */
    initHorizontalScrubber() {
        const playBtn = document.getElementById('h-play-btn');
        const stopBtn = document.getElementById('h-stop-btn');
        const rewindBtn = document.getElementById('h-rewind-btn');
        const ffwdBtn = document.getElementById('h-ffwd-btn');
        const track = document.getElementById('h-timeline-track');

        if (playBtn) {
            playBtn.addEventListener('click', () => {
                Timeline.togglePlay();
                playBtn.textContent = Timeline.playing ? '⏸' : '▶';
            });
        }

        if (stopBtn) {
            stopBtn.addEventListener('click', () => {
                Timeline.stop();
                if (playBtn) playBtn.textContent = '▶';
            });
        }

        if (rewindBtn) {
            rewindBtn.addEventListener('click', () => {
                Timeline.seekTo(Math.max(0, Timeline.currentTime - (Timeline.maxTime * 0.05)));
            });
        }

        if (ffwdBtn) {
            ffwdBtn.addEventListener('click', () => {
                Timeline.seekTo(Math.min(Timeline.maxTime, Timeline.currentTime + (Timeline.maxTime * 0.05)));
            });
        }

        if (track) {
            let isDragging = false;
            const updateTrack = (e) => {
                if (Timeline.maxTime <= 0) return;
                const rect = track.getBoundingClientRect();
                const clientX = e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : rect.left);
                let pct = (clientX - rect.left) / rect.width;
                pct = Math.max(0, Math.min(1, pct));
                Timeline.seekTo(pct * Timeline.maxTime);
            };

            track.addEventListener('mousedown', (e) => {
                isDragging = true;
                updateTrack(e);
            });

            window.addEventListener('mousemove', (e) => {
                if (isDragging) {
                    e.preventDefault();
                    updateTrack(e);
                }
            });

            window.addEventListener('mouseup', () => {
                isDragging = false;
            });
        }

        // Speed buttons
        document.querySelectorAll('.horizontal-scrubber-bar .speed-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const spd = parseFloat(btn.dataset.speed);
                Timeline.speed = spd;
                document.querySelectorAll('.speed-btn').forEach(b => {
                    b.classList.toggle('active', parseFloat(b.dataset.speed) === spd);
                });
            });
        });
    },

    /**
     * Update the stats bar with global data summary (matching the 4 KPI cards in the mockup)
     */
    updateStatsBar() {
        if (!this.matchIndex) return;

        const totalMatches = this.matchIndex.length;
        const totalKills = this.matchIndex.reduce((s, m) => s + m.events.kills, 0);
        const totalStorm = this.matchIndex.reduce((s, m) => s + (m.events.storm_deaths || 0), 0);
        const avgPlayers = totalMatches > 0 ? Math.round(this.matchIndex.reduce((s, m) => s + (m.humans + m.bots), 0) / totalMatches) : 48;

        const elMatches = document.getElementById('kpi-total-matches');
        const elAvgPlayers = document.getElementById('kpi-avg-players');
        const elKills = document.getElementById('kpi-kill-events');
        const elStorm = document.getElementById('kpi-storm-deaths');

        if (elMatches) elMatches.textContent = totalMatches.toLocaleString();
        if (elAvgPlayers) elAvgPlayers.textContent = avgPlayers.toLocaleString();
        if (elKills) elKills.textContent = totalKills.toLocaleString();
        if (elStorm) elStorm.textContent = totalStorm.toLocaleString();
    },

    /**
     * Called when map/date filters change
     */
    onFilterChange() {
        // Update heatmap when map filter changes
        const mapVal = document.getElementById('map-filter').value;
        if (mapVal) {
            Heatmap.setMap(mapVal);
        }

        // Clear current match display
        this.matchData = null;
        GameMap.clearAll();
        Timeline.stop();
    },

    focusedPlayerId: null, // Player ID currently isolated/highlighted

    /**
     * Called when a match is selected
     */
    async onMatchSelect(matchMeta) {
        if (!matchMeta) {
            this.matchData = null;
            this.focusedPlayerId = null;
            GameMap.clearAll();
            Timeline.stop();
            this.updatePlayerRoster();
            return;
        }

        // Load match detail JSON
        const filename = matchMeta.file;
        console.log(`Loading match: ${matchMeta.id} (${filename})`);

        const data = await Utils.fetchJSON(`data/matches/${filename}`);
        if (!data) {
            console.error('Failed to load match data');
            return;
        }

        // Attach metadata if missing
        if (!data.id && matchMeta.id) data.id = matchMeta.id;
        if (!data.map && matchMeta.map) data.map = matchMeta.map;

        // Flatten player events into matchData.events for event log feed & match stats
        const allEvents = [];
        if (data.players) {
            Object.entries(data.players).forEach(([userId, p]) => {
                if (p.events && Array.isArray(p.events)) {
                    p.events.forEach(e => {
                        allEvents.push({
                            ...e,
                            user_id: userId,
                            user_display: p.display || userId.substring(0, 8),
                            is_human: Boolean(p.human)
                        });
                    });
                }
            });
        }
        allEvents.sort((a, b) => a.t - b.t);
        data.events = allEvents;

        this.matchData = data;
        this.focusedPlayerId = null;

        // Populate roster, journey progression, event log, and match stats
        this.updatePlayerRoster();
        this.updateJourneyStages();
        this.renderEventLog();
        Filters.updateMatchInfo(data);

        // Update heatmap map so it stays in sync (date filtering still applies)
        Heatmap.setMap(data.map);

        // Set up timeline with duration and match events
        Timeline.setMatch(data.duration_ms, data);

        // Render the full match (no time filter)
        this.renderCurrentMatch(null);
    },

    /**
     * Render the chronological combat and activity event log feed
     */
    renderEventLog() {
        const logContainer = document.getElementById('event-log-list');
        if (!logContainer) return;

        if (!this.matchData || !this.matchData.events || this.matchData.events.length === 0) {
            logContainer.innerHTML = '<p class="dim" style="font-size:0.7rem; padding:6px;">No events recorded</p>';
            return;
        }

        const events = [...this.matchData.events];
        events.sort((a, b) => a.t - b.t);

        logContainer.innerHTML = '';

        events.slice(0, 50).forEach(evt => {
            const entry = document.createElement('div');
            let logTypeClass = 'log-kill';
            let icon = '⚔';
            let desc = '';

            const player = this.matchData.players[evt.user_id];
            const playerName = player ? player.display : `Player_${evt.user_id.substring(0,4)}`;

            const timeStr = Utils.formatTime(evt.t);
            const fullTimeStr = `14:${timeStr.length === 4 ? '0' + timeStr : timeStr}`;
            const sector = (typeof MapAnnotations !== 'undefined' && MapAnnotations[this.matchData.map]) ? 'Central Plaza' : 'Tactical Sector';

            if (evt.type === 'BotKill' || evt.type === 'Kill') {
                logTypeClass = 'log-kill';
                icon = '<span style="color:var(--kill-red);">⚔</span>';
                desc = `<span style="color:#ffffff; font-weight:600;">${playerName}</span> killed opponent at ${sector}`;
            } else if (evt.type === 'Killed' || evt.type === 'BotKilled') {
                logTypeClass = 'log-death';
                icon = '<span style="color:var(--death-orange);">💀</span>';
                desc = `<span style="color:#ffffff; font-weight:600;">${playerName}</span> died to environment`;
            } else if (evt.type === 'Loot') {
                logTypeClass = 'log-loot';
                icon = '<span style="color:var(--loot-yellow);">📦</span>';
                desc = `<span style="color:#ffffff; font-weight:600;">${playerName}</span> picked up supply cache`;
            } else if (evt.type === 'KilledByStorm') {
                logTypeClass = 'log-storm';
                icon = '<span style="color:var(--storm-purple);">🌧</span>';
                desc = `<span style="color:#ffffff; font-weight:600;">${playerName}</span> died to the Storm`;
            } else {
                desc = `<span style="color:#ffffff; font-weight:600;">${playerName}</span> performed ${evt.type}`;
            }

            entry.className = `event-log-entry ${logTypeClass}`;
            entry.innerHTML = `
                <div class="log-entry-row" style="display:flex; align-items:center; justify-content:space-between; gap:6px;">
                    <div style="display:flex; align-items:center; gap:6px; overflow:hidden;">
                        <span style="color:var(--text-dimmed); font-size:0.62rem; flex-shrink:0;">${fullTimeStr}</span>
                        <span>${icon}</span>
                        <span class="log-desc" style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${desc}</span>
                    </div>
                    <span class="log-coords" style="flex-shrink:0;">[X:${Math.round(evt.x)}, Y:${Math.round(evt.y)}]</span>
                </div>
            `;

            // Click log entry to seek to that timestamp and zoom to coordinate
            entry.addEventListener('click', () => {
                Timeline.seekTo(evt.t);
                if (evt.x !== undefined && evt.y !== undefined) {
                    GameMap.flyToSector(1024 - evt.y, evt.x, 2.0);
                }
            });

            logContainer.appendChild(entry);
        });
    },

    /**
     * Render the player roster in the sidebar
     */
    updatePlayerRoster() {
        const rosterEl = document.getElementById('player-roster');
        if (!rosterEl) return;

        if (!this.matchData || !this.matchData.players) {
            rosterEl.innerHTML = '<p class="dim" style="font-size:0.75rem;">No engagement selected</p>';
            return;
        }

        const players = Object.values(this.matchData.players);
        // Sort: humans first, then bots
        players.sort((a, b) => (b.human ? 1 : 0) - (a.human ? 1 : 0));

        rosterEl.innerHTML = '';

        // Add "All Operatives" option at top
        const allCard = document.createElement('div');
        allCard.className = `player-card ${!this.focusedPlayerId ? 'active-focus' : ''}`;
        allCard.innerHTML = `
            <div class="player-card-left">
                <span class="player-indicator" style="background: var(--accent2);"></span>
                <span class="player-name">ALL OPERATIVES</span>
            </div>
            <span class="player-tag" style="background: rgba(0, 210, 255, 0.2); color: var(--accent2);">${players.length} TOTAL</span>
        `;
        allCard.addEventListener('click', () => this.focusPlayer(null));
        rosterEl.appendChild(allCard);

        players.forEach((p, idx) => {
            const isHuman = p.human;
            const isFocused = this.focusedPlayerId === p.id;
            const killCount = p.events.filter(e => e.type === 'Kill' || e.type === 'BotKill').length;
            const isDead = p.events.some(e => e.type === 'Killed' || e.type === 'BotKilled' || e.type === 'KilledByStorm');
            const playerColor = Utils.getPlayerColor(p, idx);

            // Calculate approximate distance
            let dist = 0;
            if (p.path && p.path.length > 1) {
                for (let i = 1; i < p.path.length; i++) {
                    const dx = p.path[i][0] - p.path[i-1][0];
                    const dy = p.path[i][1] - p.path[i-1][1];
                    dist += Math.sqrt(dx*dx + dy*dy);
                }
            }
            const distStr = `${Math.round(dist)} m`;

            const deathCount = p.events.filter(e => e.type === 'Killed' || e.type === 'BotKilled' || e.type === 'KilledByStorm').length;

            const card = document.createElement('div');
            card.className = `player-card ${isFocused ? 'active-focus' : ''}`;
            card.innerHTML = `
                <div class="player-card-left">
                    <span class="player-indicator" style="background: ${playerColor}; box-shadow: 0 0 6px ${playerColor};"></span>
                    <span class="player-name">${p.display}</span>
                </div>
                <div class="player-card-middle">
                    <span class="weapon-icon-svg" title="Assault Rifle">︻╦デ╤━</span>
                    <span class="player-stat-num">${killCount}</span>
                    <span class="player-stat-num text-dimmed">${deathCount}</span>
                </div>
                <div class="player-card-right">
                    <span class="player-dist-stat">${distStr}</span>
                    <span class="player-tag ${isHuman ? 'tag-human' : 'tag-bot'}">
                        ${isHuman ? 'HUMAN' : 'BOT'}
                    </span>
                </div>
            `;
            card.addEventListener('click', () => this.focusPlayer(isFocused ? null : p.id));
            rosterEl.appendChild(card);
        });
    },

    /**
     * Focus or isolate a single player's route without shifting tabs or zooming in
     */
    focusPlayer(playerId) {
        this.focusedPlayerId = playerId;
        this.updatePlayerRoster();
        this.updateJourneyStages();

        // Note: Keep user on the currently selected tab (e.g. OPERATIVES) without auto-switching tabs

        const timeLimit = Timeline.playing ? Timeline.currentTime :
                         (Timeline.currentTime > 0 ? Timeline.currentTime : null);
        this.renderCurrentMatch(timeLimit);

        // Do not auto-zoom into the player's path; keep the map framing steady
    },

    /**
     * Render chronological journey stages, achievements, and sector milestones for focused player
     */
    updateJourneyStages() {
        const container = document.getElementById('journey-stages');
        if (!container) return;

        if (!this.matchData || !this.matchData.players) {
            container.innerHTML = '<p class="dim" style="font-size:0.75rem;">No engagement selected</p>';
            return;
        }

        const players = Object.values(this.matchData.players);
        // Default to focused player or the primary human player
        const targetPlayer = this.focusedPlayerId ? 
            this.matchData.players[this.focusedPlayerId] : 
            (players.find(p => p.human) || players[0]);

        if (!targetPlayer) {
            container.innerHTML = '<p class="dim" style="font-size:0.75rem;">Select an operative above</p>';
            return;
        }

        const annotations = (typeof MapAnnotations !== 'undefined' && MapAnnotations[this.matchData.map]) ? MapAnnotations[this.matchData.map] : null;

        // Function to find nearest POI zone/label name from pixel coords
        const getSectorName = (px, py) => {
            if (!annotations) return 'Open Sector';
            let bestName = 'Tactical Sector';
            let minDist = 999999;

            const allPoints = [];
            if (annotations.zones) {
                annotations.zones.forEach(z => {
                    const pos = z.labelPos || z.coords[0];
                    allPoints.push({ name: z.name, y: pos[0], x: pos[1] });
                });
            }
            if (annotations.labels) {
                annotations.labels.forEach(l => {
                    allPoints.push({ name: l.name, y: l.pos[0], x: l.pos[1] });
                });
            }

            allPoints.forEach(pt => {
                const dy = (1024 - py) - pt.y;
                const dx = px - pt.x;
                const d = Math.sqrt(dx * dx + dy * dy);
                if (d < minDist) {
                    minDist = d;
                    bestName = pt.name;
                }
            });
            return bestName;
        };

        const stages = [];

        // Stage 1: Insertion / Spawn
        if (targetPlayer.path && targetPlayer.path.length > 0) {
            const startPt = targetPlayer.path[0];
            const startSector = getSectorName(startPt[0], startPt[1]);
            stages.push({
                type: 'spawn',
                time: Utils.formatTime(startPt[2]),
                location: startSector,
                lat: 1024 - startPt[1],
                lng: startPt[0],
                achievement: '🎖 Stage 1: Drop & Initial Recon Infiltration'
            });
        }

        // Progression stages from key events
        targetPlayer.events.forEach((evt, idx) => {
            const sector = getSectorName(evt.x, evt.y);
            let achievementText = '';
            let cssClass = 'combat';

            if (evt.type === 'BotKill' || evt.type === 'Kill') {
                achievementText = `⚔ Combat Takedown: Eliminated target in ${sector}`;
                cssClass = 'combat';
            } else if (evt.type === 'Loot') {
                achievementText = `📦 Resource Cache Secured: Harvested supplies in ${sector}`;
                cssClass = 'loot';
            } else if (evt.type === 'Killed' || evt.type === 'BotKilled') {
                achievementText = `💀 Operative Neutralized (KIA) in ${sector}`;
                cssClass = 'combat';
            } else if (evt.type === 'KilledByStorm') {
                achievementText = `🌧 Consumed by Storm Barrier near ${sector}`;
                cssClass = 'storm';
            }

            stages.push({
                type: cssClass,
                time: Utils.formatTime(evt.t),
                location: sector,
                lat: 1024 - evt.y,
                lng: evt.x,
                achievement: achievementText
            });
        });

        // Stage Final: Extraction or Survival
        if (targetPlayer.path && targetPlayer.path.length > 1) {
            const endPt = targetPlayer.path[targetPlayer.path.length - 1];
            const endSector = getSectorName(endPt[0], endPt[1]);
            const isDead = targetPlayer.events.some(e => e.type.includes('Kill') && (e.type.includes('ed') || e.type.includes('Storm')));
            stages.push({
                type: isDead ? 'combat' : 'loot',
                time: Utils.formatTime(endPt[2]),
                location: endSector,
                lat: 1024 - endPt[1],
                lng: endPt[0],
                achievement: isDead ? `💀 Final Position: Mission Terminated at ${endSector}` : `🏆 Extraction Objective: Survived Match Duration at ${endSector}`
            });
        }

        container.innerHTML = `
            <div style="font-size:0.75rem; color:var(--accent2); margin-bottom:6px; font-weight:700;">
                OPERATIVE ${targetPlayer.display} (${stages.length} Milestones — Click to Fly)
            </div>
            ${stages.map((s, i) => `
                <div class="stage-step stage-step-${s.type}" data-idx="${i}" style="cursor: pointer;" title="Click to zoom to this sector on the map">
                    <div class="stage-header">
                        <span class="stage-location">📍 ${s.location}</span>
                        <span class="stage-time">⏱ ${s.time}</span>
                    </div>
                    <div class="stage-achievement">${s.achievement}</div>
                </div>
            `).join('')}
        `;

        // Add click events to fly to stage sector
        container.querySelectorAll('.stage-step').forEach(stepEl => {
            stepEl.addEventListener('click', () => {
                const idx = parseInt(stepEl.getAttribute('data-idx'));
                const stage = stages[idx];
                if (stage && stage.lat !== undefined && stage.lng !== undefined) {
                    GameMap.flyToSector(stage.lat, stage.lng, 1.8);
                }
            });
        });
    },

    /**
     * Called when timeline time changes
     */
    onTimeChange(timeMs) {
        if (!this.matchData) return;
        this.renderCurrentMatch(timeMs);
    },

    /**
     * Render the current match with current filters and time
     */
    renderCurrentMatch(timeLimit) {
        if (!this.matchData) return;

        const filters = Filters.getDisplayFilters();
        GameMap.renderMatch(this.matchData, filters, timeLimit, this.focusedPlayerId);
    },

    /**
     * Refresh display with current filters (called when toggles change)
     */
    refreshDisplay() {
        if (typeof Heatmap !== 'undefined' && Heatmap.currentMode !== 'none') {
            Heatmap.render();
        }

        if (!this.matchData) return;

        const timeLimit = Timeline.playing ? Timeline.currentTime :
                         (Timeline.currentTime > 0 ? Timeline.currentTime : null);
        this.renderCurrentMatch(timeLimit);
    },
};

// Start the app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
