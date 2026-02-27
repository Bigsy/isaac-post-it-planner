import { describe, it, expect } from "vitest";
import { ITEM_VALUES, QUALITY_SCORE, getItemValue } from "../src/data/item-values";
import { getAchievement } from "../src/data/achievements";

describe("ITEM_VALUES catalog integrity", () => {
  it("all achievement IDs exist in achievements.ts", () => {
    for (const entry of ITEM_VALUES) {
      const ach = getAchievement(entry.achievementId);
      expect(ach.name, `achId ${entry.achievementId} (${entry.itemName})`).not.toBe("Unknown");
    }
  });

  it("no duplicate achievement IDs", () => {
    const ids = ITEM_VALUES.map((e) => e.achievementId);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("S-tier entries match achievements", () => {
  it("470 → Revelation", () => {
    expect(getAchievement(470).name).toContain("Revelation");
  });

  it("190 → Incubus", () => {
    expect(getAchievement(190).name).toContain("Incubus");
  });

  it("491 → Glitched Crown", () => {
    expect(getAchievement(491).name).toContain("Glitched Crown");
  });

  it("417 → Book of Virtues", () => {
    expect(getAchievement(417).name).toContain("Book of Virtues");
  });

  it("431 → Birthright", () => {
    expect(getAchievement(431).name).toContain("Birthright");
  });

  it("43 → Mom's Knife", () => {
    expect(getAchievement(43).name).toContain("Mom's Knife");
  });

  it("29 → The D6", () => {
    expect(getAchievement(29).name).toContain("D6");
  });
});

describe("toxic entries match achievements", () => {
  it("105 → Missing No.", () => {
    expect(getAchievement(105).name).toContain("Missing No.");
  });

  it("30 → The Scissors", () => {
    expect(getAchievement(30).name).toContain("Scissors");
  });

  it("240 → Sticky Nickels", () => {
    expect(getAchievement(240).name).toContain("Sticky");
  });
});

describe("QUALITY_SCORE", () => {
  it("toxic is negative", () => {
    expect(QUALITY_SCORE["toxic"]).toBeLessThan(0);
  });

  it("s-tier > a-tier > b-tier > c-tier", () => {
    expect(QUALITY_SCORE["s-tier"]).toBeGreaterThan(QUALITY_SCORE["a-tier"]);
    expect(QUALITY_SCORE["a-tier"]).toBeGreaterThan(QUALITY_SCORE["b-tier"]);
    expect(QUALITY_SCORE["b-tier"]).toBeGreaterThan(QUALITY_SCORE["c-tier"]);
    expect(QUALITY_SCORE["c-tier"]).toBeGreaterThan(QUALITY_SCORE["toxic"]);
  });
});

describe("getItemValue", () => {
  it("returns undefined for unlisted achievement ID", () => {
    expect(getItemValue(999)).toBeUndefined();
  });

  it("returns correct entry for known ID", () => {
    const entry = getItemValue(470);
    expect(entry).toBeDefined();
    expect(entry!.itemName).toBe("Revelation");
    expect(entry!.quality).toBe("s-tier");
  });

  it("returns toxic entry", () => {
    const entry = getItemValue(105);
    expect(entry).toBeDefined();
    expect(entry!.quality).toBe("toxic");
  });
});
