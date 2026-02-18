import type {
  SaveData,
  AnalysisResult,
  CharacterProgress,
  TaintedCharacterProgress,
  CharacterUnlock,
  ChallengeInfo,
  CounterStats,
  LaneRecommendation,
  BlockingDep,
  EffortLevel,
} from "./types";
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
import { GREED_DONATION_MILESTONES, NORMAL_DONATION_MILESTONES } from "./data/donation";
import { CHALLENGE_PREREQS } from "./data/challenge-prereqs";
import { getChallengeTier } from "./data/challenge-tiers";
import { GUARDRAILS } from "./data/guardrails";

function getUnlockedIds(achievements: number[]): Set<number> {
  const ids = new Set<number>();
  for (let i = 1; i < achievements.length; i++) {
    if (achievements[i] !== 0) ids.add(i);
  }
  return ids;
}

function parseCounterStats(counters: number[]): CounterStats {
  const get = (i: number) => (i < counters.length ? counters[i] : 0);
  return {
    momKills: get(0),
    deaths: get(1),
    itemsCollected: get(2),
    momsHeartKills: get(3),
    satanKills: get(4),
    isaacKills: get(5),
    blueBabyKills: get(6),
    theLambKills: get(7),
    megaSatanKills: get(8),
    bossRushCompletions: get(9),
    hushCompletions: get(10),
    deliriumKills: get(11),
    motherKills: get(12),
    beastKills: get(13),
    ultraGreedKills: get(14),
    ultraGreedierKills: get(15),
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

function analyzeCompletionMarks(unlocked: Set<number>): CharacterProgress[] {
  return Object.entries(COMPLETION_MARKS).map(([name, marks]) => {
    let done = 0;
    let total = 0;
    const markDetails = marks.map((achId, i) => {
      if (achId === null) {
        return { boss: BOSS_NAMES[i], done: false, achievementId: null };
      }
      total++;
      const isDone = unlocked.has(achId);
      if (isDone) done++;
      return { boss: BOSS_NAMES[i], done: isDone, achievementId: achId };
    });
    return { name, marks: markDetails, done, total };
  });
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
  for (let i = 1; i <= 45; i++) {
    const completed = i < challengeData.length && challengeData[i] !== 0;
    results.push({
      id: i,
      name: CHALLENGE_NAMES[i] ?? `Challenge ${i}`,
      reward: CHALLENGE_REWARDS[i] ?? null,
      completed,
    });
  }
  return results;
}

// --- Lane-based recommendation engine ---

function computeScore(
  value: number,
  readiness: number,
  effort: EffortLevel,
  risk: number,
  blockerDepth: number,
): number {
  const effortMap: Record<EffortLevel, number> = {
    "single-run": 0.1,
    "multi-run": 0.5,
    "grind": 0.9,
  };
  const raw =
    value * 0.45 +
    readiness * 0.3 -
    effortMap[effort] * 0.15 -
    risk * 0.1;
  return raw * Math.pow(0.7, blockerDepth);
}

function checkBlockingDeps(
  achievementIds: number[],
  unlocked: Set<number>,
): { deps: BlockingDep[]; depth: number } {
  const deps: BlockingDep[] = achievementIds.map((id) => ({
    description: getAchievement(id).unlockDescription,
    achievementId: id,
    met: unlocked.has(id),
  }));
  const unmet = deps.filter((d) => !d.met);
  return { deps: unmet, depth: unmet.length };
}

function isGateCleared(
  gate: typeof PROGRESSION_GATES[number],
  unlocked: Set<number>,
  stats: CounterStats,
): boolean {
  if (gate.achievementIds.length > 0) {
    return gate.achievementIds.every((id) => unlocked.has(id));
  }
  if (gate.counterCheck) {
    return (stats as any)[gate.counterCheck.field] >= gate.counterCheck.threshold;
  }
  return false;
}

function evaluateProgressionGates(
  unlocked: Set<number>,
  stats: CounterStats,
): LaneRecommendation[] {
  const recs: LaneRecommendation[] = [];

  for (const gate of PROGRESSION_GATES) {
    if (isGateCleared(gate, unlocked, stats)) continue;

    // Check blockers — use same clearing logic
    const blockerGates = gate.blockedBy
      .map((id) => PROGRESSION_GATES.find((g) => g.id === id))
      .filter(Boolean);
    const blockers: BlockingDep[] = [];
    let depth = 0;
    for (const bg of blockerGates) {
      if (!bg) continue;
      if (!isGateCleared(bg, unlocked, stats)) {
        blockers.push({
          description: bg.description,
          achievementId: bg.achievementIds[0] ?? null,
          met: false,
        });
        depth++;
      }
    }

    // Count downstream value (gates + characters opened)
    const downstream = PROGRESSION_GATES.filter((g) =>
      g.blockedBy.includes(gate.id),
    ).length;

    const score = computeScore(
      Math.min(downstream / 5, 1), // normalize: 5 downstream = max value
      depth === 0 ? 0.8 : 0.2,
      depth === 0 ? "multi-run" : "grind",
      0.1,
      depth,
    );

    recs.push({
      lane: "progression-gate",
      target: gate.description,
      achievementIds: gate.achievementIds,
      blockedBy: blockers,
      blockerDepth: depth,
      estimatedEffort: depth === 0 ? "multi-run" : "grind",
      downstreamValue: downstream,
      score,
      whyNow: `Opens: ${gate.opens}`,
    });
  }

  return recs;
}

function evaluateCharacterUnlocks(
  unlocked: Set<number>,
): LaneRecommendation[] {
  const recs: LaneRecommendation[] = [];

  for (const [idStr, name] of Object.entries(BASE_CHARACTER_UNLOCKS)) {
    const id = Number(idStr);
    if (unlocked.has(id)) continue;

    // Count how many marks this character would open
    const marks = COMPLETION_MARKS[name === "Jacob & Esau" ? "Jacob" : name];
    const markCount = marks
      ? marks.filter((m) => m !== null).length
      : 13;

    const score = computeScore(
      Math.min(markCount / 13, 1),
      0.6,
      "single-run",
      0.1,
      0,
    );

    recs.push({
      lane: "character-unlock",
      target: `Unlock ${name}`,
      achievementIds: [id],
      blockedBy: [],
      blockerDepth: 0,
      estimatedEffort: "single-run",
      downstreamValue: markCount,
      score,
      whyNow: `${getAchievement(id).unlockDescription} — opens ${markCount} completion marks`,
    });
  }

  // Tainted characters
  for (const [idStr, name] of Object.entries(TAINTED_CHARACTER_UNLOCKS)) {
    const id = Number(idStr);
    if (unlocked.has(id)) continue;

    // Tainted chars require Home access (ach 635)
    const homeUnlocked = unlocked.has(635);
    const blockers: BlockingDep[] = [];
    let depth = 0;
    if (!homeUnlocked) {
      blockers.push({
        description: "Defeat Mother to unlock Home access",
        achievementId: 635,
        met: false,
      });
      depth = 1;
    }

    const score = computeScore(
      0.5, // 7 marks per tainted char
      homeUnlocked ? 0.5 : 0.1,
      "single-run",
      0.2,
      depth,
    );

    recs.push({
      lane: "character-unlock",
      target: `Unlock ${name}`,
      achievementIds: [id],
      blockedBy: blockers,
      blockerDepth: depth,
      estimatedEffort: "single-run",
      downstreamValue: 7,
      score,
      whyNow: `Reach Home as ${name.replace("T.", "")} with Red Key/Cracked Key — opens 7 tainted marks`,
    });
  }

  return recs;
}

function evaluateCompletionMarks(
  unlocked: Set<number>,
  baseGrid: CharacterProgress[],
  taintedGrid: TaintedCharacterProgress[],
): LaneRecommendation[] {
  const recs: LaneRecommendation[] = [];

  // Base characters near complete (≤4 remaining)
  for (const char of baseGrid) {
    const remaining = char.total - char.done;
    if (remaining <= 0 || remaining > 4 || char.done === 0) continue;

    const missing = char.marks
      .filter((m) => m.achievementId !== null && !m.done)
      .map((m) => m.boss);

    const readiness = char.done / char.total;
    const score = computeScore(readiness, readiness, "multi-run", 0.1, 0);

    recs.push({
      lane: "completion-mark",
      target: `Finish ${char.name} (${char.done}/${char.total}, needs: ${missing.join(", ")})`,
      achievementIds: char.marks
        .filter((m) => m.achievementId !== null && !m.done)
        .map((m) => m.achievementId!),
      blockedBy: [],
      blockerDepth: 0,
      estimatedEffort: remaining <= 2 ? "single-run" : "multi-run",
      downstreamValue: remaining,
      score,
      whyNow: `Only ${remaining} marks remaining — close to all hard mode marks for ${char.name}`,
    });
  }

  // Tainted characters near complete (≤3 remaining, since they only have 7 total)
  for (const char of taintedGrid) {
    const remaining = char.total - char.done;
    if (remaining <= 0 || remaining > 3 || char.done === 0) continue;

    const missing = char.marks
      .filter((m) => !m.done)
      .map((m) => m.boss);

    const readiness = char.done / char.total;
    const score = computeScore(readiness, readiness, "multi-run", 0.15, 0);

    recs.push({
      lane: "completion-mark",
      target: `Finish ${char.name} (${char.done}/${char.total}, needs: ${missing.join(", ")})`,
      achievementIds: char.marks.filter((m) => !m.done).map((m) => m.achievementId),
      blockedBy: [],
      blockerDepth: 0,
      estimatedEffort: remaining <= 2 ? "single-run" : "multi-run",
      downstreamValue: remaining,
      score,
      whyNow: `Only ${remaining} tainted marks remaining`,
    });
  }

  // Untouched base characters with all marks available
  for (const char of baseGrid) {
    if (char.done !== 0 || char.total === 0) continue;

    const score = computeScore(0.3, 0.1, "grind", 0.2, 0);

    recs.push({
      lane: "completion-mark",
      target: `Start playing as ${char.name} (0/${char.total} marks)`,
      achievementIds: [],
      blockedBy: [],
      blockerDepth: 0,
      estimatedEffort: "grind",
      downstreamValue: char.total,
      score,
      whyNow: "Untouched character — many unlocks available",
    });
  }

  return recs;
}

function evaluateChallenges(
  unlocked: Set<number>,
  challenges: ChallengeInfo[],
): LaneRecommendation[] {
  const recs: LaneRecommendation[] = [];
  const incomplete = challenges.filter((c) => !c.completed);

  for (const ch of incomplete) {
    // Check prerequisites
    const prereq = CHALLENGE_PREREQS.find((p) => p.challengeId === ch.id);
    const blockers: BlockingDep[] = [];
    let depth = 0;

    if (prereq) {
      for (const reqId of prereq.requiredAchievements) {
        if (!unlocked.has(reqId)) {
          blockers.push({
            description: getAchievement(reqId).unlockDescription,
            achievementId: reqId,
            met: false,
          });
          depth++;
        }
      }
    }

    const tier = getChallengeTier(ch.id);
    const tierValue: Record<string, number> = { high: 0.9, medium: 0.5, low: 0.2 };
    const value = tierValue[tier] ?? 0.5;
    const effort: EffortLevel = "single-run";

    const score = computeScore(value, depth === 0 ? 0.7 : 0.2, effort, 0.1, depth);

    const rewardText = ch.reward ? ` — unlocks ${ch.reward}` : "";

    recs.push({
      lane: "challenge",
      target: `Complete #${ch.id} ${ch.name}${rewardText}`,
      achievementIds: [],
      blockedBy: blockers,
      blockerDepth: depth,
      estimatedEffort: effort,
      downstreamValue: tier === "high" ? 3 : tier === "medium" ? 1 : 0,
      score,
      whyNow: depth === 0
        ? `${tier}-value challenge, ready to attempt`
        : `Blocked: ${blockers.map((b) => b.description).join("; ")}`,
    });
  }

  return recs;
}

function evaluateDonation(unlocked: Set<number>): LaneRecommendation[] {
  const recs: LaneRecommendation[] = [];

  // Find next unmet Greed milestone
  let lastGreedMet = 0;
  for (const m of GREED_DONATION_MILESTONES) {
    if (unlocked.has(m.achievementId)) {
      lastGreedMet = m.coins;
    } else {
      const score = computeScore(
        m.strategic ? 0.8 : 0.3,
        lastGreedMet > 0 ? 0.5 : 0.3,
        "grind",
        0.2,
        0,
      );

      recs.push({
        lane: "donation",
        target: `Greed Donation: reach ${m.coins} coins for ${m.name}`,
        achievementIds: [m.achievementId],
        blockedBy: [],
        blockerDepth: 0,
        estimatedEffort: "grind",
        downstreamValue: m.strategic ? 5 : 1,
        score,
        whyNow: m.strategic
          ? `Strategic milestone — ${m.name} significantly impacts progression`
          : `Next Greed donation milestone (${m.coins} coins)`,
      });
      break; // Only show next milestone
    }
  }

  // Find next unmet Normal milestone
  let lastNormalMet = 0;
  for (const m of NORMAL_DONATION_MILESTONES) {
    if (unlocked.has(m.achievementId)) {
      lastNormalMet = m.coins;
    } else {
      if (m.strategic) {
        const score = computeScore(0.4, lastNormalMet > 0 ? 0.4 : 0.2, "grind", 0.1, 0);
        recs.push({
          lane: "donation",
          target: `Normal Donation: reach ${m.coins} coins for ${m.name}`,
          achievementIds: [m.achievementId],
          blockedBy: [],
          blockerDepth: 0,
          estimatedEffort: "grind",
          downstreamValue: 2,
          score,
          whyNow: "Normal donations happen passively — just keep playing",
        });
      }
      break;
    }
  }

  return recs;
}

function evaluateGuardrails(unlocked: Set<number>): LaneRecommendation[] {
  const recs: LaneRecommendation[] = [];
  const unlockedCount = unlocked.size;

  // Show guardrails early in the game, reduce as player progresses
  for (const g of GUARDRAILS) {
    // Show warnings always, tips only early-mid game
    if (g.category === "tip" && unlockedCount > 400) continue;

    recs.push({
      lane: "guardrail",
      target: g.title,
      achievementIds: [],
      blockedBy: [],
      blockerDepth: 0,
      estimatedEffort: "single-run",
      downstreamValue: 0,
      score: g.category === "warning" ? 0.1 : 0.05,
      whyNow: g.description,
    });
  }

  return recs;
}

function generateLaneRecommendations(
  unlocked: Set<number>,
  stats: CounterStats,
  baseGrid: CharacterProgress[],
  taintedGrid: TaintedCharacterProgress[],
  challenges: ChallengeInfo[],
): LaneRecommendation[] {
  const allRecs = [
    ...evaluateProgressionGates(unlocked, stats),
    ...evaluateCharacterUnlocks(unlocked),
    ...evaluateCompletionMarks(unlocked, baseGrid, taintedGrid),
    ...evaluateChallenges(unlocked, challenges),
    ...evaluateDonation(unlocked),
    ...evaluateGuardrails(unlocked),
  ];

  // Sort by score descending, guardrails last
  allRecs.sort((a, b) => {
    if (a.lane === "guardrail" && b.lane !== "guardrail") return 1;
    if (a.lane !== "guardrail" && b.lane === "guardrail") return -1;
    return b.score - a.score;
  });

  return allRecs;
}

export function analyze(saveData: SaveData): AnalysisResult {
  const unlocked = getUnlockedIds(saveData.achievements);
  const stats = parseCounterStats(saveData.counters);
  const baseCharacters = analyzeCharacterUnlocks(unlocked, BASE_CHARACTER_UNLOCKS);
  const taintedCharacters = analyzeCharacterUnlocks(unlocked, TAINTED_CHARACTER_UNLOCKS);
  const completionGrid = analyzeCompletionMarks(unlocked);
  const taintedCompletionGrid = analyzeTaintedCompletionMarks(unlocked);
  const challenges = analyzeChallenges(saveData.challenges);
  const laneRecommendations = generateLaneRecommendations(
    unlocked, stats, completionGrid, taintedCompletionGrid, challenges,
  );

  return {
    totalAchievements: TOTAL_ACHIEVEMENTS,
    unlockedCount: unlocked.size,
    stats,
    baseCharacters,
    taintedCharacters,
    completionGrid,
    taintedCompletionGrid,
    challenges,
    laneRecommendations,
  };
}

// Export internals for testing
export {
  getUnlockedIds,
  analyzeCompletionMarks,
  analyzeTaintedCompletionMarks,
  analyzeCharacterUnlocks,
  analyzeChallenges,
  generateLaneRecommendations,
  evaluateProgressionGates,
  evaluateCharacterUnlocks,
  evaluateCompletionMarks,
  evaluateChallenges,
  evaluateDonation,
  evaluateGuardrails,
};
