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
    showAnnotations: true, // Enabled for maps without baked-in names; GrandRift auto-suppresses duplicates

    /**
     * Initialize the Leaflet map with CRS.Simple and Google Maps-like interaction
     */
    init() {
        // CRS.Simple — pixel-based coordinate system
        this.map = L.map('map', {
            crs: L.CRS.Simple,
            minZoom: -1,
            maxZoom: 4,
            zoomSnap: 0.1,         // Smooth Google Maps-like fluid zoom levels
            zoomDelta: 0.5,
            wheelPxPerZoomLevel: 90,
            zoomControl: false,    // We add custom tactical zoom buttons or positioned control
            attributionControl: false,
            // Prevent panning off into infinite black void
            maxBounds: [[-120, -120], [1144, 1144]],
            maxBoundsViscosity: 0.85
        });

        // Add sleek zoom control in bottom-right corner like modern maps
        L.control.zoom({ position: 'bottomright' }).addTo(this.map);

        // Initialize layer groups
        this.annotationLayers = L.layerGroup().addTo(this.map);
        this.pathLayers = L.layerGroup().addTo(this.map);
        this.eventLayers = L.layerGroup().addTo(this.map);

        // Resize listener to ensure map always invalidates and fills viewport seamlessly
        window.addEventListener('resize', () => {
            if (this.map) {
                this.map.invalidateSize();
                this.zoomToFit(false);
            }
        });

        // Load default map
        this.loadMap('AmbroseValley');
    },

    /**
     * Load a minimap image as the background and fit to panel viewport
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

        // Add new minimap image (0 to 1024)
        const bounds = [[0, 0], [Utils.IMAGE_SIZE, Utils.IMAGE_SIZE]];
        this.imageOverlay = L.imageOverlay(config.image, bounds).addTo(this.map);

        // Smoothly fit map to container like Google Maps (no black letterbox margins)
        this.zoomToFit(false);

        // Clear player & event layers
        this.clearAll();

        // Render tactical POI zones and labels matching design mockup
        this.renderAnnotations();
    },

    /**
     * Seamlessly fit the map into the right panel container like Google Maps
     * Calculates container aspect ratio and fills the entire available area
     */
    /**
     * Seamlessly fit the entire 1024x1024 map into the right panel container
     * Ensures all parts of the map are fully visible without zooming in or cropping
     */
    zoomToFit(animate = true) {
        if (!this.map) return;
        this.map.invalidateSize();

        const fullBounds = [[0, 0], [Utils.IMAGE_SIZE, Utils.IMAGE_SIZE]];
        this.map.fitBounds(fullBounds, {
            padding: [0, 0],
            animate: animate,
            duration: 0.65
        });
    },

    /**
     * Smoothly fly to a tactical sector or coordinate
     */
    flyToSector(lat, lng, zoom = 1.0) {
        if (!this.map) return;
        this.map.flyTo([lat, lng], zoom, {
            duration: 0.8,
            easeLinearity: 0.25
        });
    },

    /**
     * Fly to bounds covering a player's route or active engagement area
     */
    flyToBounds(bounds, maxZoom = 1.8) {
        if (!this.map) return;
        this.map.flyToBounds(bounds, {
            padding: [50, 50],
            maxZoom: maxZoom,
            duration: 0.85
        });
    },

    /**
     * Render POI zones, polygons, and military style labels
     */
    renderAnnotations() {
        this.annotationLayers.clearLayers();
        if (!this.showAnnotations || !this.currentMap || typeof MapAnnotations === 'undefined') return;

        const mapData = MapAnnotations[this.currentMap];
        if (!mapData) return;

        // For GrandRift: The official sector names & artwork are already baked cleanly into the minimap PNG,
        // so we skip duplicate overlay labels to keep Grand Rift 100% clean and pristine.
        if (this.currentMap === 'GrandRift') {
            return;
        }

        // For AmbroseValley & Lockdown: Render the previous annotated sector names cleanly (text labels)
        if (mapData.zones) {
            mapData.zones.forEach(zone => {
                const labelIcon = L.divIcon({
                    className: 'clean-map-poi-container',
                    html: `<div class="clean-map-poi-label" title="Click to zoom to ${zone.name}">${zone.name}</div>`,
                    iconSize: [220, 24],
                    iconAnchor: [110, 12]
                });
                const pos = zone.labelPos || zone.coords[0];
                const marker = L.marker(pos, { icon: labelIcon, interactive: true });
                marker.on('click', () => {
                    this.flyToSector(pos[0], pos[1], 1.6);
                });
                this.annotationLayers.addLayer(marker);
            });
        }

        // Render additional landmark text labels (e.g. RIVER CROSSING, WEST DAM & RIVER)
        if (mapData.labels) {
            mapData.labels.forEach(lbl => {
                const labelIcon = L.divIcon({
                    className: 'clean-map-poi-container',
                    html: `<div class="clean-map-poi-label" title="Click to zoom to ${lbl.name}">${lbl.name}</div>`,
                    iconSize: [220, 24],
                    iconAnchor: [110, 12]
                });
                const marker = L.marker(lbl.pos, { icon: labelIcon, interactive: true });
                marker.on('click', () => {
                    this.flyToSector(lbl.pos[0], lbl.pos[1], 1.6);
                });
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

        players.forEach((player, pIdx) => {
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

            // Convert to Leaflet [lat, lng] format.
            // Minimap image overlay has bounds [[0,0], [1024, 1024]] with Leaflet CRS.Simple (0 at bottom, 1024 at top).
            // Image coordinates have y=0 at top, so Leaflet lat = 1024 - py, Leaflet lng = px.
            const latLngs = pathPoints.map(p => [1024 - p[1], p[0]]);

            // Style: Unique vibrant neon color for each human player, subtle slate for bots
            let baseColor = Utils.getPlayerColor(player, pIdx);
            let color = baseColor;
            let weight = isHuman ? 3.5 : 1.8;
            let opacity = isHuman ? 0.95 : 0.55;

            if (focusedPlayerId) {
                if (isFocused) {
                    color = '#00f2fe'; // Super high-visibility glowing cyan/gold
                    weight = 5.5;
                    opacity = 1.0;
                } else {
                    opacity = isHuman ? 0.35 : 0.12;
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

            // Current player location marker (head of path) during playback with pulse animation
            if (timeLimit !== null && latLngs.length > 0) {
                const currentPos = latLngs[latLngs.length - 1];

                // Outer pulsing glow aura
                const pulseRing = L.circleMarker(currentPos, {
                    radius: isHuman ? 11 : 7,
                    color: color,
                    fillColor: color,
                    fillOpacity: 0.25,
                    weight: 1.5,
                    className: 'player-head-pulse'
                });
                this.pathLayers.addLayer(pulseRing);

                // Central high-contrast position head
                const headMarker = L.circleMarker(currentPos, {
                    radius: isHuman ? 5.5 : 3.5,
                    color: '#ffffff',
                    fillColor: color,
                    fillOpacity: 1,
                    weight: 2,
                    className: 'player-head-point'
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

                // Leaflet CRS.Simple: lat = 1024 - evt.y, lng = evt.x
                const marker = L.circleMarker([1024 - evt.y, evt.x], {
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
