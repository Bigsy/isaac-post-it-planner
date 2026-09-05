import type { ActionItem, PlannerPreferences } from "./types";
import { unlockValue } from "./data/unlock-values";
import { getItemValue } from "./data/item-values";
import type { DlcLevel } from "./data/dlc";

export const DEFAULT_PREFERENCES: PlannerPreferences = {
  objective: "power",
  avoidedCharacters: [],
  noTimedRuns: false,
};
export function preferenceExcludes(
  a: ActionItem,
  p: PlannerPreferences,
): boolean {
  return !!(
    (p.noTimedRuns && a.timed) ||
    (a.character && p.avoidedCharacters.includes(a.character))
  );
}
export function compareScoredActions(a: ActionItem, b: ActionItem): number {
  return (
    Number(a.blocked) - Number(b.blocked) ||
    b.score - a.score ||
    (a.burden ?? 0) - (b.burden ?? 0) ||
    a.id.localeCompare(b.id)
  );
}
export function scoreAction(
  action: ActionItem,
  preferences = DEFAULT_PREFERENCES,
  dlc?: DlcLevel,
): ActionItem {
  const a = { ...action };
  a.originalHeadline ??= a.headline;
  a.originalDetail ??= a.detail;
  a.headline = a.originalHeadline;
  a.detail = a.originalDetail;
  const complete = [
    ...new Set(
      a.completedAchievementIds ??
        (a.category === "challenge" || a.category === "unlock"
          ? a.achievementIds
          : []),
    ),
  ];
  const progress = [
    ...new Set(
      a.progressAchievementIds ??
        (a.category === "gate" || a.category === "donation"
          ? a.achievementIds
          : []),
    ),
  ].filter((id) => !complete.includes(id));
  const rewards = complete
    .map((id) => unlockValue(id, dlc))
    .sort(
      (a, b) =>
        b.powerValue - a.powerValue || a.achievementId - b.achievementId,
    );
  const primary = rewards[0];
  const primaryBenefit =
    (primary?.powerValue ?? 0) * (preferences.objective === "power" ? 60 : 24);
  const additionalBenefit = Math.min(
    10,
    rewards
      .slice(1)
      .reduce((sum, r, i) => sum + (r.powerValue * 6) / (i + 1), 0),
  );
  const setupBenefit = Math.min(
    20,
    Math.max(
      a.setupTarget ? (a.setupValue ?? 18) : 0,
      ...progress.map((id) => unlockValue(id, dlc).powerValue * 20),
    ),
  );
  // Co-op rewards are completion only, including the small incidental-mark term.
  const usefulMarks = (a.goals ?? []).filter(
    (g) =>
      g.type === "completion-mark" &&
      !g.isBundled &&
      g.achievementId != null &&
      (preferences.objective === "completion" ||
        unlockValue(g.achievementId).rewardKind !== "co-op-baby"),
  );
  const completionBenefit =
    preferences.objective === "completion"
      ? Math.min(45, complete.length * 10 + progress.length * 3)
      : Math.min(
          5,
          Math.max(
            0,
            new Set(usefulMarks.map((g) => g.achievementId)).size - 1,
          ),
        );
  const burden =
    a.burden ?? (a.effort === "grind" ? 25 : a.effort === "multi-run" ? 16 : 7);
  const baseScore = Math.max(
    0,
    primaryBenefit +
      additionalBenefit +
      setupBenefit +
      completionBenefit -
      burden,
  );
  a.score = a.blocked ? 0 : baseScore;
  a.burden = burden;
  a.completedAchievementIds = complete;
  a.progressAchievementIds = progress;
  a.primaryAchievementId = primary?.achievementId;
  a.excluded = preferenceExcludes(a, preferences);
  a.scoreBreakdown = {
    primaryBenefit,
    additionalBenefit,
    setupBenefit,
    completionBenefit,
    burden,
    impact: primaryBenefit,
    readiness: setupBenefit,
    effort: -burden,
    itemQuality: additionalBenefit,
    phaseAlignment: 0,
    communityMeta: 0,
    blockerDecay: a.blocked ? 0 : 1,
    diversityPenalty: 0,
    baseScore,
    finalScore: a.score,
  };
  if (primary && (a.category === "run" || a.category === "challenge")) {
    a.itemName = primary.name;
    a.itemQuality =
      primary.confidence === "reviewed"
        ? getItemValue(primary.achievementId)?.quality
        : "unreviewed";
    const instruction =
      a.category === "run"
        ? `beat ${a.goals?.find((g) => g.achievementId === primary.achievementId)?.boss ?? a.route} as ${a.character}`
        : a.headline.replace(/ — unlocks .*/, "");
    a.headline = `Unlock ${primary.name} — ${instruction}`;
    a.detail = `${primary.benefit} ${a.detail}`;
    if (a.goals)
      a.goals = [...a.goals].sort(
        (x, y) =>
          Number(y.achievementId === primary.achievementId) -
          Number(x.achievementId === primary.achievementId),
      );
  } else if (a.category === "run" && progress.length) {
    const best = progress
      .map((id) => unlockValue(id, dlc))
      .sort((a, b) => b.powerValue - a.powerValue)[0];
    a.headline = `Work toward ${best.name} — ${a.character} → ${a.route}`;
  }
  if (a.setupTarget) {
    if ((primary?.powerValue ?? 0) < 0.5)
      a.headline = `Work toward ${a.setupTarget} — ${a.originalHeadline.replace(/^Work toward .*? — /, "")}`;
    a.detail += ` This advances ${a.setupTarget}; further requirements remain.`;
  }
  return a;
}
