import type {
  ActionCategory,
  ActionItem,
  BlockingDep,
  BossKillMilestoneGroupStatus,
  ChallengeInfo,
  CharacterProgress,
  CounterStats,
  EffortLevel,
  LaneRecommendation,
  ScoreBreakdown,
  TaintedCharacterProgress,
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
import { COMMUNITY_META } from "./data/community-meta";
import { getBossPriority } from "./data/boss-order";
import { bestRemainingMark, characterItemValue } from "./data/character-value";
import { characterWikiUrl } from "./data/wiki";

interface CounterBlocker {
  field: keyof CounterStats;
  threshold: number;
  description: string;
}

interface BaseUnlockMeta {
  requiredAchievements?: number[];
  counterBlockers?: CounterBlocker[];
  effort?: EffortLevel;
}

interface ScoreInput {
  impact: number;
  readiness: number;
  effort: EffortLevel;
  blockerDepth?: number;
  itemQuality?: number;
  phaseAlignment?: number;
  communityMeta?: number;
  diversityPenalty?: number;
}

const BASE_UNLOCK_META: Record<number, BaseUnlockMeta> = {
  82: { effort: "multi-run" },
  251: {
    counterBlockers: [
      {
        field: "greedDonationCoins",
        threshold: 1000,
        description: "Reach 1000 Greed donation coins",
      },
    ],
    effort: "grind",
  },
  390: { effort: "grind" },
  405: {
    requiredAchievements: [635],
    effort: "multi-run",
  },
};

const GATE_PHASE_MAP: Record<string, ProgressionPhase> = {
  mom: "phase-1-foundations",
  "it-lives": "phase-1-foundations",
  "sheol-cathedral": "phase-1-foundations",
  polaroid: "phase-1-foundations",
  negative: "phase-1-foundations",
  "blue-womb": "phase-2-expansion",
  "mega-satan": "phase-2-expansion",
  "void-delirium": "phase-2-expansion",
  "alt-path": "phase-3-repentance",
  "home-beast": "phase-3-repentance",
};

const PHASE_ORDER: ProgressionPhase[] = [
  "phase-1-foundations",
  "phase-2-expansion",
  "phase-3-repentance",
  "phase-4-completion",
];

const EFFORT_PENALTY: Record<EffortLevel, number> = {
  "single-run": 1,
  "multi-run": 5,
  grind: 9,
};

const CLASSIC_RUNE_ACHIEVEMENTS = new Map<number, number>([
  [1, 89],
  [2, 90],
  [3, 91],
  [4, 92],
  [5, 93],
  [6, 94],
  [8, 96],
  [20, 95],
]);

const DAILY_ACTIONS = [
  {
    achievementId: 354,
    title: "Start Daily Challenges now",
    detail: "Try to clear daily runs when they appear. These unlocks take real-world days, so steady progress matters more than perfect routing.",
    impact: 0.72,
    readiness: 0.95,
    effort: "single-run" as EffortLevel,
  },
  {
    achievementId: 325,
    title: "Keep up Daily Challenges for Dedication",
    detail: "Dedication comes from showing up over time, so it pays to chip away at it whenever a daily appears.",
    impact: 0.8,
    readiness: 0.92,
    effort: "single-run" as EffortLevel,
  },
  {
    achievementId: 336,
    title: "Take shots at Daily Challenge win streaks",
    detail: "The Marathon comes from a daily win streak, so treat it as an ongoing side goal whenever a good daily shows up.",
    impact: 0.58,
    readiness: 0.68,
    effort: "multi-run" as EffortLevel,
  },
];

function clamp(n: number, min: number = 0, max: number = 1): number {
  return Math.min(max, Math.max(min, n));
}

export function slugifyActionPart(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
}

function isAdjacentPhase(a: ProgressionPhase, b: ProgressionPhase): boolean {
  const indexA = PHASE_ORDER.indexOf(a);
  const indexB = PHASE_ORDER.indexOf(b);
  return indexA !== -1 && indexB !== -1 && Math.abs(indexA - indexB) === 1;
}

function phaseAlignmentValue(
  targetPhase: ProgressionPhase | undefined,
  currentPhase: ProgressionPhase,
): number {
  if (!targetPhase) return 0;
  if (targetPhase === currentPhase) return 1;
  if (isAdjacentPhase(targetPhase, currentPhase)) return 0.3;
  return 0;
}

function communityMetaValue(achievementIds: number[], readiness: number, direct: boolean = false): number {
  if (!direct && readiness < 0.4) return 0;
  let best = 0;
  for (const id of achievementIds) {
    const entry = COMMUNITY_META[id];
    if (entry) {
      best = Math.max(best, entry.weight);
    }
  }
  return best;
}

function computeScore(input: ScoreInput): { score: number; breakdown: ScoreBreakdown } {
  const blockerDepth = input.blockerDepth ?? 0;
  const blockerDecay = Math.pow(0.7, blockerDepth);
  const impact = clamp(input.impact) * 35;
  const readiness = clamp(input.readiness) * 25;
  const effort = EFFORT_PENALTY[input.effort];
  const itemQuality = clamp(input.itemQuality ?? 0, -1, 1) * 15;
  const phaseAlignment = clamp(input.phaseAlignment ?? 0) * 15;
  const communityMeta = clamp(input.communityMeta ?? 0) * 5;
  const diversityPenalty = input.diversityPenalty ?? 0;
  const baseScore = Math.max(0, (impact + readiness - effort + itemQuality + phaseAlignment + communityMeta) * blockerDecay);
  const finalScore = Math.max(0, baseScore - diversityPenalty);

  return {
    score: finalScore,
    breakdown: {
      impact,
      readiness,
      effort: -effort,
      itemQuality,
      phaseAlignment,
      communityMeta,
      blockerDecay,
      diversityPenalty: -diversityPenalty,
      baseScore,
      finalScore,
    },
  };
}

function compareLaneRecommendations(a: LaneRecommendation, b: LaneRecommendation): number {
  const actionableA = a.lane !== "guardrail" || !!a.isToxicWarning;
  const actionableB = b.lane !== "guardrail" || !!b.isToxicWarning;
  if (actionableA !== actionableB) return actionableA ? -1 : 1;
  if (b.score !== a.score) return b.score - a.score;
  if (a.blockedBy.length !== b.blockedBy.length) return a.blockedBy.length - b.blockedBy.length;
  if ((a.bossPriority ?? 99) !== (b.bossPriority ?? 99)) {
    return (a.bossPriority ?? 99) - (b.bossPriority ?? 99);
  }
  return a.target.localeCompare(b.target);
}

function checkBlockingDeps(
  achievementIds: number[],
  unlocked: Set<number>,
): { deps: BlockingDep[]; depth: number } {
  const deps = achievementIds
    .filter((id) => !unlocked.has(id))
    .map((id) => ({
      description: getAchievement(id).unlockDescription,
      achievementId: id,
      met: false,
    }));
  return { deps, depth: deps.length };
}

function getPhaseCriterionIds(phase: ProgressionPhase): Set<number> {
  const phaseDef = PHASE_DEFINITIONS.find((p) => p.id === phase);
  if (!phaseDef) return new Set<number>();
  const ids = new Set<number>();
  for (const criterion of phaseDef.completionCriteria) {
    if (criterion.achievementId != null) ids.add(criterion.achievementId);
  }
  return ids;
}

function findChallengeAchievementId(challengeId: number, maxAchId: number): number | null {
  const explicit = CLASSIC_RUNE_ACHIEVEMENTS.get(challengeId);
  if (explicit != null && explicit <= maxAchId) return explicit;

  for (let id = 1; id <= maxAchId; id++) {
    const unlockDescription = getAchievement(id).unlockDescription;
    if (unlockDescription.includes(`challenge #${challengeId}`)) {
      return id;
    }
  }
  return null;
}

function collectToxicMarks(
  marks: { boss: string; done: boolean; achievementId: number | null }[],
  characterName: string,
  out: { characterName: string; bossName: string; itemName: string; reason: string }[],
): void {
  for (const mark of marks) {
    if (mark.done || mark.achievementId == null) continue;
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

function isBaseCharacterAvailable(name: string, unlocked: Set<number>): boolean {
  const entry = Object.entries(BASE_CHARACTER_UNLOCKS).find(([, value]) =>
    value === name || (value === "Jacob & Esau" && name === "Jacob"),
  );
  if (!entry) return true;
  return unlocked.has(Number(entry[0]));
}

function isTaintedCharacterAvailable(name: string, unlocked: Set<number>): boolean {
  const entry = Object.entries(TAINTED_CHARACTER_UNLOCKS).find(([, value]) => value === name);
  return !!entry && unlocked.has(Number(entry[0]));
}

function createLaneRecommendation(
  recommendation: Omit<LaneRecommendation, "score" | "scoreBreakdown">,
  scoreInput: ScoreInput,
): LaneRecommendation {
  const { score, breakdown } = computeScore(scoreInput);
  return {
    ...recommendation,
    score,
    scoreBreakdown: breakdown,
  };
}

export function evaluateProgressionGates(
  unlocked: Set<number>,
  stats: CounterStats,
  maxAchId: number = TOTAL_ACHIEVEMENTS,
  currentPhase: ProgressionPhase = "phase-1-foundations",
  bossKillMilestones?: BossKillMilestoneGroupStatus[],
): LaneRecommendation[] {
  const recs: LaneRecommendation[] = [];
  const filteredGates = PROGRESSION_GATES.filter((gate) =>
    gate.achievementIds.length === 0 || gate.achievementIds.every((id) => id <= maxAchId),
  );

  for (const gate of filteredGates) {
    if (isGateCleared(gate, unlocked, stats)) continue;

    const blockers: BlockingDep[] = [];
    let depth = 0;
    for (const blockerId of gate.blockedBy) {
      const blockerGate = filteredGates.find((candidate) => candidate.id === blockerId);
      if (!blockerGate || isGateCleared(blockerGate, unlocked, stats)) continue;
      blockers.push({
        description: blockerGate.description,
        achievementId: blockerGate.achievementIds[0] ?? null,
        met: false,
      });
      depth++;
    }

    const downstreamGates = filteredGates.filter((candidate) => candidate.blockedBy.includes(gate.id)).length;
    const systemMarks = SYSTEM_UNLOCK_MARKS[gate.id] ?? 0;
    const impact = clamp(downstreamGates * 0.18 + systemMarks / 35, 0.25, 1);
    const counterProgress = gate.counterCheck
      ? clamp(stats[gate.counterCheck.field] / gate.counterCheck.threshold)
      : 1;
    const readiness = clamp((depth === 0 ? 0.45 : 0.12) + counterProgress * 0.4, 0.15, 1);
    const gatePhase = GATE_PHASE_MAP[gate.id] ?? "phase-4-completion";
    const phaseAlignment = phaseAlignmentValue(gatePhase, currentPhase);
    const effort: EffortLevel = gate.counterCheck ? "grind" : depth === 0 ? "multi-run" : "grind";

    let whyNow = `Opens: ${gate.opens}${gate.counterCheck ? ` (${stats[gate.counterCheck.field]}/${gate.counterCheck.threshold})` : ""}`;
    if (systemMarks > 0) {
      whyNow += ` — unlocks ${systemMarks}+ new marks`;
    }

    if (bossKillMilestones && (gate.id === "polaroid" || gate.id === "negative")) {
      const bossName = gate.id === "polaroid" ? "isaac" : "satan";
      const group = bossKillMilestones.find((candidate) => candidate.bossName === bossName);
      if (group?.nextMilestone) {
        const remaining = group.nextMilestone.kills - group.currentKills;
        if (remaining > 0) {
          const bossDisplay = gate.id === "polaroid" ? "Isaac" : "Satan";
          const estimated = group.killCountKnown ? "" : " (estimated)";
          whyNow = `Defeat ${bossDisplay} ${remaining} more times${estimated} — ${whyNow}`;
        }
      }
    }

    recs.push(createLaneRecommendation({
      lane: "progression-gate",
      target: gate.description,
      achievementIds: gate.achievementIds,
      blockedBy: blockers,
      blockerDepth: depth,
      estimatedEffort: effort,
      downstreamValue: systemMarks + downstreamGates,
      whyNow,
      phase: gatePhase,
      gateId: gate.id,
      actionCategory: "gate",
    }, {
      impact,
      readiness,
      effort,
      blockerDepth: depth,
      phaseAlignment,
      communityMeta: communityMetaValue(gate.achievementIds, readiness),
    }));
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
  const phaseOneCharacters = new Set([1, 2, 3, 42, 67, 79, 80, 82]);

  for (const [idText, name] of Object.entries(BASE_CHARACTER_UNLOCKS)) {
    const id = Number(idText);
    if (id > maxAchId || unlocked.has(id)) continue;

    const lookupName = name === "Jacob & Esau" ? "Jacob" : name;
    const marks = COMPLETION_MARKS[lookupName];
    const markCount = marks ? marks.filter((mark) => mark != null && mark <= maxAchId).length : 0;
    const meta = BASE_UNLOCK_META[id];
    const blockers: BlockingDep[] = [];
    let depth = 0;

    if (meta?.requiredAchievements) {
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

    const best = bestRemainingMark(lookupName, unlocked, false);
    const itemQuality = best ? QUALITY_SCORE[best.quality] : Math.min(characterItemValue(lookupName, unlocked, false) / 5, 1);
    let readiness = depth === 0 ? 0.75 : 0.22;
    let detail = `${getAchievement(id).unlockDescription} — opens ${markCount} completion marks`;

    if (best) {
      detail += ` — best item unlock: ${best.itemName}`;
    }

    if (id === 82 && stats && stats.greedDonationCoins < 879) {
      readiness *= 0.45;
      detail += " — defer playing until 879 Greed donation for Holy Mantle";
    }

    recs.push(createLaneRecommendation({
      lane: "character-unlock",
      target: `Unlock ${name}`,
      achievementIds: [id],
      blockedBy: blockers,
      blockerDepth: depth,
      estimatedEffort: meta?.effort ?? "single-run",
      downstreamValue: markCount,
      whyNow: detail,
      itemQuality: best?.quality,
      itemName: best?.itemName,
      character: name,
      actionCategory: "unlock",
      links: [{ text: name, url: characterWikiUrl(name) }],
    }, {
      impact: markCount > 0 ? clamp(markCount / 10, 0.3, 1) : 0.3,
      readiness,
      effort: meta?.effort ?? "single-run",
      blockerDepth: depth,
      itemQuality,
      phaseAlignment: phaseOneCharacters.has(id) ? phaseAlignmentValue("phase-1-foundations", currentPhase) : 0,
      communityMeta: communityMetaValue([id], readiness),
    }));
  }

  if (maxAchId >= 474) {
    for (const [idText, name] of Object.entries(TAINTED_CHARACTER_UNLOCKS)) {
      const id = Number(idText);
      if (id > maxAchId || unlocked.has(id)) continue;

      const blockers: BlockingDep[] = [];
      let depth = 0;
      if (!unlocked.has(635)) {
        blockers.push({
          description: "Defeat Mother to unlock Home access",
          achievementId: 635,
          met: false,
        });
        depth++;
      }

      const best = bestRemainingMark(name, unlocked, true);
      const itemQuality = best ? QUALITY_SCORE[best.quality] : Math.min(characterItemValue(name, unlocked, true) / 5, 1);
      const detail = `Reach Home as ${name.replace("T.", "")} with Red Key or Cracked Key — opens 7 tainted marks${best ? ` — best item unlock: ${best.itemName}` : ""}`;

      recs.push(createLaneRecommendation({
        lane: "character-unlock",
        target: `Unlock ${name}`,
        achievementIds: [id],
        blockedBy: blockers,
        blockerDepth: depth,
        estimatedEffort: "single-run",
        downstreamValue: 7,
        whyNow: detail,
        itemQuality: best?.quality,
        itemName: best?.itemName,
        character: name,
        actionCategory: "unlock",
      }, {
        impact: 0.72,
        readiness: depth === 0 ? 0.58 : 0.14,
        effort: "single-run",
        blockerDepth: depth,
        itemQuality,
        phaseAlignment: phaseAlignmentValue("phase-3-repentance", currentPhase),
        communityMeta: communityMetaValue([id], depth === 0 ? 0.58 : 0.14),
      }));
    }
  }

  return recs;
}

export function evaluateCompletionMarks(
  unlocked: Set<number>,
  baseGrid: CharacterProgress[],
  taintedGrid: TaintedCharacterProgress[],
  currentPhase: ProgressionPhase = "phase-1-foundations",
): LaneRecommendation[] {
  const recs: LaneRecommendation[] = [];
  const toxicMarks: { characterName: string; bossName: string; itemName: string; reason: string }[] = [];
  const phaseAchievements = getPhaseCriterionIds(currentPhase);

  for (const char of baseGrid) {
    if (!isBaseCharacterAvailable(char.name, unlocked) && char.done === 0) continue;
    if (char.done >= char.total || char.total === 0) continue;

    const best = bestRemainingMark(char.name, unlocked, false);
    if (!best) continue;

    collectToxicMarks(char.marks, char.name, toxicMarks);

    const remaining = char.total - char.done;
    const effort: EffortLevel = char.done === 0 ? "grind" : remaining <= 2 ? "single-run" : "multi-run";
    const detail = char.done === 0
      ? `${char.total} marks to earn — start with ${best.bossName} for ${best.itemName}`
      : remaining <= 4
        ? `${remaining} marks left — next up: ${best.bossName} for ${best.itemName}`
        : `${char.done}/${char.total} done — next up: ${best.bossName} for ${best.itemName}`;

    recs.push(createLaneRecommendation({
      lane: "completion-mark",
      target: char.done === 0
        ? `Start playing as ${char.name} (0/${char.total} marks) -> ${best.bossName}`
        : `${char.name}: ${best.bossName} for ${best.itemName} (${char.done}/${char.total} done)`,
      achievementIds: [best.achievementId],
      blockedBy: [],
      blockerDepth: 0,
      estimatedEffort: effort,
      downstreamValue: remaining,
      whyNow: detail,
      itemQuality: best.quality,
      itemName: best.itemName,
      bossPriority: getBossPriority(best.bossName, false),
      character: char.name,
      boss: best.bossName,
      actionCategory: "mark",
    }, {
      impact: clamp((remaining <= 4 ? 0.45 : 0.25) + Math.min(remaining, 4) * 0.08, 0.25, 1),
      readiness: char.done === 0 ? 0.22 : clamp(0.35 + char.done / char.total * 0.5),
      effort,
      itemQuality: QUALITY_SCORE[best.quality],
      phaseAlignment: phaseAchievements.has(best.achievementId) ? 1 : 0,
      communityMeta: communityMetaValue([best.achievementId], char.done === 0 ? 0.22 : 0.75),
    }));
  }

  for (const char of taintedGrid) {
    if (!isTaintedCharacterAvailable(char.name, unlocked) && char.done === 0) continue;
    if (char.done >= char.total || char.total === 0) continue;

    const best = bestRemainingMark(char.name, unlocked, true);
    if (!best) continue;

    collectToxicMarks(
      char.marks.map((mark) => ({ ...mark, achievementId: mark.achievementId as number | null })),
      char.name,
      toxicMarks,
    );

    const remaining = char.total - char.done;
    const effort: EffortLevel = char.done === 0 ? "grind" : remaining <= 2 ? "single-run" : "multi-run";
    const detail = char.done === 0
      ? `${char.total} tainted marks to earn — start with ${best.bossName} for ${best.itemName}`
      : remaining <= 3
        ? `${remaining} tainted marks left — next up: ${best.bossName} for ${best.itemName}`
        : `${char.done}/${char.total} done — next up: ${best.bossName} for ${best.itemName}`;

    recs.push(createLaneRecommendation({
      lane: "completion-mark",
      target: char.done === 0
        ? `Start playing as ${char.name} (0/${char.total} marks) -> ${best.bossName}`
        : `${char.name}: ${best.bossName} for ${best.itemName} (${char.done}/${char.total} done)`,
      achievementIds: [best.achievementId],
      blockedBy: [],
      blockerDepth: 0,
      estimatedEffort: effort,
      downstreamValue: remaining,
      whyNow: detail,
      itemQuality: best.quality,
      itemName: best.itemName,
      bossPriority: getBossPriority(best.bossName, true),
      character: char.name,
      boss: best.bossName,
      actionCategory: "mark",
    }, {
      impact: clamp((remaining <= 3 ? 0.5 : 0.32) + Math.min(remaining, 3) * 0.1, 0.3, 1),
      readiness: char.done === 0 ? 0.2 : clamp(0.3 + char.done / char.total * 0.55),
      effort,
      itemQuality: QUALITY_SCORE[best.quality],
      phaseAlignment: phaseAchievements.has(best.achievementId) ? 1 : 0,
      communityMeta: communityMetaValue([best.achievementId], char.done === 0 ? 0.2 : 0.7),
    }));
  }

  for (const toxic of toxicMarks.slice(0, 5)) {
    recs.push(createLaneRecommendation({
      lane: "guardrail",
      target: `Pool Warning: ${toxic.itemName}`,
      achievementIds: [],
      blockedBy: [],
      blockerDepth: 0,
      estimatedEffort: "single-run",
      downstreamValue: 0,
      whyNow: `Consider leaving ${toxic.characterName} -> ${toxic.bossName} for later: it unlocks ${toxic.itemName}, which can dilute future item pools.`,
      isToxicWarning: true,
      itemQuality: "toxic",
      itemName: toxic.itemName,
      warningId: slugifyActionPart(toxic.itemName),
      actionCategory: "warning",
    }, {
      impact: 0,
      readiness: 0,
      effort: "single-run",
      itemQuality: QUALITY_SCORE.toxic,
    }));
  }

  return recs;
}

export function evaluateChallenges(
  unlocked: Set<number>,
  challenges: ChallengeInfo[],
  currentPhase: ProgressionPhase = "phase-1-foundations",
  maxAchId: number = TOTAL_ACHIEVEMENTS,
): LaneRecommendation[] {
  const recs: LaneRecommendation[] = [];
  const unlockedRunes = Array.from(CLASSIC_RUNE_ACHIEVEMENTS.values()).filter((id) => unlocked.has(id)).length;

  for (const challenge of challenges.filter((candidate) => !candidate.completed)) {
    const prereq = CHALLENGE_PREREQS.find((candidate) => candidate.challengeId === challenge.id);
    const blockers: BlockingDep[] = [];
    let depth = 0;
    if (prereq) {
      for (const requiredAchievement of prereq.requiredAchievements) {
        if (unlocked.has(requiredAchievement)) continue;
        blockers.push({
          description: getAchievement(requiredAchievement).unlockDescription,
          achievementId: requiredAchievement,
          met: false,
        });
        depth++;
      }
    }

    const achievementId = findChallengeAchievementId(challenge.id, maxAchId);
    const tier = getChallengeTier(challenge.id);
    const baseImpact = tier === "high" ? 0.75 : tier === "medium" ? 0.48 : 0.24;
    const isRuneChallenge = CLASSIC_RUNE_ACHIEVEMENTS.has(challenge.id);
    const reachesSixRunes = isRuneChallenge && unlockedRunes === 5;
    const runeBonus = isRuneChallenge && unlockedRunes < 6 ? (reachesSixRunes ? 0.3 : 0.18) : 0;
    const impact = clamp(baseImpact + runeBonus, 0.15, 1);
    const readiness = depth === 0 ? 0.78 : 0.2;
    const effort: EffortLevel = "single-run";
    const phaseAlignment = isRuneChallenge
      ? phaseAlignmentValue("phase-1-foundations", currentPhase)
      : 0;
    const communityMeta = achievementId != null ? communityMetaValue([achievementId], readiness) : 0;

    let whyNow = depth === 0
      ? (tier === "high" ? "Strong reward, ready to attempt" : "Ready to attempt now")
      : `Blocked by: ${blockers.map((blocker) => blocker.description).join("; ")}`;
    if (isRuneChallenge && unlockedRunes < 6) {
      whyNow += reachesSixRunes
        ? " — completing this gets you to 6 runes, which cleans up the rune pool"
        : ` — ${unlockedRunes}/6 runes unlocked, getting to 6 cleans up the rune pool`;
    }

    recs.push(createLaneRecommendation({
      lane: "challenge",
      target: `Complete #${challenge.id} ${challenge.name}${challenge.reward ? ` — unlocks ${challenge.reward}` : ""}`,
      achievementIds: achievementId != null ? [achievementId] : [],
      blockedBy: blockers,
      blockerDepth: depth,
      estimatedEffort: effort,
      downstreamValue: tier === "high" ? 3 : tier === "medium" ? 2 : 1,
      whyNow,
      challengeId: challenge.id,
      actionCategory: "challenge",
    }, {
      impact,
      readiness,
      effort,
      blockerDepth: depth,
      phaseAlignment,
      communityMeta,
    }));
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
  const donationPhase = currentPhase === "phase-1-foundations"
    ? 1
    : currentPhase === "phase-2-expansion"
      ? 0.3
      : 0;

  const filteredGreed = GREED_DONATION_MILESTONES.filter((milestone) => milestone.achievementId <= maxAchId);
  const nextGreed = filteredGreed.find((milestone) => !unlocked.has(milestone.achievementId));
  if (stats.greedDonationCoins === 0 && unlocked.has(4) && nextGreed) {
    recs.push(createLaneRecommendation({
      lane: "donation",
      target: "Start Greed Mode — rotate characters to build donation machine",
      achievementIds: [nextGreed.achievementId],
      blockedBy: [],
      blockerDepth: 0,
      estimatedEffort: "grind",
      downstreamValue: 6,
      whyNow: "Greed donation is an early progression engine, not cleanup. Starting at 0 coins after beating Mom means you should rotate characters now before jam odds waste future runs.",
      donationMachine: "greed",
      actionCategory: "donation",
    }, {
      impact: 0.95,
      readiness: 0.88,
      effort: "grind",
      phaseAlignment: donationPhase,
      communityMeta: communityMetaValue([nextGreed.achievementId], 0.88, true),
    }));
  }

  for (const milestone of filteredGreed) {
    if (unlocked.has(milestone.achievementId)) continue;
    const readiness = clamp(0.2 + stats.greedDonationCoins / Math.max(milestone.coins, 1) * 0.65, 0.2, 0.9);
    const impact = milestone.strategic ? 0.82 : 0.46;
    recs.push(createLaneRecommendation({
      lane: "donation",
      target: `Greed Donation -> ${milestone.coins} for ${milestone.name}`,
      achievementIds: [milestone.achievementId],
      blockedBy: [],
      blockerDepth: 0,
      estimatedEffort: "grind",
      downstreamValue: milestone.strategic ? 5 : 1,
      whyNow: milestone.strategic
        ? `Key Greed milestone — ${stats.greedDonationCoins}/${milestone.coins} coins`
        : `Greed donation progress — ${stats.greedDonationCoins}/${milestone.coins} coins`,
      donationMachine: "greed",
      actionCategory: "donation",
    }, {
      impact,
      readiness,
      effort: "grind",
      phaseAlignment: donationPhase,
      communityMeta: communityMetaValue([milestone.achievementId], readiness),
    }));
    break;
  }

  const filteredNormal = NORMAL_DONATION_MILESTONES.filter((milestone) => milestone.achievementId <= maxAchId);
  for (const milestone of filteredNormal) {
    if (unlocked.has(milestone.achievementId)) continue;
    const readiness = clamp(0.12 + stats.normalDonationCoins / Math.max(milestone.coins, 1) * 0.5, 0.12, 0.7);
    recs.push(createLaneRecommendation({
      lane: "donation",
      target: `Normal Donation: reach ${milestone.coins} coins for ${milestone.name}`,
      achievementIds: [milestone.achievementId],
      blockedBy: [],
      blockerDepth: 0,
      estimatedEffort: "grind",
      downstreamValue: milestone.strategic ? 2 : 1,
      whyNow: milestone.strategic
        ? `Key donation milestone — ${stats.normalDonationCoins}/${milestone.coins} coins`
        : `Donation progress — ${stats.normalDonationCoins}/${milestone.coins} coins`,
      donationMachine: "normal",
      actionCategory: "donation",
    }, {
      impact: milestone.strategic ? 0.36 : 0.18,
      readiness,
      effort: "grind",
      phaseAlignment: donationPhase,
      communityMeta: communityMetaValue([milestone.achievementId], readiness),
    }));
    break;
  }

  return recs;
}

export function evaluateDailies(
  unlocked: Set<number>,
  currentPhase: ProgressionPhase = "phase-1-foundations",
  maxAchId: number = TOTAL_ACHIEVEMENTS,
): LaneRecommendation[] {
  const recs: LaneRecommendation[] = [];

  for (const daily of DAILY_ACTIONS) {
    if (daily.achievementId > maxAchId || unlocked.has(daily.achievementId)) continue;
    recs.push(createLaneRecommendation({
      lane: "guardrail",
      target: daily.title,
      achievementIds: [daily.achievementId],
      blockedBy: [],
      blockerDepth: 0,
      estimatedEffort: daily.effort,
      downstreamValue: 2,
      whyNow: daily.detail,
      actionCategory: "daily",
    }, {
      impact: daily.impact,
      readiness: daily.readiness,
      effort: daily.effort,
      phaseAlignment: phaseAlignmentValue("phase-1-foundations", currentPhase),
      communityMeta: communityMetaValue([daily.achievementId], daily.readiness, true),
    }));
  }

  return recs;
}

export function evaluateGuardrails(unlocked: Set<number>): LaneRecommendation[] {
  const recs: LaneRecommendation[] = [];
  const unlockedCount = unlocked.size;

  for (const guardrail of GUARDRAILS) {
    if (guardrail.category === "tip" && unlockedCount > 400) continue;
    recs.push(createLaneRecommendation({
      lane: "guardrail",
      target: guardrail.title,
      achievementIds: [],
      blockedBy: [],
      blockerDepth: 0,
      estimatedEffort: "single-run",
      downstreamValue: 0,
      whyNow: guardrail.description,
      warningId: slugifyActionPart(guardrail.title),
      actionCategory: "warning",
    }, {
      impact: 0,
      readiness: 0,
      effort: "single-run",
    }));
  }

  return recs;
}

function categoryFromLane(rec: LaneRecommendation): ActionCategory {
  if (rec.actionCategory) return rec.actionCategory;
  switch (rec.lane) {
    case "progression-gate":
      return "gate";
    case "character-unlock":
      return "unlock";
    case "completion-mark":
      return "mark";
    case "challenge":
      return "challenge";
    case "donation":
      return "donation";
    case "guardrail":
      return rec.isToxicWarning ? "warning" : "warning";
  }
}

export function laneRecommendationToActionItem(rec: LaneRecommendation): ActionItem {
  const category = categoryFromLane(rec);
  let id: string;
  switch (category) {
    case "gate":
      id = `gate:${rec.gateId ?? slugifyActionPart(rec.target)}`;
      break;
    case "unlock":
      id = `unlock:char:${slugifyActionPart(rec.character ?? rec.target.replace(/^Unlock\s+/, ""))}`;
      break;
    case "mark":
      id = `mark:${slugifyActionPart(rec.character ?? "unknown")}:${slugifyActionPart(rec.boss ?? rec.target)}`;
      break;
    case "challenge":
      id = `challenge:${rec.challengeId ?? 0}`;
      break;
    case "donation":
      id = `donation:${rec.donationMachine ?? "normal"}:${rec.achievementIds[0] ?? 0}`;
      break;
    case "daily":
      id = `daily:${rec.achievementIds[0] ?? 0}`;
      break;
    case "warning":
      id = `warning:${rec.warningId ?? slugifyActionPart(rec.itemName ?? rec.target)}`;
      break;
    case "run":
      id = `warning:unexpected-run`;
      break;
  }

  return {
    id,
    tier: "backlog",
    score: rec.score,
    headline: rec.target,
    detail: rec.whyNow,
    category,
    effort: rec.estimatedEffort,
    blocked: rec.blockedBy.length > 0,
    blockedBy: rec.blockedBy.length > 0 ? rec.blockedBy : undefined,
    achievementIds: rec.achievementIds,
    character: rec.character,
    itemQuality: rec.itemQuality,
    itemName: rec.itemName,
    isToxicWarning: rec.isToxicWarning,
    challengeId: rec.challengeId,
    links: rec.links,
    scoreBreakdown: rec.scoreBreakdown,
  };
}

export function laneRecommendationsToActionItems(recs: LaneRecommendation[]): ActionItem[] {
  return recs.map(laneRecommendationToActionItem);
}

export function generateWhyFirst(item: ActionItem, breakdown?: ScoreBreakdown): string {
  if (!breakdown) return "Best overall mix of value and readiness.";

  const reasons: string[] = [];
  if (breakdown.phaseAlignment >= breakdown.baseScore * 0.3) {
    reasons.push("Advances your current phase");
  }

  if (item.category === "gate") {
    const gateMarks = item.detail.match(/unlocks (\d+)\+? new marks/i);
    if (gateMarks) {
      reasons.push(`Opens ${gateMarks[1]}+ new marks`);
    } else if (breakdown.impact >= breakdown.readiness && breakdown.impact >= breakdown.itemQuality) {
      reasons.push("Opens new routes");
    }
  }

  if (reasons.length === 0 && breakdown.readiness >= 18 && breakdown.effort >= -5) {
    reasons.push("Quick win — ready right now");
  }

  if (reasons.length === 0 && breakdown.itemQuality > 8 && item.itemName) {
    reasons.push(`Unlocks ${item.itemName}`);
  }

  if (reasons.length === 0 && breakdown.communityMeta >= 3) {
    reasons.push("Widely valued account unlock");
  }

  if (reasons.length === 0 && breakdown.impact > 0) {
    reasons.push("Best overall value");
  }

  return reasons.slice(0, 2).join(" + ") + ".";
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

  return [
    ...evaluateProgressionGates(unlocked, stats, maxAchId, currentPhase, bossKillMilestones),
    ...evaluateCharacterUnlocks(unlocked, maxAchId, currentPhase, stats),
    ...evaluateCompletionMarks(unlocked, baseGrid, taintedGrid, currentPhase),
    ...evaluateChallenges(unlocked, challenges, currentPhase, maxAchId),
    ...evaluateDonation(unlocked, stats, maxAchId, currentPhase),
    ...evaluateDailies(unlocked, currentPhase, maxAchId),
    ...evaluateGuardrails(unlocked),
  ].sort(compareLaneRecommendations);
}
