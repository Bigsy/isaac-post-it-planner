# Implementation validation — 2026-09-05

Baseline: 554 tests passed before edits. Final: 593 tests pass; `npx tsc --noEmit` and `make build` pass. No deployment was performed.

## Live-save calibration

The fresh live save parsed as 352 unlocked achievements (the plan recorded an older count of 431). It was read only. No live-save path or save-specific ranking rule is embedded in production code.

Before: Tainted Jacob and a daily reminder occupied two top slots; Revelation was the third. C Section, Spindown Dice, Keeper’s Sack, Echo Chamber and Guppy’s Eye had no generated actions.

After, default Power objective:

| Target | Character / route | Score |
| --- | --- | ---: |
| Unlock C Section | beat Beast as Lilith | 50.8 |
| Unlock Glitched Crown | beat Beast as T.Isaac | 47.8 |
| Unlock Twisted Pair | beat Beast as T.Lilith | 47.2 |
| Unlock Incubus | beat Hush as Lilith | 44.6 |
| Unlock Echo Chamber | beat Beast as T.Apollyon | 43.0 |
| Unlock Revelation | beat Mother as Bethany | 41.4 |

The broader reviewed list exposes Spindown Dice, Keeper’s Sack, Guppy’s Eye and compound long-term rewards independently of this shortlist. Already-earned rewards are omitted. These scores are editorial and are not comparable to the old scoring scale.

## Fixture coverage

| Fixture | Unlocked | DLC |
| --- | ---: | --- |
| Afterbirth+BP5_persistentgamedata.dat | 403 | afterbirth-plus |
| Afterbirth+_persistentgamedata.dat | 339 | afterbirth-plus |
| Afterbirth_persistentgamedata.dat | 276 | afterbirth |
| Rebirth_persistentgamedata.dat | 178 | rebirth |
| Repentance+_persistentgamedata.dat | 637 | repentance |
| Repentance_persistentgamedata.dat | 637 | repentance |
| fixture-earlygame-sparse.dat | 3 | rebirth |
| fixture-lategame-clustered.dat | 637 | repentance |
| fixture-lategame-nearly-there.dat | 634 | repentance |
| rep+persistentgamedata1.dat | 112 | repentance |
| user-save.dat | 131 | repentance |

Tests cover candidate coverage, equivalent versus partial outcomes, score totals, stable ordering, DLC and challenge access, Greedier, compound goals, and session exclusions. Older tests requiring multi-mark-only runs, phase bonuses, toxic warnings, or dailies in the next-run queue were replaced with the intended behavior.

## Browser verification

A fresh isolated Chromium session served `dist/` locally. All 11 fixture uploads rendered; the missing-power section showed at most six cards initially, with working expand/collapse controls only when more than six targets remained; the live-save checks exercised both objectives, timed exclusions, character exclusions, excluding every character, reset, and reanalysis without reupload. Desktop (1440 px) and mobile (390 px) screenshots were inspected. No JavaScript page errors, duplicate DOM IDs, broken internal action anchors, or page-width overflow were found. The app browser connector was unavailable, so these checks used standalone Playwright installed outside the repository.

Reproduce analyzer comparisons with `npx tsx scripts/diagnose.ts` or pass a read-only save path. See [reward audit](reward-audit.md) for sources and save-format limitations.
