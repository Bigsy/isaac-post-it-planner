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
  PhaseProgress,
  BestiaryData,
  BestiaryEntry,
} from "./types";
import type { DlcLevel } from "./data/dlc";
import type { ProgressionPhase } from "./data/phases";
import { getAchievement, TOTAL_ACHIEVEMENTS } from "./data/achievements";
import {
  BASE_CHARACTER_UNLOCKS,
  TAINTED_CHARACTER_UNLOCKS,
  BOSS_NAMES,
  COMPLETION_MARKS,
} from "./data/characters";
import { CHALLENGE_NAMES, CHALLENGE_REWARDS } from "./data/challenges";
import { TAINTED_COMPLETION_MARKS, TAINTED_BOSS_NAMES } from "./data/tainted-marks";
import { PROGRESSION_GATES, isGateCleared } from "./data/progression";
import { GREED_DONATION_MILESTONES, NORMAL_DONATION_MILESTONES } from "./data/donation";
import { CHALLENGE_PREREQS } from "./data/challenge-prereqs";
import { getChallengeTier } from "./data/challenge-tiers";
import { GUARDRAILS } from "./data/guardrails";
import { BESTIARY_ENTITIES, BESTIARY_TOTAL } from "./data/bestiary";
import { analyzeMissingUnlocks } from "./data/achievement-categories";
import { detectPhase, PHASE_DEFINITIONS, dlcAtLeast } from "./data/phases";
import { getItemValue, QUALITY_SCORE } from "./data/item-values";
import { getBossPriority } from "./data/boss-order";
import { characterItemValue, bestRemainingMark } from "./data/character-value";
import { achievementWikiUrl } from "./data/wiki";
import { buildRunPlans } from "./run-planner";

function getUnlockedIds(achievements: number[]): Set<number> {
  const ids = new Set<number>();
  for (let i = 1; i < achievements.length; i++) {
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

// --- Lane-based recommendation engine ---

function computeScore(
  value: number,
  readiness: number,
  effort: EffortLevel,
  risk: number,
  blockerDepth: number,
  itemQualityBonus: number = 0,
  phaseAlignment: number = 0,
): number {
  const effortMap: Record<EffortLevel, number> = {
    "single-run": 0.1,
    "multi-run": 0.5,
    "grind": 0.9,
  };
  const raw =
    value * 0.35 +
    readiness * 0.25 -
    effortMap[effort] * 0.10 -
    risk * 0.05 +
    itemQualityBonus * 0.15 +
    phaseAlignment * 0.10;
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

const GATE_PHASE_MAP: Record<string, ProgressionPhase> = {
  "mom": "phase-1-foundations",
  "it-lives": "phase-1-foundations",
  "sheol-cathedral": "phase-1-foundations",
  "polaroid": "phase-1-foundations",
  "negative": "phase-1-foundations",
  "blue-womb": "phase-2-expansion",
  "mega-satan": "phase-2-expansion",
  "void-delirium": "phase-2-expansion",
  "alt-path": "phase-3-repentance",
  "home-beast": "phase-3-repentance",
};

function evaluateProgressionGates(
  unlocked: Set<number>,
  stats: CounterStats,
  maxAchId: number = TOTAL_ACHIEVEMENTS,
  currentPhase: ProgressionPhase = "phase-1-foundations",
): LaneRecommendation[] {
  const recs: LaneRecommendation[] = [];

  // Filter gates: only include gates where every achievementId is <= maxAchId
  // Gates with empty achievementIds (counter-based) pass through
  const filteredGates = PROGRESSION_GATES.filter((gate) =>
    gate.achievementIds.length === 0 || gate.achievementIds.every((id) => id <= maxAchId),
  );

  for (const gate of filteredGates) {
    if (isGateCleared(gate, unlocked, stats)) continue;

    // Check blockers — use same clearing logic
    const blockerGates = gate.blockedBy
      .map((id) => filteredGates.find((g) => g.id === id))
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
    const downstream = filteredGates.filter((g) =>
      g.blockedBy.includes(gate.id),
    ).length;

    const gatePhase = GATE_PHASE_MAP[gate.id] ?? "phase-4-completion";
    const alignment = gatePhase === currentPhase ? 0.3 : 0;

    const score = computeScore(
      Math.min(downstream / 5, 1), // normalize: 5 downstream = max value
      depth === 0 ? 0.8 : 0.2,
      depth === 0 ? "multi-run" : "grind",
      0.1,
      depth,
      0,
      alignment,
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
      phase: gatePhase,
    });
  }

  return recs;
}

function evaluateCharacterUnlocks(
  unlocked: Set<number>,
  maxAchId: number = TOTAL_ACHIEVEMENTS,
  currentPhase: ProgressionPhase = "phase-1-foundations",
): LaneRecommendation[] {
  const recs: LaneRecommendation[] = [];

  // Early-game character unlock achievements (phase-1 alignment)
  const PHASE1_CHAR_IDS = new Set([1, 2, 3, 42, 67, 79, 80, 82]);

  for (const [idStr, name] of Object.entries(BASE_CHARACTER_UNLOCKS)) {
    const id = Number(idStr);
    if (id > maxAchId) continue;
    if (unlocked.has(id)) continue;

    const lookupName = name === "Jacob & Esau" ? "Jacob" : name;

    // Count how many marks this character would open
    const marks = COMPLETION_MARKS[lookupName];
    const markCount = marks
      ? marks.filter((m) => m !== null && m <= maxAchId).length
      : 0;

    // Item quality awareness
    const charValue = characterItemValue(lookupName, unlocked, false);
    const best = bestRemainingMark(lookupName, unlocked, false);
    const qualityBonus = Math.min(charValue / 5, 1);
    const alignment = PHASE1_CHAR_IDS.has(id) && currentPhase === "phase-1-foundations" ? 0.2 : 0;

    const score = computeScore(
      markCount > 0 ? Math.min(markCount / 13, 1) : 0.3,
      0.6,
      "single-run",
      0.1,
      0,
      qualityBonus,
      alignment,
    );

    const bestInfo = best ? ` — best remaining: ${best.itemName} (${best.quality})` : "";

    recs.push({
      lane: "character-unlock",
      target: `Unlock ${name}`,
      achievementIds: [id],
      blockedBy: [],
      blockerDepth: 0,
      estimatedEffort: "single-run",
      downstreamValue: markCount,
      score,
      whyNow: `${getAchievement(id).unlockDescription} — opens ${markCount} completion marks${bestInfo}`,
      itemQuality: best?.quality,
      itemName: best?.itemName,
    });
  }

  // Tainted characters — only if maxAchId >= 474 (first tainted unlock ID)
  if (maxAchId >= 474) {
    for (const [idStr, name] of Object.entries(TAINTED_CHARACTER_UNLOCKS)) {
      const id = Number(idStr);
      if (id > maxAchId) continue;
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

      // Item quality awareness for tainted characters
      const charValue = characterItemValue(name, unlocked, true);
      const best = bestRemainingMark(name, unlocked, true);
      const qualityBonus = Math.min(charValue / 5, 1);

      const score = computeScore(
        0.5, // 7 marks per tainted char
        homeUnlocked ? 0.5 : 0.1,
        "single-run",
        0.2,
        depth,
        qualityBonus,
      );

      const bestInfo = best ? ` — best remaining: ${best.itemName} (${best.quality})` : "";

      recs.push({
        lane: "character-unlock",
        target: `Unlock ${name}`,
        achievementIds: [id],
        blockedBy: blockers,
        blockerDepth: depth,
        estimatedEffort: "single-run",
        downstreamValue: 7,
        score,
        whyNow: `Reach Home as ${name.replace("T.", "")} with Red Key/Cracked Key — opens 7 tainted marks${bestInfo}`,
        itemQuality: best?.quality,
        itemName: best?.itemName,
      });
    }
  }

  return recs;
}

// Collect phase criterion achievement IDs for alignment checks
function getPhaseCriterionIds(phase: ProgressionPhase): Set<number> {
  const phaseDef = PHASE_DEFINITIONS.find(p => p.id === phase);
  if (!phaseDef) return new Set();
  const ids = new Set<number>();
  for (const c of phaseDef.completionCriteria) {
    if (c.achievementId != null) ids.add(c.achievementId);
  }
  return ids;
}

function collectToxicMarks(
  marks: { boss: string; done: boolean; achievementId: number | null }[],
  characterName: string,
  out: { characterName: string; bossName: string; itemName: string; reason: string }[],
): void {
  for (const mark of marks) {
    if (mark.done || mark.achievementId === null) continue;
    const entry = getItemValue(mark.achievementId);
    if (entry?.quality === "toxic") {
      out.push({
        characterName,
        bossName: mark.boss,
        itemName: entry.itemName,
        reason: entry.reason ?? "pool pollution",
      });
    }
  }
}

function evaluateCompletionMarks(
  unlocked: Set<number>,
  baseGrid: CharacterProgress[],
  taintedGrid: TaintedCharacterProgress[],
  currentPhase: ProgressionPhase = "phase-1-foundations",
): LaneRecommendation[] {
  const recs: LaneRecommendation[] = [];
  const toxicMarks: { characterName: string; bossName: string; itemName: string; reason: string }[] = [];
  const phaseAchIds = getPhaseCriterionIds(currentPhase);

  // Base characters near complete (≤4 remaining)
  for (const char of baseGrid) {
    const remaining = char.total - char.done;
    if (remaining <= 0 || remaining > 4 || char.done === 0) continue;

    const missing = char.marks
      .filter((m) => m.achievementId !== null && !m.done)
      .map((m) => m.boss);

    const best = bestRemainingMark(char.name, unlocked, false);
    const qualityBonus = best ? QUALITY_SCORE[best.quality] : 0;
    const bestBossPriority = best ? getBossPriority(best.bossName, false) : 99;

    collectToxicMarks(char.marks, char.name, toxicMarks);

    // Phase alignment: if any remaining mark is a phase criterion, boost
    const hasPhaseRelevantMark = char.marks.some(
      m => !m.done && m.achievementId !== null && phaseAchIds.has(m.achievementId),
    );
    const alignment = hasPhaseRelevantMark ? 0.2 : 0;

    const readiness = char.done / char.total;
    const score = computeScore(readiness, readiness, "multi-run", 0.1, 0, qualityBonus, alignment);

    const bestInfo = best
      ? ` — next: ${best.bossName} for ${best.itemName} (${best.quality})`
      : "";
    const hasToxic = char.marks.some(
      (m) => !m.done && m.achievementId !== null && getItemValue(m.achievementId)?.quality === "toxic",
    );

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
      whyNow: `Only ${remaining} marks remaining${bestInfo}`,
      itemQuality: best?.quality,
      itemName: best?.itemName,
      bossPriority: bestBossPriority,
      isToxicWarning: hasToxic || undefined,
    });
  }

  // Base characters in progress (>4 remaining, some done) — per-mark rec for best boss
  for (const char of baseGrid) {
    const remaining = char.total - char.done;
    if (remaining <= 4 || char.done === 0) continue;

    const best = bestRemainingMark(char.name, unlocked, false);
    if (!best) continue;

    collectToxicMarks(char.marks, char.name, toxicMarks);

    const qualityBonus = QUALITY_SCORE[best.quality];
    const bestBossPriority = getBossPriority(best.bossName, false);
    const hasPhaseRelevantMark = phaseAchIds.has(best.achievementId);
    const alignment = hasPhaseRelevantMark ? 0.2 : 0;

    const readiness = char.done / char.total;
    const score = computeScore(
      readiness * 0.6,  // lower value than near-complete
      readiness,
      "multi-run",
      0.15,
      0,
      qualityBonus,
      alignment,
    );

    recs.push({
      lane: "completion-mark",
      target: `${char.name}: ${best.bossName} for ${best.itemName} (${char.done}/${char.total} done)`,
      achievementIds: [best.achievementId],
      blockedBy: [],
      blockerDepth: 0,
      estimatedEffort: "multi-run",
      downstreamValue: remaining,
      score,
      whyNow: `In progress — best remaining mark: ${best.bossName} for ${best.itemName} (${best.quality})`,
      itemQuality: best.quality,
      itemName: best.itemName,
      bossPriority: bestBossPriority,
      isToxicWarning: best.quality === "toxic" || undefined,
    });
  }

  // Tainted characters near complete (≤3 remaining, since they only have 7 total)
  for (const char of taintedGrid) {
    const remaining = char.total - char.done;
    if (remaining <= 0 || remaining > 3 || char.done === 0) continue;

    const missing = char.marks
      .filter((m) => !m.done)
      .map((m) => m.boss);

    const best = bestRemainingMark(char.name, unlocked, true);
    const qualityBonus = best ? QUALITY_SCORE[best.quality] : 0;
    const bestBossPriority = best ? getBossPriority(best.bossName, true) : 99;

    collectToxicMarks(
      char.marks.map(m => ({ ...m, achievementId: m.achievementId as number | null })),
      char.name,
      toxicMarks,
    );

    const hasPhaseRelevantMark = char.marks.some(
      m => !m.done && phaseAchIds.has(m.achievementId),
    );
    const alignment = hasPhaseRelevantMark ? 0.2 : 0;

    const readiness = char.done / char.total;
    const hasToxic = char.marks.some(
      (m) => !m.done && getItemValue(m.achievementId)?.quality === "toxic",
    );
    const score = computeScore(readiness, readiness, "multi-run", 0.15, 0, qualityBonus, alignment);

    const bestInfo = best
      ? ` — next: ${best.bossName} for ${best.itemName} (${best.quality})`
      : "";

    recs.push({
      lane: "completion-mark",
      target: `Finish ${char.name} (${char.done}/${char.total}, needs: ${missing.join(", ")})`,
      achievementIds: char.marks.filter((m) => !m.done).map((m) => m.achievementId),
      blockedBy: [],
      blockerDepth: 0,
      estimatedEffort: remaining <= 2 ? "single-run" : "multi-run",
      downstreamValue: remaining,
      score,
      whyNow: `Only ${remaining} tainted marks remaining${bestInfo}`,
      itemQuality: best?.quality,
      itemName: best?.itemName,
      bossPriority: bestBossPriority,
      isToxicWarning: hasToxic || undefined,
    });
  }

  // Tainted characters in progress (>3 remaining, some done)
  for (const char of taintedGrid) {
    const remaining = char.total - char.done;
    if (remaining <= 3 || char.done === 0) continue;

    const best = bestRemainingMark(char.name, unlocked, true);
    if (!best) continue;

    collectToxicMarks(
      char.marks.map(m => ({ ...m, achievementId: m.achievementId as number | null })),
      char.name,
      toxicMarks,
    );

    const qualityBonus = QUALITY_SCORE[best.quality];
    const bestBossPriority = getBossPriority(best.bossName, true);
    const hasPhaseRelevantMark = phaseAchIds.has(best.achievementId);
    const alignment = hasPhaseRelevantMark ? 0.2 : 0;

    const readiness = char.done / char.total;
    const score = computeScore(
      readiness * 0.6,
      readiness,
      "multi-run",
      0.2,
      0,
      qualityBonus,
      alignment,
    );

    recs.push({
      lane: "completion-mark",
      target: `${char.name}: ${best.bossName} for ${best.itemName} (${char.done}/${char.total} done)`,
      achievementIds: [best.achievementId],
      blockedBy: [],
      blockerDepth: 0,
      estimatedEffort: "multi-run",
      downstreamValue: remaining,
      score,
      whyNow: `In progress — best remaining mark: ${best.bossName} for ${best.itemName} (${best.quality})`,
      itemQuality: best.quality,
      itemName: best.itemName,
      bossPriority: bestBossPriority,
      isToxicWarning: best.quality === "toxic" || undefined,
    });
  }

  // Untouched base characters with all marks available
  for (const char of baseGrid) {
    if (char.done !== 0 || char.total === 0) continue;

    const charValue = characterItemValue(char.name, unlocked, false);
    const best = bestRemainingMark(char.name, unlocked, false);
    const qualityBonus = Math.min(charValue / 5, 1);

    const score = computeScore(0.3, 0.1, "grind", 0.2, 0, qualityBonus);

    const bestInfo = best ? ` — best mark: ${best.itemName} (${best.quality})` : "";

    recs.push({
      lane: "completion-mark",
      target: `Start playing as ${char.name} (0/${char.total} marks)`,
      achievementIds: [],
      blockedBy: [],
      blockerDepth: 0,
      estimatedEffort: "grind",
      downstreamValue: char.total,
      score,
      whyNow: `Untouched character — many unlocks available${bestInfo}`,
      itemQuality: best?.quality,
      itemName: best?.itemName,
    });
  }

  // Toxic guardrail warnings (up to 5)
  for (const toxic of toxicMarks.slice(0, 5)) {
    recs.push({
      lane: "guardrail",
      target: `Pool Warning: ${toxic.itemName}`,
      achievementIds: [],
      blockedBy: [],
      blockerDepth: 0,
      estimatedEffort: "single-run",
      downstreamValue: 0,
      score: 0.12,
      whyNow: `Consider delaying: ${toxic.characterName} vs ${toxic.bossName} unlocks ${toxic.itemName} — ${toxic.reason}`,
      isToxicWarning: true,
      itemQuality: "toxic",
      itemName: toxic.itemName,
    });
  }

  return recs;
}

function evaluateChallenges(
  unlocked: Set<number>,
  challenges: ChallengeInfo[],
  currentPhase: ProgressionPhase = "phase-1-foundations",
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

    const alignment = currentPhase === "phase-1-foundations" ? 0.1 : 0;
    const score = computeScore(value, depth === 0 ? 0.7 : 0.2, effort, 0.1, depth, 0, alignment);

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

function evaluateDonation(
  unlocked: Set<number>,
  stats: CounterStats,
  maxAchId: number = TOTAL_ACHIEVEMENTS,
  currentPhase: ProgressionPhase = "phase-1-foundations",
): LaneRecommendation[] {
  const recs: LaneRecommendation[] = [];
  const donationAlignment =
    currentPhase === "phase-1-foundations" || currentPhase === "phase-4-completion" ? 0.2 : 0;

  // Find next unmet Greed milestone (filtered by DLC)
  const filteredGreed = GREED_DONATION_MILESTONES.filter((m) => m.achievementId <= maxAchId);
  let lastGreedMet = 0;
  for (const m of filteredGreed) {
    if (unlocked.has(m.achievementId)) {
      lastGreedMet = m.coins;
    } else {
      const score = computeScore(
        m.strategic ? 0.8 : 0.3,
        lastGreedMet > 0 ? 0.5 : 0.3,
        "grind",
        0.2,
        0,
        0,
        donationAlignment,
      );

      const coinProgress = `(${stats.greedDonationCoins}/${m.coins} coins)`;
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
          ? `Strategic milestone — ${m.name} significantly impacts progression ${coinProgress}`
          : `Next Greed donation milestone ${coinProgress}`,
      });
      break; // Only show next milestone
    }
  }

  // Find next unmet Normal milestone (filtered by DLC) — include non-strategic milestones too
  const filteredNormal = NORMAL_DONATION_MILESTONES.filter((m) => m.achievementId <= maxAchId);
  let lastNormalMet = 0;
  for (const m of filteredNormal) {
    if (unlocked.has(m.achievementId)) {
      lastNormalMet = m.coins;
    } else {
      const coinProgress = `(${stats.normalDonationCoins}/${m.coins} coins)`;
      const score = computeScore(
        m.strategic ? 0.4 : 0.2,
        lastNormalMet > 0 ? 0.4 : 0.2,
        "grind",
        0.1,
        0,
        0,
        donationAlignment,
      );
      recs.push({
        lane: "donation",
        target: `Normal Donation: reach ${m.coins} coins for ${m.name}`,
        achievementIds: [m.achievementId],
        blockedBy: [],
        blockerDepth: 0,
        estimatedEffort: "grind",
        downstreamValue: m.strategic ? 2 : 1,
        score,
        whyNow: m.strategic
          ? `Strategic milestone — ${m.name} significantly impacts progression ${coinProgress}`
          : `Normal donations happen passively — just keep playing ${coinProgress}`,
      });
      break; // Only show next milestone
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
  maxAchId: number = TOTAL_ACHIEVEMENTS,
  dlcLevel: DlcLevel = "repentance",
): LaneRecommendation[] {
  const currentPhase = detectPhase(unlocked, stats, dlcLevel);

  const allRecs = [
    ...evaluateProgressionGates(unlocked, stats, maxAchId, currentPhase),
    ...evaluateCharacterUnlocks(unlocked, maxAchId, currentPhase),
    ...evaluateCompletionMarks(unlocked, baseGrid, taintedGrid, currentPhase),
    ...evaluateChallenges(unlocked, challenges, currentPhase),
    ...evaluateDonation(unlocked, stats, maxAchId, currentPhase),
    ...evaluateGuardrails(unlocked),
  ];

  // Sort by score descending, guardrails last
  // Tie-break: progression-gate > others; within same lane, lower bossPriority wins
  allRecs.sort((a, b) => {
    if (a.lane === "guardrail" && b.lane !== "guardrail") return 1;
    if (a.lane !== "guardrail" && b.lane === "guardrail") return -1;
    if (b.score !== a.score) return b.score - a.score;
    // Tie-break: progression gates first
    if (a.lane === "progression-gate" && b.lane !== "progression-gate") return -1;
    if (a.lane !== "progression-gate" && b.lane === "progression-gate") return 1;
    // Within same lane, lower bossPriority wins
    return (a.bossPriority ?? 99) - (b.bossPriority ?? 99);
  });

  return allRecs;
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
  const unlocked = getUnlockedIds(saveData.achievements);
  const stats = parseCounterStats(saveData.counters);
  const { seen: collectiblesSeen, total: totalCollectibles } =
    countCollectiblesSeen(saveData.collectibles);
  const maxAchId = Math.max(0, Math.min(saveData.achievements.length - 1, TOTAL_ACHIEVEMENTS));
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
  generateLaneRecommendations,
  evaluateProgressionGates,
  evaluateCharacterUnlocks,
  evaluateCompletionMarks,
  evaluateChallenges,
  evaluateDonation,
  evaluateGuardrails,
};
