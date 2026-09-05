/**
 * Challenge prerequisites — which achievements must be unlocked to attempt each challenge.
 *
 * Challenge unlock flags are authoritative across DLC rule changes.
 * Explicit prerequisite descriptions below help explain later challenges.
 */

export interface ChallengePrereq {
  challengeId: number;
  description: string;
  requiredAchievements: number[];
}

export const CHALLENGE_PREREQS: ChallengePrereq[] = [
  {
    challengeId: 37,
    description: "Bethany unlocked + Blood Bag unlocked + It Lives defeated",
    requiredAchievements: [404, 147, 34], // Bethany, Blood Bag, It Lives
  },
  {
    challengeId: 38,
    description: "Defeat Satan as Bethany + It Lives + Maggy's Faith unlocked",
    requiredAchievements: [418, 34, 71], // Satan as Bethany, It Lives, Maggy's Faith
  },
  {
    challengeId: 39,
    description: "Mother defeated",
    requiredAchievements: [635], // A Strange Door (defeat Mother)
  },
  {
    challengeId: 40,
    description: "Mother defeated",
    requiredAchievements: [635],
  },
  {
    challengeId: 41,
    description: "It Lives + Marbles unlocked",
    requiredAchievements: [34, 386], // It Lives, Marbles
  },
  {
    challengeId: 42,
    description: "Tainted Forgotten unlocked",
    requiredAchievements: [488], // T.Forgotten
  },
  {
    challengeId: 43,
    description: "Tainted Cain unlocked",
    requiredAchievements: [476], // T.Cain
  },
  {
    challengeId: 44,
    description: "Tainted Jacob unlocked",
    requiredAchievements: [490], // T.Jacob
  },
  {
    challengeId: 45,
    description: "Tainted Eden unlocked",
    requiredAchievements: [483], // T.Eden
  },
];

/** Save flags prove challenge access without guessing version-specific unlock rules. */
export const CHALLENGE_ACCESS_FLAGS: Record<number, number> = {
  4:157,5:158,6:159,7:160,8:161,9:162,10:163,11:164,19:165,20:166,
  21:265,22:266,23:267,24:268,25:269,26:270,27:271,28:272,29:273,30:274,
  31:277,32:278,33:279,34:280,35:281,
  37:508,38:509,39:510,40:511,41:512,42:513,43:514,44:515,45:516,
};
