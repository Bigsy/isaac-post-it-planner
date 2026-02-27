import { BOSS_NAMES } from "./characters";
import { TAINTED_BOSS_NAMES } from "./tainted-marks";

/**
 * Base character boss priority — lower number = attempt first.
 * Keys match BOSS_NAMES exactly.
 */
export const BASE_BOSS_PRIORITY: Record<string, number> = {
  "Greedier": 0,
  "Greed": 1,
  "Boss Rush": 2,
  "Hush": 3,
  "Delirium": 4,
  "Isaac": 5,
  "???": 6,
  "Mega Satan": 7,
  "Satan": 8,
  "The Lamb": 9,
  "Beast": 10,
  "Mother": 11,
  "Mom's Heart": 12,
};

/**
 * Tainted character boss priority — lower number = attempt first.
 * Keys match TAINTED_BOSS_NAMES exactly.
 */
export const TAINTED_BOSS_PRIORITY: Record<string, number> = {
  "Ultra Greedier": 0,
  "Hush + Boss Rush": 1,
  "Delirium": 2,
  "Mega Satan": 3,
  "Main Bosses": 4,
  "Beast": 5,
  "Mother": 6,
};

/**
 * Look up the priority for a boss name.
 * Returns 99 for unknown bosses.
 */
export function getBossPriority(bossName: string, isTainted: boolean): number {
  const table = isTainted ? TAINTED_BOSS_PRIORITY : BASE_BOSS_PRIORITY;
  return table[bossName] ?? 99;
}

// Compile-time guard: ensure every BOSS_NAMES entry has a priority
(BOSS_NAMES as readonly string[]).forEach((name) => {
  if (!(name in BASE_BOSS_PRIORITY)) {
    throw new Error(`BASE_BOSS_PRIORITY missing entry for "${name}"`);
  }
});

(TAINTED_BOSS_NAMES as readonly string[]).forEach((name) => {
  if (!(name in TAINTED_BOSS_PRIORITY)) {
    throw new Error(`TAINTED_BOSS_PRIORITY missing entry for "${name}"`);
  }
});
