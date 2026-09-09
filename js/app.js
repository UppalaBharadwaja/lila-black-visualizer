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

        // Set default heatmap map
        Heatmap.setMap('AmbroseValley');

        console.log('Initialization complete');
    },

    /**
     * Update the stats bar with global data summary
     */
    updateStatsBar() {
        const statsBar = document.getElementById('stats-bar');
        if (!statsBar || !this.matchIndex) return;

        const totalMatches = this.matchIndex.length;
        const totalKills = this.matchIndex.reduce((s, m) => s + m.events.kills, 0);
        const totalDeaths = this.matchIndex.reduce((s, m) => s + m.events.deaths, 0);
        const maps = [...new Set(this.matchIndex.map(m => m.map))];

        statsBar.innerHTML = `
            <span class="stat"><strong>${totalMatches}</strong> matches</span>
            <span class="stat-sep">|</span>
            <span class="stat"><strong>${maps.length}</strong> maps</span>
            <span class="stat-sep">|</span>
            <span class="stat kill-color"><strong>${totalKills}</strong> kills</span>
            <span class="stat-sep">|</span>
            <span class="stat death-color"><strong>${totalDeaths}</strong> deaths</span>
        `;
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

        this.matchData = data;
        this.focusedPlayerId = null;

        // Populate roster & journey progression
        this.updatePlayerRoster();
        this.updateJourneyStages();

        // Update heatmap to this match's map
        Heatmap.setMap(data.map);

        // Set up timeline
        Timeline.setMatch(data.duration_ms);

        // Render the full match (no time filter)
        this.renderCurrentMatch(null);
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

        players.forEach(p => {
            const isHuman = p.human;
            const isFocused = this.focusedPlayerId === p.id;
            const killCount = p.events.filter(e => e.type === 'Kill' || e.type === 'BotKill').length;
            const isDead = p.events.some(e => e.type === 'Killed' || e.type === 'BotKilled' || e.type === 'KilledByStorm');

            const card = document.createElement('div');
            card.className = `player-card ${isFocused ? 'active-focus' : ''}`;
            card.innerHTML = `
                <div class="player-card-left">
                    <span class="player-indicator" style="background: ${isHuman ? 'var(--accent2)' : '#8b9bb4'};"></span>
                    <span class="player-name">${p.display}</span>
                    <span class="player-tag" style="background:${isHuman ? 'rgba(0, 210, 255, 0.15)' : 'rgba(255, 255, 255, 0.08)'}; color:${isHuman ? 'var(--accent2)' : '#8b9bb4'};">
                        ${isHuman ? 'HUMAN' : 'BOT'}
                    </span>
                </div>
                <div class="player-stats">
                    ${killCount > 0 ? `<span class="kill-color">⚔${killCount}</span> ` : ''}
                    ${isDead ? '<span class="death-color">💀KIA</span>' : '<span class="loot-color">✓OK</span>'}
                </div>
            `;
            card.addEventListener('click', () => this.focusPlayer(isFocused ? null : p.id));
            rosterEl.appendChild(card);
        });
    },

    /**
     * Focus or isolate a single player's route
     */
    focusPlayer(playerId) {
        this.focusedPlayerId = playerId;
        this.updatePlayerRoster();
        this.updateJourneyStages();

        const timeLimit = Timeline.playing ? Timeline.currentTime :
                         (Timeline.currentTime > 0 ? Timeline.currentTime : null);
        this.renderCurrentMatch(timeLimit);
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
                achievementText = `⚡ Consumed by Storm Barrier near ${sector}`;
                cssClass = 'storm';
            }

            stages.push({
                type: cssClass,
                time: Utils.formatTime(evt.t),
                location: sector,
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
                achievement: isDead ? `💀 Final Position: Mission Terminated at ${endSector}` : `🏆 Extraction Objective: Survived Match Duration at ${endSector}`
            });
        }

        container.innerHTML = `
            <div style="font-size:0.75rem; color:var(--accent2); margin-bottom:6px; font-weight:700;">
                OPERATIVE ${targetPlayer.display} (${stages.length} Milestones)
            </div>
            ${stages.map((s, i) => `
                <div class="stage-step stage-step-${s.type}">
                    <div class="stage-header">
                        <span class="stage-location">📍 ${s.location}</span>
                        <span class="stage-time">⏱ ${s.time}</span>
                    </div>
                    <div class="stage-achievement">${s.achievement}</div>
                </div>
            `).join('')}
        `;
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
