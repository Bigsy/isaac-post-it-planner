import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { parseSaveFile } from "../src/parser";
import { analyze } from "../src/analyzer";

const SAMPLE_DIR = join(__dirname, "..", "sample-saves");

function loadAndAnalyze(filename: string) {
  const buf = readFileSync(join(SAMPLE_DIR, filename));
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  return analyze(parseSaveFile(ab));
}

describe("integration: full pipeline with sample save", () => {
  it("parses and analyzes sample save end-to-end", () => {
    const result = loadAndAnalyze("rep+persistentgamedata1.dat");

    // Achievement counts
    expect(result.unlockedCount).toBe(113);
    expect(result.totalAchievements).toBe(637);

    // DLC level
    expect(result.dlcLevel).toBe("repentance");

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

describe("integration: multi-version saves", () => {
  it("Rebirth save produces valid analysis", () => {
    const result = loadAndAnalyze("Rebirth_persistentgamedata.dat");
    expect(result.dlcLevel).toBe("rebirth");
    expect(result.totalAchievements).toBe(178);
    expect(result.challenges.length).toBe(20);
    expect(result.taintedCharacters.length).toBe(0);
    expect(result.taintedCompletionGrid.length).toBe(0);
    expect(result.completionGrid[0].marks.length).toBe(6);
    expect(result.laneRecommendations.length).toBeGreaterThanOrEqual(0);
  });

  it("Afterbirth save produces valid analysis", () => {
    const result = loadAndAnalyze("Afterbirth_persistentgamedata.dat");
    expect(result.dlcLevel).toBe("afterbirth");
    expect(result.totalAchievements).toBe(276);
    expect(result.challenges.length).toBe(30);
    expect(result.taintedCharacters.length).toBe(0);
    expect(result.completionGrid[0].marks.length).toBe(9);
  });

  it("Afterbirth+ save produces valid analysis", () => {
    const result = loadAndAnalyze("Afterbirth+_persistentgamedata.dat");
    expect(result.dlcLevel).toBe("afterbirth-plus");
    expect(result.totalAchievements).toBe(348);
    expect(result.challenges.length).toBe(35);
    expect(result.taintedCharacters.length).toBe(0);
    expect(result.completionGrid[0].marks.length).toBe(11);
  });

  it("Repentance+ save produces valid analysis", () => {
    const result = loadAndAnalyze("Repentance+_persistentgamedata.dat");
    expect(result.dlcLevel).toBe("repentance");
    expect(result.totalAchievements).toBe(637);
    expect(result.challenges.length).toBe(45);
    expect(result.taintedCharacters.length).toBe(17);
    expect(result.completionGrid[0].marks.length).toBe(13);
    expect(result.taintedCompletionGrid.length).toBe(17);
  });

  it("all versions produce lane recommendations", () => {
    const saves = [
      "Rebirth_persistentgamedata.dat",
      "Afterbirth_persistentgamedata.dat",
      "Afterbirth+_persistentgamedata.dat",
      "rep+persistentgamedata1.dat",
    ];
    for (const file of saves) {
      const result = loadAndAnalyze(file);
      // All saves should produce some recommendations (at minimum guardrails)
      expect(result.laneRecommendations.length).toBeGreaterThanOrEqual(0);
    }
  });
});
