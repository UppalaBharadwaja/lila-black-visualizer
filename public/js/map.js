/**
 * map.js — Leaflet map management for the Player Journey Visualization Tool
 */

const GameMap = {
    map: null,
    imageOverlay: null,
    pathLayers: null,      // L.layerGroup for player paths
    eventLayers: null,     // L.layerGroup for event markers
    annotationLayers: null,// L.layerGroup for POI zones & labels
    currentMap: null,
    showAnnotations: true,

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
        this.annotationLayers = L.layerGroup().addTo(this.map);
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
        const bounds = [[0, 0], [Utils.IMAGE_SIZE, Utils.IMAGE_SIZE]];
        this.imageOverlay = L.imageOverlay(config.image, bounds).addTo(this.map);

        // Fit view to image bounds
        this.map.fitBounds(bounds);

        // Clear player & event layers
        this.clearAll();

        // Render tactical POI zones and labels matching design mockup
        this.renderAnnotations();
    },

    /**
     * Render POI zones, polygons, and military style labels
     */
    renderAnnotations() {
        this.annotationLayers.clearLayers();
        if (!this.showAnnotations || !this.currentMap || typeof MapAnnotations === 'undefined') return;

        const mapData = MapAnnotations[this.currentMap];
        if (!mapData) return;

        // 1. Render Polygons for Zones
        if (mapData.zones) {
            mapData.zones.forEach(zone => {
                const polygon = L.polygon(zone.coords, {
                    color: zone.color,
                    fillColor: zone.fillColor,
                    fillOpacity: 0.38,
                    weight: 2.5,
                    dashArray: '3, 4',
                    className: 'tactical-zone-polygon'
                });
                polygon.bindTooltip(`<strong>${zone.name}</strong><br><span style="font-size:0.75rem;color:#ccc;">Tactical Sector</span>`, {
                    direction: 'top',
                    className: 'player-tooltip'
                });
                this.annotationLayers.addLayer(polygon);

                // Add prominent POI Text Label centered or positioned on zone
                const labelIcon = L.divIcon({
                    className: 'zone-poi-label-container',
                    html: `<div class="zone-poi-label zone-${zone.type || 'orange'}">${zone.name}</div>`,
                    iconSize: [160, 24],
                    iconAnchor: [80, 12]
                });
                const marker = L.marker(zone.labelPos || zone.coords[0], { icon: labelIcon, interactive: false });
                this.annotationLayers.addLayer(marker);
            });
        }

        // 2. Render Text-only Area Labels
        if (mapData.labels) {
            mapData.labels.forEach(lbl => {
                const labelIcon = L.divIcon({
                    className: 'area-poi-label-container',
                    html: `<div class="area-poi-label">${lbl.name}</div>`,
                    iconSize: [160, 24],
                    iconAnchor: [80, 12]
                });
                const marker = L.marker(lbl.pos, { icon: labelIcon, interactive: false });
                this.annotationLayers.addLayer(marker);
            });
        }
    },

    /**
     * Toggle display of POI annotations
     */
    toggleAnnotations(show) {
        this.showAnnotations = show;
        this.renderAnnotations();
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
     * @param {string|null} focusedPlayerId — if set, highlight this player's route
     */
    renderMatch(matchData, filters, timeLimit = null, focusedPlayerId = null) {
        this.clearAll();

        if (!matchData || !matchData.players) return;

        const players = Object.values(matchData.players);

        // Sort so focused player or human players render on top
        players.sort((a, b) => {
            if (a.id === focusedPlayerId) return 1;
            if (b.id === focusedPlayerId) return -1;
            if (a.human && !b.human) return 1;
            if (!a.human && b.human) return -1;
            return 0;
        });

        players.forEach(player => {
            const isHuman = player.human;
            const isFocused = focusedPlayerId === player.id;

            // Check visibility filters (focused player always visible)
            if (!isFocused) {
                if (isHuman && !filters.showHumans) return;
                if (!isHuman && !filters.showBots) return;
            }

            // Get path points, filtered by time if needed
            let pathPoints = player.path;
            if (timeLimit !== null) {
                pathPoints = pathPoints.filter(p => p[2] <= timeLimit);
            }

            if (pathPoints.length < 2) return;

            // Convert to Leaflet [lat, lng] format = [y, x] in our pixel system
            const latLngs = pathPoints.map(p => [p[1], p[0]]);

            // Style: Focused player gets bright gold, humans get cyber cyan, bots get subtle slate
            let color = isHuman ? Utils.PLAYER_COLORS.human : Utils.PLAYER_COLORS.bot;
            let weight = isHuman ? 3.5 : 1.5;
            let opacity = isHuman ? 0.95 : 0.45;

            if (focusedPlayerId) {
                if (isFocused) {
                    color = '#f5ee38'; // High-visibility golden yellow
                    weight = 5;
                    opacity = 1.0;
                } else {
                    opacity = isHuman ? 0.4 : 0.15;
                    weight = isHuman ? 2 : 1;
                }
            }

            const polyline = L.polyline(latLngs, {
                color: color,
                weight: weight,
                opacity: opacity,
                smoothFactor: 1,
                lineJoin: 'round',
                className: isFocused ? 'focused-player-path' : (isHuman ? 'human-player-path' : 'bot-player-path')
            });

            // Add tooltip with player info
            polyline.bindTooltip(`<strong>${player.display}</strong> (${isHuman ? 'Human Operative' : 'Bot AI'})${isFocused ? ' [FOCUSED]' : ''}`, {
                sticky: true,
                className: 'player-tooltip',
                direction: 'top',
            });

            // Clicking path focuses the player
            polyline.on('click', () => {
                if (typeof App !== 'undefined' && App.focusPlayer) {
                    App.focusPlayer(player.id);
                }
            });

            this.pathLayers.addLayer(polyline);

            // Draw start marker (radar ping ring)
            if (latLngs.length > 0) {
                const startMarker = L.circleMarker(latLngs[0], {
                    radius: isFocused ? 7 : (isHuman ? 5 : 3.5),
                    color: color,
                    fillColor: color,
                    fillOpacity: 1,
                    weight: 2,
                });
                startMarker.bindTooltip(`${player.display} (Drop/Spawn)`, { direction: 'top', className: 'player-tooltip' });
                startMarker.on('click', () => {
                    if (typeof App !== 'undefined' && App.focusPlayer) {
                        App.focusPlayer(player.id);
                    }
                });
                this.pathLayers.addLayer(startMarker);
            }

            // Current player location marker (head of path) during playback
            if (timeLimit !== null && latLngs.length > 0) {
                const currentPos = latLngs[latLngs.length - 1];
                const headMarker = L.circleMarker(currentPos, {
                    radius: isHuman ? 6 : 4,
                    color: '#ffffff',
                    fillColor: color,
                    fillOpacity: 1,
                    weight: 2.5,
                });
                this.pathLayers.addLayer(headMarker);
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
                    fillOpacity: 0.9,
                    weight: 2,
                    className: 'tactical-event-marker'
                });

                marker.bindTooltip(
                    `<div class="event-popup-content">
                        <span class="event-badge" style="background:${style.color};">${style.icon} ${style.label}</span>
                        <div class="event-target">${player.display}</div>
                        <div class="event-time">Time: ${Utils.formatTime(evt.t)}</div>
                    </div>`,
                    { direction: 'top', className: 'event-tooltip' }
                );

                this.eventLayers.addLayer(marker);
            });
        });

        // Ensure route polylines and markers render crisply above POIs and base layers
        if (this.pathLayers) this.pathLayers.bringToFront();
        if (this.eventLayers) this.eventLayers.bringToFront();
    },
};
