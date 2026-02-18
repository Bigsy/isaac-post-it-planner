import { describe, it, expect } from "vitest";
import { getAchievement, TOTAL_ACHIEVEMENTS } from "../src/data/achievements";
import {
  BASE_CHARACTER_UNLOCKS,
  TAINTED_CHARACTER_UNLOCKS,
  COMPLETION_MARKS,
  BOSS_NAMES,
} from "../src/data/characters";
import { CHALLENGE_NAMES, CHALLENGE_REWARDS, CHALLENGE_ACHIEVEMENT_IDS, TOTAL_CHALLENGES } from "../src/data/challenges";
import { TAINTED_COMPLETION_MARKS, TAINTED_BOSS_NAMES } from "../src/data/tainted-marks";

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

  it("has 17 characters in completion marks", () => {
    expect(Object.keys(COMPLETION_MARKS).length).toBe(17);
  });

  it("completion mark IDs are unique per boss across characters", () => {
    for (let i = 0; i < BOSS_NAMES.length; i++) {
      const seen = new Map<number, string>();
      for (const [char, marks] of Object.entries(COMPLETION_MARKS)) {
        const id = marks[i];
        if (id === null) continue;
        expect(
          seen.has(id),
          `Boss "${BOSS_NAMES[i]}": achievement ${id} used by both ${seen.get(id)} and ${char}`,
        ).toBe(false);
        seen.set(id, char);
      }
    }
  });
});

describe("semantic correctness", () => {
  it("base character unlock IDs resolve to achievements matching the character name", () => {
    // Normalise "&" vs "and" for comparison
    const normalise = (s: string) => s.toLowerCase().replace(/&/g, "and");
    for (const [idStr, name] of Object.entries(BASE_CHARACTER_UNLOCKS)) {
      const ach = getAchievement(Number(idStr));
      expect(
        normalise(ach.name).includes(normalise(name)) ||
          normalise(ach.name) === normalise(name),
        `Achievement ${idStr} ("${ach.name}") should match character "${name}"`,
      ).toBe(true);
    }
  });

  it("tainted character unlock IDs resolve to achievements mentioning Red Key and Home", () => {
    for (const [idStr, name] of Object.entries(TAINTED_CHARACTER_UNLOCKS)) {
      const ach = getAchievement(Number(idStr));
      const text = (ach.inGameDescription + " " + ach.unlockDescription).toLowerCase();
      expect(
        text.includes("red key") && text.includes("home"),
        `Tainted unlock ${idStr} ("${name}") should mention Red Key and Home, got: "${ach.inGameDescription}" / "${ach.unlockDescription}"`,
      ).toBe(true);
    }
  });

  it("spot-check: Isaac's Satan mark is achievement 43 (Mom's Knife)", () => {
    const ach = getAchievement(43);
    expect(ach.unlockDescription.toLowerCase()).toContain("satan");
    expect(ach.unlockDescription.toLowerCase()).toContain("isaac");
  });

  it("spot-check: Magdalene's Isaac mark is achievement 20 (A Cross)", () => {
    const ach = getAchievement(20);
    expect(ach.unlockDescription.toLowerCase()).toContain("isaac");
    expect(ach.unlockDescription.toLowerCase()).toContain("magdalene");
  });

  it("spot-check: Azazel's Boss Rush mark is achievement 9 (The Nail)", () => {
    const ach = getAchievement(9);
    expect(ach.unlockDescription.toLowerCase()).toContain("boss rush");
    expect(ach.unlockDescription.toLowerCase()).toContain("azazel");
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

  it("all 45 challenges have rewards", () => {
    for (let i = 1; i <= 45; i++) {
      expect(CHALLENGE_REWARDS[i], `Challenge #${i} missing reward`).toBeDefined();
    }
  });

  it("all 45 challenges have achievement IDs", () => {
    for (let i = 1; i <= 45; i++) {
      expect(CHALLENGE_ACHIEVEMENT_IDS[i], `Challenge #${i} missing achievement ID`).toBeDefined();
    }
  });

  it("challenge achievement IDs resolve to valid achievements", () => {
    for (const [chStr, achId] of Object.entries(CHALLENGE_ACHIEVEMENT_IDS)) {
      const ach = getAchievement(achId);
      expect(ach.name, `Challenge #${chStr} → achievement ${achId}`).not.toBe("Unknown");
    }
  });

  it("challenge achievement IDs point to achievements that mention the challenge", () => {
    for (const [chStr, achId] of Object.entries(CHALLENGE_ACHIEVEMENT_IDS)) {
      const ach = getAchievement(achId);
      const text = ach.unlockDescription.toLowerCase();
      expect(
        text.includes(`challenge #${chStr}`) || text.includes(`(challenge #${chStr})`),
        `Achievement ${achId} for challenge #${chStr} should mention the challenge, got: "${ach.unlockDescription}"`,
      ).toBe(true);
    }
  });

  it("challenge reward names match their achievement names", () => {
    for (const [chStr, achId] of Object.entries(CHALLENGE_ACHIEVEMENT_IDS)) {
      const ch = Number(chStr);
      const ach = getAchievement(achId);
      const reward = CHALLENGE_REWARDS[ch];
      expect(reward, `Challenge #${ch} reward should match achievement ${achId} name "${ach.name}"`).toBe(ach.name);
    }
  });
});

describe("tainted completion marks", () => {
  it("has 17 tainted characters", () => {
    expect(Object.keys(TAINTED_COMPLETION_MARKS).length).toBe(17);
  });

  it("each tainted character has 7 marks", () => {
    for (const [char, marks] of Object.entries(TAINTED_COMPLETION_MARKS)) {
      expect(marks.length, `${char} should have 7 marks`).toBe(TAINTED_BOSS_NAMES.length);
    }
  });

  it("all tainted mark IDs resolve to valid achievements", () => {
    for (const [char, marks] of Object.entries(TAINTED_COMPLETION_MARKS)) {
      for (const id of marks) {
        const ach = getAchievement(id);
        expect(ach.name, `${char} mark achievement ${id}`).not.toBe("Unknown");
      }
    }
  });

  it("tainted mark IDs are unique across all characters per boss", () => {
    for (let i = 0; i < TAINTED_BOSS_NAMES.length; i++) {
      const seen = new Map<number, string>();
      for (const [char, marks] of Object.entries(TAINTED_COMPLETION_MARKS)) {
        const id = marks[i];
        expect(
          seen.has(id),
          `Boss "${TAINTED_BOSS_NAMES[i]}": achievement ${id} used by both ${seen.get(id)} and ${char}`,
        ).toBe(false);
        seen.set(id, char);
      }
    }
  });

  it("main bosses marks mention Isaac/Satan/Lamb in unlock description", () => {
    for (const [char, marks] of Object.entries(TAINTED_COMPLETION_MARKS)) {
      const ach = getAchievement(marks[0]);
      const desc = ach.unlockDescription.toLowerCase();
      expect(
        desc.includes("isaac") && desc.includes("satan") && desc.includes("lamb"),
        `${char} main bosses mark (${marks[0]}) should mention Isaac, Satan, Lamb: "${ach.unlockDescription}"`,
      ).toBe(true);
    }
  });

  it("mother marks mention 'mother' in unlock description", () => {
    for (const [char, marks] of Object.entries(TAINTED_COMPLETION_MARKS)) {
      const ach = getAchievement(marks[1]);
      expect(
        ach.unlockDescription.toLowerCase().includes("mother"),
        `${char} mother mark (${marks[1]}): "${ach.unlockDescription}"`,
      ).toBe(true);
    }
  });

  it("beast marks mention 'beast' in unlock description", () => {
    for (const [char, marks] of Object.entries(TAINTED_COMPLETION_MARKS)) {
      const ach = getAchievement(marks[2]);
      expect(
        ach.unlockDescription.toLowerCase().includes("beast"),
        `${char} beast mark (${marks[2]}): "${ach.unlockDescription}"`,
      ).toBe(true);
    }
  });

  it("ultra greedier marks mention 'ultra greedier' in unlock description", () => {
    for (const [char, marks] of Object.entries(TAINTED_COMPLETION_MARKS)) {
      const ach = getAchievement(marks[3]);
      expect(
        ach.unlockDescription.toLowerCase().includes("ultra greedier"),
        `${char} ultra greedier mark (${marks[3]}): "${ach.unlockDescription}"`,
      ).toBe(true);
    }
  });

  it("delirium marks mention 'delirium' in unlock description", () => {
    for (const [char, marks] of Object.entries(TAINTED_COMPLETION_MARKS)) {
      const ach = getAchievement(marks[4]);
      expect(
        ach.unlockDescription.toLowerCase().includes("delirium"),
        `${char} delirium mark (${marks[4]}): "${ach.unlockDescription}"`,
      ).toBe(true);
    }
  });

  it("mega satan marks mention 'mega satan' in unlock description", () => {
    for (const [char, marks] of Object.entries(TAINTED_COMPLETION_MARKS)) {
      const ach = getAchievement(marks[5]);
      expect(
        ach.unlockDescription.toLowerCase().includes("mega satan"),
        `${char} mega satan mark (${marks[5]}): "${ach.unlockDescription}"`,
      ).toBe(true);
    }
  });

  it("hush+boss rush marks mention 'hush' and 'boss rush' in unlock description", () => {
    for (const [char, marks] of Object.entries(TAINTED_COMPLETION_MARKS)) {
      const ach = getAchievement(marks[6]);
      const desc = ach.unlockDescription.toLowerCase();
      expect(
        desc.includes("hush") && desc.includes("boss rush"),
        `${char} hush+rush mark (${marks[6]}): "${ach.unlockDescription}"`,
      ).toBe(true);
    }
  });

  it("tainted mark IDs don't overlap with base character mark IDs", () => {
    const baseIds = new Set<number>();
    for (const marks of Object.values(COMPLETION_MARKS)) {
      for (const id of marks) {
        if (id !== null) baseIds.add(id);
      }
    }
    for (const [char, marks] of Object.entries(TAINTED_COMPLETION_MARKS)) {
      for (const id of marks) {
        expect(
          baseIds.has(id),
          `${char} mark ${id} overlaps with base character mark`,
        ).toBe(false);
      }
    }
  });
});

describe("greed donation thresholds", () => {
  it("ach 242 (Lucky Pennies) requires 2 coins", () => {
    expect(getAchievement(242).unlockDescription).toContain("2 Coins");
  });

  it("ach 243 (Special Hanging Shopkeepers) requires 14 coins", () => {
    expect(getAchievement(243).unlockDescription).toContain("14 Coins");
  });

  it("ach 244 (Wooden Nickel) requires 33 coins", () => {
    expect(getAchievement(244).unlockDescription).toContain("33 Coins");
  });

  it("ach 245 (Cain holds Paperclip) requires 68 coins", () => {
    expect(getAchievement(245).unlockDescription).toContain("68 Coins");
  });

  it("ach 251 (Keeper) requires 1000 coins", () => {
    expect(getAchievement(251).unlockDescription).toContain("1000 Coins");
  });
});
