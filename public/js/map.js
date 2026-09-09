/**
 * map.js — Leaflet map management for the Player Journey Visualization Tool
 */

const GameMap = {
    map: null,
    imageOverlay: null,
    pathLayers: null,      // L.layerGroup for player paths
    eventLayers: null,     // L.layerGroup for event markers
    currentMap: null,

    /**
     * Initialize the Leaflet map with CRS.Simple
     */
    init() {
        // CRS.Simple — pixel-based coordinate system
        this.map = L.map('map', {
            crs: L.CRS.Simple,
            minZoom: -2,
            maxZoom: 4,
            zoomControl: true,
            attributionControl: false,
        });

        // Initialize layer groups
        this.pathLayers = L.layerGroup().addTo(this.map);
        this.eventLayers = L.layerGroup().addTo(this.map);

        // Set initial view
        const bounds = [[0, 0], [Utils.IMAGE_SIZE, Utils.IMAGE_SIZE]];
        this.map.fitBounds(bounds);

        // Load default map
        this.loadMap('AmbroseValley');
    },

    /**
     * Load a minimap image as the background
     */
    loadMap(mapId) {
        if (this.currentMap === mapId) return;
        this.currentMap = mapId;

        const config = Utils.MAP_CONFIGS[mapId];
        if (!config) return;

        // Remove existing overlay
        if (this.imageOverlay) {
            this.map.removeLayer(this.imageOverlay);
        }

        // Add new minimap image
        // In Leaflet CRS.Simple, bounds are [y, x] = [lat, lng]
        const bounds = [[0, 0], [Utils.IMAGE_SIZE, Utils.IMAGE_SIZE]];
        this.imageOverlay = L.imageOverlay(config.image, bounds).addTo(this.map);

        // Fit view to image bounds
        this.map.fitBounds(bounds);

        // Clear existing layers
        this.clearAll();
    },

    /**
     * Clear all player paths and event markers
     */
    clearAll() {
        this.pathLayers.clearLayers();
        this.eventLayers.clearLayers();
    },

    /**
     * Render player paths and events for a match
     * @param {Object} matchData — full match detail data
     * @param {Object} filters — current filter state
     * @param {number|null} timeLimit — if set, only show events up to this time (ms)
     */
    renderMatch(matchData, filters, timeLimit = null) {
        this.clearAll();

        if (!matchData || !matchData.players) return;

        const players = Object.values(matchData.players);

        players.forEach(player => {
            const isHuman = player.human;

            // Check visibility filters
            if (isHuman && !filters.showHumans) return;
            if (!isHuman && !filters.showBots) return;

            // Get path points, filtered by time if needed
            let pathPoints = player.path;
            if (timeLimit !== null) {
                pathPoints = pathPoints.filter(p => p[2] <= timeLimit);
            }

            if (pathPoints.length < 2) return;

            // Convert to Leaflet [lat, lng] format = [y, x] in our pixel system
            const latLngs = pathPoints.map(p => [p[1], p[0]]);

            // Draw path polyline
            const color = isHuman ? Utils.PLAYER_COLORS.human : Utils.PLAYER_COLORS.bot;
            const weight = isHuman ? 2.5 : 1.5;
            const opacity = isHuman ? 0.8 : 0.4;

            const polyline = L.polyline(latLngs, {
                color: color,
                weight: weight,
                opacity: opacity,
                smoothFactor: 1,
                lineJoin: 'round',
            });

            // Add tooltip with player info
            polyline.bindTooltip(player.display, {
                sticky: true,
                className: 'player-tooltip',
                direction: 'top',
            });

            this.pathLayers.addLayer(polyline);

            // Draw start marker (small circle)
            if (latLngs.length > 0) {
                const startMarker = L.circleMarker(latLngs[0], {
                    radius: 4,
                    color: color,
                    fillColor: color,
                    fillOpacity: 1,
                    weight: 1,
                });
                startMarker.bindTooltip(`${player.display} (start)`, { direction: 'top' });
                this.pathLayers.addLayer(startMarker);
            }

            // Draw event markers
            player.events.forEach(evt => {
                if (timeLimit !== null && evt.t > timeLimit) return;

                const style = Utils.EVENT_STYLES[evt.type];
                if (!style) return;

                // Check event type filters
                if ((evt.type === 'Kill' || evt.type === 'BotKill') && !filters.showKills) return;
                if ((evt.type === 'Killed' || evt.type === 'BotKilled') && !filters.showDeaths) return;
                if (evt.type === 'Loot' && !filters.showLoot) return;
                if (evt.type === 'KilledByStorm' && !filters.showStorm) return;

                const marker = L.circleMarker([evt.y, evt.x], {
                    radius: style.radius,
                    color: style.color,
                    fillColor: style.color,
                    fillOpacity: 0.85,
                    weight: 2,
                });

                marker.bindTooltip(
                    `${style.icon} ${style.label}<br>${player.display}<br>${Utils.formatTime(evt.t)}`,
                    { direction: 'top', className: 'event-tooltip' }
                );

                this.eventLayers.addLayer(marker);
            });
        });
    },
};
