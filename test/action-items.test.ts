import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { parseSaveFile } from "../src/parser";
import {
  analyze,
  analyzeChallenges,
  analyzeCompletionMarks,
  analyzeTaintedCompletionMarks,
  assignTiers,
  compareActionItems,
  deduplicateActionItems,
  evaluateChallenges,
  evaluateCompletionMarks,
  evaluateProgressionGates,
} from "../src/analyzer";
import { evaluateDailies, laneRecommendationToActionItem } from "../src/recommender";
import { toActionItems } from "../src/run-planner";
import type { ActionItem, CounterStats, LaneRecommendation, RunPlan } from "../src/types";

const SAMPLE_DIR = join(__dirname, "..", "sample-saves");

function loadAndAnalyze(filename: string) {
  const buf = readFileSync(join(SAMPLE_DIR, filename));
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  return analyze(parseSaveFile(ab));
}

function emptyCounters(): CounterStats {
  return {
    momKills: 0,
    deaths: 0,
    momsHeartKills: 0,
    rocksDestroyed: 0,
    tintedRocksDestroyed: 0,
    poopDestroyed: 0,
    shopkeeperKills: 0,
    greedDonationCoins: 0,
    normalDonationCoins: 0,
    edenTokens: 0,
    winStreak: 0,
    bestStreak: 0,
  };
}

function makeActionItem(overrides: Partial<ActionItem> & Pick<ActionItem, "id" | "headline" | "score" | "category">): ActionItem {
  return {
    id: overrides.id,
    tier: "backlog",
    score: overrides.score,
    headline: overrides.headline,
    detail: overrides.detail ?? overrides.headline,
    category: overrides.category,
    effort: overrides.effort ?? "single-run",
    blocked: overrides.blocked ?? false,
    achievementIds: overrides.achievementIds ?? [],
    ...overrides,
  };
}

describe("fixture edge cases", () => {
  it("early-game sparse fixture stays under 20 achievements and produces a tiny action queue", () => {
    const result = loadAndAnalyze("fixture-earlygame-sparse.dat");
    const actionable = result.actionItems.filter((item) => item.category !== "warning");

    expect(result.unlockedCount).toBeLessThan(20);
    expect(actionable.length).toBeLessThan(3);
    expect(actionable.filter((item) => item.tier === 2)).toHaveLength(0);
  });

  it("late-game clustered fixture keeps multiple cleanup actions in play", () => {
    const result = loadAndAnalyze("fixture-lategame-clustered.dat");
    const actionable = result.actionItems.filter((item) => item.category !== "warning");

    expect(result.unlockedCount).toBeGreaterThan(500);
    expect(actionable.length).toBeGreaterThan(5);
    expect(actionable.filter((item) => item.tier === 1).length).toBeGreaterThan(0);
    expect(actionable.filter((item) => item.tier === 2).length).toBeGreaterThan(0);
  });

  it("late-game nearly-there fixture collapses to a short final checklist", () => {
    const result = loadAndAnalyze("fixture-lategame-nearly-there.dat");
    const actionable = result.actionItems.filter((item) => item.category !== "warning");

    expect(result.unlockedCount).toBeGreaterThan(500);
    expect(actionable.length).toBeLessThanOrEqual(5);
    expect(actionable.every((item) => item.category === "daily")).toBe(true);
    expect(actionable.filter((item) => item.tier === 2 || item.tier === 3 || item.tier === "backlog")).toHaveLength(0);
  });
});

describe("tier assignment", () => {
  it("puts three items into tier 1 when scores stay in a tight cluster", () => {
    const items = assignTiers([
      makeActionItem({ id: "a", headline: "A", score: 80, category: "gate" }),
      makeActionItem({ id: "b", headline: "B", score: 60, category: "mark" }),
      makeActionItem({ id: "c", headline: "C", score: 55, category: "challenge" }),
      makeActionItem({ id: "d", headline: "D", score: 28, category: "donation" }),
    ]);

    expect(items.filter((item) => item.tier === 1)).toHaveLength(3);
  });

  it("keeps tier 1 to a single item when scores fall off sharply", () => {
    const items = assignTiers([
      makeActionItem({ id: "a", headline: "A", score: 80, category: "gate" }),
      makeActionItem({ id: "b", headline: "B", score: 20, category: "mark" }),
      makeActionItem({ id: "c", headline: "C", score: 18, category: "challenge" }),
    ]);

    expect(items.filter((item) => item.tier === 1)).toHaveLength(1);
  });

  it("keeps backlog items in the output instead of filtering them away", () => {
    const items = assignTiers([
      makeActionItem({ id: "a", headline: "A", score: 50, category: "gate" }),
      makeActionItem({ id: "b", headline: "B", score: 9, category: "challenge" }),
    ]);

    const backlog = items.find((item) => item.id === "b");
    expect(backlog).toBeDefined();
    expect(backlog!.tier).toBe("backlog");
  });
});

describe("dedup and tie-breaks", () => {
  it("does not suppress a stronger standalone gate when the overlapping run is timed", () => {
    const run = makeActionItem({
      id: "run:isaac:blue-womb",
      headline: "Isaac -> Blue Womb",
      score: 68,
      category: "run",
      achievementIds: [234],
      timed: true,
      route: "Blue Womb",
      character: "Isaac",
    });
    const gate = makeActionItem({
      id: "gate:blue-womb",
      headline: "Unlock Blue Womb",
      score: 72,
      category: "gate",
      achievementIds: [234],
    });

    const result = deduplicateActionItems([run, gate], true);
    expect(result.items).toHaveLength(2);
    expect(result.suppressedItems).toHaveLength(0);
  });

  it("applies the diversity pass so tier 2 is not dominated by the same route", () => {
    const items = assignTiers([
      makeActionItem({ id: "top", headline: "Top", score: 90, category: "run", route: "Chest", character: "Isaac" }),
      makeActionItem({ id: "a", headline: "A", score: 60, category: "run", route: "Chest", character: "Magdalene" }),
      makeActionItem({ id: "b", headline: "B", score: 59, category: "run", route: "Chest", character: "Cain" }),
      makeActionItem({ id: "c", headline: "C", score: 58, category: "run", route: "Void", character: "Eve" }),
    ]);

    const tierTwo = items.filter((item) => item.tier === 2);
    expect(tierTwo[0]?.route).toBe("Void");
  });

  it("stays deterministic inside the 2-point tie-break window", () => {
    const items = [
      makeActionItem({ id: "blocked", headline: "Blocked", score: 50, category: "gate", blocked: true }),
      makeActionItem({ id: "grind", headline: "Grind", score: 50, category: "run", effort: "grind" }),
      makeActionItem({ id: "daily", headline: "Daily", score: 51, category: "daily" }),
      makeActionItem({ id: "donation-a", headline: "Alpha Donation", score: 50, category: "donation" }),
      makeActionItem({ id: "donation-b", headline: "Beta Donation", score: 50, category: "donation" }),
    ].sort(compareActionItems);

    expect(items.map((item) => item.headline)).toEqual([
      "Daily",
      "Alpha Donation",
      "Beta Donation",
      "Grind",
      "Blocked",
    ]);
  });
});

describe("scoring guardrails", () => {
  it("does not let a low-readiness community-meta mark outrank a cleaner progression gate", () => {
    const unlocked = new Set<number>([405, 635]);
    const gate = evaluateProgressionGates(unlocked, emptyCounters(), 637, "phase-1-foundations")
      .find((rec) => rec.target === "Defeat Mom");
    const baseGrid = analyzeCompletionMarks(unlocked, 637);
    const taintedGrid = analyzeTaintedCompletionMarks(unlocked);
    const jacob = evaluateCompletionMarks(unlocked, baseGrid, taintedGrid, "phase-1-foundations")
      .find((rec) => rec.character === "Jacob");

    expect(gate).toBeDefined();
    expect(jacob).toBeDefined();
    expect(gate!.score).toBeGreaterThan(jacob!.score);
  });

  it("boosts rune challenges before 6 runes, and gives the 6th rune the biggest bump", () => {
    const challenges = analyzeChallenges(new Array(46).fill(0));
    const fourRunes = new Set<number>([89, 90, 91, 92]);
    const fiveRunes = new Set<number>([89, 90, 91, 92, 93]);
    const sixRunes = new Set<number>([89, 90, 91, 92, 93, 94]);

    const berkanoAtFour = evaluateChallenges(fourRunes, challenges, "phase-1-foundations", 637)
      .find((rec) => rec.challengeId === 20);
    const berkanoAtFive = evaluateChallenges(fiveRunes, challenges, "phase-1-foundations", 637)
      .find((rec) => rec.challengeId === 20);
    const berkanoAtSix = evaluateChallenges(sixRunes, challenges, "phase-1-foundations", 637)
      .find((rec) => rec.challengeId === 20);

    expect(berkanoAtFour).toBeDefined();
    expect(berkanoAtFive).toBeDefined();
    expect(berkanoAtSix).toBeDefined();
    expect(berkanoAtFive!.score).toBeGreaterThan(berkanoAtFour!.score);
    expect(berkanoAtFive!.score).toBeGreaterThan(berkanoAtSix!.score);
  });

  it("emits daily actions with honest generic wording when those unlocks are still locked", () => {
    const dailies = evaluateDailies(new Set<number>(), "phase-1-foundations", 637);

    expect(dailies).toHaveLength(3);
    expect(dailies.every((rec) => rec.actionCategory === "daily")).toBe(true);
    expect(dailies.every((rec) => !/\d+\/\d+/.test(rec.whyNow))).toBe(true);
  });
});

describe("stable action ids", () => {
  it("builds deterministic ids across all action categories", () => {
    const recs: LaneRecommendation[] = [
      {
        lane: "progression-gate",
        target: "Defeat Isaac 5 times",
        achievementIds: [57],
        blockedBy: [],
        blockerDepth: 0,
        estimatedEffort: "multi-run",
        downstreamValue: 1,
        score: 70,
        whyNow: "Gate",
        gateId: "polaroid",
        actionCategory: "gate",
      },
      {
        lane: "character-unlock",
        target: "Unlock The Lost",
        achievementIds: [82],
        blockedBy: [],
        blockerDepth: 0,
        estimatedEffort: "single-run",
        downstreamValue: 1,
        score: 60,
        whyNow: "Unlock",
        character: "The Lost",
        actionCategory: "unlock",
      },
      {
        lane: "completion-mark",
        target: "Isaac: Mother for Meat Cleaver (9/13 done)",
        achievementIds: [440],
        blockedBy: [],
        blockerDepth: 0,
        estimatedEffort: "single-run",
        downstreamValue: 1,
        score: 55,
        whyNow: "Mark",
        character: "Isaac",
        boss: "Mother",
        actionCategory: "mark",
      },
      {
        lane: "challenge",
        target: "Complete #17 Waka Waka — unlocks Death's Touch",
        achievementIds: [103],
        blockedBy: [],
        blockerDepth: 0,
        estimatedEffort: "single-run",
        downstreamValue: 1,
        score: 50,
        whyNow: "Challenge",
        challengeId: 17,
        actionCategory: "challenge",
      },
      {
        lane: "donation",
        target: "Greed Donation -> 879 for Holy Mantle",
        achievementIds: [250],
        blockedBy: [],
        blockerDepth: 0,
        estimatedEffort: "grind",
        downstreamValue: 1,
        score: 45,
        whyNow: "Donation",
        donationMachine: "greed",
        actionCategory: "donation",
      },
      {
        lane: "guardrail",
        target: "Start Daily Challenges now",
        achievementIds: [354],
        blockedBy: [],
        blockerDepth: 0,
        estimatedEffort: "single-run",
        downstreamValue: 1,
        score: 40,
        whyNow: "Daily",
        actionCategory: "daily",
      },
      {
        lane: "guardrail",
        target: "Pool Warning: Magic Skin",
        achievementIds: [],
        blockedBy: [],
        blockerDepth: 0,
        estimatedEffort: "single-run",
        downstreamValue: 0,
        score: 5,
        whyNow: "Warning",
        warningId: "magic-skin",
        actionCategory: "warning",
      },
    ];

    const ids = recs.map((rec) => laneRecommendationToActionItem(rec).id);
    const runPlans: RunPlan[] = [{
      character: "Isaac",
      isTainted: false,
      route: "The Chest",
      routeId: "chest",
      routeWikiPath: "The_Chest",
      whyThisRun: "Two marks",
      goals: [{
        type: "completion-mark",
        boss: "Isaac",
        achievementId: 49,
        description: "Isaac mark",
      }],
      primaryGoal: {
        type: "completion-mark",
        boss: "Isaac",
        achievementId: 49,
        description: "Isaac mark",
      },
      scoreBreakdown: {
        markScore: 1,
        gateBonus: 0,
        phaseBonus: 0,
        timedPenalty: 0,
        bundledPenalty: 0,
      },
      score: 1,
      timed: false,
      greedMode: false,
    }];
    ids.push(toActionItems(runPlans)[0].id);

    expect(ids).toEqual([
      "gate:polaroid",
      "unlock:char:the-lost",
      "mark:isaac:mother",
      "challenge:17",
      "donation:greed:250",
      "daily:354",
      "warning:magic-skin",
      "run:isaac:chest",
    ]);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
