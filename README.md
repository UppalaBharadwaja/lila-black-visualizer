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

## 📖 Feature Walkthrough

### 1. Overview & High-Level Telemetry
- **Top KPI Cards**: View aggregate metrics across the selected telemetry slice: Total Matches, Average Players per Match, Combat Kills, and Storm Deaths.
- **Tactical Minimap View**: High-resolution 1024×1024 map canvas with coordinate grids, responsive zoom controls (+ / —), and quick fit (⛶).
- **Map Selection**: Quickly switch between Ambrose Valley, Grand Rift, and Lockdown with instant coordinate and minimap recalibration.

### 2. Match Explorer & Player Journeys
- **Match Selector**: Choose from 796 matches with live human/bot composition, duration, and kill count metadata.
- **Operative Paths**: Visual polylines showing exact player trajectories. Human operatives are highlighted in cyan (`#00d2ff`) and bots in stealth gray (`#888888`).
- **Event Markers**:
  - ⚔ **Kills / Bot Kills**: Red combat crosshairs showing where engagements occurred.
  - 💀 **Deaths / Bot Deaths**: Orange skull markers marking elimination positions.
  - 📦 **Loot Pickups**: Green loot boxes highlighting item collection spots.
  - ⚡ **Storm Deaths**: Purple storm markers indicating players caught outside safe zones.

### 3. Timeline Playback & Match Progression
- **Play / Pause (▶ / ⏸)**: Watch the match unfold chronologically in simulated time.
- **Speed Multipliers**: Seamlessly toggle between 1x, 2x, 4x, and 8x playback speeds.
- **Interactive Scrubber**: Drag across match duration with live millisecond tooltips and dynamic trajectory growth.

### 4. Operative Roster & Milestone Inspection
- **Operative Cards**: View each player's status (Alive vs. Eliminated), human/bot badge, and total kills.
- **Path Isolation**: Click any operative card to highlight their specific path and dim out others.
- **Milestone Navigation**: Click chronological combat milestones to pan directly to key firefights.

### 5. Heatmap Density Overlays
- **Toggle Modes**: Switch between **Kill Zones**, **Death Zones**, **Traffic Density**, and **Loot Spots**.
- **Dynamic Filtering**: Heatmaps react to both the active map and date filter, showing day-level hotspot shifts.
- **Density Legend**: Visual gradient from low density (cyan/blue) to high density (yellow/red) with live point counter badge and a quick **✕ Clear** button.

## ✅ Submission Checklist Verification

- [x] **Tool is live at the hosted URL**: Accessible at [https://lila-black-visualizer.netlify.app](https://lila-black-visualizer.netlify.app)
- [x] **Player paths render correctly on the minimap**: Coordinate transformation formula applied with 0 out-of-bounds errors.
- [x] **Can tell humans apart from bots visually**: Cyan vs. Gray paths, distinct roster badges, and filter toggles.
- [x] **Kill, death, loot, and storm events are marked**: Distinct event icons with tooltips.
- [x] **Filtering by map/date/match works**: Multi-level dropdowns and pill filters.
- [x] **Timeline or playback shows match progression**: Scrubber, play/pause, and 1x–8x playback speeds.
- [x] **Heatmaps show kill zones, death zones, and traffic**: Interactive Leaflet.heat overlays with density gradient.
- [x] **Architecture doc covers coordinate mapping approach**: Detailed in [`ARCHITECTURE.md`](ARCHITECTURE.md).
- [x] **Three insights with supporting evidence**: Documented with metrics in [`INSIGHTS.md`](INSIGHTS.md).
- [x] **Walkthrough covers all major features**: Complete walkthrough included above.

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
