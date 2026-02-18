/** Achievement IDs that unlock base characters */
export const BASE_CHARACTER_UNLOCKS: Record<number, string> = {
  1: "Magdalene",
  2: "Cain",
  3: "Judas",
  42: "Eve",
  67: "Samson",
  79: "Azazel",
  80: "Lazarus",
  82: "The Lost",
  199: "Lilith",
  251: "Keeper",
  340: "Apollyon",
  390: "The Forgotten",
  404: "Bethany",
  405: "Jacob & Esau",
};

/** Achievement IDs that unlock tainted characters */
export const TAINTED_CHARACTER_UNLOCKS: Record<number, string> = {
  474: "T.Isaac",
  475: "T.Magdalene",
  476: "T.Cain",
  477: "T.Judas",
  478: "T.???",
  479: "T.Eve",
  480: "T.Samson",
  481: "T.Azazel",
  482: "T.Lazarus",
  483: "T.Eden",
  484: "T.Lost",
  485: "T.Lilith",
  486: "T.Keeper",
  487: "T.Apollyon",
  488: "T.Forgotten",
  489: "T.Bethany",
  490: "T.Jacob",
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
 */
export const COMPLETION_MARKS: Record<string, (number | null)[]> = {
  "Isaac":     [167, 106, 43, 49, 149, 70, 179, 205, 282, 440, 441, 192, 296],
  "Magdalene": [168, 20, 45, 50, 71, 109, 180, 206, 283, 442, 443, 193, 297],
  "Cain":      [171, 21, 46, 75, 51, 110, 181, 207, 284, 444, 445, 194, 298],
  "Judas":     [170, 107, 72, 77, 52, 108, 182, 208, 285, 446, 447, 195, 299],
  "???":       [174, 29, 48, 113, 73, 114, 183, 209, 286, 448, 449, 196, 300],
  "Eve":       [169, 76, 44, 53, 111, 112, 184, 210, 288, 450, 451, 197, 302],
  "Samson":    [177, 54, 56, 55, 74, 115, 185, 211, 287, 452, 453, 198, 301],
  "Azazel":    [172, 126, 127, 128, 47, 9, 186, 212, 290, 454, 455, 199, 304],
  "Lazarus":   [173, 116, 117, 118, 119, 105, 187, 213, 291, 456, 457, 200, 305],
  "Eden":      [176, 121, 122, 123, 124, 125, 188, 214, 289, 458, 459, 201, 303],
  "The Lost":  [175, 129, 130, 131, 132, 133, 189, 215, 293, 460, 461, 202, 307],
  "Lilith":    [223, 218, 220, 219, 221, 222, 190, 216, 292, 462, 463, 203, 306],
  "Keeper":    [241, 236, 237, 238, 239, 240, 191, 217, 294, 464, 465, 204, 308],
  "Apollyon":  [318, 310, 311, 312, 313, 314, 315, 317, 295, 466, 467, 316, 309],
  "Forgotten": [392, 393, 394, 395, 396, 397, 398, 403, 401, 468, 469, 399, 400],
  "Bethany":   [416, 417, 418, 419, 420, 421, 423, 427, 425, 470, 471, 422, 424],
  "Jacob":     [428, 429, 430, 431, 432, 433, 435, 439, 437, 472, 473, 434, 436],
};
