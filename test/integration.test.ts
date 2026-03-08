import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { parseSaveFile } from "../src/parser";
import { analyze } from "../src/analyzer";
import type { SaveData } from "../src/types";

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
    expect(result.unlockedCount).toBe(112);
    expect(result.totalAchievements).toBe(637);

    // DLC level
    expect(result.dlcLevel).toBe("repentance");

    // Completion grids
    expect(result.completionGrid.length).toBe(17);
    expect(result.taintedCompletionGrid.length).toBe(17);

    // Unified action items generated
    expect(result.actionItems.length).toBeGreaterThan(0);
    const runItems = result.actionItems.filter((item) => item.category === "run");
    expect(runItems.length).toBeGreaterThan(0);
    expect(runItems.every((item) => item.detail.trim().length > 0)).toBe(true);
    expect(runItems.every((item) => !item.timed || !!item.timedDescription?.trim())).toBe(true);

    // Action items span multiple categories
    const categories = new Set(result.actionItems.map((item) => item.category));
    expect(categories.size).toBeGreaterThanOrEqual(3);

    // Challenges
    expect(result.challenges.length).toBe(45);
    const completedChallenges = result.challenges.filter((c) => c.completed).length;
    expect(completedChallenges).toBeGreaterThan(0);

    // Collectibles
    expect(result.totalCollectibles).toBeGreaterThan(0);
    expect(result.collectiblesSeen).toBeGreaterThanOrEqual(0);
    expect(result.collectiblesSeen).toBeLessThanOrEqual(result.totalCollectibles);

    // Bestiary
    expect(result.bestiary.length).toBeGreaterThan(0);
    expect(result.bestiaryEncountered).toBeGreaterThan(0);
    expect(result.bestiaryTotal).toBeGreaterThan(0);

    // Stats
    expect(result.stats.deaths).toBeGreaterThan(0);
    expect(result.stats.momKills).toBeGreaterThan(0);
    expect(result.stats.normalDonationCoins).toBe(51);

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
    expect(result.totalCollectibles).toBeGreaterThan(0);
    expect(result.actionItems.length).toBeGreaterThan(0);
    const runs = result.actionItems.filter((item) => item.category === "run");
    expect(runs.every((item) => item.route !== "Mother")).toBe(true);
    expect(runs.every((item) => item.route !== "Home")).toBe(true);
    expect(runs.every((item) => item.route !== "Greedier")).toBe(true);
  });

  it("Afterbirth save produces valid analysis", () => {
    const result = loadAndAnalyze("Afterbirth_persistentgamedata.dat");
    expect(result.dlcLevel).toBe("afterbirth");
    expect(result.totalAchievements).toBe(276);
    expect(result.challenges.length).toBe(30);
    expect(result.taintedCharacters.length).toBe(0);
    expect(result.completionGrid[0].marks.length).toBe(9);
    expect(result.totalCollectibles).toBeGreaterThan(0);
  });

  it("Afterbirth+ save produces valid analysis", () => {
    const result = loadAndAnalyze("Afterbirth+_persistentgamedata.dat");
    expect(result.dlcLevel).toBe("afterbirth-plus");
    expect(result.totalAchievements).toBe(348);
    expect(result.challenges.length).toBe(35);
    expect(result.taintedCharacters.length).toBe(0);
    expect(result.completionGrid[0].marks.length).toBe(11);
    expect(result.totalCollectibles).toBeGreaterThan(0);
    const runs = result.actionItems.filter((item) => item.category === "run");
    expect(runs.every((item) => item.route !== "Mother")).toBe(true);
    expect(runs.every((item) => item.route !== "Home")).toBe(true);
  });

  it("Repentance+ save produces valid analysis", () => {
    const result = loadAndAnalyze("Repentance+_persistentgamedata.dat");
    expect(result.dlcLevel).toBe("repentance");
    expect(result.totalAchievements).toBe(637);
    expect(result.challenges.length).toBe(45);
    expect(result.taintedCharacters.length).toBe(17);
    expect(result.completionGrid[0].marks.length).toBe(13);
    expect(result.taintedCompletionGrid.length).toBe(17);
    expect(result.totalCollectibles).toBeGreaterThan(0);
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
      expect(result.actionItems.length).toBeGreaterThan(0);
    }
  });

  it("returns no run plans when only single-goal opportunities remain", () => {
    const allUnlockedSingleGoalSave: SaveData = {
      dlcLevel: "rebirth",
      achievements: [0, 1],
      counters: [],
      levelCounters: [],
      collectibles: [],
      minibosses: [],
      bosses: [],
      challenges: [],
      cutsceneCounters: [],
      gameSettings: [],
      specialSeedCounters: [],
      bestiary: null,
    };
    const result = analyze(allUnlockedSingleGoalSave);
    expect(result.actionItems.filter((item) => item.category === "run")).toHaveLength(0);
    expect(result.actionItems.length).toBeGreaterThan(0);
  });
});

describe("integration: phaseProgress", () => {
  it("result.phaseProgress exists with valid currentPhase for each DLC", () => {
    const saves = [
      "Rebirth_persistentgamedata.dat",
      "Afterbirth_persistentgamedata.dat",
      "Afterbirth+_persistentgamedata.dat",
      "rep+persistentgamedata1.dat",
      "Repentance+_persistentgamedata.dat",
    ];
    const validPhases = [
      "phase-1-foundations",
      "phase-2-expansion",
      "phase-3-repentance",
      "phase-4-completion",
    ];
    for (const file of saves) {
      const result = loadAndAnalyze(file);
      expect(result.phaseProgress).toBeDefined();
      expect(validPhases).toContain(result.phaseProgress!.currentPhase);
      expect(result.phaseProgress!.phaseName).toBeTruthy();
      expect(result.phaseProgress!.criteria.length).toBeGreaterThan(0);
    }
  });

  it("primary fixture is early-game phase", () => {
    const result = loadAndAnalyze("rep+persistentgamedata1.dat");
    // 112/637 achievements should be phase-1 or phase-2
    expect(["phase-1-foundations", "phase-2-expansion"]).toContain(
      result.phaseProgress!.currentPhase,
    );
  });

  it("Afterbirth save excludes Repentance-only criteria from phase checklist", () => {
    const result = loadAndAnalyze("Afterbirth_persistentgamedata.dat");
    const pp = result.phaseProgress!;
    // Phase 2 has "Alt path (Repentance)" with requiredDlc: "repentance"
    // Afterbirth save should NOT include that criterion
    const descriptions = pp.criteria.map(c => c.description);
    expect(descriptions.every(d => !d.includes("Repentance"))).toBe(true);
  });

  it("user save no longer shows Stop Watch as a phase-1 blocker", () => {
    const result = loadAndAnalyze("user-save.dat");
    const descriptions = result.phaseProgress!.criteria.map((c) => c.description);
    expect(descriptions).not.toContain("Donation machine to 999 (Stop Watch)");
  });
});

describe("integration: recommendation ordering", () => {
  it("user save prioritizes Polaroid and Greed setup ahead of challenge cleanup", () => {
    const result = loadAndAnalyze("user-save.dat");
    const actionable = result.actionItems.filter((item) => item.category !== "warning");
    const indexOf = (target: string) => actionable.findIndex((item) => item.headline === target);

    const polaroid = indexOf("Defeat Isaac 5 times");
    const greedStart = indexOf("Start Greed Mode — rotate characters to build donation machine");
    const waka = indexOf("Complete #17 Waka Waka — unlocks Death's Touch");

    expect(polaroid).toBeGreaterThanOrEqual(0);
    expect(greedStart).toBeGreaterThanOrEqual(0);
    expect(waka).toBeGreaterThanOrEqual(0);
    expect(polaroid).toBeLessThan(waka);
    expect(greedStart).toBeLessThan(waka);
  });
});
