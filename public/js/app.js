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

    /**
     * Called when a match is selected
     */
    async onMatchSelect(matchMeta) {
        if (!matchMeta) {
            this.matchData = null;
            GameMap.clearAll();
            Timeline.stop();
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

        // Update heatmap to this match's map
        Heatmap.setMap(data.map);

        // Set up timeline
        Timeline.setMatch(data.duration_ms);

        // Render the full match (no time filter)
        this.renderCurrentMatch(null);
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
        GameMap.renderMatch(this.matchData, filters, timeLimit);
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
