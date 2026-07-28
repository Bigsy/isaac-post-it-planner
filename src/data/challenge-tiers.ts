/**
 * A rough challenge order based on recurring community recommendations.
 *
 * This is deliberately a reward-first order rather than a difficulty ranking.
 * "Top" rewards noticeably improve ordinary runs; "worthwhile" rewards are
 * useful but less urgent. Challenges not listed are completionist cleanup.
 */

export type ChallengeTier = "high" | "medium" | "low";

export interface ChallengePriority {
  rank: number;
  tier: Exclude<ChallengeTier, "low">;
  reason: string;
}

export const CHALLENGE_PRIORITIES: Record<number, ChallengePriority> = {
  2: { rank: 1, tier: "high", reason: "Jera duplicates room pickups and can enable run-winning value plays." },
  6: { rank: 2, tier: "high", reason: "Perthro rerolls pedestal items; one of the most consistently useful runes." },
  17: { rank: 3, tier: "high", reason: "Death's Touch is a major damage upgrade with piercing tears." },
  8: { rank: 4, tier: "high", reason: "Algiz grants long invulnerability and is excellent for difficult bosses." },
  9: { rank: 5, tier: "high", reason: "Chaos Card can instantly solve nearly any boss encounter." },
  10: { rank: 6, tier: "high", reason: "Credit Card can take an entire shop or deal for free." },
  23: { rank: 7, tier: "high", reason: "Golden Bombs give unlimited bombs for a floor." },
  37: { rank: 8, tier: "high", reason: "Sigil of Baphomet chains brief invulnerability after kills." },
  39: { rank: 9, tier: "high", reason: "Spirit Sword is a powerful, run-defining weapon." },

  18: { rank: 10, tier: "medium", reason: "Technology .5 adds strong passive extra damage." },
  4: { rank: 11, tier: "medium", reason: "Dagaz gives a soul heart and removes the current curse." },
  5: { rank: 12, tier: "medium", reason: "Ansuz reveals the floor, saving time and resources." },
  19: { rank: 13, tier: "medium", reason: "Epic Fetus is extremely powerful, though it heavily changes how a run plays." },
  32: { rank: 14, tier: "medium", reason: "Magdalene permanently starts with a Full Health pill." },
  30: { rank: 15, tier: "medium", reason: "Blank Rune gives flexible access to rune effects." },
  33: { rank: 16, tier: "medium", reason: "Charged Keys can refill active items without consuming a battery." },
  36: { rank: 17, tier: "medium", reason: "Dirty Mind is a solid item and improves destroyed poop pickups." },
  38: { rank: 18, tier: "medium", reason: "Purgatory provides useful room-clearing damage." },
  42: { rank: 19, tier: "medium", reason: "The reverse Chariot card grants a strong temporary turret effect." },
  43: { rank: 20, tier: "medium", reason: "The reverse Justice card produces a room of useful pickups." },
  44: { rank: 21, tier: "medium", reason: "The reverse Hermit card can turn unwanted shop items into money." },
};

const LOW_VALUE_CHALLENGES = new Set([
  1,  // Hagalaz
  11, // Rules Card
  12, // Card Against Humanity
  13, // Burnt Penny
  14, // SMB Super Fan
  24, // pill rotation additions
  25, // pill rotation additions
  28, // D8
  29, // Kidney Stone for a punishing challenge
  34, // minor Samson starting-health upgrade
  45, // minor reverse card for an extremely unpredictable challenge
]);

export function getChallengeTier(challengeId: number): ChallengeTier {
  return CHALLENGE_PRIORITIES[challengeId]?.tier
    ?? (LOW_VALUE_CHALLENGES.has(challengeId) ? "low" : "medium");
}

export function getChallengePriority(challengeId: number): ChallengePriority | null {
  return CHALLENGE_PRIORITIES[challengeId] ?? null;
}
