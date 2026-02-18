import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { parseSaveFile } from "../src/parser";
import {
  analyze,
  getUnlockedIds,
  analyzeCompletionMarks,
  analyzeTaintedCompletionMarks,
  analyzeChallenges,
  generateLaneRecommendations,
  evaluateProgressionGates,
  evaluateCharacterUnlocks,
  evaluateCompletionMarks,
  evaluateChallenges,
  evaluateDonation,
  evaluateGuardrails,
} from "../src/analyzer";
import type { CounterStats } from "../src/types";

const SAMPLE_PATH = join(__dirname, "..", "sample-saves", "rep+persistentgamedata1.dat");

function loadSample() {
  const buf = readFileSync(SAMPLE_PATH);
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  return parseSaveFile(ab);
}

function emptyCounters(): CounterStats {
  return {
    momKills: 0, deaths: 0, momsHeartKills: 0,
    rocksDestroyed: 0, tintedRocksDestroyed: 0, poopDestroyed: 0,
    shopkeeperKills: 0, donationCoins: 0,
    edenTokens: 0, winStreak: 0, bestStreak: 0,
  };
}

describe("getUnlockedIds", () => {
  it("returns correct count from sample save", () => {
    const save = loadSample();
    const unlocked = getUnlockedIds(save.achievements);
    expect(unlocked.size).toBe(113);
  });

  it("skips index 0", () => {
    const unlocked = getUnlockedIds([1, 0, 1, 0]);
    expect(unlocked.has(0)).toBe(false);
    expect(unlocked.has(2)).toBe(true);
  });
});

describe("analyze (full pipeline)", () => {
  it("returns correct achievement counts", () => {
    const result = analyze(loadSample());
    expect(result.unlockedCount).toBe(113);
    expect(result.totalAchievements).toBe(637);
  });

  it("identifies base character unlock states", () => {
    const result = analyze(loadSample());
    const unlockedNames = result.baseCharacters
      .filter((c) => c.unlocked)
      .map((c) => c.name);
    expect(unlockedNames).toContain("Magdalene");
    expect(unlockedNames).toContain("Cain");
    expect(unlockedNames).toContain("Judas");
  });

  it("produces lane recommendations", () => {
    const result = analyze(loadSample());
    expect(result.laneRecommendations.length).toBeGreaterThan(0);
  });

  it("has stats with deaths > 0", () => {
    const result = analyze(loadSample());
    expect(result.stats.deaths).toBeGreaterThan(0);
  });

  it("has tainted completion grid with 17 characters", () => {
    const result = analyze(loadSample());
    expect(result.taintedCompletionGrid.length).toBe(17);
  });
});

describe("analyzeCompletionMarks", () => {
  it("returns 17 characters", () => {
    const unlocked = getUnlockedIds(loadSample().achievements);
    const grid = analyzeCompletionMarks(unlocked);
    expect(grid.length).toBe(17);
  });

  it("Isaac has some marks done in sample save", () => {
    const unlocked = getUnlockedIds(loadSample().achievements);
    const grid = analyzeCompletionMarks(unlocked);
    const isaac = grid.find((c) => c.name === "Isaac")!;
    expect(isaac.done).toBeGreaterThan(0);
  });
});

describe("analyzeTaintedCompletionMarks", () => {
  it("returns 17 tainted characters", () => {
    const unlocked = getUnlockedIds(loadSample().achievements);
    const grid = analyzeTaintedCompletionMarks(unlocked);
    expect(grid.length).toBe(17);
  });

  it("each tainted character has 7 marks", () => {
    const unlocked = getUnlockedIds(loadSample().achievements);
    const grid = analyzeTaintedCompletionMarks(unlocked);
    for (const char of grid) {
      expect(char.total).toBe(7);
      expect(char.marks.length).toBe(7);
    }
  });
});

describe("analyzeChallenges", () => {
  it("returns 45 challenges", () => {
    const challenges = analyzeChallenges(loadSample().challenges);
    expect(challenges.length).toBe(45);
  });

  it("some challenges are completed in sample save", () => {
    const challenges = analyzeChallenges(loadSample().challenges);
    const completed = challenges.filter((c) => c.completed);
    expect(completed.length).toBeGreaterThan(0);
  });
});

// --- Lane evaluator tests ---

describe("evaluateProgressionGates", () => {
  it("empty save shows progression gates", () => {
    const unlocked = new Set<number>();
    const recs = evaluateProgressionGates(unlocked, emptyCounters());
    expect(recs.length).toBeGreaterThan(0);
    expect(recs.every((r) => r.lane === "progression-gate")).toBe(true);
  });

  it("sample save has some gates cleared", () => {
    const save = loadSample();
    const unlocked = getUnlockedIds(save.achievements);
    const stats: CounterStats = {
      ...emptyCounters(),
      momKills: save.counters[1] ?? 0,
      momsHeartKills: save.counters[1] ?? 0,
    };
    const recs = evaluateProgressionGates(unlocked, stats);
    // Should have some gates remaining (113/637 is early game)
    expect(recs.length).toBeGreaterThan(0);
  });

  it("blocked gates have blockerDepth > 0", () => {
    const unlocked = new Set<number>();
    const recs = evaluateProgressionGates(unlocked, emptyCounters());
    const blocked = recs.filter((r) => r.blockerDepth > 0);
    // Some gates should be blocked (e.g. alt-path blocked by blue-womb)
    expect(blocked.length).toBeGreaterThan(0);
  });

  it("sheol-cathedral clears when momsHeartKills >= 1", () => {
    const unlocked = new Set([4]); // Mom defeated
    const stats = { ...emptyCounters(), momKills: 1, momsHeartKills: 1 };
    const recs = evaluateProgressionGates(unlocked, stats);
    const sheol = recs.find((r) => r.target.includes("Mom's Heart or It Lives"));
    expect(sheol).toBeUndefined(); // should be cleared, not recommended
  });

  it("sheol-cathedral NOT cleared on empty save", () => {
    const recs = evaluateProgressionGates(new Set(), emptyCounters());
    const sheol = recs.find((r) => r.target.includes("Mom's Heart or It Lives"));
    expect(sheol).toBeDefined();
  });

  it("polaroid/negative show as blocked when sheol-cathedral not cleared", () => {
    const unlocked = new Set([4]); // Mom defeated, but momsHeartKills=0
    const stats = { ...emptyCounters(), momKills: 1 };
    const recs = evaluateProgressionGates(unlocked, stats);
    const polaroid = recs.find((r) => r.target.includes("Isaac 5 times"));
    const negative = recs.find((r) => r.target.includes("Satan 5 times"));
    if (polaroid) expect(polaroid.blockerDepth).toBeGreaterThan(0);
    if (negative) expect(negative.blockerDepth).toBeGreaterThan(0);
  });

  it("polaroid/negative unblocked when sheol-cathedral is cleared", () => {
    const unlocked = new Set([4]); // Mom defeated
    const stats = { ...emptyCounters(), momKills: 1, momsHeartKills: 5 };
    const recs = evaluateProgressionGates(unlocked, stats);
    const polaroid = recs.find((r) => r.target.includes("Isaac 5 times"));
    const negative = recs.find((r) => r.target.includes("Satan 5 times"));
    if (polaroid) expect(polaroid.blockerDepth).toBe(0);
    if (negative) expect(negative.blockerDepth).toBe(0);
  });
});

describe("evaluateCharacterUnlocks", () => {
  it("empty save recommends all 14 base + 17 tainted characters", () => {
    const unlocked = new Set<number>();
    const recs = evaluateCharacterUnlocks(unlocked);
    expect(recs.length).toBe(14 + 17);
    expect(recs.every((r) => r.lane === "character-unlock")).toBe(true);
  });

  it("tainted characters show Home as blocker when Mother not defeated", () => {
    const unlocked = new Set<number>();
    const recs = evaluateCharacterUnlocks(unlocked);
    const taintedRecs = recs.filter((r) => r.target.includes("T."));
    expect(taintedRecs.every((r) => r.blockerDepth > 0)).toBe(true);
    expect(taintedRecs.every((r) => r.blockedBy.some((b) => b.achievementId === 635))).toBe(true);
  });

  it("tainted characters are unblocked when Home is accessible", () => {
    const unlocked = new Set([635]); // Home/Mother unlocked
    const recs = evaluateCharacterUnlocks(unlocked);
    const taintedRecs = recs.filter((r) => r.target.includes("T."));
    expect(taintedRecs.every((r) => r.blockerDepth === 0)).toBe(true);
  });
});

describe("evaluateCompletionMarks", () => {
  it("flags near-complete base characters", () => {
    const save = loadSample();
    const unlocked = getUnlockedIds(save.achievements);
    const baseGrid = analyzeCompletionMarks(unlocked);
    const taintedGrid = analyzeTaintedCompletionMarks(unlocked);
    const recs = evaluateCompletionMarks(unlocked, baseGrid, taintedGrid);
    expect(recs.every((r) => r.lane === "completion-mark")).toBe(true);
  });

  it("detects untouched characters", () => {
    const unlocked = new Set<number>();
    const baseGrid = analyzeCompletionMarks(unlocked);
    const taintedGrid = analyzeTaintedCompletionMarks(unlocked);
    const recs = evaluateCompletionMarks(unlocked, baseGrid, taintedGrid);
    const untouched = recs.filter((r) => r.target.includes("0/"));
    expect(untouched.length).toBeGreaterThan(0);
  });
});

describe("evaluateChallenges", () => {
  it("incomplete challenges get recommendations", () => {
    const save = loadSample();
    const unlocked = getUnlockedIds(save.achievements);
    const challenges = analyzeChallenges(save.challenges);
    const recs = evaluateChallenges(unlocked, challenges);
    expect(recs.every((r) => r.lane === "challenge")).toBe(true);
    expect(recs.length).toBeGreaterThan(0);
  });

  it("challenges with prerequisites show blockers when not met", () => {
    const unlocked = new Set<number>();
    const challenges = analyzeChallenges(new Array(50).fill(0));
    const recs = evaluateChallenges(unlocked, challenges);
    // Challenges #37-45 have prerequisites
    const challenge42 = recs.find((r) => r.target.includes("#42"));
    if (challenge42) {
      expect(challenge42.blockerDepth).toBeGreaterThan(0);
    }
  });
});

describe("evaluateDonation", () => {
  it("empty save shows greed donation milestone", () => {
    const unlocked = new Set<number>();
    const recs = evaluateDonation(unlocked);
    expect(recs.some((r) => r.target.includes("Greed Donation"))).toBe(true);
  });
});

describe("evaluateGuardrails", () => {
  it("returns tips and warnings", () => {
    const unlocked = new Set<number>();
    const recs = evaluateGuardrails(unlocked);
    expect(recs.length).toBeGreaterThan(0);
    expect(recs.every((r) => r.lane === "guardrail")).toBe(true);
  });

  it("shows fewer tips for late-game saves", () => {
    const early = evaluateGuardrails(new Set<number>());
    const late = evaluateGuardrails(new Set(Array.from({ length: 500 }, (_, i) => i + 1)));
    expect(late.length).toBeLessThanOrEqual(early.length);
  });
});

describe("generateLaneRecommendations (integration)", () => {
  it("produces recommendations from all lanes for sample save", () => {
    const save = loadSample();
    const unlocked = getUnlockedIds(save.achievements);
    const stats: CounterStats = {
      ...emptyCounters(),
      momKills: save.counters[1] ?? 0,
      momsHeartKills: save.counters[1] ?? 0,
    };
    const baseGrid = analyzeCompletionMarks(unlocked);
    const taintedGrid = analyzeTaintedCompletionMarks(unlocked);
    const challenges = analyzeChallenges(save.challenges);
    const recs = generateLaneRecommendations(unlocked, stats, baseGrid, taintedGrid, challenges);

    expect(recs.length).toBeGreaterThan(0);
    const lanes = new Set(recs.map((r) => r.lane));
    expect(lanes.has("character-unlock")).toBe(true);
    expect(lanes.has("guardrail")).toBe(true);
  });

  it("guardrails sort last", () => {
    const save = loadSample();
    const unlocked = getUnlockedIds(save.achievements);
    const stats: CounterStats = {
      ...emptyCounters(),
      momKills: save.counters[1] ?? 0,
      momsHeartKills: save.counters[1] ?? 0,
    };
    const baseGrid = analyzeCompletionMarks(unlocked);
    const taintedGrid = analyzeTaintedCompletionMarks(unlocked);
    const challenges = analyzeChallenges(save.challenges);
    const recs = generateLaneRecommendations(unlocked, stats, baseGrid, taintedGrid, challenges);

    const firstGuardrail = recs.findIndex((r) => r.lane === "guardrail");
    if (firstGuardrail >= 0) {
      // All recs after first guardrail should also be guardrails
      for (let i = firstGuardrail; i < recs.length; i++) {
        expect(recs[i].lane).toBe("guardrail");
      }
    }
  });

  it("all recommendations have a score", () => {
    const save = loadSample();
    const unlocked = getUnlockedIds(save.achievements);
    const stats: CounterStats = {
      ...emptyCounters(),
      momKills: save.counters[1] ?? 0,
    };
    const baseGrid = analyzeCompletionMarks(unlocked);
    const taintedGrid = analyzeTaintedCompletionMarks(unlocked);
    const challenges = analyzeChallenges(save.challenges);
    const recs = generateLaneRecommendations(unlocked, stats, baseGrid, taintedGrid, challenges);

    for (const r of recs) {
      expect(typeof r.score).toBe("number");
      expect(isNaN(r.score)).toBe(false);
    }
  });

  it("blocked recommendations have lower scores than unblocked ones of same lane", () => {
    const unlocked = new Set<number>();
    const stats = emptyCounters();
    const baseGrid = analyzeCompletionMarks(unlocked);
    const taintedGrid = analyzeTaintedCompletionMarks(unlocked);
    const challenges = analyzeChallenges(new Array(50).fill(0));
    const recs = generateLaneRecommendations(unlocked, stats, baseGrid, taintedGrid, challenges);

    const charRecs = recs.filter((r) => r.lane === "character-unlock");
    const unblocked = charRecs.filter((r) => r.blockerDepth === 0);
    const blocked = charRecs.filter((r) => r.blockerDepth > 0);
    if (unblocked.length > 0 && blocked.length > 0) {
      const maxBlocked = Math.max(...blocked.map((r) => r.score));
      const minUnblocked = Math.min(...unblocked.map((r) => r.score));
      expect(minUnblocked).toBeGreaterThan(maxBlocked);
    }
  });
});
