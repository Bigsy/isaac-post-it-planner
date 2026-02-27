import { describe, it, expect } from "vitest";
import { PHASE_DEFINITIONS, detectPhase } from "../src/data/phases";
import type { CounterStats } from "../src/types";

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

/** Collect all achievement IDs from phase definitions up through the given phase index */
function achievementIdsThrough(phaseIndex: number): Set<number> {
  const ids = new Set<number>();
  for (let i = 0; i <= phaseIndex; i++) {
    for (const c of PHASE_DEFINITIONS[i].completionCriteria) {
      if (c.achievementId != null) ids.add(c.achievementId);
    }
  }
  return ids;
}

describe("phase definitions", () => {
  it("has 4 phases", () => {
    expect(PHASE_DEFINITIONS).toHaveLength(4);
  });

  it("has unique IDs", () => {
    const ids = PHASE_DEFINITIONS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("each phase has non-empty criteria", () => {
    for (const phase of PHASE_DEFINITIONS) {
      expect(phase.completionCriteria.length).toBeGreaterThan(0);
    }
  });

  it("has correct minDlc values", () => {
    expect(PHASE_DEFINITIONS[0].minDlc).toBeUndefined();
    expect(PHASE_DEFINITIONS[1].minDlc).toBe("afterbirth");
    expect(PHASE_DEFINITIONS[2].minDlc).toBe("repentance");
    expect(PHASE_DEFINITIONS[3].minDlc).toBeUndefined();
  });
});

describe("detectPhase", () => {
  it("empty save → phase-1", () => {
    expect(detectPhase(new Set(), EMPTY_STATS, "repentance")).toBe("phase-1-foundations");
  });

  it("all phase-1 criteria met → phase-2", () => {
    const unlocked = achievementIdsThrough(0);
    expect(detectPhase(unlocked, EMPTY_STATS, "repentance")).toBe("phase-2-expansion");
  });

  it("all phase-1+2 criteria met → phase-3", () => {
    const unlocked = achievementIdsThrough(1);
    expect(detectPhase(unlocked, EMPTY_STATS, "repentance")).toBe("phase-3-repentance");
  });

  it("all phase-1+2+3 criteria met → phase-4", () => {
    const unlocked = achievementIdsThrough(2);
    expect(detectPhase(unlocked, EMPTY_STATS, "repentance")).toBe("phase-4-completion");
  });

  it("all criteria met → phase-4 (fallback)", () => {
    const unlocked = achievementIdsThrough(3);
    expect(detectPhase(unlocked, EMPTY_STATS, "repentance")).toBe("phase-4-completion");
  });

  it("partial phase-1 stays in phase-1", () => {
    // Has Azazel (79) and Mom (4) but missing others
    const unlocked = new Set([79, 4]);
    expect(detectPhase(unlocked, EMPTY_STATS, "repentance")).toBe("phase-1-foundations");
  });

  it("rebirth skips phase-2 and phase-3", () => {
    const unlocked = achievementIdsThrough(0);
    // With rebirth DLC, phase-2 (minDlc: afterbirth) and phase-3 (minDlc: repentance) are skipped
    expect(detectPhase(unlocked, EMPTY_STATS, "rebirth")).toBe("phase-4-completion");
  });

  it("afterbirth+ skips alt-path criterion in phase-2", () => {
    // Phase-2 without ach 407 (alt path, requiredDlc: repentance) — should still pass on AB+
    const unlocked = new Set([
      ...achievementIdsThrough(0),
      234, 320, 58, // phase-2 criteria minus 407
    ]);
    expect(detectPhase(unlocked, EMPTY_STATS, "afterbirth-plus")).toBe("phase-4-completion");
  });

  it("repentance requires alt-path criterion in phase-2", () => {
    const unlocked = new Set([
      ...achievementIdsThrough(0),
      234, 320, 58, // phase-2 criteria minus 407
    ]);
    // On repentance, ach 407 is required
    expect(detectPhase(unlocked, EMPTY_STATS, "repentance")).toBe("phase-2-expansion");
  });
});
