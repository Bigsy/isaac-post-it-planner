import { describe, it, expect } from "vitest";
import { getAchievement, TOTAL_ACHIEVEMENTS } from "../src/data/achievements";
import {
  BASE_CHARACTER_UNLOCKS,
  TAINTED_CHARACTER_UNLOCKS,
  COMPLETION_MARKS,
  BOSS_NAMES,
} from "../src/data/characters";
import { CHALLENGE_NAMES, TOTAL_CHALLENGES } from "../src/data/challenges";

describe("achievements data", () => {
  it("has 637 achievements", () => {
    expect(TOTAL_ACHIEVEMENTS).toBe(637);
  });

  it("returns known achievement by ID", () => {
    const ach = getAchievement(1);
    expect(ach.name).toBe("Magdalene");
  });

  it("returns unknown for out-of-range ID", () => {
    const ach = getAchievement(9999);
    expect(ach.name).toBe("Unknown");
  });
});

describe("character data", () => {
  it("all base character unlock IDs exist in achievements", () => {
    for (const id of Object.keys(BASE_CHARACTER_UNLOCKS).map(Number)) {
      const ach = getAchievement(id);
      expect(ach.name).not.toBe("Unknown");
    }
  });

  it("all tainted character unlock IDs exist in achievements", () => {
    for (const id of Object.keys(TAINTED_CHARACTER_UNLOCKS).map(Number)) {
      const ach = getAchievement(id);
      expect(ach.name).not.toBe("Unknown");
    }
  });

  it("all completion mark IDs exist in achievements", () => {
    for (const [char, marks] of Object.entries(COMPLETION_MARKS)) {
      for (const id of marks) {
        if (id !== null) {
          const ach = getAchievement(id);
          expect(ach.name, `Character ${char}, achievement ${id}`).not.toBe("Unknown");
        }
      }
    }
  });

  it("each character has 13 marks (one per boss)", () => {
    for (const [char, marks] of Object.entries(COMPLETION_MARKS)) {
      expect(marks.length, `${char} should have 13 marks`).toBe(BOSS_NAMES.length);
    }
  });

  it("has 14 base characters", () => {
    expect(Object.keys(BASE_CHARACTER_UNLOCKS).length).toBe(14);
  });

  it("has 17 tainted characters", () => {
    expect(Object.keys(TAINTED_CHARACTER_UNLOCKS).length).toBe(17);
  });

  it("has 15 characters in completion marks", () => {
    expect(Object.keys(COMPLETION_MARKS).length).toBe(15);
  });
});

describe("challenge data", () => {
  it("has 45 challenges", () => {
    expect(TOTAL_CHALLENGES).toBe(45);
    expect(Object.keys(CHALLENGE_NAMES).length).toBe(45);
  });

  it("challenge IDs are 1-45", () => {
    for (let i = 1; i <= 45; i++) {
      expect(CHALLENGE_NAMES[i]).toBeDefined();
    }
  });
});
