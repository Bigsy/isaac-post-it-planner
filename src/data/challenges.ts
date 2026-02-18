/** Challenge names by ID (1-indexed) */
export const CHALLENGE_NAMES: Record<number, string> = {
  1: "Pitch Black",
  2: "High Brow",
  3: "Head Trauma",
  4: "Darkness Falls",
  5: "The Tank",
  6: "Solar System",
  7: "Suicide King",
  8: "Cat Got Your Tongue",
  9: "Demo Man",
  10: "Cursed!",
  11: "Glass Cannon",
  12: "When Life Gives You Lemons",
  13: "Beans!",
  14: "It's in the Cards",
  15: "Slow Roll",
  16: "Computer Savvy",
  17: "Waka Waka",
  18: "The Host",
  19: "The Family Man",
  20: "Purist",
  21: "XXXXXXXXL",
  22: "SPEED!",
  23: "Blue Bomber",
  24: "PAY TO PLAY",
  25: "Have a Heart",
  26: "I RULE!",
  27: "BRAINS!",
  28: "PRIDE DAY!",
  29: "Onan's Streak",
  30: "The Guardian",
  31: "Backasswards",
  32: "Aprils Fool",
  33: "Pokey Mans",
  34: "Ultra Hard",
  35: "Pong",
  36: "Scat Man",
  37: "Bloody Mary",
  38: "Baptism by Fire",
  39: "Isaac's Awakening",
  40: "Seeing Double",
  41: "Pica Run",
  42: "Hot Potato",
  43: "Cantripped",
  44: "Red Redemption",
  45: "DELETE THIS",
};

/**
 * Challenge reward — the achievement name unlocked by completing each challenge.
 * Sourced from achievements.ts unlock descriptions matching "challenge #N".
 * Achievement ID in comment for cross-reference.
 */
export const CHALLENGE_REWARDS: Record<number, string> = {
  1: "Rune of Hagalaz",           // ach 89
  2: "Rune of Jera",              // ach 90
  3: "Rune of Ehwaz",             // ach 91
  4: "Rune of Dagaz",             // ach 92
  5: "Rune of Ansuz",             // ach 93
  6: "Rune of Perthro",           // ach 94
  7: "Suicide King",              // ach 120
  8: "Rune of Algiz",             // ach 96
  9: "Chaos Card",                // ach 97
  10: "Credit Card",              // ach 98
  11: "Rules Card",               // ach 99
  12: "Card Against Humanity",    // ach 100
  13: "Burnt Penny",              // ach 60
  14: "SMB Super Fan",            // ach 63
  15: "Swallowed Penny",          // ach 101
  16: "Robo-Baby 2.0",            // ach 102
  17: "Death's Touch",            // ach 103
  18: "Technology .5",            // ach 104
  19: "Epic Fetus",               // ach 62
  20: "Rune of Berkano",          // ach 95
  21: "Gold Heart",               // ach 224
  22: "Get out of Jail Free Card", // ach 225
  23: "Gold Bomb",                // ach 226
  24: "2 new pills",              // ach 227
  25: "2 new pills",              // ach 228
  26: "Poker Chip",               // ach 229
  27: "Stud Finder",              // ach 230
  28: "D8",                       // ach 231
  29: "Kidney Stone",             // ach 232
  30: "Blank Rune",               // ach 233
  31: "Laz Bleeds More!",         // ach 331
  32: "Maggy Now Holds a Pill!",  // ach 332
  33: "Charged Key",              // ach 333
  34: "Samson Feels Healthy!",    // ach 334
  35: "Greed's Gullet",           // ach 335
  36: "Dirty Mind",               // ach 517
  37: "Sigil of Baphomet",        // ach 518
  38: "Purgatory",                // ach 519
  39: "Spirit Sword",             // ach 520
  40: "Broken Glasses",           // ach 521
  41: "Ice Cube",                 // ach 522
  42: "The Chariot",              // ach 531
  43: "Justice",                  // ach 532
  44: "The Hermit",               // ach 533
  45: "Temperance",               // ach 538
};

/** Achievement ID that each challenge completion unlocks */
export const CHALLENGE_ACHIEVEMENT_IDS: Record<number, number> = {
  1: 89, 2: 90, 3: 91, 4: 92, 5: 93, 6: 94, 7: 120, 8: 96,
  9: 97, 10: 98, 11: 99, 12: 100, 13: 60, 14: 63, 15: 101,
  16: 102, 17: 103, 18: 104, 19: 62, 20: 95, 21: 224, 22: 225,
  23: 226, 24: 227, 25: 228, 26: 229, 27: 230, 28: 231, 29: 232,
  30: 233, 31: 331, 32: 332, 33: 333, 34: 334, 35: 335, 36: 517,
  37: 518, 38: 519, 39: 520, 40: 521, 41: 522, 42: 531, 43: 532,
  44: 533, 45: 538,
};

export const TOTAL_CHALLENGES = 45;
