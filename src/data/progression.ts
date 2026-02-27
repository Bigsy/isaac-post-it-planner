import type { CounterStats } from "../types";

/**
 * Progression gates — major route gates that block downstream content.
 *
 * Each gate has:
 *   - id: unique identifier
 *   - name: display name
 *   - description: what must be done
 *   - achievementIds: achievement(s) that prove this gate is cleared (empty = counter-based)
 *   - counterCheck: optional counter-based check (field name + threshold)
 *   - opens: what content becomes available
 *   - blockedBy: IDs of gates that must be cleared first
 */

export interface ProgressionGate {
  id: string;
  name: string;
  description: string;
  achievementIds: number[];
  counterCheck?: { field: keyof CounterStats; threshold: number };
  opens: string;
  blockedBy: string[];
}

export const PROGRESSION_GATES: ProgressionGate[] = [
  {
    id: "mom",
    name: "Mom",
    description: "Defeat Mom",
    achievementIds: [4], // "The Womb" — Chapter 4 unlocked
    opens: "Womb floors, Boss Rush access (reach Mom in <20min)",
    blockedBy: [],
  },
  {
    id: "it-lives",
    name: "It Lives",
    description: "Defeat Mom's Heart 11 times",
    achievementIds: [34], // "It Lives!" — replaces Mom's Heart permanently
    counterCheck: { field: "momsHeartKills", threshold: 11 },
    opens: "It Lives replaces Mom's Heart; unlocks Sheol/Cathedral paths",
    blockedBy: ["mom"],
  },
  {
    id: "blue-womb",
    name: "Blue Womb / Hush",
    description: "Defeat Mom's Heart 10 times (Hush access requires <30min clear)",
    achievementIds: [234], // "Blue Womb" hidden chapter unlocked
    counterCheck: { field: "momsHeartKills", threshold: 10 },
    opens: "Hush fight (reach Mom's Heart in <30min), Void portal after bosses",
    blockedBy: ["mom"],
  },
  {
    id: "sheol-cathedral",
    name: "Sheol / Cathedral",
    description: "Defeat Mom's Heart or It Lives",
    achievementIds: [],
    counterCheck: { field: "momsHeartKills", threshold: 1 },
    opens: "Satan path (Sheol) and Isaac path (Cathedral)",
    blockedBy: ["mom"],
  },
  {
    id: "polaroid",
    name: "The Polaroid",
    description: "Defeat Isaac 5 times",
    achievementIds: [57], // "The Polaroid"
    opens: "The Chest (??? path) via Polaroid after defeating Isaac",
    blockedBy: ["sheol-cathedral"],
  },
  {
    id: "negative",
    name: "The Negative",
    description: "Defeat Satan 5 times",
    achievementIds: [78], // "The Negative"
    opens: "Dark Room (The Lamb path) via Negative after defeating Satan",
    blockedBy: ["sheol-cathedral"],
  },
  {
    id: "mega-satan",
    name: "Mega Satan",
    description: "Obtain both Key Pieces from Angel Rooms in one run",
    achievementIds: [58], // "Dad's Key" — pick up both Key Pieces
    opens: "Mega Satan fight; unlocks Apollyon (ach 340) on first kill",
    blockedBy: ["sheol-cathedral"],
  },
  {
    id: "void-delirium",
    name: "Void / Delirium",
    description: "Defeat Hush (portal to Void appears after bosses)",
    achievementIds: [320], // "New Area" — unlocked by defeating Hush
    opens: "Void floor, Delirium boss fight",
    blockedBy: ["blue-womb"],
  },
  {
    id: "alt-path",
    name: "Alt Path (Downpour → Corpse → Mother)",
    description: "Defeat Hush 3 times",
    achievementIds: [407], // "A Secret Exit"
    opens: "Downpour → Mines → Mausoleum → Corpse → Mother fight; uses Knife Pieces (mirror/minecart, NOT Angel Room Key Pieces)",
    blockedBy: ["blue-womb"],
  },
  {
    id: "home-beast",
    name: "Home / Beast",
    description: "Defeat Mother",
    achievementIds: [635], // "A Strange Door"
    opens: "Ascent → Home → Dogma → Beast fight; also unlocks tainted character pipeline (Red Key closet in Home)",
    blockedBy: ["alt-path"],
  },
];

export function isGateCleared(
  gate: ProgressionGate,
  unlocked: Set<number>,
  stats: CounterStats,
): boolean {
  if (gate.achievementIds.length > 0) {
    return gate.achievementIds.every((id) => unlocked.has(id));
  }
  if (gate.counterCheck) {
    return stats[gate.counterCheck.field] >= gate.counterCheck.threshold;
  }
  return false;
}
