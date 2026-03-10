# Isaac Post-it Planner

**https://isaac.bigsy.uk**

A client-side web app that reads your Binding of Isaac save file and tells you what to focus on next. Existing tools show what you *have* — this one tells you what to *do*.

Drop your save file in the browser. Nothing is uploaded; everything runs locally.

## What it shows

- **DLC detection** — auto-detects supported save versions from Rebirth through Repentance+ and filters all content to your DLC level
- **Play Next** — one unified ranked queue across boss routes, progression goals, character unlocks, marks, challenges, donations, and daily challenges:
  - `Do This` for the best current actions
  - `Rotate Into` for 2-5 strong alternatives after a light diversity pass
  - `When You're Ready` and `Backlog` so lower-priority work stays visible instead of disappearing
- **Summary** — overall completion plus a compact featured-pick card that points at the #1 action without duplicating the full recommendation card
- **Completion grid** — character x boss table with colour-coded marks and wiki-linked headers; separate grids for base (13 bosses) and tainted (7 bundled categories) characters
- **Character unlocks** — base and tainted, with how-to-unlock for locked ones
- **Challenges** — all 45, sorted by completion status, with reward wiki links
- **Missing Unlocks** — categorised browser of everything you haven't unlocked yet:
  - 8 categories: Items, Characters, Cards & Runes, Challenges, Starting Items, Co-op Babies, Stages & Bosses, Milestones
  - Per-category progress bars
  - Wiki links for each missing achievement
  - Collapsible sections that auto-expand when close to completion
- **Bestiary** — collapsible boss/enemy tables with encounter, kill, hit, and death counts (Repentance+ saves)
- **Wiki links** — names throughout the UI link to the Binding of Isaac wiki

## How recommendations work

The planner scores runs, gates, marks, challenges, donations, and dailies on one shared scale. The main inputs are:

- `impact` — how much future progression or item value the action opens up
- `readiness` — how close the save is to doing it now
- `effort` — a penalty for long grinds versus single-run wins
- `item quality` — boosts for strong unlocks and penalties for toxic pool pollution
- `phase alignment` — a single progression-phase bonus instead of phase-based sectioning
- `community meta` — a small curated nudge for widely valued unlocks like D6, Glitched Crown, Revelation, and Red Key

Two extra planner-specific rules matter:

- Daily challenges are surfaced intentionally because real time, not save state, is the blocker.
- Early Greed setup is treated as a real progression action, not buried as passive donation cleanup.

## Assumptions and limits

- Save files expose unlocked state, but not every form of partial progress.
- Daily challenge counts and streak state are not readable from the save, so daily recommendations use honest generic wording.
- Community advice is a light overlay, not a hardcoded progression script.
- Item-quality and toxic classifications are planner heuristics, not objective truth.

## Quick start

```
make install
make build
open dist/index.html
```

Then drag your Isaac save `.dat` file onto the page.

Common save folders:
- **Windows live Steam save:** `C:\Program Files (x86)\Steam\userdata\{steam-id}\250900\remote\`
- **macOS live Steam save:** `~/Library/Application Support/Steam/userdata/{steam-id}/250900/remote/`
- **Linux live Steam save:** `~/.local/share/Steam/userdata/{steam-id}/250900/remote/` or `~/.steam/steam/userdata/{steam-id}/250900/remote/`
- **Windows local/cloud-off folders:** `C:\Users\{you}\Documents\My Games\Binding of Isaac Rebirth\`, `C:\Users\{you}\Documents\My Games\Binding of Isaac Afterbirth\`, `C:\Users\{you}\Documents\My Games\Binding of Isaac Afterbirth+\`, `C:\Users\{you}\Documents\My Games\Binding of Isaac Repentance\`
- **macOS local folders:** `~/Library/Application Support/Binding of Isaac Rebirth/`, `~/Library/Application Support/Binding of Isaac Afterbirth/`, `~/Library/Application Support/Binding of Isaac Afterbirth+/`

For Steam installs, `userdata/<steam-id>/250900/remote/` is usually the live save folder. The version-named folders are mainly useful for local copies, backups, or cloud-off restore flows.

## Development

```
make dev      # esbuild serve with watch
make test     # vitest
make build    # production bundle
make clean    # remove built files
```

## Tech

- TypeScript + esbuild (no framework, no runtime dependencies)
- Native binary parser using DataView — no external parsing libraries
- Static output to `dist/` for GitHub Pages
- Vitest for testing
