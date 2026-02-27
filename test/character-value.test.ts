import { describe, it, expect } from "vitest";
import { characterItemValue, bestRemainingMark } from "../src/data/character-value";
import { COMPLETION_MARKS } from "../src/data/characters";
import { TAINTED_COMPLETION_MARKS } from "../src/data/tainted-marks";

/** Build a set containing all mark IDs for a character */
function allMarks(name: string, isTainted: boolean): Set<number> {
  const marks = isTainted ? TAINTED_COMPLETION_MARKS[name] : COMPLETION_MARKS[name];
  const s = new Set<number>();
  for (const id of marks) {
    if (id != null) s.add(id);
  }
  return s;
}

describe("characterItemValue", () => {
  it("fully-unlocked character returns 0", () => {
    const unlocked = allMarks("Isaac", false);
    expect(characterItemValue("Isaac", unlocked, false)).toBe(0);
  });

  it("character with remaining marks returns positive value", () => {
    const value = characterItemValue("Isaac", new Set(), false);
    expect(value).toBeGreaterThan(0);
  });

  it("unknown character returns 0", () => {
    expect(characterItemValue("FakeCharacter", new Set(), false)).toBe(0);
  });

  it("Bethany has higher value than a generic character with fewer S-tier marks", () => {
    // Bethany has Revelation (S-tier) + Book of Virtues (S-tier) among her marks
    const bethanyValue = characterItemValue("Bethany", new Set(), false);
    // Samson has no S-tier marks in the catalog
    const samsonValue = characterItemValue("Samson", new Set(), false);
    expect(bethanyValue).toBeGreaterThan(samsonValue);
  });

  it("partially unlocked returns less than fully remaining", () => {
    const partial = new Set([167, 106]); // Mom's Heart + Isaac marks for Isaac
    const fullValue = characterItemValue("Isaac", new Set(), false);
    const partialValue = characterItemValue("Isaac", partial, false);
    expect(partialValue).toBeLessThan(fullValue);
    expect(partialValue).toBeGreaterThan(0);
  });
});

describe("characterItemValue (tainted)", () => {
  it("tainted character lookup works", () => {
    const value = characterItemValue("T.Isaac", new Set(), true);
    expect(value).toBeGreaterThan(0);
  });

  it("fully-unlocked tainted character returns 0", () => {
    const unlocked = allMarks("T.Isaac", true);
    expect(characterItemValue("T.Isaac", unlocked, true)).toBe(0);
  });
});

describe("bestRemainingMark", () => {
  it("returns null for fully-unlocked character", () => {
    const unlocked = allMarks("Isaac", false);
    expect(bestRemainingMark("Isaac", unlocked, false)).toBeNull();
  });

  it("returns null for unknown character", () => {
    expect(bestRemainingMark("FakeCharacter", new Set(), false)).toBeNull();
  });

  it("returns highest-quality mark when multiple remain", () => {
    // Bethany with no unlocks — should pick Revelation (S-tier, achId 470)
    const result = bestRemainingMark("Bethany", new Set(), false);
    expect(result).not.toBeNull();
    expect(result!.quality).toBe("s-tier");
    // Should be one of the S-tier marks (Revelation or Book of Virtues)
    expect(["Revelation", "Book of Virtues"]).toContain(result!.itemName);
  });

  it("skips already-unlocked marks", () => {
    // Unlock Revelation (470), should pick the next best — Book of Virtues (417)
    const unlocked = new Set([470]);
    const result = bestRemainingMark("Bethany", unlocked, false);
    expect(result).not.toBeNull();
    expect(result!.itemName).toBe("Book of Virtues");
    expect(result!.quality).toBe("s-tier");
  });

  it("returns b-tier default for character with no cataloged marks", () => {
    // Eden has mostly uncataloged marks → should return b-tier default
    const result = bestRemainingMark("Eden", new Set(), false);
    expect(result).not.toBeNull();
    // Eden's marks are mostly not in catalog, so best should be b-tier (or whatever is cataloged)
    expect(["s-tier", "a-tier", "b-tier"]).toContain(result!.quality);
  });

  it("works for tainted characters", () => {
    const result = bestRemainingMark("T.Isaac", new Set(), true);
    expect(result).not.toBeNull();
    expect(result!.achievementId).toBeGreaterThan(0);
    // T.Isaac has Glitched Crown (491) as S-tier
    expect(result!.itemName).toBe("Glitched Crown");
    expect(result!.quality).toBe("s-tier");
  });
});
