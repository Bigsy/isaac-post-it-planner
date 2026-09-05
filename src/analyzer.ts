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
  GreedMachineCharacterStat,
  GreedMachineMilestoneStatus,
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
import {
  TAINTED_BOSS_NAMES,
  TAINTED_COMPLETION_MARKS,
} from "./data/tainted-marks";
import { PROGRESSION_GATES } from "./data/progression";
import { BESTIARY_ENTITIES, BESTIARY_TOTAL } from "./data/bestiary";
import { analyzeMissingUnlocks } from "./data/achievement-categories";
import { detectPhase, PHASE_DEFINITIONS, dlcAtLeast } from "./data/phases";
import { BOSS_KILL_MILESTONE_GROUPS } from "./data/boss-milestones";
import {
  greedDonationCounters,
  greedDonationTotalCounter,
  greedierJamChance,
  greedJamChance,
} from "./data/greed-machine";
import {
  GREED_DONATION_MILESTONES,
  NORMAL_DONATION_MILESTONES,
} from "./data/donation";
import { achievementWikiUrl } from "./data/wiki";
import {
  buildRunPlans,
  routeRequirements,
  toActionItems as runPlansToActionItems,
} from "./run-planner";
import {
  evaluateChallenges,
  evaluateCharacterUnlocks,
  evaluateCompletionMarks,
  evaluateDonation,
  evaluateGuardrails,
  evaluateProgressionGates,
  generateLaneRecommendations,
  laneRecommendationsToActionItems,
} from "./recommender";

import {
  DEFAULT_PREFERENCES,
  scoreAction,
  compareScoredActions,
  preferenceExcludes,
} from "./planner-scoring";
import { ROUTES } from "./data/run-paths";
import { missingPowerTargets } from "./power-targets";

export interface AnalyzeOptions {
  debug?: boolean;
  preferences?: Partial<import("./types").PlannerPreferences>;
}

function getUnlockedIds(
  achievements: number[],
  maxId: number = TOTAL_ACHIEVEMENTS,
): Set<number> {
  const ids = new Set<number>();
  const limit = Math.min(achievements.length, maxId + 1);
  for (let i = 1; i < limit; i++) {
    if (achievements[i] !== 0) ids.add(i);
  }
  return ids;
}

function countCollectiblesSeen(collectibles: number[]): {
  seen: number;
  total: number;
} {
  let seen = 0;
  const total = Math.max(0, collectibles.length - 1);
  for (let i = 1; i < collectibles.length; i++) {
    if (collectibles[i] !== 0) seen++;
  }
  return { seen, total };
}

function parseCounterStats(
  counters: number[],
  dlcLevel: DlcLevel,
): CounterStats {
  const get = (i: number) => (i < counters.length ? counters[i] : 0);
  // Afterbirth inserted SUPER_SPECIAL_ROCKS_DESTROYED at EventCounter 4,
  // shifting every later counter by one from the original Rebirth layout.
  const getModernEvent = (i: number) =>
    get(i + (dlcLevel === "rebirth" ? -1 : 0));
  const greedCounter = greedDonationTotalCounter(dlcLevel);
  return {
    momKills: get(1),
    deaths: getModernEvent(10),
    momsHeartKills: get(1),
    rocksDestroyed: get(2),
    tintedRocksDestroyed: get(3),
    poopDestroyed: getModernEvent(5),
    shopkeeperKills: getModernEvent(12),
    greedDonationCoins: greedCounter == null ? 0 : get(greedCounter),
    normalDonationCoins: getModernEvent(20),
    edenTokens: getModernEvent(21),
    winStreak: getModernEvent(22),
    bestStreak: getModernEvent(23),
  };
}

function analyzeGreedMachineStats(
  counters: number[],
  dlcLevel: DlcLevel,
  maxAchievementId: number,
): GreedMachineCharacterStat[] {
  return greedDonationCounters(dlcLevel, maxAchievementId).map(
    ({ character, counterIndex, isTainted }) => {
      const coinsDonated = Math.max(0, counters[counterIndex] ?? 0);
      return {
        character,
        isTainted,
        coinsDonated,
        greedJamChance: greedJamChance(coinsDonated),
        greedierJamChance: greedierJamChance(coinsDonated),
      };
    },
  );
}

function analyzeGreedMachineMilestones(
  unlocked: Set<number>,
  maxAchievementId: number,
): GreedMachineMilestoneStatus[] {
  return GREED_DONATION_MILESTONES.filter(
    (milestone) => milestone.achievementId <= maxAchievementId,
  ).map((milestone) => ({
    coins: milestone.coins,
    achievementId: milestone.achievementId,
    reward: milestone.name,
    strategic: milestone.strategic,
    unlocked: unlocked.has(milestone.achievementId),
  }));
}

function analyzeNormalDonationMilestones(
  unlocked: Set<number>,
  maxAchievementId: number,
): GreedMachineMilestoneStatus[] {
  return NORMAL_DONATION_MILESTONES.filter(
    (milestone) => milestone.achievementId <= maxAchievementId,
  ).map((milestone) => ({
    coins: milestone.coins,
    achievementId: milestone.achievementId,
    reward: milestone.name,
    strategic: milestone.strategic,
    unlocked: unlocked.has(milestone.achievementId),
  }));
}

function analyzePhaseProgress(
  unlocked: Set<number>,
  stats: CounterStats,
  dlcLevel: DlcLevel,
) {
  const currentPhase = detectPhase(unlocked, stats, dlcLevel);
  const phaseDef = PHASE_DEFINITIONS.find(
    (phase) => phase.id === currentPhase,
  )!;
  const applicableCriteria = phaseDef.completionCriteria.filter(
    (criterion) =>
      !criterion.requiredDlc || dlcAtLeast(dlcLevel, criterion.requiredDlc),
  );
  return {
    currentPhase,
    phaseName: phaseDef.name,
    phaseDescription: phaseDef.description,
    criteria: applicableCriteria.map((criterion) => {
      const met =
        criterion.type === "achievement" && criterion.achievementId != null
          ? unlocked.has(criterion.achievementId)
          : criterion.type === "counter-threshold" &&
              criterion.counterField &&
              criterion.counterThreshold != null
            ? stats[criterion.counterField] >= criterion.counterThreshold
            : false;
      const achievement =
        criterion.achievementId != null
          ? getAchievement(criterion.achievementId)
          : null;
      return {
        description: criterion.description,
        met,
        howTo: achievement?.unlockDescription,
        wikiUrl: achievement
          ? (achievementWikiUrl(achievement.name) ?? undefined)
          : undefined,
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

function analyzeTaintedCompletionMarks(
  unlocked: Set<number>,
): TaintedCharacterProgress[] {
  return Object.entries(TAINTED_COMPLETION_MARKS).map(([name, marks]) => {
    let done = 0;
    const markDetails = marks.map((achievementId, index) => {
      const isDone = unlocked.has(achievementId);
      if (isDone) done++;
      return {
        boss: TAINTED_BOSS_NAMES[index] as string,
        done: isDone,
        achievementId,
      };
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
    const milestones = group.milestones.filter(
      (milestone) => milestone.achievementId <= maxAchId,
    );
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

    const mappedMilestones: BossKillMilestoneStatus[] = milestones.map(
      (milestone) => ({
        kills: milestone.kills,
        achievementId: milestone.achievementId,
        name: milestone.name,
        unlocked: unlocked.has(milestone.achievementId),
      }),
    );

    return {
      bossName: group.bossName,
      bossDisplayName: group.bossDisplayName,
      currentKills,
      killCountKnown,
      milestones: mappedMilestones,
      nextMilestone:
        mappedMilestones.find((milestone) => !milestone.unlocked) ?? null,
    };
  }).filter((group): group is BossKillMilestoneGroupStatus => group !== null);
}

function compareActionItems(a: ActionItem, b: ActionItem): number {
  return compareScoredActions(a, b);
}

function deduplicateActionItems(
  items: ActionItem[],
  debug: boolean,
): { items: ActionItem[]; suppressedItems?: SuppressedItem[] } {
  const winners = new Map<string, ActionItem>();
  const suppressedItems: SuppressedItem[] = [];
  for (const item of [...items].sort(compareActionItems)) {
    // Only identical completed AND partial outcomes with the same session constraints are equivalent.
    const outcomes = item.completedAchievementIds ?? item.achievementIds;
    const key = outcomes.length
      ? JSON.stringify([
          item.category === "run" ? "play" : item.category,
          [...outcomes].sort((a, b) => a - b),
          [...(item.progressAchievementIds ?? [])].sort((a, b) => a - b),
          item.character,
          !!item.timed,
          item.blocked,
        ])
      : item.id;
    const winner = winners.get(key);
    if (winner)
      suppressedItems.push({
        item,
        suppressedBy: winner.id,
        reason: "dedup: equivalent completed and partial outcomes",
        originalScore: item.score,
      });
    else winners.set(key, item);
  }
  return {
    items: [...winners.values()],
    suppressedItems: debug ? suppressedItems : undefined,
  };
}

function assignTiers(items: ActionItem[]): ActionItem[] {
  const sorted = items
    .map((a) => ({ ...a, tier: "backlog" as ActionItem["tier"] }))
    .sort(compareActionItems);
  const eligible = sorted.filter(
    (a) =>
      !a.blocked &&
      !a.excluded &&
      !["warning", "daily", "donation"].includes(a.category) &&
      a.score > 0,
  );
  const selected: ActionItem[] = [];
  const choose = (a: ActionItem | undefined, label: string) => {
    if (a) {
      a.tier = 1;
      a.selectionLabel = label;
      selected.push(a);
    }
  };
  const best = eligible[0];
  choose(best, "Best power unlock");
  const distinct = (a: ActionItem) =>
    !selected.some(
      (b) =>
        b.id === a.id ||
        (b.primaryAchievementId != null &&
          b.primaryAchievementId === a.primaryAchievementId),
    );
  choose(
    eligible.find(
      (a) =>
        distinct(a) &&
        (a.burden ?? 25) < (best?.burden ?? 0) &&
        (a.scoreBreakdown?.primaryBenefit ?? 0) >= 30,
    ),
    "Easier useful run",
  );
  choose(
    eligible.find(
      (a) =>
        distinct(a) &&
        !!a.setupTarget &&
        (a.scoreBreakdown?.setupBenefit ?? 0) >= 6,
    ),
    "Progress toward a major unlock",
  );
  const alternatives: ActionItem[] = [];
  for (const a of eligible) {
    if (selected.includes(a)) continue;
    if (a.score <= 10 && !a.setupTarget) {
      a.tier = "backlog";
      continue;
    }
    if (
      alternatives.length < 5 &&
      distinct(a) &&
      !alternatives.some(
        (b) =>
          b.primaryAchievementId != null &&
          b.primaryAchievementId === a.primaryAchievementId,
      )
    ) {
      a.tier = 2;
      alternatives.push(a);
    } else a.tier = 3;
  }
  return [...selected, ...sorted.filter((a) => !selected.includes(a))];
}

function stripDebug(items: ActionItem[]): ActionItem[] {
  return items.map((item) => ({ ...item, scoreBreakdown: undefined }));
}

export function analyze(
  saveData: SaveData,
  options: AnalyzeOptions = {},
): AnalysisResult {
  const preferences = { ...DEFAULT_PREFERENCES, ...options.preferences };
  const maxAchId = Math.max(
    0,
    Math.min(saveData.achievements.length - 1, TOTAL_ACHIEVEMENTS),
  );
  const unlocked = getUnlockedIds(saveData.achievements, maxAchId);
  const stats = parseCounterStats(saveData.counters, saveData.dlcLevel);
  const { seen: collectiblesSeen, total: totalCollectibles } =
    countCollectiblesSeen(saveData.collectibles);
  const dlcLevel = saveData.dlcLevel;
  const isRepentance = dlcLevel === "repentance";
  const greedMachineStats = analyzeGreedMachineStats(
    saveData.counters,
    dlcLevel,
    maxAchId,
  );
  const greedMachineMilestones = analyzeGreedMachineMilestones(
    unlocked,
    maxAchId,
  );
  const normalDonationMilestones = analyzeNormalDonationMilestones(
    unlocked,
    maxAchId,
  );

  const filteredBase = Object.fromEntries(
    Object.entries(BASE_CHARACTER_UNLOCKS).filter(
      ([id]) => Number(id) <= maxAchId,
    ),
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
  const bossKillMilestones = analyzeBossKillMilestones(
    unlocked,
    stats,
    saveData.bestiary,
    maxAchId,
  );

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
    const unlockEntry = Object.entries(BASE_CHARACTER_UNLOCKS).find(
      ([, name]) =>
        name === char.name ||
        (name === "Jacob & Esau" && char.name === "Jacob"),
    );
    if (!unlockEntry || unlocked.has(Number(unlockEntry[0]))) {
      availableCharacters.add(char.name);
    }
  }
  for (const char of taintedCompletionGrid) {
    const unlockEntry = Object.entries(TAINTED_CHARACTER_UNLOCKS).find(
      ([, name]) => name === char.name,
    );
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

  const lanes = laneRecommendationsToActionItems(laneRecommendations).filter(
    (a) => a.category !== "mark" && !a.isToxicWarning,
  );
  for (const a of lanes) {
    // Generic gate instructions also obey timed-run exclusions.
    a.timed = ["gate:alt-path", "gate:void-delirium"].includes(a.id);
    if (a.category === "gate" && !a.blocked) {
      const gate = PROGRESSION_GATES.find((g) => `gate:${g.id}` === a.id)!;
      const nextBoss: Record<string, string> = {
        mom: "Mom",
        "it-lives": "Mom's Heart",
        "blue-womb": "Mom's Heart",
        "sheol-cathedral": "Mom's Heart",
        polaroid: "Isaac",
        negative: "Satan",
        "mega-satan": "both Angel statues for Key Pieces",
        "void-delirium": "Hush",
        "alt-path": "Hush",
        "home-beast": "Mother",
      };
      a.effort = "single-run";
      a.burden = (
        {
          mom: 4,
          "it-lives": 5,
          "blue-womb": 5,
          "sheol-cathedral": 5,
          polaroid: 6,
          negative: 6,
          "mega-satan": 15,
          "void-delirium": 13,
          "alt-path": 13,
          "home-beast": 15,
        } as Record<string, number>
      )[gate.id];
      a.headline = `Work toward ${gate.name} — defeat ${nextBoss[gate.id]}`;
      a.detail = `Requirement: ${gate.description}. ${a.detail} This action makes progress; repeat runs where needed.`;
    }
    if (a.category === "challenge" && a.challengeId) {
      const characters: Record<number, string> = {
        4: "Eve",
        5: "Magdalene",
        7: "Lazarus",
        10: "Magdalene",
        29: "Judas",
        31: "Lazarus",
        37: "Bethany",
        38: "Bethany",
        40: "Jacob",
        42: "T.Forgotten",
        43: "T.Cain",
        44: "T.Jacob",
        45: "T.Eden",
      };
      a.character = characters[a.challengeId] ?? "Isaac";
      a.burden =
        (
          {
            2: 6,
            4: 11,
            5: 7,
            6: 15,
            8: 11,
            9: 8,
            10: 6,
            17: 12,
            18: 7,
            23: 10,
            32: 14,
            37: 16,
            39: 16,
            34: 25,
            45: 25,
          } as Record<number, number>
        )[a.challengeId] ?? 10;
      a.timed = a.challengeId === 22;
    }
    if (a.category === "unlock" && a.character?.startsWith("T.")) {
      // A tainted-character unlock is played as its base counterpart.
      a.character = a.character.slice(2);
    } else if (a.category === "unlock") {
      a.character = a.achievementIds.includes(404) ? "Lazarus" : undefined;
    }
    if (!a.character && ["gate", "unlock"].includes(a.category) && !a.blocked) {
      a.character =
        [...availableCharacters].find(
          (c) => !preferences.avoidedCharacters.includes(c),
        ) ?? [...availableCharacters][0];
    }
  }
  const special: ActionItem[] = [];
  if (maxAchId >= 415 && !unlocked.has(415)) {
    const requirements = routeRequirements(
      ROUTES.find((r) => r.id === "home")!,
      unlocked,
      stats,
      dlcLevel,
    );
    special.push({
      id: "target:415",
      tier: "backlog",
      score: 0,
      headline: "Open Mom’s Chest in Home",
      detail:
        "Ascend to Home and open Mom’s Chest; no Beast win is needed for Red Key.",
      category: "challenge",
      effort: "single-run",
      blocked: requirements.length > 0,
      achievementIds: [415],
      completedAchievementIds: [415],
      burden: 9,
      character:
        [...availableCharacters].find(
          (c) => !preferences.avoidedCharacters.includes(c),
        ) ?? [...availableCharacters][0],
      blockedBy: requirements.map((description) => ({
        description,
        achievementId: null,
        met: false,
      })),
    });
  }
  let merged = [
    ...lanes,
    ...runPlansToActionItems(runPlans, unlocked),
    ...special,
  ].map((a) => scoreAction(a, preferences, dlcLevel));
  let missingPower = missingPowerTargets(
    unlocked,
    maxAchId,
    dlcLevel,
    stats,
    [...completionGrid, ...taintedCompletionGrid],
    availableCharacters,
    merged,
    preferences,
  );
  for (const target of missingPower) {
    if (
      target.status === "Available now" ||
      target.status === "Excluded by your preferences" ||
      !target.actionId
    )
      continue;
    const action = merged.find((a) => a.id === target.actionId);
    if (
      action &&
      !action.completedAchievementIds?.includes(target.achievementId) &&
      !action.setupTarget
    ) {
      action.setupTarget = target.name;
      action.setupValue =
        target.status === "Long-term"
          ? 3
          : 18 / Math.max(1, target.requirements.length);
      action.detail += ` Next step toward ${target.name}: ${target.method}. Further work remains.`;
    }
  }
  // Mechanical early gates retain setup value even before a curated target has a linked route.
  for (const a of merged)
    if (a.category === "gate" && !a.setupTarget && !a.blocked) {
      a.setupTarget = "access to stronger unlocks";
      a.detail +=
        " Opens the route toward stronger unlocks; repeated-kill requirements may take several runs.";
    }
  merged = merged.map((a) => scoreAction(a, preferences, dlcLevel));
  const deduped = deduplicateActionItems(merged, !!options.debug);
  const ongoingGoals = deduped.items.filter(
    (a) =>
      a.category === "daily" ||
      a.category === "donation" ||
      a.effort === "grind",
  );
  const actionItems = assignTiers(
    deduped.items.filter(
      (a) =>
        a.category !== "daily" &&
        a.category !== "donation" &&
        a.effort !== "grind",
    ),
  );
  const first = actionItems.find((a) => a.tier === 1);
  if (first)
    first.whyFirst = first.itemName
      ? `A useful next unlock: ${first.itemName}.`
      : first.setupTarget
        ? `Makes progress toward ${first.setupTarget}.`
        : "Opens access to future unlocks.";
  if (preferences.objective === "completion")
    for (const a of actionItems)
      if (a.selectionLabel === "Best power unlock")
        a.selectionLabel = "Best completion run";
  missingPower = missingPowerTargets(
    unlocked,
    maxAchId,
    dlcLevel,
    stats,
    [...completionGrid, ...taintedCompletionGrid],
    availableCharacters,
    merged,
    preferences,
  );

  const bestiaryEntries = analyzeBestiary(saveData.bestiary);
  const bestiaryEncountered = bestiaryEntries.filter(
    (entry) => entry.encountered > 0,
  ).length;
  const missingUnlocks = analyzeMissingUnlocks(unlocked, maxAchId);

  return {
    dlcLevel,
    preferences,
    ongoingGoals: options.debug ? ongoingGoals : stripDebug(ongoingGoals),
    missingPower,
    totalAchievements: maxAchId,
    unlockedCount: unlocked.size,
    collectiblesSeen,
    totalCollectibles,
    stats,
    greedMachineStats,
    greedMachineMilestones,
    normalDonationMilestones,
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
  analyzeGreedMachineMilestones,
  analyzeNormalDonationMilestones,
  analyzeGreedMachineStats,
  analyzeCharacterUnlocks,
  assignTiers,
  analyzeCompletionMarks,
  analyzeTaintedCompletionMarks,
  compareActionItems,
  countCollectiblesSeen,
  deduplicateActionItems,
  getUnlockedIds,
  parseCounterStats,
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
