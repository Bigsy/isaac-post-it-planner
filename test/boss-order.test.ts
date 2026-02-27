import { describe, it, expect } from "vitest";
import { BASE_BOSS_PRIORITY, TAINTED_BOSS_PRIORITY, getBossPriority } from "../src/data/boss-order";
import { BOSS_NAMES } from "../src/data/characters";
import { TAINTED_BOSS_NAMES } from "../src/data/tainted-marks";

describe("base boss priority", () => {
  it("covers all 13 base bosses", () => {
    for (const name of BOSS_NAMES) {
      expect(BASE_BOSS_PRIORITY).toHaveProperty(name);
    }
    expect(Object.keys(BASE_BOSS_PRIORITY)).toHaveLength(BOSS_NAMES.length);
  });

  it("Greedier has lowest priority (0)", () => {
    expect(BASE_BOSS_PRIORITY["Greedier"]).toBe(0);
  });

  it("Mom's Heart has highest priority (12)", () => {
    expect(BASE_BOSS_PRIORITY["Mom's Heart"]).toBe(12);
  });

  it("all values are unique", () => {
    const values = Object.values(BASE_BOSS_PRIORITY);
    expect(new Set(values).size).toBe(values.length);
  });
});

describe("tainted boss priority", () => {
  it("covers all 7 tainted bosses", () => {
    for (const name of TAINTED_BOSS_NAMES) {
      expect(TAINTED_BOSS_PRIORITY).toHaveProperty(name);
    }
    expect(Object.keys(TAINTED_BOSS_PRIORITY)).toHaveLength(TAINTED_BOSS_NAMES.length);
  });

  it("Ultra Greedier has lowest priority (0)", () => {
    expect(TAINTED_BOSS_PRIORITY["Ultra Greedier"]).toBe(0);
  });

  it("Mother has highest priority (6)", () => {
    expect(TAINTED_BOSS_PRIORITY["Mother"]).toBe(6);
  });

  it("all values are unique", () => {
    const values = Object.values(TAINTED_BOSS_PRIORITY);
    expect(new Set(values).size).toBe(values.length);
  });
});

describe("getBossPriority", () => {
  it("returns base priority when isTainted=false", () => {
    expect(getBossPriority("Greedier", false)).toBe(0);
    expect(getBossPriority("Mom's Heart", false)).toBe(12);
    expect(getBossPriority("Isaac", false)).toBe(5);
  });

  it("returns tainted priority when isTainted=true", () => {
    expect(getBossPriority("Ultra Greedier", true)).toBe(0);
    expect(getBossPriority("Mother", true)).toBe(6);
    expect(getBossPriority("Main Bosses", true)).toBe(4);
  });

  it("returns 99 for unknown boss", () => {
    expect(getBossPriority("Fake Boss", false)).toBe(99);
    expect(getBossPriority("Fake Boss", true)).toBe(99);
  });
});
