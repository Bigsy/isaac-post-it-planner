# Isaac Post-it Planner

**https://isaac.bigsy.uk**

A client-side web app that reads your Binding of Isaac save file and tells you what to focus on next. Existing tools show what you *have* — this one tells you what to *do*.

Drop your save file in the browser. Nothing is uploaded; everything runs locally.

## What it shows

- **DLC detection** — auto-detects supported save versions from Rebirth through Repentance+ and filters all content to your DLC level
- **Play Next** — achievable reward-first choices: Best power unlock, Easier useful run, and Progress toward a major unlock when suitable distinct options exist. Additional alternatives and lower-priority targets remain expandable.
- **Powerful unlocks you're missing** — a separate reviewed catalog with benefits, unlock methods, prerequisites, and Available now / Needs setup / Long-term / Excluded by your preferences status.
- **Session preferences** — Power unlocks (default) or Completion, avoided characters, and no timed runs. Changes reanalyse the loaded save immediately; Reset clears the controls.
- **Ongoing goals** — daily reminders and donation grinds stay visible outside the next-run competition.
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

The default objective is to make future runs stronger. The planner generates all feasible character routes, including one-reward Beast and Mother runs, before scoring. It checks character access, challenge unlock flags, DLC, mechanical route gates and Greedier access. Timed routes retain their conditions. A shorter route can win without requiring an extra Mega Satan detour.

One final heuristic scores every playable action:

- Up to 60 points for the strongest reward actually earned.
- Up to 20 for useful prerequisite progress toward a named unlock; long compound goals get only a small contribution.
- Up to 10 for other unique useful rewards, with diminishing returns.
- Up to 5 for incidental useful marks.
- A route/character burden penalty of up to 25.

Completion mode instead raises unique completion credit and reduces the dominance of primary power benefit. Co-op babies contribute completion value but no solo power. Empty post-its and death counts are not estimates of skill: a one-win target stays a one-run target. Editorial phases and community/challenge bonuses are not added to final power scores.

Equivalent completed and partial outcomes are deduplicated separately. Preferences are hard exclusions from next-run selection, while excluded valuable targets remain in the missing-power list. Special recommendation slots are left empty when no useful distinct candidate fits; the easier option must have lower estimated burden. Selection does not alter scores. Add `?debug` to inspect the actual score contributions and suppression reasons.

## Assumptions and limits

- Curated account benefit is distinct from in-game strength and the existing S/A/B/C item badges. Unreviewed rewards use a conservative fallback and are labelled explicitly. See the [reward audit](docs/reward-audit.md) and source links in the catalog.
- Save files expose aggregate unlocks, not every partial requirement. Tainted bundles and Godhead/Mega Mush/Death Certificate are described honestly as progress or long-term targets.
- Daily counts and streaks are not readable; reminders do not claim current progress. Donation amounts do not guarantee that the next machine will accept enough coins.
- Mega Satan requires in-run setup; pre-It-Lives branch access is conditional. The planner does not predict success probabilities, room RNG, or exact item encounter rates.
- The catalog does not cover every strong reward yet. The complete missing-unlock browser remains available for everything outside the reviewed catalog.
- Preferences live only in memory for the session. Saves are parsed locally and never modified or uploaded. Repentance patch variants share the current parser's DLC category and 637-achievement catalog.

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
npx tsc --noEmit # type-check production code
npx tsx scripts/diagnose.ts # compare all repository fixtures
npx tsx scripts/diagnose.ts /path/to/save.dat # read-only calibration
```

## Tech

- TypeScript + esbuild (no framework, no runtime dependencies)
- Native binary parser using DataView — no external parsing libraries
- Static output to `dist/` for GitHub Pages
- Vitest for testing
