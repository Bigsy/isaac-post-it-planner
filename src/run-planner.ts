import type {
  ActionItem,
  CharacterProgress,
  CounterStats,
  PhaseProgress,
  RunGoal,
  RunPlan,
  TaintedCharacterProgress,
} from "./types";
import type { DlcLevel } from "./data/dlc";
import { getAchievement } from "./data/achievements";
import { getItemValue } from "./data/item-values";
import { unlockValue } from "./data/unlock-values";
import {
  PROGRESSION_GATES,
  isGateCleared,
  type ProgressionGate,
} from "./data/progression";
import {
  ROUTES,
  GATE_ROUTE_ALIGNMENT,
  TAINTED_BUNDLE_BOSSES,
  type RouteDef,
} from "./data/run-paths";
import { scoreAction } from "./planner-scoring";

export function routeRequirements(
  route: RouteDef,
  unlocked: Set<number>,
  stats: CounterStats,
  dlc: DlcLevel,
): string[] {
  const requirements: string[] = [];
  if (route.greedMode && dlc === "rebirth")
    requirements.push("Requires Afterbirth");
  if (
    route.id === "greedier" &&
    (dlc === "rebirth" || dlc === "afterbirth" || !unlocked.has(341))
  )
    requirements.push("Donate 500 coins to unlock Greedier");
  if (["corpse", "home"].includes(route.id) && dlc !== "repentance")
    requirements.push("Requires Repentance");
  if (route.id === "void" && (dlc === "rebirth" || dlc === "afterbirth"))
    requirements.push("Requires Afterbirth+");
  if (route.id === "home" && !unlocked.has(57) && !unlocked.has(78))
    requirements.push("Unlock the Polaroid or Negative for the Strange Door");
  if (route.id === "blue-womb" && dlc === "rebirth")
    requirements.push("Requires Afterbirth");
  for (const id of route.requiredGates) {
    const gate = PROGRESSION_GATES.find((g) => g.id === id);
    if (gate && !isGateCleared(gate, unlocked, stats))
      requirements.push(gate.description);
  }
  return requirements;
}
export function routeBurden(
  routeId: string,
  character: string,
  unlocked: Set<number> = new Set(),
): number {
  const route =
    (
      {
        womb: 4,
        "boss-rush": 9,
        cathedral: 6,
        sheol: 6,
        chest: 9,
        "dark-room": 9,
        "blue-womb": 13,
        home: 11,
        corpse: 15,
        void: 21,
        greed: 7,
        greedier: 15,
        "mega-satan-dr": 18,
        "mega-satan-ch": 18,
      } as Record<string, number>
    )[routeId] ?? 10;
  const char =
    character === "Jacob" || character === "T.Jacob"
      ? 6
      : character === "T.Lost"
        ? 9
        : character === "The Lost"
          ? unlocked.has(250)
            ? 3
            : 9
          : character === "Keeper"
            ? unlocked.has(236)
              ? 3
              : 6
            : character === "T.Lazarus"
              ? 6
              : 0;
  return Math.min(25, route + char);
}
export function routeInstructions(
  route: RouteDef,
  unlocked: Set<number>,
): string {
  let text = route.greedMode
    ? route.id === "greedier"
      ? "Play Greedier mode. "
      : "Play Greed mode. "
    : "Play on Hard for completion credit. ";
  text += `Route: ${route.name}. `;
  if (route.id.startsWith("mega-satan"))
    text +=
      "Collect both Angel Room Key Pieces or another door opener in this run; access is conditional. ";
  if (
    ["sheol", "cathedral", "chest", "dark-room"].includes(route.id) &&
    !unlocked.has(34)
  )
    text +=
      "Before It Lives, the post-heart path requires a Devil/Angel Room opening; access is conditional. ";
  if (route.id === "corpse")
    text +=
      "Collect both Knife Pieces, open the flesh door and continue to Corpse II. ";
  if (route.id === "home")
    text +=
      "Take the Polaroid or Negative after Mom, use The Fool to return to the Strange Door, take Dad’s Note, ascend to Home, then defeat Dogma and Beast. ";
  return text + (route.timedDescription ?? "");
}
export function buildRunPlans(
  baseGrid: CharacterProgress[],
  taintedGrid: TaintedCharacterProgress[],
  unlocked: Set<number>,
  available: Set<string>,
  phase: PhaseProgress,
  gates: ProgressionGate[],
  stats: CounterStats,
  dlc: DlcLevel,
  maxId: number,
): RunPlan[] {
  const plans: RunPlan[] = [];
  for (const character of [...baseGrid, ...taintedGrid]) {
    if (!available.has(character.name)) continue;
    const tainted = character.name.startsWith("T.");
    for (const route of ROUTES) {
      if (routeRequirements(route, unlocked, stats, dlc).length) continue;
      const goals: RunGoal[] = [];
      for (const mark of character.marks) {
        if (
          mark.done ||
          mark.achievementId == null ||
          mark.achievementId > maxId
        )
          continue;
        const bundle = tainted ? TAINTED_BUNDLE_BOSSES[mark.boss] : undefined;
        if (!(bundle ?? [mark.boss]).some((b) => route.bosses.includes(b)))
          continue;
        goals.push({
          type: "completion-mark",
          boss: mark.boss,
          achievementId: mark.achievementId,
          itemName: getAchievement(mark.achievementId).name,
          itemQuality:
            getItemValue(mark.achievementId)?.quality ?? "unreviewed",
          isBundled: !!bundle,
          description: bundle
            ? `Works toward ${mark.boss}; constituent progress is not readable.`
            : getAchievement(mark.achievementId).unlockDescription,
        });
      }
      for (const gate of gates) {
        if (
          gate.achievementIds.some((id) => id > maxId) ||
          isGateCleared(gate, unlocked, stats) ||
          !GATE_ROUTE_ALIGNMENT[gate.id]?.includes(route.id)
        )
          continue;
        goals.push({
          type: "gate-progress",
          boss: gate.name,
          achievementId: gate.achievementIds[0],
          description: `Works toward: ${gate.description}; repeat until the requirement is met.`,
        });
      }
      // Single-win mechanical gates can be earned now; repeated kill gates remain progress.
      if (route.id === "corpse" && !unlocked.has(635))
        goals.push({
          type: "completion-mark",
          boss: "Mother",
          achievementId: 635,
          itemName: "A Strange Door",
          description: "Defeat Mother to open Home.",
        });
      if (!goals.length) continue;
      goals.sort(
        (a, b) =>
          Number(a.isBundled ?? a.type !== "completion-mark") -
            Number(b.isBundled ?? b.type !== "completion-mark") ||
          unlockValue(b.achievementId ?? 0).powerValue -
            unlockValue(a.achievementId ?? 0).powerValue ||
          (a.achievementId ?? 0) - (b.achievementId ?? 0),
      );
      plans.push({
        character: character.name,
        isTainted: tainted,
        route: route.name,
        routeId: route.id,
        routeWikiPath: route.wikiPath,
        whyThisRun: routeInstructions(route, unlocked),
        timedDescription: route.timedDescription,
        goals,
        primaryGoal: goals[0],
        scoreBreakdown: {
          markScore: 0,
          gateBonus: 0,
          phaseBonus: 0,
          timedPenalty: 0,
          bundledPenalty: 0,
        },
        score: 0,
        phase: phase.currentPhase,
        timed: route.timed,
        greedMode: route.greedMode,
      });
    }
  }
  // No candidate selection here: all routes reach the shared final scorer.
  return plans;
}
export function toActionItems(
  plans: RunPlan[],
  unlocked: Set<number> = new Set(),
): ActionItem[] {
  return plans.map((p) =>
    scoreAction({
      id: `run:${p.character
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")}:${p.routeId}`,
      tier: "backlog",
      score: 0,
      headline: `${p.character} → ${p.route}`,
      detail: p.whyThisRun,
      category: "run",
      effort: "single-run",
      blocked: false,
      achievementIds: [
        ...new Set(
          p.goals.flatMap((g) =>
            g.achievementId == null ? [] : [g.achievementId],
          ),
        ),
      ],
      completedAchievementIds: p.goals
        .filter((g) => g.type === "completion-mark" && !g.isBundled)
        .map((g) => g.achievementId!),
      progressAchievementIds: p.goals
        .filter((g) => g.type === "gate-progress" || g.isBundled)
        .map((g) => g.achievementId!),
      character: p.character,
      route: p.route,
      routeWikiPath: p.routeWikiPath,
      timed: p.timed,
      timedDescription: p.timedDescription,
      goals: p.goals,
      burden: routeBurden(p.routeId, p.character, unlocked),
    }),
  );
}
