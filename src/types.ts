import type { DlcLevel } from "./data/dlc";
import type { ProgressionPhase } from "./data/phases";
import type { ItemQuality } from "./data/item-values";

/** Parsed bestiary sub-chunk maps: "entityId_variant" → count */
export interface BestiaryData {
  encounters: Map<string, number>;
  kills: Map<string, number>;
  hits: Map<string, number>;
  deaths: Map<string, number>;
}

/** Single bestiary entity with all 4 stat categories */
export interface BestiaryEntry {
  name: string;
  isBoss: boolean;
  encountered: number;
  kills: number;
  hitsTaken: number;
  deathsTo: number;
}

/** Parsed binary save file data */
export interface SaveData {
  dlcLevel: DlcLevel;
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
  bestiary: BestiaryData | null; // null for pre-AB+ saves (no chunk 11)
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

export type ActionCategory =
  | "run"
  | "gate"
  | "unlock"
  | "mark"
  | "challenge"
  | "donation"
  | "daily"
  | "warning";

export interface BlockingDep {
  description: string;
  achievementId: number | null;
  met: boolean;
}

export interface ScoreBreakdown {
  impact: number;
  readiness: number;
  effort: number;
  itemQuality: number;
  phaseAlignment: number;
  communityMeta: number;
  blockerDecay: number;
  diversityPenalty: number;
  baseScore: number;
  finalScore: number;
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
  phase?: ProgressionPhase;
  itemQuality?: ItemQuality;
  itemName?: string;
  isToxicWarning?: boolean;
  bossPriority?: number;
  gateId?: string;
  challengeId?: number;
  character?: string;
  boss?: string;
  donationMachine?: "greed" | "normal";
  warningId?: string;
  actionCategory?: ActionCategory;
  scoreBreakdown?: ScoreBreakdown;
  links?: { text: string; url: string }[];
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

/** Counter stats parsed from the save file's counters chunk. */
export interface CounterStats {
  momKills: number;
  deaths: number;
  momsHeartKills: number;
  rocksDestroyed: number;
  tintedRocksDestroyed: number;
  poopDestroyed: number;
  shopkeeperKills: number;
  greedDonationCoins: number;
  normalDonationCoins: number;
  edenTokens: number;
  winStreak: number;
  bestStreak: number;
}

export type AchievementCategory =
  | "items" | "characters" | "challenges" | "co-op-babies"
  | "starting-items" | "cards-runes" | "stages-bosses" | "milestones";

export interface MissingAchievement {
  id: number;
  name: string;
  unlockDescription: string;
  category: AchievementCategory;
}

export interface CategorySummary {
  category: AchievementCategory;
  label: string;
  total: number;
  unlocked: number;
  missing: MissingAchievement[];
}

export interface MissingUnlocksResult {
  categories: CategorySummary[];
  totalMissing: number;
}

export interface PhaseProgress {
  currentPhase: ProgressionPhase;
  phaseName: string;
  phaseDescription: string;
  criteria: {
    description: string;
    met: boolean;
    howTo?: string;
    wikiUrl?: string;
  }[];
}

export interface RunGoal {
  type: "completion-mark" | "gate-progress" | "phase-criterion";
  boss: string;
  achievementId?: number;
  itemName?: string;
  itemQuality?: ItemQuality;
  description: string;
  isBundled?: boolean;
}

export interface RunPlan {
  character: string;
  isTainted: boolean;
  route: string;
  routeId: string;
  routeWikiPath: string;
  whyThisRun: string;
  timedDescription?: string;
  goals: RunGoal[];
  primaryGoal: RunGoal;
  scoreBreakdown: {
    markScore: number;
    gateBonus: number;
    phaseBonus: number;
    timedPenalty: number;
    bundledPenalty: number;
  };
  score: number;
  phase?: ProgressionPhase;
  timed: boolean;
  greedMode: boolean;
}

export interface ActionItem {
  id: string;
  tier: 1 | 2 | 3 | "backlog";
  score: number;
  headline: string;
  detail: string;
  category: ActionCategory;
  effort: EffortLevel;
  blocked: boolean;
  blockedBy?: BlockingDep[];
  achievementIds: number[];
  whyFirst?: string;
  character?: string;
  route?: string;
  routeWikiPath?: string;
  timed?: boolean;
  timedDescription?: string;
  goals?: RunGoal[];
  itemQuality?: ItemQuality;
  itemName?: string;
  isToxicWarning?: boolean;
  links?: { text: string; url: string }[];
  scoreBreakdown?: ScoreBreakdown;
}

export interface SuppressedItem {
  item: ActionItem;
  suppressedBy: string;
  reason: string;
  originalScore: number;
}

export interface BossKillMilestoneStatus {
  kills: number;
  achievementId: number;
  name: string;
  unlocked: boolean;
}

export interface BossKillMilestoneGroupStatus {
  bossName: string;
  bossDisplayName: string;
  currentKills: number;
  killCountKnown: boolean; // false when inferred from achievements
  milestones: BossKillMilestoneStatus[];
  nextMilestone: BossKillMilestoneStatus | null;
}

/** Full analysis result passed to UI */
export interface AnalysisResult {
  dlcLevel: DlcLevel;
  totalAchievements: number;
  unlockedCount: number;
  collectiblesSeen: number;
  totalCollectibles: number;
  stats: CounterStats;
  baseCharacters: CharacterUnlock[];
  taintedCharacters: CharacterUnlock[];
  completionGrid: CharacterProgress[];
  taintedCompletionGrid: TaintedCharacterProgress[];
  challenges: ChallengeInfo[];
  actionItems: ActionItem[];
  suppressedItems?: SuppressedItem[];
  bestiary: BestiaryEntry[];
  bestiaryEncountered: number;
  bestiaryTotal: number;
  missingUnlocks: MissingUnlocksResult;
  bossKillMilestones: BossKillMilestoneGroupStatus[];
  phaseProgress?: PhaseProgress;
}
