import type {
  ActionItem,
  AnalysisResult,
  BestiaryData,
  BestiaryEntry,
  BossKillMilestoneGroupStatus,
  BossKillMilestoneStatus,
  ChallengeInfo,
  CharacterProgress,
  CharacterUnlock,
  CounterStats,
  SaveData,
  SuppressedItem,
  TaintedCharacterProgress,
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
import { TAINTED_BOSS_NAMES, TAINTED_COMPLETION_MARKS } from "./data/tainted-marks";
import { PROGRESSION_GATES } from "./data/progression";
import { BESTIARY_ENTITIES, BESTIARY_TOTAL } from "./data/bestiary";
import { analyzeMissingUnlocks } from "./data/achievement-categories";
import { detectPhase, PHASE_DEFINITIONS, dlcAtLeast } from "./data/phases";
import { BOSS_KILL_MILESTONE_GROUPS } from "./data/boss-milestones";
import { achievementWikiUrl } from "./data/wiki";
import { buildRunPlans, toActionItems as runPlansToActionItems } from "./run-planner";
import {
  evaluateChallenges,
  evaluateCharacterUnlocks,
  evaluateCompletionMarks,
  evaluateDonation,
  evaluateGuardrails,
  evaluateProgressionGates,
  generateLaneRecommendations,
  generateWhyFirst,
  laneRecommendationsToActionItems,
} from "./recommender";

interface AnalyzeOptions {
  debug?: boolean;
}

const EFFORT_ORDER = new Map([
  ["single-run", 0],
  ["multi-run", 1],
  ["grind", 2],
]);

const CATEGORY_ORDER = new Map([
  ["run", 0],
  ["gate", 1],
  ["mark", 2],
  ["challenge", 3],
  ["unlock", 4],
  ["daily", 5],
  ["donation", 6],
  ["warning", 7],
]);

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
  const get = (i: number) => (i < counters.length ? counters[i] : 0);
  return {
    momKills: get(1),
    deaths: get(9),
    momsHeartKills: get(1),
    rocksDestroyed: get(2),
    tintedRocksDestroyed: get(3),
    poopDestroyed: get(5),
    shopkeeperKills: get(11),
    greedDonationCoins: get(19),
    normalDonationCoins: get(20),
    edenTokens: get(21),
    winStreak: get(22),
    bestStreak: get(23),
  };
}

function analyzePhaseProgress(
  unlocked: Set<number>,
  stats: CounterStats,
  dlcLevel: DlcLevel,
) {
  const currentPhase = detectPhase(unlocked, stats, dlcLevel);
  const phaseDef = PHASE_DEFINITIONS.find((phase) => phase.id === currentPhase)!;
  const applicableCriteria = phaseDef.completionCriteria.filter(
    (criterion) => !criterion.requiredDlc || dlcAtLeast(dlcLevel, criterion.requiredDlc),
  );
  return {
    currentPhase,
    phaseName: phaseDef.name,
    phaseDescription: phaseDef.description,
    criteria: applicableCriteria.map((criterion) => {
      const met = criterion.type === "achievement" && criterion.achievementId != null
        ? unlocked.has(criterion.achievementId)
        : criterion.type === "counter-threshold" && criterion.counterField && criterion.counterThreshold != null
          ? stats[criterion.counterField] >= criterion.counterThreshold
          : false;
      const achievement = criterion.achievementId != null ? getAchievement(criterion.achievementId) : null;
      return {
        description: criterion.description,
        met,
        howTo: achievement?.unlockDescription,
        wikiUrl: achievement ? achievementWikiUrl(achievement.name) ?? undefined : undefined,
      };
    }),
  };
}

function analyzeCharacterUnlocks(
  unlocked: Set<number>,
  charMap: Record<number, string>,
): CharacterUnlock[] {
  return Object.entries(charMap)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([idText, name]) => {
      const achievementId = Number(idText);
      const achievement = getAchievement(achievementId);
      return {
        achievementId,
        name,
        unlocked: unlocked.has(achievementId),
        unlockDescription: achievement.unlockDescription,
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
      const achievementId = marks[i];
      if (achievementId == null || achievementId > maxAchId) continue;
      const isDone = unlocked.has(achievementId);
      total++;
      if (isDone) done++;
      markDetails.push({ boss: BOSS_NAMES[i], done: isDone, achievementId });
    }
    if (markDetails.length > 0) {
      results.push({ name, marks: markDetails, done, total });
    }
  }
  return results;
}

function analyzeTaintedCompletionMarks(unlocked: Set<number>): TaintedCharacterProgress[] {
  return Object.entries(TAINTED_COMPLETION_MARKS).map(([name, marks]) => {
    let done = 0;
    const markDetails = marks.map((achievementId, index) => {
      const isDone = unlocked.has(achievementId);
      if (isDone) done++;
      return { boss: TAINTED_BOSS_NAMES[index] as string, done: isDone, achievementId };
    });
    return { name, marks: markDetails, done, total: marks.length };
  });
}

function analyzeChallenges(challengeData: number[]): ChallengeInfo[] {
  const results: ChallengeInfo[] = [];
  for (let i = 1; i < challengeData.length; i++) {
    const name = CHALLENGE_NAMES[i];
    if (!name) continue;
    results.push({
      id: i,
      name,
      reward: CHALLENGE_REWARDS[i] ?? null,
      completed: challengeData[i] !== 0,
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

function analyzeBossKillMilestones(
  unlocked: Set<number>,
  stats: CounterStats,
  bestiary: BestiaryData | null,
  maxAchId: number,
): BossKillMilestoneGroupStatus[] {
  return BOSS_KILL_MILESTONE_GROUPS.map((group) => {
    const milestones = group.milestones.filter((milestone) => milestone.achievementId <= maxAchId);
    if (milestones.length === 0) return null;

    let currentKills = 0;
    let killCountKnown = false;
    if (group.source.type === "counter") {
      currentKills = stats[group.source.field];
      killCountKnown = true;
    } else if (bestiary && bestiary.kills.has(group.source.entityKey)) {
      currentKills = bestiary.kills.get(group.source.entityKey)!;
      killCountKnown = true;
    } else {
      for (let i = milestones.length - 1; i >= 0; i--) {
        if (unlocked.has(milestones[i].achievementId)) {
          currentKills = milestones[i].kills;
          break;
        }
      }
    }

    const mappedMilestones: BossKillMilestoneStatus[] = milestones.map((milestone) => ({
      kills: milestone.kills,
      achievementId: milestone.achievementId,
      name: milestone.name,
      unlocked: unlocked.has(milestone.achievementId),
    }));

    return {
      bossName: group.bossName,
      bossDisplayName: group.bossDisplayName,
      currentKills,
      killCountKnown,
      milestones: mappedMilestones,
      nextMilestone: mappedMilestones.find((milestone) => !milestone.unlocked) ?? null,
    };
  }).filter((group): group is BossKillMilestoneGroupStatus => group !== null);
}

function intersects(left: number[], right: number[]): boolean {
  if (left.length === 0 || right.length === 0) return false;
  const rightSet = new Set(right);
  return left.some((id) => rightSet.has(id));
}

function compareActionItems(a: ActionItem, b: ActionItem): number {
  if (Math.abs(b.score - a.score) > 2) return b.score - a.score;
  if (a.blocked !== b.blocked) return a.blocked ? 1 : -1;
  const effortA = EFFORT_ORDER.get(a.effort) ?? 99;
  const effortB = EFFORT_ORDER.get(b.effort) ?? 99;
  if (effortA !== effortB) return effortA - effortB;
  const categoryA = CATEGORY_ORDER.get(a.category) ?? 99;
  const categoryB = CATEGORY_ORDER.get(b.category) ?? 99;
  if (categoryA !== categoryB) return categoryA - categoryB;
  return a.headline.localeCompare(b.headline);
}

function deduplicateActionItems(
  items: ActionItem[],
  debug: boolean,
): { items: ActionItem[]; suppressedItems?: SuppressedItem[] } {
  const suppressedItems: SuppressedItem[] = [];
  const exactWinners = new Map<string, ActionItem>();
  const deduped: ActionItem[] = [];

  for (const item of [...items].sort(compareActionItems)) {
    const exactWinner = exactWinners.get(item.id);
    if (exactWinner) {
      if (debug) {
        suppressedItems.push({
          item,
          suppressedBy: exactWinner.id,
          reason: "dedup: exact duplicate id",
          originalScore: item.score,
        });
      }
      continue;
    }
    exactWinners.set(item.id, item);
    deduped.push(item);
  }

  const suppressedIds = new Set<string>();
  for (let i = 0; i < deduped.length; i++) {
    const winner = deduped[i];
    if (suppressedIds.has(winner.id)) continue;

    for (let j = i + 1; j < deduped.length; j++) {
      const loser = deduped[j];
      if (suppressedIds.has(loser.id) || !intersects(winner.achievementIds, loser.achievementIds)) continue;

      if (winner.category === "run" && loser.category !== "run" && !winner.timed && winner.score >= loser.score * 0.8) {
        suppressedIds.add(loser.id);
        if (debug) {
          suppressedItems.push({
            item: loser,
            suppressedBy: winner.id,
            reason: "dedup: run plan covers same unlock with comparable or better value",
            originalScore: loser.score,
          });
        }
        continue;
      }

      if (loser.category === "run" && winner.category !== "run" && !loser.timed && loser.score >= winner.score * 0.8) {
        suppressedIds.add(winner.id);
        if (debug) {
          suppressedItems.push({
            item: winner,
            suppressedBy: loser.id,
            reason: "dedup: run plan covers same unlock with comparable or better value",
            originalScore: winner.score,
          });
        }
        break;
      }
    }
  }

  return {
    items: deduped.filter((item) => !suppressedIds.has(item.id)),
    suppressedItems: debug ? suppressedItems : undefined,
  };
}

function cloneActionItem(item: ActionItem): ActionItem {
  return {
    ...item,
    blockedBy: item.blockedBy ? [...item.blockedBy] : undefined,
    goals: item.goals ? [...item.goals] : undefined,
    links: item.links ? [...item.links] : undefined,
    scoreBreakdown: item.scoreBreakdown ? { ...item.scoreBreakdown } : undefined,
  };
}

function applyDiversityPenalty(item: ActionItem, chosen: ActionItem[]): ActionItem {
  if (chosen.length === 0 || item.category === "warning") return cloneActionItem(item);
  let penalty = 0;
  if (item.character && chosen.some((candidate) => candidate.character === item.character)) penalty += 5;
  if (item.route && chosen.some((candidate) => candidate.route === item.route)) penalty += 8;
  if (chosen.some((candidate) => candidate.effort === item.effort)) penalty += 3;
  if (penalty === 0) return cloneActionItem(item);

  const clone = cloneActionItem(item);
  clone.score = Math.max(0, clone.score - penalty);
  if (clone.scoreBreakdown) {
    clone.scoreBreakdown.diversityPenalty = -penalty;
    clone.scoreBreakdown.finalScore = clone.score;
  }
  return clone;
}

function assignTiers(items: ActionItem[]): ActionItem[] {
  const warnings = items.filter((item) => item.category === "warning");
  const actionable = items
    .filter((item) => item.category !== "warning")
    .sort(compareActionItems)
    .map(cloneActionItem);

  if (actionable.length === 0) {
    return [...warnings.map(cloneActionItem)];
  }

  const topScore = actionable[0].score;
  const tierOneThreshold = Math.max(25, topScore * 0.6);
  const tierOne = actionable.filter((item) => item.score >= tierOneThreshold).slice(0, 3);
  const tierOneIds = new Set(tierOne.map((item) => item.id));
  for (const item of tierOne) item.tier = 1;

  const tierTwoCandidates = actionable.filter((item) => !tierOneIds.has(item.id));
  const tierTwo: ActionItem[] = [];
  const chosen = [...tierOne];
  while (tierTwo.length < 5 && tierTwoCandidates.length > 0) {
    const rescored = tierTwoCandidates.map((candidate) => applyDiversityPenalty(candidate, chosen)).sort(compareActionItems);
    const next = rescored[0];
    if (!next || next.score <= 30) break;
    next.tier = 2;
    tierTwo.push(next);
    chosen.push(next);
    const index = tierTwoCandidates.findIndex((candidate) => candidate.id === next.id);
    if (index !== -1) tierTwoCandidates.splice(index, 1);
  }

  const tierTwoIds = new Set(tierTwo.map((item) => item.id));
  const remainder = actionable
    .filter((item) => !tierOneIds.has(item.id) && !tierTwoIds.has(item.id))
    .map((item) => {
      const clone = cloneActionItem(item);
      clone.tier = clone.score > 10 ? 3 : "backlog";
      return clone;
    });

  return [
    ...warnings.map((item) => {
      const clone = cloneActionItem(item);
      clone.tier = "backlog";
      return clone;
    }),
    ...tierOne,
    ...tierTwo,
    ...remainder.sort((a, b) => {
      if (a.tier !== b.tier) {
        if (a.tier === 3) return -1;
        if (b.tier === 3) return 1;
      }
      return compareActionItems(a, b);
    }),
  ];
}

function stripDebug(items: ActionItem[]): ActionItem[] {
  return items.map((item) => ({ ...item, scoreBreakdown: undefined }));
}

export function analyze(saveData: SaveData, options: AnalyzeOptions = {}): AnalysisResult {
  const maxAchId = Math.max(0, Math.min(saveData.achievements.length - 1, TOTAL_ACHIEVEMENTS));
  const unlocked = getUnlockedIds(saveData.achievements, maxAchId);
  const stats = parseCounterStats(saveData.counters);
  const { seen: collectiblesSeen, total: totalCollectibles } = countCollectiblesSeen(saveData.collectibles);
  const dlcLevel = saveData.dlcLevel;
  const isRepentance = dlcLevel === "repentance";

  const filteredBase = Object.fromEntries(
    Object.entries(BASE_CHARACTER_UNLOCKS).filter(([id]) => Number(id) <= maxAchId),
  );
  const filteredTainted = isRepentance ? TAINTED_CHARACTER_UNLOCKS : {};

  const baseCharacters = analyzeCharacterUnlocks(unlocked, filteredBase);
  const taintedCharacters = analyzeCharacterUnlocks(unlocked, filteredTainted);
  const completionGrid = analyzeCompletionMarks(unlocked, maxAchId);
  const taintedCompletionGrid = isRepentance ? analyzeTaintedCompletionMarks(unlocked) : [];
  const challenges = analyzeChallenges(saveData.challenges);
  const phaseProgress = analyzePhaseProgress(unlocked, stats, dlcLevel);
  const bossKillMilestones = analyzeBossKillMilestones(unlocked, stats, saveData.bestiary, maxAchId);

  const laneRecommendations = generateLaneRecommendations(
    unlocked,
    stats,
    completionGrid,
    taintedCompletionGrid,
    challenges,
    maxAchId,
    dlcLevel,
    bossKillMilestones,
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
    const unlockEntry = Object.entries(TAINTED_CHARACTER_UNLOCKS).find(([, name]) => name === char.name);
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

  const merged = [
    ...laneRecommendationsToActionItems(laneRecommendations),
    ...runPlansToActionItems(runPlans),
  ];
  const deduped = deduplicateActionItems(merged, !!options.debug);
  const actionItems = assignTiers(deduped.items);
  const firstAction = actionItems.find((item) => item.category !== "warning");
  if (firstAction) {
    firstAction.whyFirst = generateWhyFirst(firstAction, firstAction.scoreBreakdown);
  }

  const bestiaryEntries = analyzeBestiary(saveData.bestiary);
  const bestiaryEncountered = bestiaryEntries.filter((entry) => entry.encountered > 0).length;
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
    actionItems: options.debug ? actionItems : stripDebug(actionItems),
    suppressedItems: options.debug ? deduped.suppressedItems : undefined,
    bestiary: bestiaryEntries,
    bestiaryEncountered,
    bestiaryTotal: bestiaryEntries.length > 0 ? BESTIARY_TOTAL : 0,
    missingUnlocks,
    bossKillMilestones,
    phaseProgress,
  };
}

export {
  analyzeBestiary,
  analyzeBossKillMilestones,
  analyzeChallenges,
  analyzeCharacterUnlocks,
  assignTiers,
  analyzeCompletionMarks,
  analyzeTaintedCompletionMarks,
  compareActionItems,
  countCollectiblesSeen,
  deduplicateActionItems,
  getUnlockedIds,
};

export {
  evaluateChallenges,
  evaluateCharacterUnlocks,
  evaluateCompletionMarks,
  evaluateDonation,
  evaluateGuardrails,
  evaluateProgressionGates,
  generateLaneRecommendations,
} from "./recommender";
