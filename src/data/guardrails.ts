/**
 * Guardrails — static advisory text for conditions that affect achievement progression.
 *
 * These are informational tips, not dynamic detections. The save file does not contain
 * current-run state (seeded, victory lap, etc.), so these are shown alongside
 * recommendations as general guidance.
 */

export interface Guardrail {
  id: string;
  title: string;
  description: string;
  category: "warning" | "tip";
}

export const GUARDRAILS: Guardrail[] = [
  // Warnings — conditions that suppress achievements
  {
    id: "seeded-runs",
    title: "Seeded runs disable achievements",
    description: "Entering a seed disables all achievements for that run. Look for the no-trophies icon in the HUD.",
    category: "warning",
  },
  {
    id: "victory-laps",
    title: "Victory Laps disable most marks",
    description: "Victory Laps only count toward 3 specific achievements (321, 337, 360). Normal completion marks do NOT count.",
    category: "warning",
  },
  {
    id: "daily-challenges",
    title: "Daily Challenges have limited achievements",
    description: "Only 3 achievements are earnable from Dailies: Dedication (31 participations), Marathon (5-win streak), and Broken Modem (7 completions).",
    category: "warning",
  },
  {
    id: "mods",
    title: "Some mods disable achievements",
    description: "Mods that change gameplay can disable achievement tracking. Check mod descriptions or disable mods when going for unlocks.",
    category: "warning",
  },

  // Strategic tips
  {
    id: "always-hard",
    title: "Always play on Hard mode",
    description: "The difficulty gap is small in Repentance and Hard mode marks are required for Mega Mush and Death Certificate. Playing Normal means doing everything twice.",
    category: "tip",
  },
  {
    id: "angel-rooms",
    title: "Take Angel Rooms for Mega Satan",
    description: "Mega Satan requires both Key Pieces from Angel Rooms in a single run. Players who always take Devil Deals will be permanently blocked from Mega Satan marks.",
    category: "tip",
  },
  {
    id: "boss-rush-timer",
    title: "Boss Rush: reach Mom within 20 minutes",
    description: "Boss Rush only appears if you reach Mom in under 20 minutes (25 minutes in Mausoleum/Gehenna). Rush through floors when going for Boss Rush marks.",
    category: "tip",
  },
  {
    id: "hush-timer",
    title: "Hush: reach Mom's Heart within 30 minutes",
    description: "The Blue Womb (Hush) entrance only appears if you defeat Mom's Heart/It Lives in under 30 minutes.",
    category: "tip",
  },
  {
    id: "greed-jam",
    title: "Rotate characters for Greed Machine donations",
    description: "The Greed Machine jams more frequently for characters that have donated more. Rotate characters to maximize donations per run.",
    category: "tip",
  },
  {
    id: "alt-path-knife",
    title: "Alt Path uses Knife Pieces, not Key Pieces",
    description: "The Alt Path (Downpour → Corpse → Mother) requires Knife Pieces from the mirror and minecart puzzles. Angel Rooms are NOT required for Alt Path access.",
    category: "tip",
  },
  {
    id: "daily-challenges-early",
    title: "Start Daily Challenges early for time-gated unlocks",
    description: "Broken Modem requires 7 Daily completions (minimum 7 real-world days). Dedication needs 31 participations. Marathon needs a 5-win streak. Start now to avoid a bottleneck later.",
    category: "tip",
  },
];
