import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { parseSaveFile } from "../src/parser";
import { analyze } from "../src/analyzer";
import {
  categorizeAchievement,
  analyzeMissingUnlocks,
  CATEGORY_ORDER,
  CATEGORY_LABELS,
} from "../src/data/achievement-categories";
import { TOTAL_ACHIEVEMENTS, getAchievement } from "../src/data/achievements";
import type { AchievementCategory } from "../src/types";

const VALID_CATEGORIES = new Set<AchievementCategory>(CATEGORY_ORDER);

const SAMPLE_DIR = join(__dirname, "..", "sample-saves");

function loadAndAnalyze(filename: string) {
  const buf = readFileSync(join(SAMPLE_DIR, filename));
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  return analyze(parseSaveFile(ab));
}

describe("categorizeAchievement", () => {
  it("categorizes character unlocks", () => {
    expect(categorizeAchievement(1)).toBe("characters");   // Magdalene
    expect(categorizeAchievement(2)).toBe("characters");   // Cain
    expect(categorizeAchievement(32)).toBe("characters");  // ???
    expect(categorizeAchievement(199)).toBe("characters"); // Lilith
    expect(categorizeAchievement(340)).toBe("characters"); // Apollyon
    expect(categorizeAchievement(390)).toBe("characters"); // The Forgotten
    expect(categorizeAchievement(404)).toBe("characters"); // Bethany
    expect(categorizeAchievement(405)).toBe("characters"); // Jacob and Esau
  });

  it("categorizes tainted character unlocks (IDs 474-490)", () => {
    expect(categorizeAchievement(474)).toBe("characters"); // Tainted Isaac
    expect(categorizeAchievement(480)).toBe("characters"); // Tainted Samson
    expect(categorizeAchievement(490)).toBe("characters"); // Tainted Jacob
  });

  it("categorizes items", () => {
    expect(categorizeAchievement(7)).toBe("items");   // Book of Revelations
    expect(categorizeAchievement(43)).toBe("items");  // Mom's Knife
    expect(categorizeAchievement(282)).toBe("items"); // D Infinity
    expect(categorizeAchievement(440)).toBe("items"); // Meat Cleaver
  });

  it("categorizes co-op babies", () => {
    expect(categorizeAchievement(167)).toBe("co-op-babies"); // Lost Baby
    expect(categorizeAchievement(205)).toBe("co-op-babies"); // Cry Baby
    expect(categorizeAchievement(252)).toBe("co-op-babies"); // Hive Baby
    expect(categorizeAchievement(416)).toBe("co-op-babies"); // Wisp Baby (non-standard desc)
    expect(categorizeAchievement(426)).toBe("co-op-babies"); // Hope Baby (non-standard desc)
  });

  it("categorizes starting items", () => {
    expect(categorizeAchievement(236)).toBe("starting-items"); // Keeper holds Wooden Nickel
    expect(categorizeAchievement(245)).toBe("starting-items"); // Cain holds Paperclip
    expect(categorizeAchievement(250)).toBe("starting-items"); // Lost holds Holy Mantle
  });

  it("categorizes challenges", () => {
    expect(categorizeAchievement(157)).toBe("challenges"); // Darkness Falls
    expect(categorizeAchievement(265)).toBe("challenges"); // XXXXXXXXL
    expect(categorizeAchievement(277)).toBe("challenges"); // Backasswards
    expect(categorizeAchievement(508)).toBe("challenges"); // Bloody Mary
  });

  it("categorizes cards and runes", () => {
    expect(categorizeAchievement(89)).toBe("cards-runes");  // Rune of Hagalaz
    expect(categorizeAchievement(96)).toBe("cards-runes");  // Rune of Algiz
    expect(categorizeAchievement(524)).toBe("cards-runes"); // The Fool
    expect(categorizeAchievement(544)).toBe("cards-runes"); // The World
    expect(categorizeAchievement(618)).toBe("cards-runes"); // Soul of Isaac
    expect(categorizeAchievement(634)).toBe("cards-runes"); // Soul of Jacob and Esau
  });

  it("categorizes stages and bosses", () => {
    expect(categorizeAchievement(4)).toBe("stages-bosses");   // The Womb
    expect(categorizeAchievement(86)).toBe("stages-bosses");  // The Cellar
    expect(categorizeAchievement(320)).toBe("stages-bosses"); // New Area (Void)
    expect(categorizeAchievement(412)).toBe("stages-bosses"); // Dross
    expect(categorizeAchievement(635)).toBe("stages-bosses"); // A Strange Door
  });

  it("categorizes milestones", () => {
    expect(categorizeAchievement(33)).toBe("milestones");  // Everything Is Terrible
    expect(categorizeAchievement(41)).toBe("milestones");  // Golden God!
    expect(categorizeAchievement(84)).toBe("milestones");  // The Real Platinum God
    expect(categorizeAchievement(547)).toBe("milestones"); // Mega Mush
    expect(categorizeAchievement(637)).toBe("milestones"); // Dead God
  });

  it("returns a valid category for every achievement ID", () => {
    for (let id = 1; id <= TOTAL_ACHIEVEMENTS; id++) {
      const cat = categorizeAchievement(id);
      expect(VALID_CATEGORIES.has(cat), `ID ${id} (${getAchievement(id).name}) returned invalid category: ${cat}`).toBe(true);
    }
  });
});

describe("category count sanity checks", () => {
  const counts = new Map<AchievementCategory, number>();

  for (let id = 1; id <= TOTAL_ACHIEVEMENTS; id++) {
    const cat = categorizeAchievement(id);
    counts.set(cat, (counts.get(cat) ?? 0) + 1);
  }

  it("items is the largest category (> 200)", () => {
    expect(counts.get("items")!).toBeGreaterThan(200);
  });

  it("characters ≥ 30 (14 base + 17 tainted + Bethany/J&E)", () => {
    expect(counts.get("characters")!).toBeGreaterThanOrEqual(30);
  });

  it("co-op-babies > 40", () => {
    expect(counts.get("co-op-babies")!).toBeGreaterThan(40);
  });

  it("cards-runes > 20", () => {
    expect(counts.get("cards-runes")!).toBeGreaterThan(20);
  });

  it("challenges > 15", () => {
    expect(counts.get("challenges")!).toBeGreaterThan(15);
  });

  it("all categories sum to TOTAL_ACHIEVEMENTS", () => {
    let total = 0;
    for (const count of counts.values()) total += count;
    expect(total).toBe(TOTAL_ACHIEVEMENTS);
  });
});

describe("analyzeMissingUnlocks", () => {
  it("empty save = 637 missing", () => {
    const result = analyzeMissingUnlocks(new Set(), TOTAL_ACHIEVEMENTS);
    expect(result.totalMissing).toBe(TOTAL_ACHIEVEMENTS);
  });

  it("full save = 0 missing", () => {
    const allIds = new Set<number>();
    for (let i = 1; i <= TOTAL_ACHIEVEMENTS; i++) allIds.add(i);
    const result = analyzeMissingUnlocks(allIds, TOTAL_ACHIEVEMENTS);
    expect(result.totalMissing).toBe(0);
  });

  it("category totals sum to maxAchId", () => {
    const result = analyzeMissingUnlocks(new Set(), TOTAL_ACHIEVEMENTS);
    const sum = result.categories.reduce((acc, c) => acc + c.total, 0);
    expect(sum).toBe(TOTAL_ACHIEVEMENTS);
  });

  it("DLC filtering: maxAchId=178 produces no IDs > 178", () => {
    const result = analyzeMissingUnlocks(new Set(), 178);
    for (const cat of result.categories) {
      for (const ach of cat.missing) {
        expect(ach.id).toBeLessThanOrEqual(178);
      }
    }
  });

  it("DLC filtering: maxAchId=178 totals sum to 178", () => {
    const result = analyzeMissingUnlocks(new Set(), 178);
    const sum = result.categories.reduce((acc, c) => acc + c.total, 0);
    expect(sum).toBe(178);
  });

  it("has all 8 categories in CATEGORY_ORDER", () => {
    const result = analyzeMissingUnlocks(new Set(), TOTAL_ACHIEVEMENTS);
    expect(result.categories.length).toBe(CATEGORY_ORDER.length);
    for (const cat of result.categories) {
      expect(CATEGORY_LABELS[cat.category]).toBeDefined();
    }
  });
});

describe("integration: sample save missing unlocks", () => {
  it("sample save has correct missing count", () => {
    const result = loadAndAnalyze("rep+persistentgamedata1.dat");
    // unlockedCount=113 includes 1 ID beyond maxAchId (637), so 637-112=525
    expect(result.missingUnlocks.totalMissing).toBe(525);
  });

  it("each category has unlocked + missing = total", () => {
    const result = loadAndAnalyze("rep+persistentgamedata1.dat");
    for (const cat of result.missingUnlocks.categories) {
      expect(cat.unlocked + cat.missing.length).toBe(cat.total);
    }
  });
});
