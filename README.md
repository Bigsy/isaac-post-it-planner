# Isaac Post-it Planner

A client-side web app that reads your Binding of Isaac: Repentance save file and tells you what to focus on next. Existing tools show what you *have* — this one tells you what to *do*.

Drop your save file in the browser. Nothing is uploaded; everything runs locally.

## What it shows

- **Overview** — achievement completion %, deaths, key stats
- **Recommendations** — prioritised list of what to tackle next:
  1. Missing character unlocks (highest impact)
  2. Near-complete characters (4 or fewer marks left)
  3. Easy challenges and Greed mode
  4. Untouched characters
- **Completion grid** — character x boss table with colour-coded marks
- **Character unlocks** — base and tainted, with how-to-unlock for locked ones
- **Challenges** — all 45, sorted by completion status, with reward info

## Quick start

```
make install
make build
open dist/index.html
```

Then drag your `rep+persistentgamedata1.dat` onto the page.

Save file location:
- **Windows:** `C:\Users\{you}\Documents\My Games\Binding of Isaac Repentance\`
- **macOS:** `~/Library/Application Support/Binding of Isaac Repentance/`
- **Linux:** `~/.local/share/binding of isaac repentance/`

## Development

```
make dev      # esbuild serve with watch
make test     # vitest (34 tests)
make build    # production bundle
make clean    # remove built files
```

## Tech

- TypeScript + esbuild (no framework, no runtime dependencies)
- Native binary parser using DataView — no external parsing libraries
- Static output to `dist/` for GitHub Pages
- Vitest for testing
