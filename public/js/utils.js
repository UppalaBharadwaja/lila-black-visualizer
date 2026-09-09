/**
 * utils.js — Utility functions for the Player Journey Visualization Tool
 */

const Utils = {
    /**
     * Map configurations for coordinate conversion
     */
    MAP_CONFIGS: {
        AmbroseValley: { scale: 900, originX: -370, originZ: -473, image: 'minimaps/AmbroseValley_Minimap.png' },
        GrandRift:     { scale: 581, originX: -290, originZ: -290, image: 'minimaps/GrandRift_Minimap.png' },
        Lockdown:      { scale: 1000, originX: -500, originZ: -500, image: 'minimaps/Lockdown_Minimap.jpg' },
    },

    IMAGE_SIZE: 1024,

    /**
     * Event type styling configuration
     */
    EVENT_STYLES: {
        Kill:          { color: '#ff1744', icon: '⚔', label: 'Player Kill', radius: 8 },
        Killed:        { color: '#ff6d00', icon: '💀', label: 'Player Death', radius: 8 },
        BotKill:       { color: '#ff4081', icon: '⚔', label: 'Bot Kill', radius: 6 },
        BotKilled:     { color: '#ffab40', icon: '💀', label: 'Bot Death', radius: 6 },
        KilledByStorm: { color: '#aa00ff', icon: '⚡', label: 'Storm Death', radius: 9 },
        Loot:          { color: '#00e676', icon: '📦', label: 'Loot', radius: 5 },
    },

    /**
     * Player path colors
     */
    PLAYER_COLORS: {
        human: '#00d2ff',
        bot: '#666',
    },

    /**
     * Format milliseconds to mm:ss display
     */
    formatTime(ms) {
        const totalSec = Math.floor(ms / 1000);
        const min = Math.floor(totalSec / 60);
        const sec = totalSec % 60;
        return `${min}:${sec.toString().padStart(2, '0')}`;
    },

    /**
     * Format match ID for display (first 8 chars)
     */
    formatMatchId(id) {
        return id.substring(0, 8) + '...';
    },

    /**
     * Check if a user_id is a human player (UUID format)
     */
    isHuman(userId) {
        return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
    },

    /**
     * Fetch JSON data with error handling
     */
    async fetchJSON(url) {
        try {
            const resp = await fetch(url);
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            return await resp.json();
        } catch (err) {
            console.error(`Failed to fetch ${url}:`, err);
            return null;
        }
    },

    /**
     * Debounce function for performance
     */
    debounce(fn, delay) {
        let timer;
        return (...args) => {
            clearTimeout(timer);
            timer = setTimeout(() => fn(...args), delay);
        };
    },
};
