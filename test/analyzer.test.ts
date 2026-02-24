import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { parseSaveFile } from "../src/parser";
import {
  analyze,
  getUnlockedIds,
  countCollectiblesSeen,
  analyzeCompletionMarks,
  analyzeTaintedCompletionMarks,
  analyzeChallenges,
  analyzeBestiary,
  generateLaneRecommendations,
  evaluateProgressionGates,
  evaluateCharacterUnlocks,
  evaluateCompletionMarks,
  evaluateChallenges,
  evaluateDonation,
  evaluateGuardrails,
} from "../src/analyzer";
import type { CounterStats, BestiaryData } from "../src/types";
import { BESTIARY_ENTITIES, BESTIARY_TOTAL } from "../src/data/bestiary";

const SAMPLE_DIR = join(__dirname, "..", "sample-saves");
const SAMPLE_PATH = join(SAMPLE_DIR, "rep+persistentgamedata1.dat");

function loadSave(filename: string) {
  const buf = readFileSync(join(SAMPLE_DIR, filename));
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  return parseSaveFile(ab);
}

function loadSample() {
  return loadSave("rep+persistentgamedata1.dat");
}

function emptyCounters(): CounterStats {
  return {
    momKills: 0, deaths: 0, momsHeartKills: 0,
    rocksDestroyed: 0, tintedRocksDestroyed: 0, poopDestroyed: 0,
    shopkeeperKills: 0, greedDonationCoins: 0, normalDonationCoins: 0,
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

describe("countCollectiblesSeen", () => {
  it("skips index 0 and counts non-zero entries", () => {
    const result = countCollectiblesSeen([0, 1, 0, 3, 0]);
    expect(result.seen).toBe(2);
    expect(result.total).toBe(4);
  });

  it("handles empty array", () => {
    const result = countCollectiblesSeen([]);
    expect(result.seen).toBe(0);
    expect(result.total).toBe(0);
  });

  it("handles array with only padding", () => {
    const result = countCollectiblesSeen([0]);
    expect(result.seen).toBe(0);
    expect(result.total).toBe(0);
  });

  it("counts all seen when every slot is non-zero", () => {
    const result = countCollectiblesSeen([0, 1, 2, 3]);
    expect(result.seen).toBe(3);
    expect(result.total).toBe(3);
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

  it("returns collectible counts", () => {
    const result = analyze(loadSample());
    expect(result.totalCollectibles).toBeGreaterThan(0);
    expect(result.collectiblesSeen).toBeGreaterThanOrEqual(0);
    expect(result.collectiblesSeen).toBeLessThanOrEqual(result.totalCollectibles);
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
    const recs = evaluateDonation(unlocked, emptyCounters());
    expect(recs.some((r) => r.target.includes("Greed Donation"))).toBe(true);
  });

  it("empty save shows normal donation milestone", () => {
    const unlocked = new Set<number>();
    const recs = evaluateDonation(unlocked, emptyCounters());
    expect(recs.some((r) => r.target.includes("Normal Donation"))).toBe(true);
  });

  it("includes coin progress in greed whyNow", () => {
    const unlocked = new Set<number>();
    const stats = { ...emptyCounters(), greedDonationCoins: 100 };
    const recs = evaluateDonation(unlocked, stats);
    const greed = recs.find((r) => r.target.includes("Greed Donation"));
    expect(greed).toBeDefined();
    expect(greed!.whyNow).toContain("(100/");
  });

  it("includes coin progress in normal whyNow", () => {
    const unlocked = new Set<number>();
    const stats = { ...emptyCounters(), normalDonationCoins: 5 };
    const recs = evaluateDonation(unlocked, stats);
    const normal = recs.find((r) => r.target.includes("Normal Donation"));
    expect(normal).toBeDefined();
    expect(normal!.whyNow).toContain("(5/");
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

// --- Bestiary analysis ---

describe("analyzeBestiary", () => {
  it("returns empty array for null bestiary", () => {
    const result = analyzeBestiary(null);
    expect(result).toEqual([]);
  });

  it("returns entries for all known entities", () => {
    const mockBestiary: BestiaryData = {
      encounters: new Map([["10_0", 5]]),
      kills: new Map([["10_0", 3]]),
      hits: new Map([["10_0", 2]]),
      deaths: new Map([["10_0", 1]]),
    };
    const result = analyzeBestiary(mockBestiary);
    expect(result.length).toBe(BESTIARY_TOTAL);
  });

  it("maps encounter/kill/hit/death counts correctly", () => {
    const mockBestiary: BestiaryData = {
      encounters: new Map([["10_0", 5], ["20_0", 10]]),
      kills: new Map([["10_0", 3], ["20_0", 8]]),
      hits: new Map([["10_0", 2]]),
      deaths: new Map([["20_0", 1]]),
    };
    const result = analyzeBestiary(mockBestiary);
    const gaper = result.find((e) => e.name === "Frowning Gaper")!;
    expect(gaper.encountered).toBe(5);
    expect(gaper.kills).toBe(3);
    expect(gaper.hitsTaken).toBe(2);
    expect(gaper.deathsTo).toBe(0);

    const monstro = result.find((e) => e.name === "Monstro")!;
    expect(monstro.encountered).toBe(10);
    expect(monstro.kills).toBe(8);
    expect(monstro.hitsTaken).toBe(0);
    expect(monstro.deathsTo).toBe(1);
  });

  it("correctly classifies bosses vs regular enemies", () => {
    const result = analyzeBestiary({
      encounters: new Map(),
      kills: new Map(),
      hits: new Map(),
      deaths: new Map(),
    });
    const bosses = result.filter((e) => e.isBoss);
    const regulars = result.filter((e) => !e.isBoss);
    expect(bosses.length).toBeGreaterThan(0);
    expect(regulars.length).toBeGreaterThan(0);
    expect(bosses.length + regulars.length).toBe(BESTIARY_TOTAL);
  });

  it("unencountered entities default to 0 for all stats", () => {
    const result = analyzeBestiary({
      encounters: new Map(),
      kills: new Map(),
      hits: new Map(),
      deaths: new Map(),
    });
    for (const e of result) {
      expect(e.encountered).toBe(0);
      expect(e.kills).toBe(0);
      expect(e.hitsTaken).toBe(0);
      expect(e.deathsTo).toBe(0);
    }
  });
});

describe("analyze with bestiary", () => {
  it("Repentance save has non-empty bestiary", () => {
    const result = analyze(loadSample());
    expect(result.bestiary.length).toBe(BESTIARY_TOTAL);
    expect(result.bestiaryTotal).toBe(BESTIARY_TOTAL);
    expect(result.bestiaryEncountered).toBeGreaterThan(0);
  });

  it("Rebirth save has empty bestiary", () => {
    const result = analyze(loadSave("Rebirth_persistentgamedata.dat"));
    expect(result.bestiary.length).toBe(0);
    expect(result.bestiaryTotal).toBe(0);
    expect(result.bestiaryEncountered).toBe(0);
  });
});

// --- DLC-aware analysis ---

describe("DLC-aware analysis", () => {
  describe("Rebirth save", () => {
    it("detects rebirth DLC level", () => {
      const result = analyze(loadSave("Rebirth_persistentgamedata.dat"));
      expect(result.dlcLevel).toBe("rebirth");
    });

    it("has totalAchievements = 178", () => {
      const result = analyze(loadSave("Rebirth_persistentgamedata.dat"));
      expect(result.totalAchievements).toBe(178);
    });

    it("has 20 challenges", () => {
      const result = analyze(loadSave("Rebirth_persistentgamedata.dat"));
      expect(result.challenges.length).toBe(20);
    });

    it("has 0 tainted characters", () => {
      const result = analyze(loadSave("Rebirth_persistentgamedata.dat"));
      expect(result.taintedCharacters.length).toBe(0);
      expect(result.taintedCompletionGrid.length).toBe(0);
    });

    it("completion grid has 6 boss columns", () => {
      const result = analyze(loadSave("Rebirth_persistentgamedata.dat"));
      expect(result.completionGrid.length).toBeGreaterThan(0);
      expect(result.completionGrid[0].marks.length).toBe(6);
    });

    it("has collectible counts", () => {
      const result = analyze(loadSave("Rebirth_persistentgamedata.dat"));
      expect(result.totalCollectibles).toBeGreaterThan(0);
      expect(result.collectiblesSeen).toBeGreaterThanOrEqual(0);
      expect(result.collectiblesSeen).toBeLessThanOrEqual(result.totalCollectibles);
    });

    it("has no tainted character recommendations", () => {
      const result = analyze(loadSave("Rebirth_persistentgamedata.dat"));
      const taintedRecs = result.laneRecommendations.filter((r) =>
        r.target.includes("T."),
      );
      expect(taintedRecs.length).toBe(0);
    });
  });

  describe("Afterbirth save", () => {
    it("detects afterbirth DLC level", () => {
      const result = analyze(loadSave("Afterbirth_persistentgamedata.dat"));
      expect(result.dlcLevel).toBe("afterbirth");
    });

    it("has totalAchievements = 276", () => {
      const result = analyze(loadSave("Afterbirth_persistentgamedata.dat"));
      expect(result.totalAchievements).toBe(276);
    });

    it("has 30 challenges", () => {
      const result = analyze(loadSave("Afterbirth_persistentgamedata.dat"));
      expect(result.challenges.length).toBe(30);
    });

    it("completion grid has 9 boss columns", () => {
      const result = analyze(loadSave("Afterbirth_persistentgamedata.dat"));
      expect(result.completionGrid.length).toBeGreaterThan(0);
      expect(result.completionGrid[0].marks.length).toBe(9);
    });

    it("has 0 tainted characters", () => {
      const result = analyze(loadSave("Afterbirth_persistentgamedata.dat"));
      expect(result.taintedCharacters.length).toBe(0);
      expect(result.taintedCompletionGrid.length).toBe(0);
    });

    it("has collectible counts", () => {
      const result = analyze(loadSave("Afterbirth_persistentgamedata.dat"));
      expect(result.totalCollectibles).toBeGreaterThan(0);
      expect(result.collectiblesSeen).toBeGreaterThanOrEqual(0);
      expect(result.collectiblesSeen).toBeLessThanOrEqual(result.totalCollectibles);
    });
  });

  describe("Afterbirth+ save", () => {
    it("detects afterbirth-plus DLC level", () => {
      const result = analyze(loadSave("Afterbirth+_persistentgamedata.dat"));
      expect(result.dlcLevel).toBe("afterbirth-plus");
    });

    it("has 35 challenges", () => {
      const result = analyze(loadSave("Afterbirth+_persistentgamedata.dat"));
      expect(result.challenges.length).toBe(35);
    });

    it("completion grid has 11 boss columns", () => {
      const result = analyze(loadSave("Afterbirth+_persistentgamedata.dat"));
      expect(result.completionGrid.length).toBeGreaterThan(0);
      expect(result.completionGrid[0].marks.length).toBe(11);
    });

    it("has 0 tainted characters", () => {
      const result = analyze(loadSave("Afterbirth+_persistentgamedata.dat"));
      expect(result.taintedCharacters.length).toBe(0);
      expect(result.taintedCompletionGrid.length).toBe(0);
    });

    it("has collectible counts", () => {
      const result = analyze(loadSave("Afterbirth+_persistentgamedata.dat"));
      expect(result.totalCollectibles).toBeGreaterThan(0);
      expect(result.collectiblesSeen).toBeGreaterThanOrEqual(0);
      expect(result.collectiblesSeen).toBeLessThanOrEqual(result.totalCollectibles);
    });
  });

  describe("Repentance save", () => {
    it("detects repentance DLC level", () => {
      const result = analyze(loadSample());
      expect(result.dlcLevel).toBe("repentance");
    });

    it("has 45 challenges", () => {
      const result = analyze(loadSample());
      expect(result.challenges.length).toBe(45);
    });

    it("completion grid has 13 boss columns", () => {
      const result = analyze(loadSample());
      expect(result.completionGrid[0].marks.length).toBe(13);
    });

    it("has 17 tainted characters", () => {
      const result = analyze(loadSample());
      expect(result.taintedCharacters.length).toBe(17);
      expect(result.taintedCompletionGrid.length).toBe(17);
    });

    it("has collectible counts", () => {
      const result = analyze(loadSample());
      expect(result.totalCollectibles).toBeGreaterThan(0);
      expect(result.collectiblesSeen).toBeGreaterThanOrEqual(0);
      expect(result.collectiblesSeen).toBeLessThanOrEqual(result.totalCollectibles);
    });
  });

  describe("Rebirth-level filtering", () => {
    it("excludes Repentance-only progression gates", () => {
      const unlocked = new Set<number>();
      const recs = evaluateProgressionGates(unlocked, emptyCounters(), 178);
      // alt-path (ach 407) and home-beast (ach 635) should be excluded
      expect(recs.every((r) => !r.target.includes("Mother"))).toBe(true);
      expect(recs.every((r) => !r.target.includes("Hush 3 times"))).toBe(true);
    });

    it("excludes Afterbirth+ characters from unlocks", () => {
      const unlocked = new Set<number>();
      const recs = evaluateCharacterUnlocks(unlocked, 178);
      // Lilith (199) and later should be excluded
      expect(recs.every((r) => !r.target.includes("Lilith"))).toBe(true);
      expect(recs.every((r) => !r.target.includes("Keeper"))).toBe(true);
      expect(recs.every((r) => !r.target.includes("T."))).toBe(true);
    });

    it("filters completion marks to 6 boss columns", () => {
      const unlocked = new Set<number>();
      const grid = analyzeCompletionMarks(unlocked, 178);
      for (const char of grid) {
        expect(char.marks.length).toBe(6);
      }
    });
  });
});
