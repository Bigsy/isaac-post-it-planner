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

    // Completion grid
    expect(result.completionGrid.length).toBe(15);

    // Recommendations generated
    expect(result.recommendations.length).toBeGreaterThan(0);

    // Challenges
    expect(result.challenges.length).toBe(45);
    const completedChallenges = result.challenges.filter((c) => c.completed).length;
    expect(completedChallenges).toBeGreaterThan(0);

    // Stats
    expect(result.stats.deaths).toBeGreaterThan(0);
    expect(result.stats.momKills).toBeGreaterThanOrEqual(0);

    // Character unlock states
    const lockedBase = result.baseCharacters.filter((c) => !c.unlocked);
    const unlockedBase = result.baseCharacters.filter((c) => c.unlocked);
    expect(unlockedBase.length).toBeGreaterThan(0);
    expect(lockedBase.length + unlockedBase.length).toBe(14);

    // Tainted characters
    expect(result.taintedCharacters.length).toBe(17);
  });
});
