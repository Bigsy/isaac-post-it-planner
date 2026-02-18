/**
 * Tainted character completion marks.
 *
 * Unlike base characters (13 individual boss marks), tainted characters have
 * 7 mark categories — some bosses are bundled into a single achievement:
 *   0: Main Bosses (Isaac + ??? + Satan + The Lamb — one achievement)
 *   1: Mother
 *   2: Beast
 *   3: Ultra Greedier  (non-contiguous IDs! challenge completions interspersed)
 *   4: Delirium
 *   5: Mega Satan
 *   6: Hush + Boss Rush (bundled — one achievement)
 *
 * Each achievement ID hand-verified against achievements.ts unlock descriptions.
 */

export const TAINTED_BOSS_NAMES = [
  "Main Bosses",   // Isaac + ??? + Satan + Lamb bundled
  "Mother",
  "Beast",
  "Ultra Greedier",
  "Delirium",
  "Mega Satan",
  "Hush + Boss Rush",
] as const;

export const TAINTED_BOSS_SHORT_NAMES = [
  "Main", "Mom2", "Beast", "Grd+", "Deli", "MSat", "H+BR",
] as const;

/**
 * Tainted completion mark achievement IDs per character.
 * Each array is indexed by boss (same order as TAINTED_BOSS_NAMES).
 * All IDs verified against achievements.ts.
 */
export const TAINTED_COMPLETION_MARKS: Record<string, number[]> = {
  "T.Isaac":     [548, 549, 491, 541, 584, 601, 618],
  "T.Magdalene": [550, 551, 492, 530, 585, 602, 619],
  "T.Cain":      [552, 553, 493, 534, 586, 603, 620],
  "T.Judas":     [554, 555, 494, 525, 587, 604, 621],
  "T.???":       [556, 557, 495, 528, 588, 605, 622],
  "T.Eve":       [558, 559, 496, 527, 589, 606, 623],
  "T.Samson":    [560, 561, 497, 535, 590, 607, 624],
  "T.Azazel":    [562, 563, 498, 539, 591, 608, 625],
  "T.Lazarus":   [564, 565, 499, 543, 592, 609, 626],
  "T.Eden":      [566, 567, 500, 544, 593, 610, 627],
  "T.Lost":      [568, 569, 501, 524, 594, 611, 628],
  "T.Lilith":    [570, 571, 502, 526, 595, 612, 629],
  "T.Keeper":    [572, 573, 503, 536, 596, 613, 630],
  "T.Apollyon":  [574, 575, 504, 540, 597, 614, 631],
  "T.Forgotten": [576, 577, 505, 537, 598, 615, 632],
  "T.Bethany":   [578, 579, 506, 529, 599, 616, 633],
  "T.Jacob":     [580, 581, 507, 542, 600, 617, 634],
};
