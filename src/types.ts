/** Parsed binary save file data */
export interface SaveData {
  achievements: number[]; // u8 array, index = achievement ID, non-zero = unlocked
  counters: number[]; // i32 array (deaths, kills, etc.)
  levelCounters: number[]; // i32 array
  collectibles: number[]; // u8 array
  minibosses: number[]; // u8 array
  bosses: number[]; // u8 array
  challenges: number[]; // u8 array, index = challenge ID, non-zero = completed
  cutsceneCounters: number[]; // i32 array
  gameSettings: number[]; // i32 array
  specialSeedCounters: number[]; // u8 array
}

/** Achievement metadata from reference data */
export interface Achievement {
  id: number;
  name: string;
  inGameDescription: string;
  unlockDescription: string;
}

/** Per-character completion mark progress (base characters: 13 bosses) */
export interface CharacterProgress {
  name: string;
  marks: { boss: string; done: boolean; achievementId: number | null }[];
  done: number;
  total: number;
}

/** Per-tainted-character completion mark progress (7 bundled categories) */
export interface TaintedCharacterProgress {
  name: string;
  marks: { boss: string; done: boolean; achievementId: number }[];
  done: number;
  total: number;
}

/** Lane-based recommendation */
export type Lane =
  | "progression-gate"
  | "character-unlock"
  | "completion-mark"
  | "challenge"
  | "donation"
  | "guardrail";

export type EffortLevel = "single-run" | "multi-run" | "grind";

export interface BlockingDep {
  description: string;
  achievementId: number | null;
  met: boolean;
}

export interface LaneRecommendation {
  lane: Lane;
  target: string;
  achievementIds: number[];
  blockedBy: BlockingDep[];
  blockerDepth: number;
  estimatedEffort: EffortLevel;
  downstreamValue: number;
  score: number;
  whyNow: string;
}

/** Challenge info */
export interface ChallengeInfo {
  id: number;
  name: string;
  reward: string | null;
  completed: boolean;
}

/** Character unlock status */
export interface CharacterUnlock {
  achievementId: number;
  name: string;
  unlocked: boolean;
  unlockDescription: string;
}

/** Counter stats */
export interface CounterStats {
  momKills: number;
  deaths: number;
  itemsCollected: number;
  momsHeartKills: number;
  satanKills: number;
  isaacKills: number;
  blueBabyKills: number;
  theLambKills: number;
  megaSatanKills: number;
  bossRushCompletions: number;
  hushCompletions: number;
  deliriumKills: number;
  motherKills: number;
  beastKills: number;
  ultraGreedKills: number;
  ultraGreedierKills: number;
}

/** Full analysis result passed to UI */
export interface AnalysisResult {
  totalAchievements: number;
  unlockedCount: number;
  stats: CounterStats;
  baseCharacters: CharacterUnlock[];
  taintedCharacters: CharacterUnlock[];
  completionGrid: CharacterProgress[];
  taintedCompletionGrid: TaintedCharacterProgress[];
  challenges: ChallengeInfo[];
  laneRecommendations: LaneRecommendation[];
}
