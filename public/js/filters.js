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
        this.els.matchInfo = document.getElementById('match-info');

        // Populate date dropdown from data
        const dates = [...new Set(matches.map(m => m.date))].sort();
        dates.forEach(d => {
            const opt = document.createElement('option');
            opt.value = d;
            opt.textContent = d;
            this.els.dateFilter.appendChild(opt);
        });

        // Attach event listeners
        this.els.mapFilter.addEventListener('change', () => this.onFilterChange());
        this.els.dateFilter.addEventListener('change', () => this.onFilterChange());
        this.els.matchFilter.addEventListener('change', () => this.onMatchSelect());

        // Initial filter
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

        this.filteredMatches.forEach(m => {
            const opt = document.createElement('option');
            opt.value = m.id;
            const humanIcon = '👤'.repeat(Math.min(m.humans, 5));
            const killCount = m.events.kills;
            opt.textContent = `${m.id.substring(0, 8)}… | ${m.map.substring(0, 7)} | ${humanIcon} ${m.humans}H/${m.bots}B | ${killCount}K`;
            this.els.matchFilter.appendChild(opt);
        });

        // Update map if a specific map is selected
        if (mapVal) {
            GameMap.loadMap(mapVal);
        }

        // Clear match info
        this.updateMatchInfo(null);

        // Notify app of filter change
        if (typeof App !== 'undefined' && App.onFilterChange) {
            App.onFilterChange();
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

        // Load the map for this match
        if (this.selectedMatch) {
            GameMap.loadMap(this.selectedMatch.map);
        }

        // Notify app
        if (typeof App !== 'undefined') App.onMatchSelect(this.selectedMatch);
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
        this.els.matchInfo.innerHTML = `
            <div class="match-info-grid">
                <div class="info-item">
                    <span class="info-label">Map</span>
                    <span class="info-value">${match.map}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Date</span>
                    <span class="info-value">${match.date}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Players</span>
                    <span class="info-value human-color">${match.humans} humans</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Bots</span>
                    <span class="info-value bot-color">${match.bots} bots</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Duration</span>
                    <span class="info-value">${duration}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Kills</span>
                    <span class="info-value kill-color">${match.events.kills}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Deaths</span>
                    <span class="info-value death-color">${match.events.deaths}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Storm Deaths</span>
                    <span class="info-value storm-color">${match.events.storm_deaths}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Loot Pickups</span>
                    <span class="info-value loot-color">${match.events.loots}</span>
                </div>
            </div>
        `;
    },

    /**
     * Get current display filter state
     */
    getDisplayFilters() {
        return {
            showHumans: document.getElementById('toggle-humans').checked,
            showBots: document.getElementById('toggle-bots').checked,
            showKills: document.getElementById('toggle-kills').checked,
            showDeaths: document.getElementById('toggle-deaths').checked,
            showLoot: document.getElementById('toggle-loot').checked,
            showStorm: document.getElementById('toggle-storm').checked,
        };
    },
};
