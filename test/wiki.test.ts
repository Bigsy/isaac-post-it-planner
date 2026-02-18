import { describe, it, expect } from "vitest";
import {
  wikiUrl,
  bossWikiUrl,
  characterWikiUrl,
  challengeWikiUrl,
  rewardWikiUrl,
  wikiLink,
  REWARD_SKIP,
} from "../src/data/wiki";
import {
  BOSS_SHORT_NAMES,
  BOSS_NAMES,
  COMPLETION_MARKS,
  BASE_CHARACTER_UNLOCKS,
  TAINTED_CHARACTER_UNLOCKS,
} from "../src/data/characters";
import {
  TAINTED_BOSS_SHORT_NAMES,
  TAINTED_BOSS_NAMES,
} from "../src/data/tainted-marks";
import { CHALLENGE_NAMES, CHALLENGE_REWARDS } from "../src/data/challenges";

const WIKI_BASE = "https://bindingofisaacrebirth.fandom.com/wiki/";

describe("wikiUrl", () => {
  it("replaces spaces with underscores", () => {
    expect(wikiUrl("Mega Satan")).toBe(WIKI_BASE + "Mega_Satan");
  });

  it("encodes apostrophes", () => {
    expect(wikiUrl("Mom's Heart")).toBe(WIKI_BASE + "Mom%27s_Heart");
  });

  it("encodes question marks", () => {
    expect(wikiUrl("???")).toBe(WIKI_BASE + "%3F%3F%3F");
  });

  it("handles simple names", () => {
    expect(wikiUrl("Isaac")).toBe(WIKI_BASE + "Isaac");
  });
});

describe("wikiLink", () => {
  it("returns anchor tag for non-null URL", () => {
    const html = wikiLink(WIKI_BASE + "Isaac", "Isaac");
    expect(html).toBe(
      `<a href="${WIKI_BASE}Isaac" target="_blank" rel="noopener" class="wiki-link">Isaac</a>`,
    );
  });

  it("returns plain text for null URL", () => {
    expect(wikiLink(null, "Main")).toBe("Main");
  });
});

describe("bossWikiUrl", () => {
  it("resolves abbreviated boss names", () => {
    expect(bossWikiUrl("Heart")).toBe(WIKI_BASE + "Mom%27s_Heart");
    expect(bossWikiUrl("BB")).toBe(WIKI_BASE + "%3F%3F%3F_(Boss)");
    expect(bossWikiUrl("MSat")).toBe(WIKI_BASE + "Mega_Satan");
    expect(bossWikiUrl("Deli")).toBe(WIKI_BASE + "Delirium_(Boss)");
    expect(bossWikiUrl("Rush")).toBe(WIKI_BASE + "Boss_Rush");
    expect(bossWikiUrl("Mom2")).toBe(WIKI_BASE + "Mother_(Boss)");
    expect(bossWikiUrl("Grd+")).toBe(WIKI_BASE + "Greedier");
  });

  it("resolves full boss names", () => {
    expect(bossWikiUrl("Mom's Heart")).toBe(WIKI_BASE + "Mom%27s_Heart");
    expect(bossWikiUrl("???")).toBe(WIKI_BASE + "%3F%3F%3F_(Boss)");
    expect(bossWikiUrl("Mega Satan")).toBe(WIKI_BASE + "Mega_Satan");
    expect(bossWikiUrl("Delirium")).toBe(WIKI_BASE + "Delirium_(Boss)");
    expect(bossWikiUrl("Mother")).toBe(WIKI_BASE + "Mother_(Boss)");
  });

  it("returns null for bundled tainted categories", () => {
    expect(bossWikiUrl("Main")).toBeNull();
    expect(bossWikiUrl("H+BR")).toBeNull();
    expect(bossWikiUrl("Main Bosses")).toBeNull();
    expect(bossWikiUrl("Hush + Boss Rush")).toBeNull();
  });

  it("passes through simple boss names", () => {
    expect(bossWikiUrl("Isaac")).toBe(WIKI_BASE + "Isaac");
    expect(bossWikiUrl("Satan")).toBe(WIKI_BASE + "Satan");
    expect(bossWikiUrl("Hush")).toBe(WIKI_BASE + "Hush");
    expect(bossWikiUrl("Beast")).toBe(WIKI_BASE + "Beast");
  });
});

describe("characterWikiUrl", () => {
  it("resolves base characters with overrides", () => {
    expect(characterWikiUrl("???")).toBe(WIKI_BASE + "Blue_Baby");
    expect(characterWikiUrl("Forgotten")).toBe(WIKI_BASE + "The_Forgotten");
    expect(characterWikiUrl("Jacob")).toBe(WIKI_BASE + "Jacob_%26_Esau");
    expect(characterWikiUrl("The Forgotten")).toBe(WIKI_BASE + "The_Forgotten");
    expect(characterWikiUrl("Jacob & Esau")).toBe(WIKI_BASE + "Jacob_%26_Esau");
    expect(characterWikiUrl("The Lost")).toBe(WIKI_BASE + "The_Lost");
  });

  it("resolves tainted characters", () => {
    expect(characterWikiUrl("T.Isaac")).toBe(WIKI_BASE + "Tainted_Isaac");
    expect(characterWikiUrl("T.Magdalene")).toBe(WIKI_BASE + "Tainted_Magdalene");
    expect(characterWikiUrl("T.???")).toBe(
      WIKI_BASE + "Tainted_%3F%3F%3F_(Character)",
    );
    expect(characterWikiUrl("T.Lost")).toBe(WIKI_BASE + "Tainted_The_Lost");
    expect(characterWikiUrl("T.Forgotten")).toBe(WIKI_BASE + "Tainted_Forgotten");
    expect(characterWikiUrl("T.Jacob")).toBe(
      WIKI_BASE + "Tainted_Jacob_and_Esau",
    );
  });

  it("passes through simple character names", () => {
    expect(characterWikiUrl("Isaac")).toBe(WIKI_BASE + "Isaac");
    expect(characterWikiUrl("Magdalene")).toBe(WIKI_BASE + "Magdalene");
    expect(characterWikiUrl("Cain")).toBe(WIKI_BASE + "Cain");
  });
});

describe("rewardWikiUrl", () => {
  it("returns null for non-item rewards", () => {
    expect(rewardWikiUrl("2 new pills")).toBeNull();
    expect(rewardWikiUrl("Laz Bleeds More!")).toBeNull();
    expect(rewardWikiUrl("Maggy Now Holds a Pill!")).toBeNull();
    expect(rewardWikiUrl("Samson Feels Healthy!")).toBeNull();
  });

  it("returns URL for item rewards", () => {
    expect(rewardWikiUrl("Chaos Card")).toBe(WIKI_BASE + "Chaos_Card");
    expect(rewardWikiUrl("Epic Fetus")).toBe(WIKI_BASE + "Epic_Fetus");
    expect(rewardWikiUrl("Death's Touch")).toBe(WIKI_BASE + "Death%27s_Touch");
  });
});

// --- Data-driven exhaustive tests ---

describe("exhaustive: every BOSS_SHORT_NAMES entry resolves", () => {
  for (const name of BOSS_SHORT_NAMES) {
    it(`"${name}" → valid URL or override`, () => {
      const url = bossWikiUrl(name);
      // All base boss short names should resolve to a URL (none are null)
      expect(url).not.toBeNull();
      expect(url).toContain(WIKI_BASE);
    });
  }
});

describe("exhaustive: every BOSS_NAMES entry resolves", () => {
  for (const name of BOSS_NAMES) {
    it(`"${name}" → valid URL or override`, () => {
      const url = bossWikiUrl(name);
      expect(url).not.toBeNull();
      expect(url).toContain(WIKI_BASE);
    });
  }
});

describe("exhaustive: every TAINTED_BOSS_SHORT_NAMES entry resolves or skips", () => {
  for (const name of TAINTED_BOSS_SHORT_NAMES) {
    it(`"${name}" → URL or null (bundled)`, () => {
      const url = bossWikiUrl(name);
      if (url !== null) {
        expect(url).toContain(WIKI_BASE);
      }
    });
  }
});

describe("exhaustive: every TAINTED_BOSS_NAMES entry resolves or skips", () => {
  for (const name of TAINTED_BOSS_NAMES) {
    it(`"${name}" → URL or null (bundled)`, () => {
      const url = bossWikiUrl(name);
      if (url !== null) {
        expect(url).toContain(WIKI_BASE);
      }
    });
  }
});

describe("exhaustive: every COMPLETION_MARKS key → valid character URL", () => {
  for (const name of Object.keys(COMPLETION_MARKS)) {
    it(`"${name}" → valid URL`, () => {
      const url = characterWikiUrl(name);
      expect(url).toContain(WIKI_BASE);
    });
  }
});

describe("exhaustive: every BASE_CHARACTER_UNLOCKS value → valid character URL", () => {
  for (const name of Object.values(BASE_CHARACTER_UNLOCKS)) {
    it(`"${name}" → valid URL`, () => {
      const url = characterWikiUrl(name);
      expect(url).toContain(WIKI_BASE);
    });
  }
});

describe("exhaustive: every TAINTED_CHARACTER_UNLOCKS value → valid character URL", () => {
  for (const name of Object.values(TAINTED_CHARACTER_UNLOCKS)) {
    it(`"${name}" → valid URL`, () => {
      const url = characterWikiUrl(name);
      expect(url).toContain(WIKI_BASE);
    });
  }
});

describe("exhaustive: every CHALLENGE_NAMES value → valid challenge URL", () => {
  for (const [id, name] of Object.entries(CHALLENGE_NAMES)) {
    it(`#${id} "${name}" → valid URL`, () => {
      const url = challengeWikiUrl(name);
      expect(url).toContain(WIKI_BASE);
    });
  }
});

describe("exhaustive: every CHALLENGE_REWARDS value → URL or explicit null", () => {
  for (const [id, name] of Object.entries(CHALLENGE_REWARDS)) {
    it(`#${id} "${name}" → URL or null (skip)`, () => {
      const url = rewardWikiUrl(name);
      if (url !== null) {
        expect(url).toContain(WIKI_BASE);
      } else {
        expect(REWARD_SKIP.has(name)).toBe(true);
      }
    });
  }
});
