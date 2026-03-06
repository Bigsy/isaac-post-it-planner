import type {
  CharacterProgress,
  TaintedCharacterProgress,
  ChallengeInfo,
  CounterStats,
  LaneRecommendation,
  BlockingDep,
  EffortLevel,
  BossKillMilestoneGroupStatus,
  TldrItem,
  RunPlan,
} from "./types";
import type { DlcLevel } from "./data/dlc";
import type { ProgressionPhase } from "./data/phases";
import { getAchievement, TOTAL_ACHIEVEMENTS } from "./data/achievements";
import {
  BASE_CHARACTER_UNLOCKS,
  TAINTED_CHARACTER_UNLOCKS,
  COMPLETION_MARKS,
} from "./data/characters";
import { PROGRESSION_GATES, isGateCleared, SYSTEM_UNLOCK_MARKS } from "./data/progression";
import { GREED_DONATION_MILESTONES, NORMAL_DONATION_MILESTONES } from "./data/donation";
import { CHALLENGE_PREREQS } from "./data/challenge-prereqs";
import { getChallengeTier } from "./data/challenge-tiers";
import { GUARDRAILS } from "./data/guardrails";
import { detectPhase, PHASE_DEFINITIONS } from "./data/phases";
import { getItemValue, QUALITY_SCORE } from "./data/item-values";
import { getBossPriority } from "./data/boss-order";
import { characterItemValue, bestRemainingMark } from "./data/character-value";
import { achievementWikiUrl, bossWikiUrl, characterWikiUrl, challengeWikiUrl, routeWikiUrl } from "./data/wiki";

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

const PHASE_MATCH_MULTIPLIER = 1.35;
const PHASE_MISMATCH_MULTIPLIER = 0.8;
const GATE_STRATEGIC_BONUS: Partial<Record<string, number>> = {
  "mom": 0.08,
  "it-lives": 0.12,
  "sheol-cathedral": 0.16,
  "polaroid": 0.28,
  "negative": 0.28,
  "blue-womb": 0.22,
  "mega-satan": 0.18,
  "void-delirium": 0.18,
  "alt-path": 0.24,
  "home-beast": 0.2,
};
const GREED_START_BONUS = 0.22;
const GREED_STRATEGIC_BONUS = 0.18;
const NORMAL_STRATEGIC_BONUS = 0.1;

interface CounterBlocker {
  field: keyof CounterStats;
  threshold: number;
  description: string;
}

interface BaseUnlockMeta {
  requiredAchievements?: number[];
  counterBlockers?: CounterBlocker[];
  effort?: EffortLevel;
  risk?: number;
}

const BASE_UNLOCK_META: Record<number, BaseUnlockMeta> = {
  82: {
    effort: "multi-run",
    risk: 0.2,
  },
  251: {
    counterBlockers: [
      {
        field: "greedDonationCoins",
        threshold: 1000,
        description: "Reach 1000 Greed donation coins",
      },
    ],
    effort: "grind",
    risk: 0.35,
  },
  390: {
    effort: "grind",
    risk: 0.35,
  },
  405: {
    requiredAchievements: [635],
    effort: "multi-run",
    risk: 0.2,
  },
};


export function evaluateProgressionGates(
  unlocked: Set<number>,
  stats: CounterStats,
  maxAchId: number = TOTAL_ACHIEVEMENTS,
  currentPhase: ProgressionPhase = "phase-1-foundations",
  bossKillMilestones?: BossKillMilestoneGroupStatus[],
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

    // System unlock bonus: gates that enable many new marks score higher
    const systemMarks = SYSTEM_UNLOCK_MARKS[gate.id] ?? 0;
    const systemBonus = systemMarks > 0 ? Math.min(systemMarks / 50, 1) * 0.3 : 0;
    const value = Math.min(downstream / 5 + systemBonus, 1);

    const gatePhase = GATE_PHASE_MAP[gate.id] ?? "phase-4-completion";
    const alignment = gatePhase === currentPhase ? 0.3 : 0;

    let score = computeScore(
      value,
      depth === 0 ? 0.8 : 0.2,
      depth === 0 ? "multi-run" : "grind",
      0.1,
      depth,
      0,
      alignment,
    );
    score *= gatePhase === currentPhase ? PHASE_MATCH_MULTIPLIER : PHASE_MISMATCH_MULTIPLIER;
    // Major route gates unlock whole branches of progression, so they should surface
    // ahead of generic cleanup even when they take multiple runs.
    const strategicBonus = GATE_STRATEGIC_BONUS[gate.id] ?? 0;
    if (strategicBonus > 0) {
      score += gatePhase === currentPhase ? strategicBonus : strategicBonus * 0.6;
    }

    let whyNow = `Opens: ${gate.opens}${gate.counterCheck ? ` (${stats[gate.counterCheck.field]}/${gate.counterCheck.threshold} kills)` : ""}`;
    if (systemMarks > 10) {
      whyNow += ` — unlocks ${systemMarks}+ new marks`;
    }

    // Enrich Polaroid/Negative gate text with boss kill counts
    if (bossKillMilestones && (gate.id === "polaroid" || gate.id === "negative")) {
      const bossName = gate.id === "polaroid" ? "isaac" : "satan";
      const group = bossKillMilestones.find((g) => g.bossName === bossName);
      if (group?.nextMilestone) {
        const remaining = group.nextMilestone.kills - group.currentKills;
        if (remaining > 0) {
          const bossDisplay = gate.id === "polaroid" ? "Isaac" : "Satan";
          const estimated = !group.killCountKnown ? " (estimated)" : "";
          whyNow = `Defeat ${bossDisplay} ${remaining} more times${estimated} — ${whyNow}`;
        }
      }
    }

    recs.push({
      lane: "progression-gate",
      target: gate.description,
      achievementIds: gate.achievementIds,
      blockedBy: blockers,
      blockerDepth: depth,
      estimatedEffort: depth === 0 ? "multi-run" : "grind",
      downstreamValue: downstream,
      score,
      whyNow,
      phase: gatePhase,
    });
  }

  return recs;
}

export function evaluateCharacterUnlocks(
  unlocked: Set<number>,
  maxAchId: number = TOTAL_ACHIEVEMENTS,
  currentPhase: ProgressionPhase = "phase-1-foundations",
  stats?: CounterStats,
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

    const meta = BASE_UNLOCK_META[id];
    const blockers: BlockingDep[] = [];
    let depth = 0;
    if (meta?.requiredAchievements && meta.requiredAchievements.length > 0) {
      const depResult = checkBlockingDeps(meta.requiredAchievements, unlocked);
      blockers.push(...depResult.deps);
      depth += depResult.depth;
    }
    if (meta?.counterBlockers) {
      for (const blocker of meta.counterBlockers) {
        const current = stats ? stats[blocker.field] : 0;
        if (!stats || current < blocker.threshold) {
          blockers.push({
            description: `${blocker.description} (${current}/${blocker.threshold})`,
            achievementId: null,
            met: false,
          });
          depth++;
        }
      }
    }

    const effort = meta?.effort ?? "single-run";
    const risk = meta?.risk ?? 0.1;
    const readiness = depth === 0 ? 0.6 : 0.2;

    let score = computeScore(
      markCount > 0 ? Math.min(markCount / 13, 1) : 0.3,
      readiness,
      effort,
      risk,
      depth,
      qualityBonus,
      alignment,
    );

    const bestInfo = best ? ` — best remaining: ${best.itemName} (${best.quality})` : "";
    let whyNow = `${getAchievement(id).unlockDescription} — opens ${markCount} completion marks${bestInfo}`;

    // The Lost (ach 82): defer if Holy Mantle not yet available via Greed donation
    if (id === 82 && stats && stats.greedDonationCoins < 879) {
      score *= 0.5;
      whyNow += " (defer playing until 879 Greed donation for Holy Mantle)";
    }

    recs.push({
      lane: "character-unlock",
      target: `Unlock ${name}`,
      achievementIds: [id],
      blockedBy: blockers,
      blockerDepth: depth,
      estimatedEffort: effort,
      downstreamValue: markCount,
      score,
      whyNow,
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

export function evaluateCompletionMarks(
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

export function evaluateChallenges(
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

    const score = computeScore(value, depth === 0 ? 0.45 : 0.2, effort, 0.2, depth, 0, 0);

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

export function evaluateDonation(
  unlocked: Set<number>,
  stats: CounterStats,
  maxAchId: number = TOTAL_ACHIEVEMENTS,
  currentPhase: ProgressionPhase = "phase-1-foundations",
): LaneRecommendation[] {
  const recs: LaneRecommendation[] = [];
  const donationAlignment =
    currentPhase === "phase-1-foundations" || currentPhase === "phase-2-expansion" ? 0.2
    : currentPhase === "phase-3-repentance" ? 0.1
    : 0;

  // Greed mode urgency: if donation is 0 and Mom beaten, prompt to start
  if (stats.greedDonationCoins === 0 && unlocked.has(4)) {
    recs.push({
      lane: "donation",
      target: "Start Greed Mode — rotate characters to build donation machine",
      achievementIds: [],
      blockedBy: [],
      blockerDepth: 0,
      estimatedEffort: "grind",
      downstreamValue: 5,
      score: computeScore(0.7, 0.6, "grind", 0.2, 0, 0, donationAlignment) + GREED_START_BONUS,
      whyNow: "The Greed Machine jams more per character — rotate early. Key milestones: 500 (Greedier mode), 879 (Holy Mantle for The Lost), 1000 (Keeper unlock)",
    });
  }

  // Find next unmet Greed milestone (filtered by DLC)
  const filteredGreed = GREED_DONATION_MILESTONES.filter((m) => m.achievementId <= maxAchId);
  let lastGreedMet = 0;
  for (const m of filteredGreed) {
    if (unlocked.has(m.achievementId)) {
      lastGreedMet = m.coins;
    } else {
      let score = computeScore(
        m.strategic ? 0.8 : 0.3,
        lastGreedMet > 0 ? 0.5 : 0.3,
        "grind",
        0.2,
        0,
        0,
        donationAlignment,
      );
      if (m.strategic) {
        score += GREED_STRATEGIC_BONUS;
      }

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
      let score = computeScore(
        m.strategic ? 0.4 : 0.2,
        lastNormalMet > 0 ? 0.4 : 0.2,
        "grind",
        0.1,
        0,
        0,
        donationAlignment,
      );
      if (m.strategic) {
        score += NORMAL_STRATEGIC_BONUS;
      }
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

export function evaluateGuardrails(unlocked: Set<number>): LaneRecommendation[] {
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

export function generateLaneRecommendations(
  unlocked: Set<number>,
  stats: CounterStats,
  baseGrid: CharacterProgress[],
  taintedGrid: TaintedCharacterProgress[],
  challenges: ChallengeInfo[],
  maxAchId: number = TOTAL_ACHIEVEMENTS,
  dlcLevel: DlcLevel = "repentance",
  bossKillMilestones?: BossKillMilestoneGroupStatus[],
): LaneRecommendation[] {
  const currentPhase = detectPhase(unlocked, stats, dlcLevel);

  const allRecs = [
    ...evaluateProgressionGates(unlocked, stats, maxAchId, currentPhase, bossKillMilestones),
    ...evaluateCharacterUnlocks(unlocked, maxAchId, currentPhase, stats),
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

export function generateTldr(
  recs: LaneRecommendation[],
  runPlans: RunPlan[],
  currentPhase?: ProgressionPhase,
): TldrItem[] {
  const items: TldrItem[] = [];

  // 1. Top unblocked progression-gate rec
  const topGate = recs.find(
    (r) =>
      r.lane === "progression-gate" &&
      r.blockedBy.length === 0 &&
      (!currentPhase || r.phase === currentPhase),
  ) ?? recs.find(r => r.lane === "progression-gate" && r.blockedBy.length === 0);
  if (topGate) {
    // Extract boss name from "Defeat X ..." pattern to link inline
    const links: { text: string; url: string }[] = [];
    const bossMatch = topGate.target.match(/^Defeat (.+?)(?:\s+\d|\s+\(|$)/);
    if (bossMatch) {
      const bossName = bossMatch[1];
      const url = bossWikiUrl(bossName);
      if (url) links.push({ text: bossName, url });
    }
    items.push({ lane: "progression-gate", summary: topGate.target, detail: topGate.whyNow, links: links.length > 0 ? links : undefined });
  }

  // 2. Top donation rec
  const topDonation = recs.find(r => r.lane === "donation");
  if (topDonation) {
    items.push({ lane: "donation", summary: topDonation.target, detail: topDonation.whyNow });
  }

  // 3. Top run plan
  if (runPlans.length > 0) {
    const plan = runPlans[0];
    const links: { text: string; url: string }[] = [
      { text: plan.character, url: characterWikiUrl(plan.character) },
      { text: plan.route, url: routeWikiUrl(plan.routeWikiPath) },
    ];
    items.push({
      lane: "completion-mark",
      summary: `${plan.character} -> ${plan.route}`,
      detail: plan.whyThisRun,
      links,
    });
  }

  // 4. Top unblocked challenge rec
  const topChallenge = recs.find(r => r.lane === "challenge" && r.blockedBy.length === 0);
  if (topChallenge) {
    // Extract challenge name from target format "Complete #N Name — unlocks Reward"
    const chMatch = topChallenge.target.match(/^Complete #\d+\s+(.+?)(?:\s+—|$)/);
    const chName = chMatch ? chMatch[1] : null;
    const links = chName ? [{ text: chName, url: challengeWikiUrl(chName) }] : undefined;
    items.push({
      lane: "challenge",
      summary: topChallenge.target,
      detail: topChallenge.whyNow,
      links,
    });
  }

  // 5. Top non-toxic guardrail tip
  const topTip = recs.find(r => r.lane === "guardrail" && !r.isToxicWarning && r.score < 0.1)
    ?? recs.find(r => r.lane === "guardrail" && !r.isToxicWarning);
  if (topTip) {
    items.push({ lane: "guardrail", summary: topTip.target, detail: topTip.whyNow });
  }

  return items.slice(0, 5);
}
