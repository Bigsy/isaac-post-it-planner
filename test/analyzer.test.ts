import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { parseSaveFile } from "../src/parser";
import {
  analyze,
  getUnlockedIds,
  analyzeCompletionMarks,
  generateRecommendations,
  analyzeChallenges,
} from "../src/analyzer";

const SAMPLE_PATH = join(__dirname, "..", "sample-saves", "rep+persistentgamedata1.dat");

function loadSample() {
  const buf = readFileSync(SAMPLE_PATH);
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  return parseSaveFile(ab);
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
    // Isaac is always unlocked (no achievement needed), these are unlockable chars
    expect(unlockedNames).toContain("Magdalene");
    expect(unlockedNames).toContain("Cain");
    expect(unlockedNames).toContain("Judas");
  });

  it("produces recommendations", () => {
    const result = analyze(loadSample());
    expect(result.recommendations.length).toBeGreaterThan(0);
  });

  it("recommendations are sorted by priority", () => {
    const result = analyze(loadSample());
    for (let i = 1; i < result.recommendations.length; i++) {
      expect(result.recommendations[i].priority).toBeGreaterThanOrEqual(
        result.recommendations[i - 1].priority,
      );
    }
  });

  it("has stats with deaths > 0", () => {
    const result = analyze(loadSample());
    expect(result.stats.deaths).toBeGreaterThan(0);
  });
});

describe("analyzeCompletionMarks", () => {
  it("returns 15 characters", () => {
    const unlocked = getUnlockedIds(loadSample().achievements);
    const grid = analyzeCompletionMarks(unlocked);
    expect(grid.length).toBe(15);
  });

  it("Isaac has some marks done in sample save", () => {
    const unlocked = getUnlockedIds(loadSample().achievements);
    const grid = analyzeCompletionMarks(unlocked);
    const isaac = grid.find((c) => c.name === "Isaac")!;
    expect(isaac.done).toBeGreaterThan(0);
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

describe("generateRecommendations", () => {
  it("character unlock recommendations appear before untouched character recommendations", () => {
    const save = loadSample();
    const unlocked = getUnlockedIds(save.achievements);
    const grid = analyzeCompletionMarks(unlocked);
    const challenges = analyzeChallenges(save.challenges);
    const recs = generateRecommendations(unlocked, grid, challenges);

    const unlockRec = recs.find((r) => r.text.startsWith("Unlock "));
    const untouchedRec = recs.find((r) => r.text.startsWith("Start playing"));
    if (unlockRec && untouchedRec) {
      expect(unlockRec.priority).toBeLessThan(untouchedRec.priority);
    }
  });

  it("empty save recommends all characters as locked", () => {
    const empty = new Array(700).fill(0);
    const unlocked = getUnlockedIds(empty);
    const grid = analyzeCompletionMarks(unlocked);
    const challenges = analyzeChallenges(empty);
    const recs = generateRecommendations(unlocked, grid, challenges);
    const unlockRecs = recs.filter((r) => r.text.startsWith("Unlock "));
    // Should recommend unlocking all 14 base characters
    expect(unlockRecs.length).toBe(14);
  });
});
