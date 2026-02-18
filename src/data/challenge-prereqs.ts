/**
 * Challenge prerequisites — which achievements must be unlocked to attempt each challenge.
 *
 * Only Repentance challenges (#37–45) have meaningful prerequisites.
 * Earlier challenges are gated by basic progression (Mom's Heart kills, etc.)
 * which the progression gate system handles.
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
