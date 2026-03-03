/**
 * Sprite filename mappings for UI rendering.
 * Maps game entity names (from BOSS_NAMES, COMPLETION_MARKS keys, etc.)
 * to asset filenames in dist/img/.
 */

/** Boss full name → mark sprite slug (used for dist/img/marks/{slug}-done.png) */
export const BOSS_MARK_SLUG: Record<string, string> = {
  "Mom's Heart": "mom-heart",
  "Isaac": "isaac",
  "Satan": "satan",
  "???": "bluebaby",
  "The Lamb": "lamb",
  "Boss Rush": "boss-rush",
  "Hush": "hush",
  "Mega Satan": "megasatan",
  "Delirium": "delirium",
  "Mother": "mother",
  "Beast": "beast",
  "Greed": "greed",
  "Greedier": "greedier",
};

/** Tainted boss name → mark sprite slug (reuses base mark assets) */
export const TAINTED_BOSS_MARK_SLUG: Record<string, string> = {
  "Main Bosses": "isaac",
  "Mother": "mother",
  "Beast": "beast",
  "Ultra Greedier": "greedier",
  "Delirium": "delirium",
  "Mega Satan": "megasatan",
  "Hush + Boss Rush": "hush",
};

/** Boss full name → boss portrait slug (used for dist/img/bosses/{slug}.png) */
export const BOSS_ICON_SLUG: Record<string, string> = {
  ...BOSS_MARK_SLUG,
};

/** Character name (from COMPLETION_MARKS keys) → portrait filename (without .png) */
export const CHARACTER_SPRITE: Record<string, string> = {
  "Isaac": "01_isaac",
  "Magdalene": "02_magdalene",
  "Cain": "03_cain",
  "Judas": "04_judas",
  "???": "06_bluebaby",
  "Eve": "05_eve",
  "Samson": "07_samson",
  "Azazel": "08_azazel",
  "Lazarus": "09_lazarus",
  "Eden": "09_eden",
  "The Lost": "12_thelost",
  "Lilith": "13_lilith",
  "Keeper": "14_keeper",
  "Apollyon": "15_apollyon",
  "Forgotten": "16_theforgotten",
  "The Forgotten": "16_theforgotten",
  "Bethany": "bethany",
  "Jacob": "jacob",
  "Jacob & Esau": "jacob",
};

/** Tainted character name → portrait filename (without .png) */
export const TAINTED_CHARACTER_SPRITE: Record<string, string> = {
  "T.Isaac": "isaac_b",
  "T.Magdalene": "magdalene_b",
  "T.Cain": "cain_b",
  "T.Judas": "judas_b",
  "T.???": "bluebaby_b",
  "T.Eve": "eve_b",
  "T.Samson": "samson_b",
  "T.Azazel": "azazel_b",
  "T.Lazarus": "lazarus_b",
  "T.Eden": "eden_b",
  "T.Lost": "thelost_b",
  "T.Lilith": "lilith_b",
  "T.Keeper": "keeper_b",
  "T.Apollyon": "apollyon_b",
  "T.Forgotten": "theforgotten_b",
  "T.Bethany": "bethany_b",
  "T.Jacob": "jacob_b",
};

/** Get mark sprite path for a boss */
export function markSpritePath(bossName: string, done: boolean): string {
  const slug = BOSS_MARK_SLUG[bossName] ?? TAINTED_BOSS_MARK_SLUG[bossName];
  if (!slug) return "";
  return `img/marks/${slug}-${done ? "done" : "miss"}.png`;
}

/** Get boss icon path */
export function bossIconPath(bossName: string): string {
  const slug = BOSS_ICON_SLUG[bossName] ?? TAINTED_BOSS_MARK_SLUG[bossName];
  if (!slug) return "";
  return `img/bosses/${slug}.png`;
}

/** Get character portrait path */
export function charSpritePath(charName: string): string {
  const file = CHARACTER_SPRITE[charName] ?? TAINTED_CHARACTER_SPRITE[charName];
  if (!file) return "";
  return `img/chars/${file}.png`;
}

/** HUD icon filenames (in dist/img/hud/) for stat cards */
export const HUD_ICONS: Record<string, string> = {
  achievements: "health",
  collectibles: "chest",
  bestiary: "skull",
  momKills: "mark-heart",
  deaths: "cross",
  challenges: "dice",
  winStreak: "luck",
  bestStreak: "luck",
  edenTokens: "key",
  rocksDestroyed: "rock",
  tintedRocks: "tinted-rock",
  poopDestroyed: "poop",
  donationMachine: "coin",
  greedDonation: "gold-coin",
  shopkeepers: "bomb",
};

/** Get HUD icon path for a stat key */
export function hudIconPath(statKey: string): string {
  const file = HUD_ICONS[statKey];
  if (!file) return "";
  return `img/hud/${file}.png`;
}
