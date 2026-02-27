import { BOSS_SHORT_NAMES, BOSS_NAMES } from "./characters";
import { TAINTED_BOSS_SHORT_NAMES, TAINTED_BOSS_NAMES } from "./tainted-marks";

const WIKI_BASE = "https://bindingofisaacrebirth.fandom.com/wiki/";

/** Convert a name to a wiki URL path segment */
function wikiPath(name: string): string {
  return name.replace(/ /g, "_").replace(/'/g, "%27").replace(/\?/g, "%3F");
}

/** Full wiki URL for a name */
export function wikiUrl(name: string): string {
  return WIKI_BASE + wikiPath(name);
}

export function routeWikiUrl(wikiPathName: string): string {
  return wikiUrl(wikiPathName);
}

// --- Boss overrides ---

/** Maps BOSS_NAMES to wiki page paths (null = skip, no single page) */
const BOSS_NAME_OVERRIDES: Partial<Record<string, string | null>> = {
  "Mom's Heart": "Mom%27s_Heart",
  "???": "%3F%3F%3F_(Boss)",
  "Boss Rush": "Boss_Rush",
  "Mega Satan": "Mega_Satan",
  "Delirium": "Delirium_(Boss)",
  "Mother": "Mother_(Boss)",
};

/** Maps BOSS_SHORT_NAMES to wiki page paths (null = skip) */
const BOSS_SHORT_OVERRIDES: Partial<Record<string, string | null>> = {
  Heart: "Mom%27s_Heart",
  BB: "%3F%3F%3F_(Boss)",
  Rush: "Boss_Rush",
  MSat: "Mega_Satan",
  Deli: "Delirium_(Boss)",
  Mom2: "Mother_(Boss)",
  "Grd+": "Greedier",
};

/** Maps TAINTED_BOSS_SHORT_NAMES to wiki page paths (null = skip) */
const TAINTED_BOSS_SHORT_OVERRIDES: Partial<Record<string, string | null>> = {
  Main: null,
  Mom2: "Mother_(Boss)",
  "Grd+": "Greedier",
  Deli: "Delirium_(Boss)",
  MSat: "Mega_Satan",
  "H+BR": null,
};

/** Maps TAINTED_BOSS_NAMES to wiki page paths (null = skip) */
const TAINTED_BOSS_NAME_OVERRIDES: Partial<Record<string, string | null>> = {
  "Main Bosses": null,
  "Ultra Greedier": "Greedier",
  "Delirium": "Delirium_(Boss)",
  "Mega Satan": "Mega_Satan",
  "Mother": "Mother_(Boss)",
  "Hush + Boss Rush": null,
};

export function bossWikiUrl(shortName: string): string | null {
  // Check short name overrides first
  if (shortName in BOSS_SHORT_OVERRIDES) {
    const path = BOSS_SHORT_OVERRIDES[shortName];
    return path === null ? null : WIKI_BASE + path;
  }
  if (shortName in TAINTED_BOSS_SHORT_OVERRIDES) {
    const path = TAINTED_BOSS_SHORT_OVERRIDES[shortName];
    return path === null ? null : WIKI_BASE + path;
  }
  // Check full name overrides
  if (shortName in BOSS_NAME_OVERRIDES) {
    const path = BOSS_NAME_OVERRIDES[shortName];
    return path === null ? null : WIKI_BASE + path;
  }
  if (shortName in TAINTED_BOSS_NAME_OVERRIDES) {
    const path = TAINTED_BOSS_NAME_OVERRIDES[shortName];
    return path === null ? null : WIKI_BASE + path;
  }
  // Default: use name directly
  return wikiUrl(shortName);
}

// --- Character overrides ---

/** Maps character keys (from COMPLETION_MARKS / unlock names) to wiki paths */
const CHARACTER_OVERRIDES: Record<string, string> = {
  "???": "Blue_Baby",
  Forgotten: "The_Forgotten",
  Jacob: "Jacob_%26_Esau",
  "The Forgotten": "The_Forgotten",
  "Jacob & Esau": "Jacob_%26_Esau",
  "The Lost": "The_Lost",
  "T.Isaac": "Tainted_Isaac",
  "T.Magdalene": "Tainted_Magdalene",
  "T.Cain": "Tainted_Cain",
  "T.Judas": "Tainted_Judas",
  "T.???": "Tainted_%3F%3F%3F_(Character)",
  "T.Eve": "Tainted_Eve",
  "T.Samson": "Tainted_Samson",
  "T.Azazel": "Tainted_Azazel",
  "T.Lazarus": "Tainted_Lazarus",
  "T.Eden": "Tainted_Eden",
  "T.Lost": "Tainted_The_Lost",
  "T.Lilith": "Tainted_Lilith",
  "T.Keeper": "Tainted_Keeper",
  "T.Apollyon": "Tainted_Apollyon",
  "T.Forgotten": "Tainted_Forgotten",
  "T.Bethany": "Tainted_Bethany",
  "T.Jacob": "Tainted_Jacob_and_Esau",
};

export function characterWikiUrl(name: string): string {
  if (name in CHARACTER_OVERRIDES) {
    return WIKI_BASE + CHARACTER_OVERRIDES[name];
  }
  return wikiUrl(name);
}

// --- Challenge overrides ---

export function challengeWikiUrl(name: string): string {
  return wikiUrl(name);
}

// --- Reward overrides ---

/** Rewards that aren't straightforward wiki item pages */
const REWARD_SKIP: Set<string> = new Set([
  "2 new pills",
  "Laz Bleeds More!",
  "Maggy Now Holds a Pill!",
  "Samson Feels Healthy!",
]);

export function rewardWikiUrl(name: string): string | null {
  if (REWARD_SKIP.has(name)) return null;
  return wikiUrl(name);
}

// --- Achievement overrides ---

/** Achievements that don't have meaningful standalone wiki pages */
const ACHIEVEMENT_SKIP = new Set([
  "Golden God!",
  "Dead God",
  "The Real Platinum God",
  "Platinum God!",
  "1001%",
  "1000000%",
  "2 new pills",
  "Everything Is Terrible!!!",
  "Everything is Terrible 2!!!",
  "DELETE THIS",
  "RERUN",
  "Generosity",
  "Mega",
  "Hat trick!",
  "INVALID_DESCRIPTION",
]);

/** Achievement names that need wiki path overrides */
const ACHIEVEMENT_NAME_OVERRIDES: Record<string, string> = {
  "???": "Blue_Baby",
  "???'s Soul": "%3F%3F%3F%27s_Soul",
  "???'s Only Friend": "%3F%3F%3F%27s_Only_Friend",
  "Soul of\u00a0???": "Soul_of_%3F%3F%3F",
};

export function achievementWikiUrl(name: string): string | null {
  if (ACHIEVEMENT_SKIP.has(name)) return null;
  if (name in ACHIEVEMENT_NAME_OVERRIDES) {
    return WIKI_BASE + ACHIEVEMENT_NAME_OVERRIDES[name];
  }
  return wikiUrl(name);
}

// --- HTML helpers ---

export function wikiLink(url: string | null, text: string): string {
  if (url === null) return text;
  return `<a href="${url}" target="_blank" rel="noopener" class="wiki-link">${text}</a>`;
}

// Re-export for tests
export {
  BOSS_NAME_OVERRIDES,
  BOSS_SHORT_OVERRIDES,
  TAINTED_BOSS_SHORT_OVERRIDES,
  TAINTED_BOSS_NAME_OVERRIDES,
  CHARACTER_OVERRIDES,
  REWARD_SKIP,
  ACHIEVEMENT_SKIP,
  ACHIEVEMENT_NAME_OVERRIDES,
};
