/** Achievement IDs that unlock base characters */
export const BASE_CHARACTER_UNLOCKS: Record<number, string> = {
  1: "Magdalene",
  2: "Cain",
  3: "Judas",
  23: "Eve",
  26: "Samson",
  29: "Azazel",
  82: "The Lost",
  114: "Lazarus",
  119: "Lilith",
  251: "Keeper",
  331: "Apollyon",
  390: "The Forgotten",
  403: "Bethany",
  404: "Jacob & Esau",
};

/** Achievement IDs that unlock tainted characters */
export const TAINTED_CHARACTER_UNLOCKS: Record<number, string> = {
  530: "T.Isaac",
  531: "T.Magdalene",
  532: "T.Cain",
  533: "T.Judas",
  534: "T.???",
  535: "T.Eve",
  536: "T.Samson",
  537: "T.Azazel",
  538: "T.Lazarus",
  539: "T.Eden",
  540: "T.Lost",
  541: "T.Lilith",
  542: "T.Keeper",
  543: "T.Apollyon",
  544: "T.Forgotten",
  545: "T.Bethany",
  546: "T.Jacob",
};

/** Boss path names in order, matching the marks arrays below */
export const BOSS_NAMES = [
  "Mom's Heart",
  "Isaac",
  "Satan",
  "???",
  "The Lamb",
  "Boss Rush",
  "Hush",
  "Mega Satan",
  "Delirium",
  "Mother",
  "Beast",
  "Greed",
  "Greedier",
] as const;

/** Short boss labels for grid display */
export const BOSS_SHORT_NAMES = [
  "Heart", "Isaac", "Satan", "BB", "Lamb",
  "Rush", "Hush", "MSat", "Deli", "Mom2",
  "Beast", "Greed", "Grd+",
] as const;

/**
 * Completion mark achievement IDs per character.
 * Each array is indexed by boss (same order as BOSS_NAMES).
 * null = mark does not exist for that character (Bethany/Jacob pre-Repentance bosses).
 */
export const COMPLETION_MARKS: Record<string, (number | null)[]> = {
  "Isaac":     [32, 17, 28, 43, 60, 65, 71, 200, 258, 405, 421, 80, 312],
  "Magdalene": [33, 20, 34, 50, 61, 66, 72, 201, 259, 406, 422, 217, 313],
  "Cain":      [34, 21, 35, 51, 62, 67, 73, 202, 260, 407, 423, 218, 314],
  "Judas":     [35, 22, 36, 52, 63, 68, 74, 203, 261, 408, 424, 219, 315],
  "???":       [36, 25, 37, 53, 98, 99, 100, 204, 262, 409, 425, 220, 316],
  "Eve":       [37, 24, 33, 54, 64, 69, 75, 205, 263, 410, 426, 221, 317],
  "Samson":    [181, 27, 38, 55, 182, 183, 184, 206, 264, 411, 427, 222, 318],
  "Azazel":    [177, 178, 179, 180, 185, 9, 76, 207, 265, 412, 428, 223, 319],
  "Lazarus":   [115, 116, 117, 118, 186, 187, 188, 208, 266, 413, 429, 224, 320],
  "Lilith":    [120, 121, 122, 123, 189, 190, 191, 209, 267, 414, 430, 225, 321],
  "Keeper":    [252, 253, 254, 255, 256, 257, 192, 210, 268, 415, 431, 226, 322],
  "Apollyon":  [332, 333, 334, 335, 336, 337, 338, 211, 269, 416, 432, 227, 323],
  "Forgotten": [391, 392, 393, 394, 395, 396, 397, 212, 270, 417, 433, 228, 324],
  "Bethany":   [null, null, null, null, null, null, null, null, null, 418, 434, 229, 325],
  "Jacob":     [null, null, null, null, null, null, null, null, null, 419, 435, 230, 326],
};
