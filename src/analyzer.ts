import type {
  SaveData,
  AnalysisResult,
  CharacterProgress,
  TaintedCharacterProgress,
  CharacterUnlock,
  ChallengeInfo,
  CounterStats,
  PhaseProgress,
  BestiaryData,
  BestiaryEntry,
} from "./types";
import type { DlcLevel } from "./data/dlc";
import { getAchievement, TOTAL_ACHIEVEMENTS } from "./data/achievements";
import {
  BASE_CHARACTER_UNLOCKS,
  TAINTED_CHARACTER_UNLOCKS,
  BOSS_NAMES,
  COMPLETION_MARKS,
} from "./data/characters";
import { CHALLENGE_NAMES, CHALLENGE_REWARDS } from "./data/challenges";
import { TAINTED_COMPLETION_MARKS, TAINTED_BOSS_NAMES } from "./data/tainted-marks";
import { PROGRESSION_GATES } from "./data/progression";
import { BESTIARY_ENTITIES, BESTIARY_TOTAL } from "./data/bestiary";
import { analyzeMissingUnlocks } from "./data/achievement-categories";
import { detectPhase, PHASE_DEFINITIONS, dlcAtLeast } from "./data/phases";
import { achievementWikiUrl } from "./data/wiki";
import { buildRunPlans } from "./run-planner";
import { generateLaneRecommendations } from "./recommender";

function getUnlockedIds(achievements: number[], maxId: number = TOTAL_ACHIEVEMENTS): Set<number> {
  const ids = new Set<number>();
  const limit = Math.min(achievements.length, maxId + 1);
  for (let i = 1; i < limit; i++) {
    if (achievements[i] !== 0) ids.add(i);
  }
  return ids;
}

function countCollectiblesSeen(collectibles: number[]): { seen: number; total: number } {
  let seen = 0;
  const total = Math.max(0, collectibles.length - 1);
  for (let i = 1; i < collectibles.length; i++) {
    if (collectibles[i] !== 0) seen++;
  }
  return { seen, total };
}

function parseCounterStats(counters: number[]): CounterStats {
  // Index 0 is a surplus zero (padding); real data starts at index 1.
  // Offsets confirmed via Demorck/Isaac-save-manager & jamesthejellyfish/isaac-save-edit-script.
  const get = (i: number) => (i < counters.length ? counters[i] : 0);
  return {
    momKills: get(1),              // 0x04
    deaths: get(9),                // 0x24
    momsHeartKills: get(1),        // same counter as momKills
    rocksDestroyed: get(2),        // 0x08
    tintedRocksDestroyed: get(3),  // 0x0C
    poopDestroyed: get(5),         // 0x14
    shopkeeperKills: get(11),      // 0x2C
    greedDonationCoins: get(19),   // 0x4C
    normalDonationCoins: get(20),  // 0x50
    edenTokens: get(21),           // 0x54
    winStreak: get(22),            // 0x58
    bestStreak: get(23),           // 0x5C
  };
}

function analyzePhaseProgress(
  unlocked: Set<number>,
  stats: CounterStats,
  dlcLevel: DlcLevel,
): PhaseProgress {
  const currentPhase = detectPhase(unlocked, stats, dlcLevel);
  const phaseDef = PHASE_DEFINITIONS.find(p => p.id === currentPhase)!;
  const applicableCriteria = phaseDef.completionCriteria.filter(
    c => !c.requiredDlc || dlcAtLeast(dlcLevel, c.requiredDlc),
  );
  const criteria = applicableCriteria.map(c => {
    const met = c.type === "achievement" && c.achievementId != null
      ? unlocked.has(c.achievementId)
      : c.type === "counter-threshold" && c.counterField && c.counterThreshold != null
        ? stats[c.counterField] >= c.counterThreshold
        : false;
    const ach = c.achievementId != null ? getAchievement(c.achievementId) : null;
    return {
      description: c.description,
      met,
      howTo: ach?.unlockDescription,
      wikiUrl: ach ? achievementWikiUrl(ach.name) ?? undefined : undefined,
    };
  });
  return {
    currentPhase,
    phaseName: phaseDef.name,
    phaseDescription: phaseDef.description,
    criteria,
  };
}

function analyzeCharacterUnlocks(
  unlocked: Set<number>,
  charMap: Record<number, string>,
): CharacterUnlock[] {
  return Object.entries(charMap)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([idStr, name]) => {
      const id = Number(idStr);
      const ach = getAchievement(id);
      return {
        achievementId: id,
        name,
        unlocked: unlocked.has(id),
        unlockDescription: ach.unlockDescription,
      };
    });
}

function analyzeCompletionMarks(
  unlocked: Set<number>,
  maxAchId: number = TOTAL_ACHIEVEMENTS,
): CharacterProgress[] {
  const results: CharacterProgress[] = [];

  for (const [name, marks] of Object.entries(COMPLETION_MARKS)) {
    let done = 0;
    let total = 0;
    const markDetails: CharacterProgress["marks"] = [];

    for (let i = 0; i < marks.length; i++) {
      const achId = marks[i];
      if (achId === null || achId > maxAchId) continue;
      total++;
      const isDone = unlocked.has(achId);
      if (isDone) done++;
      markDetails.push({ boss: BOSS_NAMES[i], done: isDone, achievementId: achId });
    }

    // Skip characters where no marks survive the filter
    if (markDetails.length === 0) continue;

    results.push({ name, marks: markDetails, done, total });
  }

  return results;
}

function analyzeTaintedCompletionMarks(unlocked: Set<number>): TaintedCharacterProgress[] {
  return Object.entries(TAINTED_COMPLETION_MARKS).map(([name, marks]) => {
    let done = 0;
    const markDetails = marks.map((achId, i) => {
      const isDone = unlocked.has(achId);
      if (isDone) done++;
      return { boss: TAINTED_BOSS_NAMES[i] as string, done: isDone, achievementId: achId };
    });
    return { name, marks: markDetails, done, total: marks.length };
  });
}

function analyzeChallenges(challengeData: number[]): ChallengeInfo[] {
  const results: ChallengeInfo[] = [];
  for (let i = 1; i < challengeData.length; i++) {
    const name = CHALLENGE_NAMES[i];
    if (!name) continue; // skip unknown challenge slots
    const completed = challengeData[i] !== 0;
    results.push({
      id: i,
      name,
      reward: CHALLENGE_REWARDS[i] ?? null,
      completed,
    });
  }
  return results;
}

function analyzeBestiary(bestiary: BestiaryData | null): BestiaryEntry[] {
  if (!bestiary) return [];

  return BESTIARY_ENTITIES.map((entity) => {
    const key = `${entity.id}_${entity.variant}`;
    return {
      name: entity.name,
      isBoss: entity.isBoss,
      encountered: bestiary.encounters.get(key) ?? 0,
      kills: bestiary.kills.get(key) ?? 0,
      hitsTaken: bestiary.hits.get(key) ?? 0,
      deathsTo: bestiary.deaths.get(key) ?? 0,
    };
  });
}

export function analyze(saveData: SaveData): AnalysisResult {
  const maxAchId = Math.max(0, Math.min(saveData.achievements.length - 1, TOTAL_ACHIEVEMENTS));
  const unlocked = getUnlockedIds(saveData.achievements, maxAchId);
  const stats = parseCounterStats(saveData.counters);
  const { seen: collectiblesSeen, total: totalCollectibles } =
    countCollectiblesSeen(saveData.collectibles);
  const dlcLevel = saveData.dlcLevel;
  const isRepentance = dlcLevel === "repentance";

  // Filter character maps to DLC-appropriate characters
  const filteredBase = Object.fromEntries(
    Object.entries(BASE_CHARACTER_UNLOCKS).filter(([id]) => Number(id) <= maxAchId),
  );
  const filteredTainted = isRepentance ? TAINTED_CHARACTER_UNLOCKS : {};

  const baseCharacters = analyzeCharacterUnlocks(unlocked, filteredBase);
  const taintedCharacters = analyzeCharacterUnlocks(unlocked, filteredTainted);
  const completionGrid = analyzeCompletionMarks(unlocked, maxAchId);
  const taintedCompletionGrid = isRepentance
    ? analyzeTaintedCompletionMarks(unlocked)
    : [];
  const challenges = analyzeChallenges(saveData.challenges);
  const phaseProgress = analyzePhaseProgress(unlocked, stats, dlcLevel);
  const laneRecommendations = generateLaneRecommendations(
    unlocked, stats, completionGrid, taintedCompletionGrid, challenges, maxAchId, dlcLevel,
  );
  const availableCharacters = new Set<string>();
  for (const char of completionGrid) {
    const unlockEntry = Object.entries(BASE_CHARACTER_UNLOCKS)
      .find(([, name]) => name === char.name || (name === "Jacob & Esau" && char.name === "Jacob"));
    if (!unlockEntry || unlocked.has(Number(unlockEntry[0]))) {
      availableCharacters.add(char.name);
    }
  }
  for (const char of taintedCompletionGrid) {
    const unlockEntry = Object.entries(TAINTED_CHARACTER_UNLOCKS)
      .find(([, name]) => name === char.name);
    if (unlockEntry && unlocked.has(Number(unlockEntry[0]))) {
      availableCharacters.add(char.name);
    }
  }
  const runPlans = buildRunPlans(
    completionGrid,
    taintedCompletionGrid,
    unlocked,
    availableCharacters,
    phaseProgress,
    PROGRESSION_GATES,
    stats,
    dlcLevel,
    maxAchId,
  );

  const bestiaryEntries = analyzeBestiary(saveData.bestiary);
  const bestiaryEncountered = bestiaryEntries.filter((e) => e.encountered > 0).length;
  const missingUnlocks = analyzeMissingUnlocks(unlocked, maxAchId);

  return {
    dlcLevel,
    totalAchievements: maxAchId,
    unlockedCount: unlocked.size,
    collectiblesSeen,
    totalCollectibles,
    stats,
    baseCharacters,
    taintedCharacters,
    completionGrid,
    taintedCompletionGrid,
    challenges,
    laneRecommendations,
    runPlans,
    bestiary: bestiaryEntries,
    bestiaryEncountered,
    bestiaryTotal: bestiaryEntries.length > 0 ? BESTIARY_TOTAL : 0,
    missingUnlocks,
    phaseProgress,
  };
}

// Export internals for testing
export {
  getUnlockedIds,
  countCollectiblesSeen,
  analyzeCompletionMarks,
  analyzeTaintedCompletionMarks,
  analyzeCharacterUnlocks,
  analyzeChallenges,
  analyzeBestiary,
};

// Re-export recommender functions so existing test imports don't break
export {
  generateLaneRecommendations,
  evaluateProgressionGates,
  evaluateCharacterUnlocks,
  evaluateCompletionMarks,
  evaluateChallenges,
  evaluateDonation,
  evaluateGuardrails,
} from "./recommender";
