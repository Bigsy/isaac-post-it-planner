import { describe, expect, it } from "vitest";
import { buildRunPlans } from "../src/run-planner";
import { PROGRESSION_GATES } from "../src/data/progression";
import type {
  CharacterProgress,
  CounterStats,
  PhaseProgress,
  TaintedCharacterProgress,
} from "../src/types";

const EMPTY_STATS: CounterStats = {
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

const PHASE_PROGRESS: PhaseProgress = {
  currentPhase: "phase-1-foundations",
  phaseName: "Phase 1",
  phaseDescription: "Foundations",
  criteria: [],
};

function baseCharacter(name: string, marks: CharacterProgress["marks"]): CharacterProgress {
  const done = marks.filter((m) => m.done).length;
  return { name, marks, done, total: marks.length };
}

function taintedCharacter(
  name: string,
  marks: TaintedCharacterProgress["marks"],
): TaintedCharacterProgress {
  const done = marks.filter((m) => m.done).length;
  return { name, marks, done, total: marks.length };
}

describe("buildRunPlans", () => {
  it("generates plans only for available characters", () => {
    const baseGrid = [
      baseCharacter("Isaac", [
        { boss: "Mom's Heart", done: false, achievementId: 10 },
        { boss: "Satan", done: false, achievementId: 11 },
      ]),
      baseCharacter("Cain", [
        { boss: "Mom's Heart", done: false, achievementId: 12 },
        { boss: "Satan", done: false, achievementId: 13 },
      ]),
    ];

    const runPlans = buildRunPlans(
      baseGrid,
      [],
      new Set<number>(),
      new Set<string>(["Isaac"]),
      PHASE_PROGRESS,
      PROGRESSION_GATES,
      { ...EMPTY_STATS, momsHeartKills: 1 },
      "repentance",
      637,
    );

    expect(runPlans.length).toBeGreaterThan(0);
    expect(runPlans.every((p) => p.character === "Isaac")).toBe(true);
  });

  it("keeps single-goal routes for final scoring", () => {
    const baseGrid = [
      baseCharacter("Isaac", [{ boss: "Satan", done: false, achievementId: 10 }]),
    ];

    const runPlans = buildRunPlans(
      baseGrid,
      [],
      new Set<number>([57, 58, 78, 320, 407, 635]),
      new Set<string>(["Isaac"]),
      PHASE_PROGRESS,
      PROGRESSION_GATES,
      { ...EMPTY_STATS, momsHeartKills: 1 },
      "repentance",
      637,
    );

    expect(runPlans.some(p=>p.routeId==="sheol" && p.goals.length===1)).toBe(true);
  });

  it("retains gate progress without a separate gate score", () => {
    const baseGrid = [
      baseCharacter("Isaac", [
        { boss: "Mom's Heart", done: false, achievementId: 10 },
        { boss: "Satan", done: false, achievementId: 11 },
      ]),
    ];

    const runPlans = buildRunPlans(
      baseGrid,
      [],
      new Set<number>(), // The Negative uncleared
      new Set<string>(["Isaac"]),
      PHASE_PROGRESS,
      PROGRESSION_GATES,
      { ...EMPTY_STATS, momsHeartKills: 1 },
      "repentance",
      637,
    );

    expect(runPlans[0].scoreBreakdown.gateBonus).toBe(0);
    expect(runPlans[0].goals.some((g) => g.type === "gate-progress")).toBe(true);
  });

  it("prefers non-timed route when mark value is equivalent", () => {
    const baseGrid = [
      baseCharacter("Isaac", [
        { boss: "Mom's Heart", done: false, achievementId: 10 },
        { boss: "Satan", done: false, achievementId: 11 },
        { boss: "Hush", done: false, achievementId: 12 },
      ]),
    ];

    const unlocked = new Set<number>([57, 58, 78, 234, 320, 407, 635]);
    const runPlans = buildRunPlans(
      baseGrid,
      [],
      unlocked,
      new Set<string>(["Isaac"]),
      PHASE_PROGRESS,
      PROGRESSION_GATES,
      { ...EMPTY_STATS, momsHeartKills: 11 },
      "repentance",
      637,
    );

    expect(runPlans[0].timed).toBe(false);
    expect(runPlans[0].routeId).not.toBe("blue-womb");
  });

  it("copies timed route descriptions into generated plans", () => {
    const baseGrid = [
      baseCharacter("Isaac", [
        { boss: "Mom's Heart", done: false, achievementId: 10 },
        { boss: "Hush", done: false, achievementId: 12 },
      ]),
    ];

    const runPlans = buildRunPlans(
      baseGrid,
      [],
      new Set<number>([57, 58, 78, 234]),
      new Set<string>(["Isaac"]),
      PHASE_PROGRESS,
      PROGRESSION_GATES,
      { ...EMPTY_STATS, momsHeartKills: 11 },
      "repentance",
      637,
    );

    const timed = runPlans.find(p=>p.routeId === "blue-womb");
    expect(timed?.timed).toBe(true);
    expect(timed?.timedDescription).toContain("30:00");
  });

  it("suppresses inaccessible branch routes before sheol-cathedral gate", () => {
    const baseGrid = [
      baseCharacter("Isaac", [
        { boss: "Satan", done: false, achievementId: 10 },
        { boss: "Isaac", done: false, achievementId: 11 },
        { boss: "The Lamb", done: false, achievementId: 12 },
      ]),
    ];

    const runPlans = buildRunPlans(
      baseGrid,
      [],
      new Set<number>(),
      new Set<string>(["Isaac"]),
      PHASE_PROGRESS,
      PROGRESSION_GATES,
      EMPTY_STATS,
      "repentance",
      637,
    );

    expect(runPlans).toHaveLength(0);
  });

  it("treats tainted bundled marks as progress goals", () => {
    const taintedGrid = [
      taintedCharacter("T.Isaac", [
        { boss: "Main Bosses", done: false, achievementId: 548 },
        { boss: "Mother", done: true, achievementId: 549 },
        { boss: "Beast", done: true, achievementId: 491 },
        { boss: "Ultra Greedier", done: true, achievementId: 541 },
        { boss: "Delirium", done: true, achievementId: 584 },
        { boss: "Mega Satan", done: true, achievementId: 601 },
        { boss: "Hush + Boss Rush", done: true, achievementId: 618 },
      ]),
    ];

    const runPlans = buildRunPlans(
      [],
      taintedGrid,
      new Set<number>([474]), // tainted unlock, but not negative (for gate progress bonus)
      new Set<string>(["T.Isaac"]),
      PHASE_PROGRESS,
      PROGRESSION_GATES,
      { ...EMPTY_STATS, momsHeartKills: 1 },
      "repentance",
      637,
    );

    const bundledGoal = runPlans[0].goals.find((g) => g.boss === "Main Bosses");
    expect(bundledGoal?.isBundled).toBe(true);
    expect(bundledGoal?.description).toContain("Works toward");
  });

  it("keeps both Mega Satan branches and shorter routes for final scoring", () => {
    const baseGrid = [
      baseCharacter("Isaac", [
        { boss: "Mom's Heart", done: false, achievementId: 10 },
        { boss: "Satan", done: false, achievementId: 11 },
        { boss: "Isaac", done: false, achievementId: 12 },
        { boss: "???", done: false, achievementId: 13 },
        { boss: "Mega Satan", done: false, achievementId: 14 },
      ]),
    ];

    const runPlans = buildRunPlans(
      baseGrid,
      [],
      new Set<number>([57, 78]),
      new Set<string>(["Isaac"]),
      PHASE_PROGRESS,
      PROGRESSION_GATES,
      { ...EMPTY_STATS, momsHeartKills: 1 },
      "repentance",
      637,
    );

    expect(runPlans.map(p=>p.routeId)).toEqual(expect.arrayContaining(["mega-satan-ch", "mega-satan-dr", "cathedral", "sheol"]));
  });

  it("does not count editorial phase criteria as additional rewards", () => {
    const baseGrid = [
      baseCharacter("Isaac", [
        { boss: "Mom's Heart", done: false, achievementId: 10 },
        { boss: "Isaac", done: false, achievementId: 11 },
      ]),
    ];

    const runPlans = buildRunPlans(
      baseGrid,
      [],
      new Set<number>(),
      new Set<string>(["Isaac"]),
      PHASE_PROGRESS,
      PROGRESSION_GATES,
      { ...EMPTY_STATS, momsHeartKills: 1 },
      "repentance",
      637,
    );

    expect(runPlans.length).toBeGreaterThan(0);
    expect(
      runPlans.some(p=>p.goals.some((g) => g.type === "phase-criterion")),
    ).toBe(false);
  });
});
