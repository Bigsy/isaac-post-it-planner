import { COMPLETION_MARKS, BOSS_NAMES } from "./characters";
import { TAINTED_COMPLETION_MARKS, TAINTED_BOSS_NAMES } from "./tainted-marks";
import { getItemValue, QUALITY_SCORE } from "./item-values";
import type { ItemQuality } from "./item-values";

const DEFAULT_QUALITY: ItemQuality = "b-tier";

/**
 * Sum of QUALITY_SCORE for remaining (not yet unlocked) marks for a character.
 * Returns 0 for unknown characters or fully-unlocked characters.
 */
export function characterItemValue(
  characterName: string,
  unlocked: Set<number>,
  isTainted: boolean,
): number {
  const marks = isTainted
    ? TAINTED_COMPLETION_MARKS[characterName]
    : COMPLETION_MARKS[characterName];
  if (!marks) return 0;

  let total = 0;
  for (const achId of marks) {
    if (achId == null || unlocked.has(achId)) continue;
    const entry = getItemValue(achId);
    const quality = entry?.quality ?? DEFAULT_QUALITY;
    total += QUALITY_SCORE[quality];
  }
  return total;
}

/**
 * Returns the highest-quality remaining mark for a character, or null if
 * all marks are complete (or the character is unknown).
 */
export function bestRemainingMark(
  characterName: string,
  unlocked: Set<number>,
  isTainted: boolean,
): { bossName: string; achievementId: number; itemName: string; quality: ItemQuality } | null {
  const marks = isTainted
    ? TAINTED_COMPLETION_MARKS[characterName]
    : COMPLETION_MARKS[characterName];
  if (!marks) return null;

  const bossNames = isTainted ? TAINTED_BOSS_NAMES : BOSS_NAMES;

  let best: { bossName: string; achievementId: number; itemName: string; quality: ItemQuality } | null = null;
  let bestScore = -Infinity;

  for (let i = 0; i < marks.length; i++) {
    const achId = marks[i];
    if (achId == null || unlocked.has(achId)) continue;

    const entry = getItemValue(achId);
    const quality = entry?.quality ?? DEFAULT_QUALITY;
    const score = QUALITY_SCORE[quality];
    const itemName = entry?.itemName ?? "Unknown";

    if (score > bestScore) {
      bestScore = score;
      best = { bossName: bossNames[i], achievementId: achId, itemName, quality };
    }
  }

  return best;
}
