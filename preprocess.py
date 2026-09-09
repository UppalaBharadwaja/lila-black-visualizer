"""
LILA BLACK Player Journey Data Preprocessor
Converts parquet telemetry files into optimized JSON for the web visualization tool.
"""

import pyarrow.parquet as pq
import pandas as pd
import json
import os
import shutil
import re
from datetime import datetime

# === Configuration ===

DATA_DIR = "player_data"
OUTPUT_DIR = "public/data"
MINIMAPS_SRC = os.path.join(DATA_DIR, "minimaps")
MINIMAPS_DST = os.path.join("public", "minimaps")

DAYS = ["February_10", "February_11", "February_12", "February_13", "February_14"]
DATE_LABELS = {
    "February_10": "2026-02-10",
    "February_11": "2026-02-11",
    "February_12": "2026-02-12",
    "February_13": "2026-02-13",
    "February_14": "2026-02-14",
}

# Map coordinate configs from the README
MAP_CONFIGS = {
    "AmbroseValley": {"scale": 900, "origin_x": -370, "origin_z": -473},
    "GrandRift":     {"scale": 581, "origin_x": -290, "origin_z": -290},
    "Lockdown":      {"scale": 1000, "origin_x": -500, "origin_z": -500},
}

IMAGE_SIZE = 1024  # Minimap images are 1024x1024

# UUID regex for detecting human players
UUID_RE = re.compile(r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$', re.IGNORECASE)


def is_human(user_id: str) -> bool:
    """Determine if a user_id belongs to a human player (UUID) or bot (numeric)."""
    return bool(UUID_RE.match(user_id))


def world_to_pixel(x: float, z: float, map_id: str) -> tuple:
    """Convert world coordinates (x, z) to minimap pixel coordinates."""
    cfg = MAP_CONFIGS[map_id]
    u = (x - cfg["origin_x"]) / cfg["scale"]
    v = (z - cfg["origin_z"]) / cfg["scale"]
    pixel_x = u * IMAGE_SIZE
    pixel_y = (1 - v) * IMAGE_SIZE
    return round(pixel_x, 1), round(pixel_y, 1)


def load_all_data() -> pd.DataFrame:
    """Load all parquet files from all days into a single DataFrame."""
    all_frames = []
    file_count = 0

    for day in DAYS:
        folder = os.path.join(DATA_DIR, day)
        if not os.path.isdir(folder):
            print(f"  Warning: {folder} not found, skipping")
            continue

        for filename in os.listdir(folder):
            if filename.startswith('.'):
                continue
            filepath = os.path.join(folder, filename)
            try:
                table = pq.read_table(filepath)
                df = table.to_pandas()

                # Decode event column from bytes
                df['event'] = df['event'].apply(
                    lambda x: x.decode('utf-8') if isinstance(x, bytes) else str(x)
                )

                # Add the date folder as metadata
                df['date'] = DATE_LABELS[day]

                # Clean match_id: strip .nakama-0 suffix for display
                df['match_id_clean'] = df['match_id'].str.replace('.nakama-0', '', regex=False)

                all_frames.append(df)
                file_count += 1
            except Exception as e:
                print(f"  Error reading {filepath}: {e}")
                continue

    print(f"Loaded {file_count} files")
    df = pd.concat(all_frames, ignore_index=True)
    print(f"Total rows: {len(df)}")
    return df


def compute_match_metadata(df: pd.DataFrame) -> list:
    """Compute per-match metadata for the match index."""
    matches = []

    for match_id, mdf in df.groupby('match_id_clean'):
        map_id = mdf['map_id'].iloc[0]
        date = mdf['date'].iloc[0]

        # Count humans vs bots
        unique_users = mdf['user_id'].unique()
        humans = [u for u in unique_users if is_human(u)]
        bots = [u for u in unique_users if not is_human(u)]

        # Compute match duration from timestamps
        ts_values = mdf['ts'].astype('int64')  # milliseconds since epoch
        ts_min = ts_values.min()
        ts_max = ts_values.max()
        duration_ms = ts_max - ts_min

        # Count events
        event_counts = mdf['event'].value_counts().to_dict()

        matches.append({
            "id": match_id,
            "map": map_id,
            "date": date,
            "humans": len(humans),
            "bots": len(bots),
            "duration_ms": int(duration_ms),
            "total_events": len(mdf),
            "events": {
                "kills": event_counts.get("Kill", 0) + event_counts.get("BotKill", 0),
                "deaths": event_counts.get("Killed", 0) + event_counts.get("BotKilled", 0),
                "storm_deaths": event_counts.get("KilledByStorm", 0),
                "loots": event_counts.get("Loot", 0),
            }
        })

    # Sort by date then match_id
    matches.sort(key=lambda m: (m["date"], m["id"]))
    return matches


def build_match_detail(match_id: str, mdf: pd.DataFrame) -> dict:
    """Build detailed match data with pixel-mapped coordinates for one match."""
    map_id = mdf['map_id'].iloc[0]

    # Get base timestamp for relative timing
    ts_values = mdf['ts'].astype('int64')
    ts_base = ts_values.min()

    players = {}
    for user_id, udf in mdf.groupby('user_id'):
        udf_sorted = udf.sort_values('ts')

        human = is_human(user_id)

        # Build path points and events
        path = []
        events = []

        for _, row in udf_sorted.iterrows():
            px, py = world_to_pixel(row['x'], row['z'], map_id)
            t = int(row['ts'].value // 1_000_000) - int(ts_base)  # ms relative to match start
            event_type = row['event']

            if event_type in ('Position', 'BotPosition'):
                path.append([px, py, t])
            else:
                events.append({
                    "type": event_type,
                    "x": px,
                    "y": py,
                    "t": t,
                })
                # Also add to path for continuity
                path.append([px, py, t])

        # Short user_id for display
        display_id = user_id[:8] if human else f"Bot-{user_id}"

        players[user_id] = {
            "id": user_id,
            "display": display_id,
            "human": human,
            "path": path,
            "events": events,
        }

    return {
        "id": match_id,
        "map": map_id,
        "date": mdf['date'].iloc[0],
        "ts_base": int(ts_base),
        "duration_ms": int(ts_values.max() - ts_base),
        "players": players,
    }


def build_heatmap_data(df: pd.DataFrame) -> dict:
    """Build pre-aggregated heatmap data per map."""
    heatmaps = {}

    for map_id in MAP_CONFIGS:
        map_df = df[df['map_id'] == map_id]

        # Kill locations (Kill + BotKill events)
        kills_df = map_df[map_df['event'].isin(['Kill', 'BotKill'])]
        kill_points = []
        for _, row in kills_df.iterrows():
            px, py = world_to_pixel(row['x'], row['z'], map_id)
            kill_points.append([py, px, 1.0])  # Leaflet uses [lat, lng] = [y, x]

        # Death locations (Killed + BotKilled + KilledByStorm)
        deaths_df = map_df[map_df['event'].isin(['Killed', 'BotKilled', 'KilledByStorm'])]
        death_points = []
        for _, row in deaths_df.iterrows():
            px, py = world_to_pixel(row['x'], row['z'], map_id)
            death_points.append([py, px, 1.0])

        # Traffic (all Position + BotPosition, subsampled for performance)
        traffic_df = map_df[map_df['event'].isin(['Position', 'BotPosition'])]
        # Subsample: take every Nth row to keep heatmap data manageable
        subsample_rate = max(1, len(traffic_df) // 5000)
        traffic_sampled = traffic_df.iloc[::subsample_rate]
        traffic_points = []
        for _, row in traffic_sampled.iterrows():
            px, py = world_to_pixel(row['x'], row['z'], map_id)
            traffic_points.append([py, px, 0.5])

        # Loot locations
        loot_df = map_df[map_df['event'] == 'Loot']
        loot_points = []
        for _, row in loot_df.iterrows():
            px, py = world_to_pixel(row['x'], row['z'], map_id)
            loot_points.append([py, px, 1.0])

        heatmaps[map_id] = {
            "kills": kill_points,
            "deaths": death_points,
            "traffic": traffic_points,
            "loot": loot_points,
        }

    return heatmaps


def main():
    print("=" * 60)
    print("LILA BLACK Data Preprocessor")
    print("=" * 60)

    # Create output directories
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    os.makedirs(os.path.join(OUTPUT_DIR, "matches"), exist_ok=True)
    os.makedirs(MINIMAPS_DST, exist_ok=True)

    # Copy minimap images
    print("\n[1/4] Copying minimap images...")
    for fname in os.listdir(MINIMAPS_SRC):
        src = os.path.join(MINIMAPS_SRC, fname)
        dst = os.path.join(MINIMAPS_DST, fname)
        shutil.copy2(src, dst)
        print(f"  Copied {fname}")

    # Load all data
    print("\n[2/4] Loading parquet data...")
    df = load_all_data()

    # Event summary
    print(f"\nEvent distribution:")
    for event, count in df['event'].value_counts().items():
        print(f"  {event}: {count}")

    # Build match index
    print("\n[3/4] Building match index...")
    matches = compute_match_metadata(df)
    print(f"  {len(matches)} matches indexed")

    # Save match index
    with open(os.path.join(OUTPUT_DIR, "matches.json"), "w") as f:
        json.dump(matches, f, separators=(',', ':'))
    print(f"  Saved matches.json")

    # Build per-match detail files
    print("\n[4/4] Building match detail files...")
    match_count = 0
    for match_id, mdf in df.groupby('match_id_clean'):
        detail = build_match_detail(match_id, mdf)
        # Use a safe filename
        safe_id = match_id.replace('-', '')[:16]
        filepath = os.path.join(OUTPUT_DIR, "matches", f"{safe_id}.json")
        with open(filepath, "w") as f:
            json.dump(detail, f, separators=(',', ':'))
        match_count += 1
        if match_count % 100 == 0:
            print(f"  Processed {match_count} matches...")

    print(f"  Saved {match_count} match files")

    # Build heatmap data
    print("\nBuilding heatmap data...")
    heatmaps = build_heatmap_data(df)
    with open(os.path.join(OUTPUT_DIR, "heatmaps.json"), "w") as f:
        json.dump(heatmaps, f, separators=(',', ':'))

    for map_id, data in heatmaps.items():
        print(f"  {map_id}: {len(data['kills'])} kills, {len(data['deaths'])} deaths, "
              f"{len(data['traffic'])} traffic points, {len(data['loot'])} loot points")

    # Update match index with safe filenames
    for match in matches:
        match["file"] = match["id"].replace('-', '')[:16] + ".json"

    with open(os.path.join(OUTPUT_DIR, "matches.json"), "w") as f:
        json.dump(matches, f, separators=(',', ':'))

    print("\n" + "=" * 60)
    print("Preprocessing complete!")
    print(f"Output directory: {OUTPUT_DIR}")
    print("=" * 60)


if __name__ == "__main__":
    main()
