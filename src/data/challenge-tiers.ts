/**
 * Challenge reward value tiers based on item power level.
 *
 * High: top-tier items that significantly affect gameplay
 * Medium: useful items worth pursuing
 * Low: cosmetics, weak items, or niche unlocks
 *
 * Challenges not listed default to 'medium'.
 */

export type ChallengeTier = "high" | "medium" | "low";

export const CHALLENGE_TIERS: Record<number, ChallengeTier> = {
  // High value — powerful items
  17: "high", // Death's Touch (Waka Waka)
  19: "high", // Epic Fetus (The Family Man)
  39: "high", // Spirit Sword (Isaac's Awakening)
  38: "high", // Purgatory (Baptism by Fire)
  23: "high", // Gold Bomb (Blue Bomber) — strong bomb synergy

  // Rune challenge value = reward (pool cleanup), not difficulty.
  2: "high",   // Rune of Jera (High Brow) — best rune, duplicates pickups
  3: "medium", // Rune of Ehwaz (Head Trauma) — trapdoor utility
  4: "medium", // Rune of Dagaz (Darkness Falls) — soul heart + curse removal
  5: "medium", // Rune of Ansuz (The Tank) — full map reveal

  // Medium — useful items (default, listed explicitly for notable ones)
  9: "medium",  // Chaos Card (Demo Man)
  15: "medium", // Swallowed Penny (Slow Roll)
  22: "medium", // Get out of Jail Free Card (SPEED!)
  30: "medium", // Blank Rune (The Guardian)

  // Low value — weak items or cosmetics
  1: "low",  // Rune of Hagalaz (Pitch Black)
  11: "low", // Rules Card (Glass Cannon) — nearly useless reward
  12: "low", // Card Against Humanity (When Life Gives You Lemons)
  13: "low", // Burnt Penny (Beans!)
  14: "low", // SMB Super Fan (It's in the Cards)
  24: "low", // 2 new pills (PAY TO PLAY)
  25: "low", // 2 new pills (Have a Heart)
  28: "low", // D8 (PRIDE DAY!)
  29: "low", // Onan's Streak — punishing, moderate reward
  34: "low", // Ultra Hard — hardest challenge, weak reward
  45: "low", // DELETE THIS — extremely difficult, minor reward
};

export function getChallengeTier(challengeId: number): ChallengeTier {
  return CHALLENGE_TIERS[challengeId] ?? "medium";
}
