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
        KilledByStorm: { color: '#aa00ff', icon: '🌧', label: 'Storm Death', radius: 9 },
        Loot:          { color: '#00e676', icon: '📦', label: 'Loot', radius: 5 },
    },

    /**
     * Distinct vibrant neon color palette for player routes
     */
    PALETTE: [
        '#3b82f6', // Electric Cobalt Blue
        '#10b981', // Emerald Green
        '#f59e0b', // Radiant Amber Gold
        '#ec4899', // Hot Pink
        '#8b5cf6', // Vivid Violet
        '#06b6d4', // Cyan
        '#f97316', // Neon Orange
        '#e11d48', // Crimson Red
        '#14b8a6', // Teal
        '#a855f7', // Purple
    ],

    getPlayerColor(player, index) {
        if (player.human) {
            return this.PALETTE[index % this.PALETTE.length];
        }
        // Distinct subtle bot colors
        const botPalette = ['#64748b', '#94a3b8', '#78716c', '#6b7280', '#475569'];
        return botPalette[index % botPalette.length];
    },

    /**
     * Format seconds or milliseconds to mm:ss display
     */
    formatTime(val) {
        if (!val || isNaN(val) || val <= 0) return '0:00';
        // Dataset relative times and match durations are in seconds (e.g. 0 to 900 seconds)
        // If a timestamp is in milliseconds (> 100000), convert to seconds
        const totalSec = Math.floor(val > 100000 ? val / 1000 : val);
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
