/**
 * heatmap.js - Heatmap overlay management for the Player Journey Visualization Tool
 *
 * Heatmaps are DATE-level aggregations from heatmaps.json.
 * They show kill zones / death zones / traffic / loot spots for ALL matches
 * on the selected map + date combination.
 *
 * Changing the date filter OR the map filter updates the overlay immediately.
 */

const Heatmap = {
    heatLayer: null,
    heatmapData: null,        // Loaded from data/heatmaps.json
    currentMode: "none",      // "kills" | "deaths" | "traffic" | "loot" | "none"
    currentMap: "AmbroseValley",
    currentDate: null,        // e.g. "2026-02-10"  or null = all dates
    currentPlayerFilter: "both", // "both" | "humans" | "bots"

    /** Initialize heatmap controls */
    init() {
        this.loadData();
        // Wire sidebar radio buttons
        document.querySelectorAll("input[name=\"heatmap-mode\"]").forEach(radio => {
            radio.addEventListener("change", (e) => {
                this.setMode(e.target.value);
            });
        });
    },

    /** Load pre-computed heatmap data from heatmaps.json */
    async loadData() {
        this.heatmapData = await Utils.fetchJSON("data/heatmaps.json");
        if (this.heatmapData) {
            console.log("Heatmap data loaded");
            if (this.currentMode !== "none") this.render();
        }
    },

    // Public setters - each re-renders when a mode is active

    setMode(mode) {
        this.currentMode = mode || "none";
        this.render();
    },

    /** Switch map and re-render. Called by filters.js and app.js. */
    setMap(mapId) {
        if (!mapId) return;
        this.currentMap = mapId;
        if (this.currentMode !== "none") this.render();
    },

    /** Switch date filter and re-render. Pass null for all dates. */
    setDate(date) {
        this.currentDate = date || null;
        if (this.currentMode !== "none") this.render();
    },

    /** Switch player-type filter and re-render. */
    setPlayerFilter(filter) {
        this.currentPlayerFilter = filter || "both";
        if (this.currentMode !== "none") this.render();
    },

    /**
     * Return filtered points from heatmaps.json.
     * Raw point format: [py, px, is_human (1|0), date_string]
     */
    getFilteredPoints() {
        if (this.currentMode === "none" || !this.heatmapData || !this.currentMap) return [];

        const mapData = this.heatmapData[this.currentMap];
        if (!mapData) return [];

        const rawPoints = mapData[this.currentMode] || [];

        return rawPoints.filter(p => {
            if (this.currentDate && p[3] !== this.currentDate) return false;
            if (this.currentPlayerFilter === "humans" && p[2] !== 1) return false;
            if (this.currentPlayerFilter === "bots"   && p[2] !== 0) return false;
            return true;
        });
    },

    /** Render the heatmap overlay on the Leaflet map. */
    render() {
        this.clear();

        if (this.currentMode === "none" || !this.heatmapData || !this.currentMap || !GameMap.map) {
            return;
        }

        const points = this.getFilteredPoints();

        // Update count badge
        const countBadge = document.getElementById("heatmap-points-count");
        if (countBadge) {
            if (points.length > 0) {
                const dateLabel = this.currentDate ? " - " + this.currentDate : " - All Dates";
                countBadge.textContent = points.length.toLocaleString() + " pts - " + this.currentMode + dateLabel;
            } else {
                countBadge.textContent = "No data for selection";
            }
        }

        if (points.length === 0) return;

        const configs = {
            kills: {
                radius: 18, blur: 15, maxZoom: 3, max: 1.0, minOpacity: 0.25,
                gradient: { 0.2: "#0284c7", 0.4: "#06b6d4", 0.6: "#10b981", 0.8: "#facc15", 1.0: "#ef4444" }
            },
            deaths: {
                radius: 18, blur: 15, maxZoom: 3, max: 1.0, minOpacity: 0.25,
                gradient: { 0.2: "#6366f1", 0.4: "#a855f7", 0.6: "#f97316", 0.85: "#ef4444", 1.0: "#ff0055" }
            },
            traffic: {
                radius: 12, blur: 10, maxZoom: 3, max: 1.0, minOpacity: 0.2,
                gradient: { 0.2: "#1e3a8a", 0.4: "#0284c7", 0.65: "#06b6d4", 0.85: "#38bdf8", 1.0: "#ffffff" }
            },
            loot: {
                radius: 14, blur: 12, maxZoom: 3, max: 1.0, minOpacity: 0.25,
                gradient: { 0.2: "#064e3b", 0.45: "#059669", 0.7: "#10b981", 0.85: "#34d399", 1.0: "#fef08a" }
            },
        };

        const config = configs[this.currentMode];
        if (!config) return;

        // Raw points: [py, px, is_human, date]
        // Leaflet CRS.Simple: [lat, lng] = [1024 - py, px]
        const intensity = this.currentMode === "traffic" ? 0.35 : 0.5;
        const leafletPoints = points.map(p => [1024 - p[0], p[1], intensity]);

        this.heatLayer = L.heatLayer(leafletPoints, config).addTo(GameMap.map);
    },

    /** Remove the heatmap layer from the map. */
    clear() {
        if (this.heatLayer && GameMap.map) {
            GameMap.map.removeLayer(this.heatLayer);
            this.heatLayer = null;
        }
        const countBadge = document.getElementById("heatmap-points-count");
        if (countBadge && this.currentMode === "none") {
            countBadge.textContent = "None";
        }
    },
};

