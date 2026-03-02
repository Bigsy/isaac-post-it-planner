/**
 * Boss kill milestones — bosses that unlock content at specific kill counts.
 *
 * Achievement IDs detect which thresholds are passed (unlocked).
 * Kill counts come from counters (Mom's Heart) or bestiary (Isaac, Satan).
 */

export interface BossKillMilestone {
  kills: number;
  achievementId: number;
  name: string;
}

export interface BossKillMilestoneGroup {
  bossName: string;
  bossDisplayName: string;
  source:
    | { type: "counter"; field: "momsHeartKills" }
    | { type: "bestiary"; entityKey: string };
  milestones: BossKillMilestone[];
}

export const BOSS_KILL_MILESTONE_GROUPS: BossKillMilestoneGroup[] = [
  {
    bossName: "momsHeart",
    bossDisplayName: "Mom's Heart / It Lives",
    source: { type: "counter", field: "momsHeartKills" },
    milestones: [
      { kills: 2,  achievementId: 150, name: "A Noose" },
      { kills: 3,  achievementId: 8,   name: "Everything is Terrible!!!" },
      { kills: 4,  achievementId: 159, name: "Forget Me Now" },
      { kills: 5,  achievementId: 139, name: "Boss Rush" },
      { kills: 6,  achievementId: 33,  name: "A Quarter" },
      { kills: 7,  achievementId: 140, name: "The Cellar" },
      { kills: 8,  achievementId: 141, name: "The Catacombs" },
      { kills: 9,  achievementId: 10,  name: "The Halo" },
      { kills: 10, achievementId: 162, name: "Mom's Contact" },
      { kills: 10, achievementId: 234, name: "Blue Womb" },
      { kills: 11, achievementId: 11,  name: "Guardian Angel" },
      { kills: 11, achievementId: 34,  name: "It Lives!" },
      { kills: 12, achievementId: 32,  name: "A Lump of Coal" },
      { kills: 14, achievementId: 160, name: "Necropolis" },
      { kills: 16, achievementId: 342, name: "Dross" },
      { kills: 22, achievementId: 343, name: "Ashpit" },
      { kills: 26, achievementId: 344, name: "Gehenna" },
      { kills: 30, achievementId: 345, name: "Corpse" },
    ],
  },
  {
    bossName: "isaac",
    bossDisplayName: "Isaac (Boss)",
    source: { type: "bestiary", entityKey: "102_0" },
    milestones: [
      { kills: 5,  achievementId: 57, name: "The Polaroid" },
      { kills: 10, achievementId: 68, name: "Isaac's Head" },
    ],
  },
  {
    bossName: "satan",
    bossDisplayName: "Satan",
    source: { type: "bestiary", entityKey: "84_0" },
    milestones: [
      { kills: 5, achievementId: 78, name: "The Negative" },
    ],
  },
];
