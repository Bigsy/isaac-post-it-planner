# Isaac Post-it Planner

A client-side web app that reads your Binding of Isaac save file and tells you what to focus on next. Existing tools show what you *have* — this one tells you what to *do*.

Drop your save file in the browser. Nothing is uploaded; everything runs locally.

## What it shows

- **DLC detection** — auto-detects supported save versions from Rebirth through Repentance+ and filters all content to your DLC level
- **Overview** — achievement %, collectibles seen, bestiary progress, deaths, win streaks, Eden tokens, donation counters, and other key stats
- **What Next** — lane-based recommendation engine that scores and ranks what to tackle next across six lanes:
  - Progression gates (Mom kills, boss unlocks, etc.)
  - Character unlocks (base + tainted, with blocker detection)
  - Completion marks (highlights near-complete characters)
  - Challenges (with prerequisite checking and tier ranking)
  - Donation milestones (Greed + normal, with coin progress)
  - Tips & guardrails (early-game guidance)
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
make test     # vitest (396 tests)
make build    # production bundle
make clean    # remove built files
```

## Tech

- TypeScript + esbuild (no framework, no runtime dependencies)
- Native binary parser using DataView — no external parsing libraries
- Static output to `dist/` for GitHub Pages
- Vitest for testing
