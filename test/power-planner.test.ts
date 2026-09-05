import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import {
  analyze,
  deduplicateActionItems,
  analyzeCompletionMarks,
  analyzeTaintedCompletionMarks,
  parseCounterStats,
} from "../src/analyzer";
import { parseSaveFile } from "../src/parser";
import {
  buildRunPlans,
  toActionItems,
  routeRequirements,
} from "../src/run-planner";
import {
  scoreAction,
  DEFAULT_PREFERENCES,
  compareScoredActions,
} from "../src/planner-scoring";
import { UNLOCK_VALUES, unlockValue } from "../src/data/unlock-values";
import { COMMUNITY_META } from "../src/data/community-meta";
import { getAchievement } from "../src/data/achievements";
import { PROGRESSION_GATES } from "../src/data/progression";
import { ROUTES } from "../src/data/run-paths";
import {
  BASE_CHARACTER_UNLOCKS,
  TAINTED_CHARACTER_UNLOCKS,
} from "../src/data/characters";
import type { ActionItem, SaveData, CharacterProgress } from "../src/types";

function fixture(name: string): SaveData {
  const b = readFileSync(new URL(`../sample-saves/${name}`, import.meta.url));
  return parseSaveFile(
    b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength),
  );
}
function saveWithLocked(ids: number[]): SaveData {
  const s = fixture("rep+persistentgamedata1.dat");
  s.achievements = Array(638).fill(1);
  s.achievements[0] = 0;
  for (const id of ids) s.achievements[id] = 0;
  s.challenges = Array(46).fill(1);
  return s;
}
function action(ids: number[], burden = 10): ActionItem {
  return {
    id: ids.join("-"),
    headline: "A run",
    detail: "One win",
    tier: "backlog",
    score: 0,
    category: "run",
    blocked: false,
    effort: "single-run",
    achievementIds: ids,
    completedAchievementIds: ids,
    burden,
    goals: ids.map((id) => ({
      type: "completion-mark",
      boss: "Beast",
      achievementId: id,
      description: "reward",
    })),
  };
}
const shortlist = (r: ReturnType<typeof analyze>) =>
  r.actionItems.filter((a) => a.tier === 1 || a.tier === 2);

describe("reviewed reward data", () => {
  it("maps every reviewed name to its achievement, allowing only documented display aliases", () => {
    const aliases: Record<number, string> = {
      250: "Lost holds Holy Mantle",
      191: "Keeper now holds... A Penny!",
    };
    expect(new Set(UNLOCK_VALUES.map((v) => v.achievementId)).size).toBe(
      UNLOCK_VALUES.length,
    );
    for (const v of UNLOCK_VALUES) {
      expect(getAchievement(v.achievementId).name).toBe(
        aliases[v.achievementId] ?? v.name,
      );
      expect(v.sourceUrls.length).toBeGreaterThan(0);
      expect(v.powerValue).toBeGreaterThanOrEqual(0);
      expect(v.powerValue).toBeLessThanOrEqual(1);
    }
    expect(COMMUNITY_META[415].note).toBe("Red Key");
    expect(COMMUNITY_META[499]).toBeUndefined();
  });
  it("distinguishes guaranteed upgrades, random items, systems and unknown rewards", () => {
    expect(unlockValue(29).availability).toBe("guaranteed-start");
    expect(unlockValue(463).availability).toBe("random-pool");
    expect(unlockValue(635).availability).toBe("system");
    expect(unlockValue(167).powerValue).toBe(0);
    expect(unlockValue(106).confidence).toBe("provisional");
    expect(scoreAction(action([106])).itemQuality).toBe("unreviewed");
  });
  it("accounts for the relevant DLC changes", () => {
    expect(unlockValue(191, "afterbirth").powerValue).toBeLessThan(
      unlockValue(191, "repentance").powerValue,
    );
    expect(unlockValue(332, "afterbirth-plus").benefit).toContain("Speed Up");
    expect(unlockValue(332, "repentance").benefit).toContain("Full Health");
    expect(unlockValue(282, "afterbirth-plus").powerValue).toBeLessThan(
      unlockValue(282, "repentance").powerValue,
    );
  });
});

describe("shared scoring", () => {
  it("a strong single reward beats ordinary cleanup at equal burden", () => {
    expect(scoreAction(action([463])).score).toBeGreaterThan(
      scoreAction(action([106, 51, 55, 179])).score,
    );
  });
  it("extra babies give no solo benefit but retain completion value", () => {
    const one = action([463]);
    const babies = action([463, 167, 168, 171]);
    expect(scoreAction(babies).score).toBe(scoreAction(one).score);
    const prefs = { ...DEFAULT_PREFERENCES, objective: "completion" as const };
    expect(scoreAction(babies, prefs).score).toBeGreaterThan(
      scoreAction(one, prefs).score,
    );
  });
  it("incidental weak rewards never dilute a strong primary and bonuses are bounded", () => {
    const best = scoreAction(action([491]));
    const extra = scoreAction(action([491, 106, 51, 55, 179]));
    expect(extra.primaryAchievementId).toBe(491);
    expect(extra.score).toBeGreaterThanOrEqual(best.score);
    expect(extra.scoreBreakdown!.additionalBenefit).toBeLessThanOrEqual(10);
    expect(extra.scoreBreakdown!.completionBenefit).toBeLessThanOrEqual(5);
  });
  it("compares equal rewards by actual route burden", () => {
    expect(scoreAction(action([463], 8)).score).toBeGreaterThan(
      scoreAction(action([463], 15)).score,
    );
  });
  it("does not award full value for partial bundles or count a reward twice", () => {
    const partial = action([]);
    partial.progressAchievementIds = [491];
    partial.achievementIds = [491];
    const scored = scoreAction(partial);
    expect(scored.scoreBreakdown!.primaryBenefit).toBe(0);
    expect(scored.score).toBeLessThan(scoreAction(action([491])).score);
    const duplicate = action([491, 491]);
    duplicate.progressAchievementIds = [491];
    expect(scoreAction(duplicate).score).toBe(scoreAction(action([491])).score);
  });
  it("deduplicates equivalent outcomes while preserving partial and full targets", () => {
    const full = scoreAction(action([491]));
    const partial = scoreAction({
      ...action([]),
      id: "partial",
      achievementIds: [491],
      progressAchievementIds: [491],
    });
    const equivalent = { ...full, id: "equivalent", score: full.score - 1 };
    const r = deduplicateActionItems([full, partial, equivalent], true);
    expect(r.items.map((a) => a.id)).toContain("partial");
    expect(r.items).toHaveLength(2);
    expect(r.suppressedItems![0].reason).toContain("equivalent");
  });
  it("ordering is transitive even inside the old two-point window", () => {
    const items = [0, 1, 2, 3].map((i) => ({
      ...action([i]),
      id: `a${i}`,
      score: 50 + i * 0.75,
    }));
    const sorted = [...items].sort(compareScoredActions);
    expect(sorted.map((a) => a.score)).toEqual([52.25, 51.5, 50.75, 50]);
    for (let i = 0; i < sorted.length; i++)
      for (let j = i + 1; j < sorted.length; j++)
        expect(compareScoredActions(sorted[i], sorted[j])).toBeLessThan(0);
  });
});

describe("coverage and availability", () => {
  it("keeps a dedicated C Section run with exactly one missing reward and no gate bonus", () => {
    const r = analyze(saveWithLocked([463]), { debug: true });
    const a = r.actionItems.find((a) =>
      a.completedAchievementIds?.includes(463),
    )!;
    expect(a).toBeDefined();
    expect(a.blocked).toBe(false);
    expect(a.completedAchievementIds).toEqual([463]);
    expect(a.progressAchievementIds).toEqual([]);
    expect(a.scoreBreakdown!.setupBenefit).toBe(0);
    expect(r.missingPower.find((t) => t.achievementId === 463)?.status).toBe(
      "Available now",
    );
  });
  it("keeps Mother rewards after Home is unlocked", () => {
    const r = analyze(saveWithLocked([470, 464, 444]));
    for (const id of [470, 464, 444])
      expect(
        r.actionItems.some((a) => a.completedAchievementIds?.includes(id)),
      ).toBe(true);
  });
  it("generates every audited live-save target without fixture-specific rules", () => {
    const ids = [463, 491, 190, 502, 470, 584, 464, 504, 444];
    const r = analyze(saveWithLocked(ids));
    for (const id of ids) {
      expect(r.missingPower.some((t) => t.achievementId === id)).toBe(true);
      expect(
        r.actionItems.some((a) => a.completedAchievementIds?.includes(id)),
      ).toBe(true);
    }
  });
  it("does not infer a grind or skill from an empty post-it or death counters", () => {
    const s = saveWithLocked([491, 548, 549, 541, 584, 601, 618]);
    const r = analyze(s);
    const a = r.actionItems.find((a) => a.primaryAchievementId === 491)!;
    expect(a.effort).toBe("single-run");
    s.counters[10] = 100000;
    expect(analyze(s).actionItems.find((x) => x.id === a.id)?.score).toBe(
      a.score,
    );
  });
  it("preserves more than five candidates and multiple routes for a character", () => {
    const s = saveWithLocked([43, 49, 190, 463, 470, 491, 584, 444, 464]);
    const unlocked = new Set(s.achievements.flatMap((v, i) => (v ? [i] : [])));
    const grid = analyzeCompletionMarks(unlocked);
    const tainted = analyzeTaintedCompletionMarks(unlocked);
    const plans = buildRunPlans(
      grid,
      tainted,
      unlocked,
      new Set([...grid, ...tainted].map((c) => c.name)),
      analyze(s).phaseProgress!,
      PROGRESSION_GATES,
      parseCounterStats(s.counters, s.dlcLevel),
      s.dlcLevel,
      637,
    );
    expect(plans.length).toBeGreaterThan(5);
    expect(
      plans.filter((p) => p.character === "Lilith").length,
    ).toBeGreaterThan(1);
  });
  it("blocks unavailable characters and route gates", () => {
    const lilithId = Number(
      Object.entries(BASE_CHARACTER_UNLOCKS).find(
        ([, name]) => name === "Lilith",
      )![0],
    );
    for (const locked of [
      [463, lilithId],
      [463, 635],
      [470, 407],
    ]) {
      const s = saveWithLocked(locked);
      const r = analyze(s);
      const target = locked[0];
      expect(
        r.actionItems.some((a) => a.completedAchievementIds?.includes(target)),
      ).toBe(false);
      expect(
        r.missingPower.find((t) => t.achievementId === target)?.status,
      ).not.toBe("Available now");
    }
  });
  it("requires the actual Greedier unlock and correct DLC", () => {
    const route = ROUTES.find((r) => r.id === "greedier")!;
    const stats = parseCounterStats([], "repentance");
    expect(
      routeRequirements(route, new Set(), stats, "repentance").length,
    ).toBeGreaterThan(0);
    expect(
      routeRequirements(route, new Set([341]), stats, "repentance"),
    ).toEqual([]);
    expect(
      routeRequirements(route, new Set([341]), stats, "afterbirth").length,
    ).toBeGreaterThan(0);
  });
  it("keeps tainted bundles and repeated kill gates as progress", () => {
    const r = analyze(saveWithLocked([548, 618, 57]), { debug: true });
    for (const a of r.actionItems.filter((a) => a.category === "run")) {
      expect(a.completedAchievementIds).not.toContain(548);
      expect(a.completedAchievementIds).not.toContain(618);
      expect(a.completedAchievementIds).not.toContain(57);
    }
    expect(
      r.actionItems.some((a) => a.progressAchievementIds?.includes(548)),
    ).toBe(true);
  });
  it("never invents a one-run Godhead, Mega Mush or Death Certificate unlock", () => {
    const r = analyze(saveWithLocked([156, 547, 636, 463]));
    for (const id of [156, 547, 636]) {
      expect(r.missingPower.find((t) => t.achievementId === id)?.status).toBe(
        "Long-term",
      );
      expect(
        r.actionItems.some((a) => a.completedAchievementIds?.includes(id)),
      ).toBe(false);
    }
  });
  it("keeps the missing-power list independent of display caps", () => {
    const r = analyze(
      saveWithLocked(UNLOCK_VALUES.map((v) => v.achievementId)),
    );
    expect(r.missingPower).toHaveLength(UNLOCK_VALUES.length);
    expect(r.missingPower.length).toBeGreaterThan(shortlist(r).length);
  });
  it("honours timed and character exclusions without hiding valuable targets", () => {
    const r = analyze(saveWithLocked([463, 491, 190, 584]), {
      preferences: { avoidedCharacters: ["Lilith"], noTimedRuns: true },
    });
    expect(
      shortlist(r).every((a) => a.character !== "Lilith" && !a.timed),
    ).toBe(true);
    for (const id of [463, 190, 584])
      expect(r.missingPower.find((t) => t.achievementId === id)?.status).toBe(
        "Excluded by your preferences",
      );
  });
  it("does not silently ignore all-character exclusions", () => {
    const s = saveWithLocked([463, 491, 103]);
    s.challenges[17] = 0;
    const r = analyze(s, {
      preferences: {
        avoidedCharacters: [
          ...analyzeCompletionMarks(new Set()).map((c) => c.name),
          ...Object.values(TAINTED_CHARACTER_UNLOCKS),
        ],
      },
    });
    expect(shortlist(r)).toHaveLength(0);
  });
  it("challenge unlock flags block Solar System until actually available", () => {
    const s = saveWithLocked([94, 159]);
    s.challenges[6] = 0;
    expect(
      analyze(s).missingPower.find((t) => t.achievementId === 94)?.status,
    ).toBe("Needs setup");
    s.achievements[159] = 1;
    expect(
      analyze(s).missingPower.find((t) => t.achievementId === 94)?.status,
    ).toBe("Available now");
  });
});

describe("all repository fixtures", () => {
  for (const name of readdirSync(
    new URL("../sample-saves", import.meta.url),
  ).filter((n) => n.endsWith(".dat"))) {
    it(`${name}: stable, feasible, DLC-filtered and explainable`, () => {
      const s = fixture(name);
      const r = analyze(s, { debug: true });
      expect(analyze(s, { debug: true })).toEqual(r);
      for (const a of shortlist(r)) {
        expect(a.blocked).toBe(false);
        expect(a.excluded).toBe(false);
        expect(a.category).not.toBe("daily");
        expect(a.category).not.toBe("donation");
        expect(a.scoreBreakdown!.finalScore).toBe(a.score);
        const b = a.scoreBreakdown!;
        expect(a.score).toBeCloseTo(
          Math.max(
            0,
            b.primaryBenefit! +
              b.setupBenefit! +
              b.additionalBenefit! +
              b.completionBenefit! -
              b.burden!,
          ),
        );
      }
      for (const t of r.missingPower) {
        expect(s.achievements[t.achievementId]).toBe(0);
        expect(t.achievementId).toBeLessThanOrEqual(r.totalAchievements);
      }
      if (s.dlcLevel !== "repentance")
        expect(
          r.actionItems.some(
            (a) =>
              a.character?.startsWith("T.") ||
              ["Home", "Mother"].includes(a.route ?? ""),
          ),
        ).toBe(false);
    });
  }
  it("early progression remains useful when major rewards are blocked", () => {
    const r = analyze(fixture("fixture-earlygame-sparse.dat"));
    expect(shortlist(r).length).toBeGreaterThan(0);
    expect(
      shortlist(r).some(
        (a) => a.setupTarget || (a.completedAchievementIds?.length ?? 0) > 0,
      ),
    ).toBe(true);
  });
});

describe("selection and session regressions", () => {
  it("does not let roster-completion phases beat an accessible power reward", () => {
    const result = analyze(saveWithLocked([490, 463]), { debug: true });
    expect(shortlist(result)[0].primaryAchievementId).toBe(463);
    const jacob = result.actionItems.find(
      (a) => a.id === "unlock:char:t-jacob",
    )!;
    expect(jacob.scoreBreakdown!.phaseAlignment).toBe(0);
    expect(jacob.score).toBeLessThan(shortlist(result)[0].score);
  });
  it("easier selected options really have lower burden", () => {
    const s = saveWithLocked([491, 93]);
    s.challenges[5] = 0;
    const result = analyze(s);
    const best = shortlist(result)[0];
    const easier = result.actionItems.find(
      (a) => a.selectionLabel === "Easier useful run",
    );
    expect(easier).toBeDefined();
    expect(easier!.burden).toBeLessThan(best.burden!);
    expect(easier!.primaryAchievementId).not.toBe(best.primaryAchievementId);
  });
  it("no-timed-runs still permits working toward Blue Womb access", () => {
    const result = analyze(saveWithLocked([234]), {
      preferences: { noTimedRuns: true },
    });
    const gate = result.actionItems.find((a) => a.id === "gate:blue-womb")!;
    expect(gate.timed).toBe(false);
    expect(gate.excluded).toBe(false);
  });
  it("Red Key follows standard Home requirements and all-character exclusions", () => {
    const s = saveWithLocked([415, 57, 78]);
    expect(
      analyze(s).missingPower.find((t) => t.achievementId === 415)?.status,
    ).toBe("Needs setup");
    s.achievements[57] = 1;
    const all = [
      ...analyzeCompletionMarks(new Set()).map((c) => c.name),
      ...Object.values(TAINTED_CHARACTER_UNLOCKS),
    ];
    expect(
      analyze(s, { preferences: { avoidedCharacters: all } }).missingPower.find(
        (t) => t.achievementId === 415,
      )?.status,
    ).toBe("Excluded by your preferences");
  });
});
