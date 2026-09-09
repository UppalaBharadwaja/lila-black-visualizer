/**
 * heatmap.js — Heatmap overlay management for the Player Journey Visualization Tool
 */

const Heatmap = {
    heatLayer: null,
    heatmapData: null,
    currentMode: 'none',
    currentMap: null,

    /**
     * Initialize heatmap controls
     */
    init() {
        // Load heatmap data
        this.loadData();

        // Attach radio button listeners
        document.querySelectorAll('input[name="heatmap-mode"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.setMode(e.target.value);
            });
        });
    },

    /**
     * Load pre-computed heatmap data
     */
    async loadData() {
        this.heatmapData = await Utils.fetchJSON('data/heatmaps.json');
        if (this.heatmapData) {
            console.log('Heatmap data loaded');
        }
    },

    /**
     * Set the current heatmap mode
     */
    setMode(mode) {
        this.currentMode = mode;
        this.render();
    },

    /**
     * Update the map being displayed
     */
    setMap(mapId) {
        this.currentMap = mapId;
        this.render();
    },

    /**
     * Render the heatmap overlay
     */
    render() {
        // Remove existing heat layer
        if (this.heatLayer) {
            GameMap.map.removeLayer(this.heatLayer);
            this.heatLayer = null;
        }

        if (this.currentMode === 'none' || !this.heatmapData || !this.currentMap) {
            return;
        }

        const mapData = this.heatmapData[this.currentMap];
        if (!mapData) return;

        let points = [];
        let config = {};

        switch (this.currentMode) {
            case 'kills':
                points = mapData.kills || [];
                config = { radius: 25, blur: 20, maxZoom: 5, max: 1.0,
                    gradient: { 0.4: '#440154', 0.6: '#b12a90', 0.8: '#e16462', 1.0: '#fca636' }
                };
                break;
            case 'deaths':
                points = mapData.deaths || [];
                config = { radius: 25, blur: 20, maxZoom: 5, max: 1.0,
                    gradient: { 0.4: '#0d0887', 0.6: '#6a00a8', 0.8: '#b12a90', 1.0: '#fca636' }
                };
                break;
            case 'traffic':
                points = mapData.traffic || [];
                config = { radius: 15, blur: 15, maxZoom: 5, max: 0.8,
                    gradient: { 0.2: '#000080', 0.4: '#006400', 0.6: '#ffff00', 0.8: '#ff8c00', 1.0: '#ff0000' }
                };
                break;
            case 'loot':
                points = mapData.loot || [];
                config = { radius: 20, blur: 18, maxZoom: 5, max: 1.0,
                    gradient: { 0.3: '#004d00', 0.5: '#00b300', 0.7: '#66ff66', 1.0: '#ffffff' }
                };
                break;
        }

        if (points.length === 0) return;

        this.heatLayer = L.heatLayer(points, config).addTo(GameMap.map);
    },

    /**
     * Clear heatmap overlay
     */
    clear() {
        if (this.heatLayer) {
            GameMap.map.removeLayer(this.heatLayer);
            this.heatLayer = null;
        }
    },
};
