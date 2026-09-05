# Reward audit — 2026-09-05

The planner's reviewed **account-benefit** catalog is `src/data/unlock-values.ts`. Its 0–1 values are editorial priorities, not drop probabilities or in-game item quality. Each entry records a practical benefit, reward kind, access type, review confidence, and source pages. The existing S/A/B/C badges remain separate from account priority.

Verification used the local achievement table, character mark mappings, and indexed wiki pages. Direct wiki requests sometimes returned 403; the indexed versions supplied the achievement tables and individual item descriptions. IDs below are **achievement IDs**, not collectible IDs. Semantic tests check every reviewed entry against the local achievement name, with explicit aliases for the Lost's Mantle and Keeper's penny upgrade.

## Core reviewed targets

| Achievement | Reward | Review conclusion |
| --- | --- | --- |
| 29 | D6 | Guaranteed Isaac starting upgrade as well as pool access; highest account benefit. |
| 250 | Lost holds Holy Mantle | Guaranteed room-by-room protection; donation is a repeated-run goal. |
| 190 | Incubus | High-value tear-copying familiar; Lilith/Hush and its timer verified. |
| 463 | C Section | High-value weapon; dedicated Lilith/Beast route. |
| 417 | Book of Virtues | Wisp protection and active-item synergies; Bethany/Isaac. |
| 470 | Revelation | Flight and charged beam; Bethany/Mother. |
| 431, 429 | Birthright, Stairway | Character-specific improvements and recurring Angel shops; Jacob/??? and Jacob/Isaac. |
| 433 | Rock Bottom | Strong with temporary stat boosts; benefit discounted for dependence on other items. |
| 491 | Glitched Crown | Five pedestal choices with pickup timing; T.Isaac/Beast. |
| 502 | Twisted Pair | Strong tear-copying familiars; T.Lilith/Beast. |
| 501 | Sacred Orb | Filters weaker spawns; T.Lost/Beast has substantial character burden. |
| 282 | D Infinity | Selectable dice in Repentance; weaker random cycling behavior in earlier DLC. |
| 584 | Spindown Dice | Predictable transformations; T.Isaac/Delirium, not Beast. |
| 464 | Keeper's Sack | Shopping grants stats; Keeper/Mother, not Keeper/Beast. |
| 504 | Echo Chamber | Replays recent consumables; modern three-consumable limit, not infinite accumulation. |
| 432 | Damocles | Extra items with a potentially fatal use drawback; benefit is situational. |
| 444 | Guppy's Eye | Resource information and Guppy contribution; Cain/Mother. |
| 415 | Red Key | First Home chest; corrected community mapping from 499 (Salvation). |
| 236, 191 | Keeper starting upgrades | Wooden Nickel is 236, not 237 (Store Key); third health container from Hush applies in Repentance. |
| 156, 547, 636 | Godhead, Mega Mush, Death Certificate | Compound hard-mode goals. No invented one-win completion or constituent counts. |

Primary references: [Achievements](https://bindingofisaacrebirth.wiki.gg/wiki/Achievements), [D6](https://bindingofisaacrebirth.wiki.gg/wiki/D6), [Greed Donation Machine](https://bindingofisaacrebirth.wiki.gg/wiki/Greed_Donation_Machine), [Keeper](https://bindingofisaacrebirth.wiki.gg/wiki/Keeper), [Mother](https://bindingofisaacrebirth.wiki.gg/wiki/Mother), [The Beast](https://bindingofisaacrebirth.wiki.gg/wiki/The_Beast), [Delirium](https://bindingofisaacrebirth.wiki.gg/wiki/Delirium). Individual effect references are stored alongside each catalog entry.

## Challenge and system benefits

Reviewed Jera, Perthro, Algiz, Dagaz, Ansuz, Chaos Card, Credit Card, Death's Touch, Technology .5, Gold Bomb, Sigil of Baphomet, Spirit Sword, and Magdalene's starting pill. The catalog also explicitly values Polaroid, Negative, Greedier, alternate-path, and Home access. Challenge burden is separate from reward benefit: for example, Solar System's blindfolded orbital combat costs more than High Brow.

[Challenge unlock flags](https://bindingofisaacrebirth.wiki.gg/wiki/Challenge) are checked for older challenges too. They preserve actual access across DLC changes such as Onan's Streak and Backasswards. Repentance challenge dependency descriptions are retained when the flag is absent.

[Runes](https://bindingofisaacrebirth.wiki.gg/wiki/Runes) confirm that Rune Shards are a Repentance mechanic. The previous general six-rune bonus and “cleans up the pool” claim were removed. No pool-threshold bonus contributes to final scores. [Magdalene](https://bindingofisaacrebirth.wiki.gg/wiki/Magdalene) starts with Speed Up after Aprils Fool in AB+, and Full Health in Repentance; the catalog adapts the explanation.

## Boundaries

- Remaining rewards have provisional account benefit. An old item-tier badge alone does not make a reward reviewed for account strength. Unknown primary rewards show “unreviewed”, never an invented B-tier default.
- Co-op babies have zero solo power value, including legacy explicit B-tier baby entries. Completion mode still counts their achievements.
- Optional pickups such as Missing No., Magic Skin, and TMTRAINER are not presented as unavoidable damage to every future run. Corrupted Data does affect subsequent spawns; it remains low priority, without a blanket warning about all situational items.
- Normal boss-unlock achievements cannot establish every hard-mode mark. Tainted bundles likewise lack constituent progress in this parser. Their benefits stay partial until the aggregate flag is unlocked.
- Mega Satan still needs a door opener in the current run. Before It Lives, Sheol/Cathedral access is conditional on a post-heart deal. Instructions disclose both conditions; the planner does not predict room RNG.
- The parser groups Repentance and Repentance+ and currently tracks the repository's 637 achievements. Patch-specific pools and four newer online secrets are outside this implementation.
