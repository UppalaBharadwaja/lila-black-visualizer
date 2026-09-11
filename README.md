# LILA BLACK — Player Journey Visualization Tool

A browser-based visualization tool that lets Level Designers explore player behavior across LILA BLACK's 3 maps.

## 🔗 Live Demo

- **Live Deployed App (Netlify)**: [https://lila-black-visualizer.netlify.app](https://lila-black-visualizer.netlify.app)
- **GitHub Repository**: [https://github.com/UppalaBharadwaja/lila-black-visualizer](https://github.com/UppalaBharadwaja/lila-black-visualizer)
- **GitHub Pages Mirror**: [https://uppalabharadwaja.github.io/lila-black-visualizer/](https://uppalabharadwaja.github.io/lila-black-visualizer/)

## Features

- **Interactive Minimap** — Zoom, pan, and explore player paths overlaid on game minimaps using Leaflet.js
- **Player Journeys** — View movement paths for all players in a match, with human/bot distinction (cyan vs gray)
- **Event Markers** — Kills (red ⚔), deaths (orange 💀), bot kills (pink), storm deaths (purple ⚡), loot (green 📦)
- **Filtering** — Filter by map, date, and specific match; toggle visibility of humans, bots, and event types
- **Timeline Playback** — Watch a match unfold over time with play/pause and adjustable speed (1x, 2x, 4x, 8x)
- **Heatmap Overlays** — Toggle between kill zones, death zones, traffic density, and loot spot overlays
- **Match Stats** — View match details including player count, duration, kill/death/loot counts

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Data Pipeline | Python 3.14 + pyarrow + pandas |
| Frontend | Vanilla HTML/JS/CSS |
| Map Rendering | Leaflet.js 1.9.4 (CDN) |
| Heatmaps | Leaflet.heat 0.2.0 (CDN) |
| Hosting | Static files (Vercel/Netlify) |

## Project Structure

```
├── preprocess.py          # Converts parquet → JSON
├── public/                # Static site (deployable)
│   ├── index.html
│   ├── css/style.css
│   ├── js/
│   │   ├── app.js         # Main orchestration
│   │   ├── map.js         # Leaflet map management
│   │   ├── filters.js     # Filter panel logic
│   │   ├── timeline.js    # Playback controls
│   │   ├── heatmap.js     # Heatmap overlays
│   │   └── utils.js       # Utilities & config
│   ├── data/              # Generated JSON data
│   │   ├── matches.json   # Match index (796 matches)
│   │   ├── matches/       # Per-match detail files
│   │   └── heatmaps.json  # Pre-computed heatmap data
│   └── minimaps/          # Map images (1024×1024)
├── player_data/           # Raw parquet data (not deployed)
├── ARCHITECTURE.md        # Architecture document
├── INSIGHTS.md            # Three game insights
└── README.md              # This file
```

## Setup & Running Locally

### Prerequisites
- Python 3.10+ with `pyarrow` and `pandas`

### Installation

```bash
# Install Python dependencies
pip install pyarrow pandas

# Run preprocessing (converts parquet → JSON)
python preprocess.py

# Start local server
python -m http.server 8080 --directory public

# Open in browser
# http://localhost:8080
```

### Environment Variables
None required — the app is fully static with no external APIs or databases.

## Data Pipeline

The preprocessing script (`preprocess.py`) handles:

1. Reading 1,243 parquet files across 5 date folders
2. Decoding `event` column from bytes to strings
3. Classifying users as human (UUID) vs bot (numeric ID)
4. Converting world coordinates to minimap pixel coordinates
5. Outputting optimized JSON files

## Deployment

The `public/` directory is a self-contained static site that can be deployed to any static hosting:

```bash
# Vercel
npx vercel public/

# Netlify
npx netlify deploy --dir=public --prod

# GitHub Pages
# Push public/ contents to gh-pages branch
```

## Data Summary

| Metric | Value |
|--------|-------|
| Date Range | Feb 10-14, 2026 |
| Total Events | 89,104 |
| Matches | 796 |
| Maps | AmbroseValley (566), Lockdown (171), GrandRift (59) |
| Event Types | Position, BotPosition, Kill, Killed, BotKill, BotKilled, KilledByStorm, Loot |
