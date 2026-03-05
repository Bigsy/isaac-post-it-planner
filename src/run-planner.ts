import type {
  CharacterProgress,
  CounterStats,
  PhaseProgress,
  RunGoal,
  RunPlan,
  TaintedCharacterProgress,
} from "./types";
import type { DlcLevel } from "./data/dlc";
import type { ProgressionGate } from "./data/progression";
import { PHASE_DEFINITIONS } from "./data/phases";
import { getAchievement } from "./data/achievements";
import { getItemValue, QUALITY_SCORE, type ItemQuality } from "./data/item-values";
import { PROGRESSION_GATES, isGateCleared, SYSTEM_UNLOCK_MARKS } from "./data/progression";
import { GATE_ROUTE_ALIGNMENT, ROUTES, TAINTED_BUNDLE_BOSSES, type RouteDef } from "./data/run-paths";

const GATE_BONUS = 0.3;
const PHASE_BONUS = 0.2;
const TIMED_PENALTY = -0.15;
const BUNDLED_PENALTY = -0.1;
const EPSILON = 1e-9;

interface ScoredRoutePlan {
  route: RouteDef;
  goals: RunGoal[];
  primaryGoal: RunGoal;
  scoreBreakdown: RunPlan["scoreBreakdown"];
  score: number;
  isPhaseAligned: boolean;
}

function getPhaseCriterionIds(phaseProgress: PhaseProgress): Set<number> {
  const ids = new Set<number>();
  const phase = PHASE_DEFINITIONS.find((p) => p.id === phaseProgress.currentPhase);
  if (!phase) return ids;
  for (const criterion of phase.completionCriteria) {
    if (criterion.achievementId != null) {
      ids.add(criterion.achievementId);
    }
  }
  return ids;
}

function resolveItemInfo(achievementId: number): { itemName: string; itemQuality: ItemQuality } {
  const item = getItemValue(achievementId);
  if (item) {
    return { itemName: item.itemName, itemQuality: item.quality };
  }
  return { itemName: getAchievement(achievementId).name, itemQuality: "b-tier" };
}

function compareMarkGoalQuality(a: RunGoal, b: RunGoal): number {
  const qualityA = a.itemQuality ? QUALITY_SCORE[a.itemQuality] : 0;
  const qualityB = b.itemQuality ? QUALITY_SCORE[b.itemQuality] : 0;
  if (qualityB !== qualityA) return qualityB - qualityA;
  if ((a.isBundled ?? false) !== (b.isBundled ?? false)) return a.isBundled ? 1 : -1;
  return a.boss.localeCompare(b.boss);
}

function buildGateGoals(
  routeId: string,
  gatesById: Map<string, ProgressionGate>,
  unclearedGates: Set<string>,
): RunGoal[] {
  const goals: RunGoal[] = [];
  for (const [gateId, routeIds] of Object.entries(GATE_ROUTE_ALIGNMENT)) {
    if (!unclearedGates.has(gateId)) continue;
    if (!routeIds.includes(routeId)) continue;
    const gate = gatesById.get(gateId);
    if (!gate) continue;
    goals.push({
      type: "gate-progress",
      boss: gate.name,
      description: `Works toward: ${gate.description}`,
      achievementId: gate.achievementIds[0],
    });
  }
  return goals;
}

function buildPhaseGoals(goals: RunGoal[], phaseAchievementIds: Set<number>): RunGoal[] {
  const phaseGoalIds = new Set<number>();
  for (const goal of goals) {
    if (goal.achievementId == null) continue;
    if (phaseAchievementIds.has(goal.achievementId)) {
      phaseGoalIds.add(goal.achievementId);
    }
  }
  return Array.from(phaseGoalIds).map((achievementId) => ({
    type: "phase-criterion",
    boss: "Phase",
    achievementId,
    description: `Phase criterion: ${getAchievement(achievementId).name}`,
  }));
}

function evaluateRouteForBaseCharacter(
  character: CharacterProgress,
  route: RouteDef,
  phaseAchievementIds: Set<number>,
  gateGoals: RunGoal[],
): ScoredRoutePlan | null {
  const markGoals: RunGoal[] = [];

  for (const mark of character.marks) {
    if (mark.done || mark.achievementId == null) continue;
    if (!route.bosses.includes(mark.boss)) continue;
    const { itemName, itemQuality } = resolveItemInfo(mark.achievementId);
    markGoals.push({
      type: "completion-mark",
      boss: mark.boss,
      achievementId: mark.achievementId,
      itemName,
      itemQuality,
      description: `${mark.boss} mark -> ${itemName}`,
    });
  }

  return scoreRoutePlan(route, markGoals, gateGoals, phaseAchievementIds);
}

function evaluateRouteForTaintedCharacter(
  character: TaintedCharacterProgress,
  route: RouteDef,
  phaseAchievementIds: Set<number>,
  gateGoals: RunGoal[],
  maxAchId: number,
): ScoredRoutePlan | null {
  const markGoals: RunGoal[] = [];

  for (const mark of character.marks) {
    if (mark.done || mark.achievementId > maxAchId) continue;
    const bundleBosses = TAINTED_BUNDLE_BOSSES[mark.boss];
    if (bundleBosses) {
      if (!bundleBosses.some((b) => route.bosses.includes(b))) continue;
      const { itemName, itemQuality } = resolveItemInfo(mark.achievementId);
      markGoals.push({
        type: "completion-mark",
        boss: mark.boss,
        achievementId: mark.achievementId,
        itemName,
        itemQuality,
        description: `Works toward ${mark.boss} mark`,
        isBundled: true,
      });
      continue;
    }

    if (!route.bosses.includes(mark.boss)) continue;
    const { itemName, itemQuality } = resolveItemInfo(mark.achievementId);
    markGoals.push({
      type: "completion-mark",
      boss: mark.boss,
      achievementId: mark.achievementId,
      itemName,
      itemQuality,
      description: `${mark.boss} mark -> ${itemName}`,
    });
  }

  return scoreRoutePlan(route, markGoals, gateGoals, phaseAchievementIds);
}

function scoreRoutePlan(
  route: RouteDef,
  markGoals: RunGoal[],
  gateGoals: RunGoal[],
  phaseAchievementIds: Set<number>,
): ScoredRoutePlan | null {
  if (markGoals.length === 0) return null;

  const sortedMarks = [...markGoals].sort(compareMarkGoalQuality);
  const primaryGoal = sortedMarks[0];
  const bundledCount = sortedMarks.filter((g) => g.isBundled).length;
  const markScore = sortedMarks.reduce((sum, goal) => {
    if (!goal.itemQuality) return sum;
    return sum + QUALITY_SCORE[goal.itemQuality];
  }, 0);
  const gateBonus = gateGoals.reduce((sum, goal) => {
    const gate = goal.achievementId != null
      ? PROGRESSION_GATES.find(g => g.achievementIds[0] === goal.achievementId)
      : undefined;
    const systemMarks = gate ? (SYSTEM_UNLOCK_MARKS[gate.id] ?? 0) : 0;
    return sum + GATE_BONUS + (systemMarks > 0 ? Math.min(systemMarks / 50, 1) * 0.5 : 0);
  }, 0);
  const hasPhaseAlignedMark = sortedMarks.some(
    (goal) => goal.achievementId != null && phaseAchievementIds.has(goal.achievementId),
  );
  const hasPhaseAlignedGate = gateGoals.some(
    (goal) => goal.achievementId != null && phaseAchievementIds.has(goal.achievementId),
  );
  const hasPhaseAlignedGoal = hasPhaseAlignedMark || hasPhaseAlignedGate;
  const phaseBonus = hasPhaseAlignedGoal ? PHASE_BONUS : 0;
  const timedPenalty = route.timed ? TIMED_PENALTY : 0;
  const bundledPenalty = bundledCount * BUNDLED_PENALTY;
  const score = markScore + gateBonus + phaseBonus + timedPenalty + bundledPenalty;

  const phaseGoals = buildPhaseGoals([...sortedMarks, ...gateGoals], phaseAchievementIds);
  const goals = [
    primaryGoal,
    ...sortedMarks.filter((goal) => goal !== primaryGoal),
    ...phaseGoals,
    ...gateGoals,
  ];

  // Only keep plans that combine at least two concrete goals.
  const goalCountForFilter = sortedMarks.length + gateGoals.length;
  if (goalCountForFilter < 2) return null;

  return {
    route,
    goals,
    primaryGoal,
    scoreBreakdown: {
      markScore,
      gateBonus,
      phaseBonus,
      timedPenalty,
      bundledPenalty,
    },
    score,
    isPhaseAligned: hasPhaseAlignedGoal,
  };
}

function buildWhyThisRun(markGoals: RunGoal[], gateGoals: RunGoal[], isPhaseAligned: boolean): string {
  const parts: string[] = [];
  parts.push(`${markGoals.length} mark${markGoals.length === 1 ? "" : "s"}`);
  if (gateGoals.length > 0) {
    const gateTargets = gateGoals.map((goal) => goal.boss).join(", ");
    parts.push(`works toward ${gateTargets}`);
  }
  if (isPhaseAligned) {
    parts.push("phase-aligned");
  }
  return parts.join(" + ");
}

function isBetterCharacterPlan(candidate: ScoredRoutePlan, current: ScoredRoutePlan): boolean {
  if (candidate.score > current.score + EPSILON) return true;
  if (candidate.score + EPSILON < current.score) return false;
  if (candidate.isPhaseAligned !== current.isPhaseAligned) {
    return candidate.isPhaseAligned;
  }
  return candidate.route.id < current.route.id;
}

function sortPlans(a: RunPlan, b: RunPlan): number {
  if (b.score !== a.score) return b.score - a.score;
  const alignedA = a.goals.some((goal) => goal.type === "phase-criterion");
  const alignedB = b.goals.some((goal) => goal.type === "phase-criterion");
  if (alignedA !== alignedB) return alignedA ? -1 : 1;
  if (a.character !== b.character) return a.character.localeCompare(b.character);
  return a.routeId.localeCompare(b.routeId);
}

export function buildRunPlans(
  baseGrid: CharacterProgress[],
  taintedGrid: TaintedCharacterProgress[],
  unlocked: Set<number>,
  unlockedCharacters: Set<string>,
  phaseProgress: PhaseProgress,
  gates: ProgressionGate[],
  stats: CounterStats,
  _dlcLevel: DlcLevel,
  maxAchId: number,
): RunPlan[] {
  const phaseAchievementIds = getPhaseCriterionIds(phaseProgress);
  const clearedGates = new Set<string>();
  for (const gate of gates) {
    if (isGateCleared(gate, unlocked, stats)) {
      clearedGates.add(gate.id);
    }
  }
  const unclearedGates = new Set(gates.map((g) => g.id).filter((id) => !clearedGates.has(id)));
  const gatesById = new Map(gates.map((g) => [g.id, g]));

  const accessibleRoutes = ROUTES.filter(
    (route) => route.requiredGates.every((gateId) => clearedGates.has(gateId)),
  );
  const plans: RunPlan[] = [];

  for (const character of baseGrid) {
    if (!unlockedCharacters.has(character.name)) continue;
    if (character.done >= character.total) continue;

    let bestPlan: ScoredRoutePlan | null = null;
    for (const route of accessibleRoutes) {
      const gateGoals = buildGateGoals(route.id, gatesById, unclearedGates);
      const evaluated = evaluateRouteForBaseCharacter(character, route, phaseAchievementIds, gateGoals);
      if (!evaluated) continue;
      if (!bestPlan || isBetterCharacterPlan(evaluated, bestPlan)) {
        bestPlan = evaluated;
      }
    }

    if (!bestPlan) continue;
    const markGoals = bestPlan.goals.filter((goal) => goal.type === "completion-mark");
    const gateGoals = bestPlan.goals.filter((goal) => goal.type === "gate-progress");
    plans.push({
      character: character.name,
      isTainted: false,
      route: bestPlan.route.name,
      routeId: bestPlan.route.id,
      routeWikiPath: bestPlan.route.wikiPath,
      whyThisRun: buildWhyThisRun(markGoals, gateGoals, bestPlan.isPhaseAligned),
      goals: bestPlan.goals,
      primaryGoal: bestPlan.primaryGoal,
      scoreBreakdown: bestPlan.scoreBreakdown,
      score: bestPlan.score,
      phase: phaseProgress.currentPhase,
      timed: bestPlan.route.timed,
      greedMode: bestPlan.route.greedMode,
    });
  }

  for (const character of taintedGrid) {
    if (!unlockedCharacters.has(character.name)) continue;
    if (character.done >= character.total) continue;

    let bestPlan: ScoredRoutePlan | null = null;
    for (const route of accessibleRoutes) {
      const gateGoals = buildGateGoals(route.id, gatesById, unclearedGates);
      const evaluated = evaluateRouteForTaintedCharacter(
        character,
        route,
        phaseAchievementIds,
        gateGoals,
        maxAchId,
      );
      if (!evaluated) continue;
      if (!bestPlan || isBetterCharacterPlan(evaluated, bestPlan)) {
        bestPlan = evaluated;
      }
    }

    if (!bestPlan) continue;
    const markGoals = bestPlan.goals.filter((goal) => goal.type === "completion-mark");
    const gateGoals = bestPlan.goals.filter((goal) => goal.type === "gate-progress");
    plans.push({
      character: character.name,
      isTainted: true,
      route: bestPlan.route.name,
      routeId: bestPlan.route.id,
      routeWikiPath: bestPlan.route.wikiPath,
      whyThisRun: buildWhyThisRun(markGoals, gateGoals, bestPlan.isPhaseAligned),
      goals: bestPlan.goals,
      primaryGoal: bestPlan.primaryGoal,
      scoreBreakdown: bestPlan.scoreBreakdown,
      score: bestPlan.score,
      phase: phaseProgress.currentPhase,
      timed: bestPlan.route.timed,
      greedMode: bestPlan.route.greedMode,
    });
  }

  return plans.sort(sortPlans).slice(0, 5);
}
