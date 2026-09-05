import type {
  ActionItem,
  CharacterProgress,
  CounterStats,
  MissingPowerTarget,
  PlannerPreferences,
  TaintedCharacterProgress,
} from "./types";
import type { DlcLevel } from "./data/dlc";
import { getAchievement } from "./data/achievements";
import { UNLOCK_VALUES, unlockValue } from "./data/unlock-values";
import { ROUTES, TAINTED_BUNDLE_BOSSES } from "./data/run-paths";
import {
  BASE_CHARACTER_UNLOCKS,
  TAINTED_CHARACTER_UNLOCKS,
} from "./data/characters";
import { PROGRESSION_GATES, isGateCleared } from "./data/progression";
import { routeRequirements } from "./run-planner";
import { compareScoredActions, preferenceExcludes } from "./planner-scoring";

export function missingPowerTargets(
  unlocked: Set<number>,
  maxId: number,
  dlc: DlcLevel,
  stats: CounterStats,
  grid: (CharacterProgress | TaintedCharacterProgress)[],
  available: Set<string>,
  actions: ActionItem[],
  preferences: PlannerPreferences,
): MissingPowerTarget[] {
  return UNLOCK_VALUES.filter(
    (v) => v.achievementId <= maxId && !unlocked.has(v.achievementId),
  )
    .map((entry) => {
      const value = unlockValue(entry.achievementId, dlc);
      const achievement = getAchievement(value.achievementId);
      const candidates = actions
        .filter((a) => a.completedAchievementIds?.includes(value.achievementId))
        .sort(compareScoredActions);
      const playable = candidates.find(
        (a) => !a.blocked && !preferenceExcludes(a, preferences),
      );
      const progress = actions
        .filter((a) => a.progressAchievementIds?.includes(value.achievementId))
        .sort(compareScoredActions);
      const owner = grid.find((c) =>
        c.marks.some((m) => m.achievementId === value.achievementId),
      );
      const mark = owner?.marks.find(
        (m) => m.achievementId === value.achievementId,
      );
      let requirements: string[] = [];
      let nextAction = playable;
      let status: MissingPowerTarget["status"] = playable
        ? "Available now"
        : "Needs setup";
      if (owner && !available.has(owner.name)) {
        const unlock = Object.entries({
          ...BASE_CHARACTER_UNLOCKS,
          ...TAINTED_CHARACTER_UNLOCKS,
        }).find(
          ([, name]) =>
            name === owner.name ||
            (name === "Jacob & Esau" && owner.name === "Jacob"),
        );
        requirements.push(
          unlock
            ? `Unlock ${owner.name}: ${getAchievement(Number(unlock[0])).unlockDescription}`
            : `Unlock ${owner.name}`,
        );
      }
      if (mark) {
        const routes = ROUTES.filter((r) =>
          (TAINTED_BUNDLE_BOSSES[mark.boss] ?? [mark.boss]).some((b) =>
            r.bosses.includes(b),
          ),
        );
        const paths = routes
          .map((r) => routeRequirements(r, unlocked, stats, dlc))
          .sort(
            (a, b) => a.length - b.length || a.join().localeCompare(b.join()),
          );
        requirements.push(...(paths[0] ?? []));
        if (TAINTED_BUNDLE_BOSSES[mark.boss]) {
          status = "Long-term";
          requirements.push(
            "Complete every boss in this bundle; constituent progress is not readable from this save.",
          );
        }
      }
      if ([156, 547, 636].includes(value.achievementId)) {
        status = "Long-term";
        requirements = [
          value.achievementId === 156
            ? "Earn every required Hard-mode mark as The Lost for your DLC. Normal-mode boss achievements do not prove hard-mode completion."
            : achievement.unlockDescription +
              ". Hard-mode constituent progress is not readable.",
        ];
        nextAction = actions
          .filter(
            (a) =>
              a.category === "run" &&
              a.route !== "Greed Mode" &&
              (value.achievementId !== 156 || a.character === "The Lost") &&
              (value.achievementId !== 547 || !a.character?.startsWith("T.")) &&
              !a.blocked &&
              !a.excluded,
          )
          .sort(compareScoredActions)[0];
      }
      if (value.achievementId === 250) {
        status = "Long-term";
        requirements = [
          `Donate up to 879 total Greed coins (${stats.greedDonationCoins}/879 recorded); repeat runs and rotate characters.`,
        ];
      }
      if (!playable && !requirements.length)
        requirements =
          candidates[0]?.blockedBy
            ?.filter((b) => !b.met)
            .map((b) => b.description) ?? [];
      if (!playable && !requirements.length)
        requirements = [achievement.unlockDescription];
      if (
        !playable &&
        candidates.some((a) => !a.blocked && preferenceExcludes(a, preferences))
      )
        status = "Excluded by your preferences";
      if (owner && preferences.avoidedCharacters.includes(owner.name))
        status = "Excluded by your preferences";
      if (
        value.achievementId === 156 &&
        preferences.avoidedCharacters.includes("The Lost")
      )
        status = "Excluded by your preferences";
      if (
        [547, 636].includes(value.achievementId) &&
        [...available].every((c) => preferences.avoidedCharacters.includes(c))
      )
        status = "Excluded by your preferences";
      if (!nextAction && owner && !available.has(owner.name)) {
        nextAction = actions.find(
          (a) =>
            a.id ===
              `unlock:char:${owner.name
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/^-|-$/g, "")}` &&
            !a.blocked &&
            !preferenceExcludes(a, preferences),
        );
      }
      if (!nextAction)
        nextAction = progress.find(
          (a) => !a.blocked && !preferenceExcludes(a, preferences),
        );
      if (!nextAction) {
        // Walk from the missing route requirement back to the next playable mechanical gate.
        const findGateAction = (
          gateId: string,
          seen = new Set<string>(),
        ): ActionItem | undefined => {
          if (seen.has(gateId)) return undefined;
          seen.add(gateId);
          const gate = PROGRESSION_GATES.find((g) => g.id === gateId);
          if (!gate || isGateCleared(gate, unlocked, stats)) return undefined;
          for (const parent of gate.blockedBy) {
            const step = findGateAction(parent, seen);
            if (step) return step;
          }
          return actions
            .filter(
              (a) =>
                !a.blocked &&
                !preferenceExcludes(a, preferences) &&
                (a.id === `gate:${gate.id}` ||
                  a.progressAchievementIds?.some((id) =>
                    gate.achievementIds.includes(id),
                  )),
            )
            .sort(compareScoredActions)[0];
        };
        const systemGate = PROGRESSION_GATES.find((g) =>
          g.achievementIds.includes(value.achievementId),
        );
        if (systemGate) nextAction = findGateAction(systemGate.id);
        const route = mark
          ? ROUTES.find((r) => r.bosses.includes(mark.boss))
          : value.achievementId === 415
            ? ROUTES.find((r) => r.id === "home")
            : undefined;
        for (const gate of route?.requiredGates ?? []) {
          nextAction = findGateAction(gate);
          if (nextAction) break;
        }
      }
      return {
        achievementId: value.achievementId,
        name: value.name,
        benefit: value.benefit,
        powerValue: value.powerValue,
        method: achievement.unlockDescription,
        status,
        requirements: playable ? [] : requirements,
        nextStep: nextAction
          ? nextAction.headline
          : (requirements[0] ?? achievement.unlockDescription),
        actionId: nextAction?.id,
        sourceUrls: value.sourceUrls,
      };
    })
    .sort(
      (a, b) =>
        b.powerValue - a.powerValue || a.achievementId - b.achievementId,
    );
}
