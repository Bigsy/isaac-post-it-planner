import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { parseSaveFile } from "../src/parser";
import { analyze } from "../src/analyzer";

const SAMPLE_PATH = join(__dirname, "..", "sample-saves", "rep+persistentgamedata1.dat");

describe("integration: full pipeline with sample save", () => {
  it("parses and analyzes sample save end-to-end", () => {
    const buf = readFileSync(SAMPLE_PATH);
    const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
    const saveData = parseSaveFile(ab);
    const result = analyze(saveData);

    // Achievement counts
    expect(result.unlockedCount).toBe(113);
    expect(result.totalAchievements).toBe(637);

    // Completion grids
    expect(result.completionGrid.length).toBe(17);
    expect(result.taintedCompletionGrid.length).toBe(17);

    // Lane recommendations generated
    expect(result.laneRecommendations.length).toBeGreaterThan(0);

    // Lane recommendations span multiple lanes
    const lanes = new Set(result.laneRecommendations.map((r) => r.lane));
    expect(lanes.size).toBeGreaterThanOrEqual(3);

    // Challenges
    expect(result.challenges.length).toBe(45);
    const completedChallenges = result.challenges.filter((c) => c.completed).length;
    expect(completedChallenges).toBeGreaterThan(0);

    // Stats
    expect(result.stats.deaths).toBeGreaterThan(0);
    expect(result.stats.momKills).toBeGreaterThan(0);

    // Character unlock states
    const lockedBase = result.baseCharacters.filter((c) => !c.unlocked);
    const unlockedBase = result.baseCharacters.filter((c) => c.unlocked);
    expect(unlockedBase.length).toBeGreaterThan(0);
    expect(lockedBase.length + unlockedBase.length).toBe(14);

    // Tainted characters
    expect(result.taintedCharacters.length).toBe(17);

    // Tainted completion grid
    for (const char of result.taintedCompletionGrid) {
      expect(char.total).toBe(7);
      expect(char.done).toBeGreaterThanOrEqual(0);
      expect(char.done).toBeLessThanOrEqual(7);
    }
  });
});
