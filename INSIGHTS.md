# INSIGHTS.md — Three Things We Learned About LILA BLACK

## Insight 1: AmbroseValley's West Side is a Kill Corridor — The East is a Ghost Town

### What caught my eye
Traffic and kill data on AmbroseValley is heavily skewed to the west/southwest quadrants. The east side of the map sees dramatically less activity.

### Supporting evidence
- **74.2% of all player traffic** on AmbroseValley occurs in the west half (NW: 34.1% + SW: 40.1%), while the east half sees only 25.9% (NE: 10.2% + SE: 15.7%)
- The top 5 kill grid cells are all in the center-west area, with **Cell (5,5)** alone accounting for 224 kills and 1,317 loot pickups
- The northeast quadrant sees only **10.2%** of traffic — less than a third of the southwest

### Actionable insight
**Metric affected**: Player engagement distribution, map utilization rate, time-to-first-encounter

**Actions**:
- Investigate *why* the east side is underused — are spawn points clustered west? Is loot distribution skewed? Is the storm direction pushing players west?
- Consider adding high-value loot or objectives to the NE/SE quadrants to incentivize exploration
- If the east is intentionally low-activity (e.g., extraction zone approach), that's fine — but if it's dead space, it's wasted level design effort

### Why a level designer should care
Over 70% of your map's playable area is where players actually go. If the east side has interesting terrain, sightlines, and cover that nobody uses, those assets are wasted. Rebalancing loot placement or spawn locations could spread engagement across the full map.

---

## Insight 2: Lockdown Has the Highest Death-Per-Kill Ratio — Players Die More and Kill Less

### What caught my eye
Lockdown has a significantly different combat dynamic compared to the other maps.

### Supporting evidence
- **Kill-to-death ratio by map**:
  - AmbroseValley: **3.56** (1,799 kills / 505 deaths)
  - GrandRift: **3.71** (193 kills / 52 deaths)
  - Lockdown: **2.30** (426 kills / 185 deaths)
- Lockdown's K/D ratio is **35-38% lower** than the other maps
- Lockdown also has the highest bot ratio at **42.4%** (vs 33.7% for AmbroseValley), meaning bots are filling more slots
- Despite being described as a "smaller/close-quarters map," average kills per match is only **2.5** (vs 3.2 for AmbroseValley)

### Actionable insight
**Metric affected**: Player survival rate, engagement satisfaction, bot encounter frequency

**Actions**:
- The low K/D suggests players on Lockdown are dying to bots more often. Review bot AI behavior on this map — are bots too aggressive in close quarters?
- The higher bot ratio (42.4%) combined with lower kills suggests matchmaking may be struggling to fill Lockdown games with humans. Consider whether the map needs better marketing/incentives or if queue times are driving players to other maps
- Analyze if the close-quarters design creates too many unavoidable engagements where players die before they can react

### Why a level designer should care
A map where players die more than they kill feels punishing. If Lockdown's tight corridors create frustrating "death traps" rather than exciting close-quarters combat, the map flow needs adjustment — wider corridors, more cover, or alternate routes to avoid forced engagements.

---

## Insight 3: Storm Deaths Are Rare (5.3%) But Concentrated — The Storm May Not Be Threatening Enough

### What caught my eye
Storm deaths account for only 5.3% of all deaths across the entire dataset. This is surprisingly low for a game with a storm mechanic.

### Supporting evidence
- **Total deaths**: 703 combat + 39 storm = 742 total deaths
- **Storm death rate**: 39/742 = **5.3%** of all deaths are from the storm
- Storm deaths are evenly distributed across maps: AmbroseValley (17), Lockdown (17), GrandRift (5)
- Matches with the most combat (top 10) show **zero storm deaths** — experienced players never die to storm
- Even in multi-bot matches (15+ players), storm deaths are rare

### Actionable insight
**Metric affected**: Match pacing, extraction urgency, risk/reward decisions

**Actions**:
- If the storm is meant to create urgency and force movement, 5.3% death rate suggests it's too forgiving or too slow
- Consider: Does the storm close fast enough? Do players have too many extraction points? Is storm damage too low?
- A/B test increasing storm speed or reducing extraction windows to see if it creates more exciting end-game scenarios
- Alternatively, if the 5.3% rate is intentional (storm as a soft guide, not a threat), document this design philosophy for the team

### Why a level designer should care
The storm is one of the primary tools for controlling match flow and creating drama. If almost no one dies to it, it's not doing its job as a pressure mechanism. Level designers should decide: is the storm a hard boundary (should kill more) or a gentle nudge (current state is fine)? The answer shapes how you design extraction routes and safe zones.
