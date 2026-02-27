export type ItemQuality = "s-tier" | "a-tier" | "b-tier" | "c-tier" | "toxic";

export interface ItemValueEntry {
  achievementId: number;
  itemName: string;
  quality: ItemQuality;
  reason?: string;
}

export const QUALITY_SCORE: Record<ItemQuality, number> = {
  "s-tier": 1.0,
  "a-tier": 0.7,
  "b-tier": 0.4,
  "c-tier": 0.15,
  "toxic": -0.15,
};

/**
 * Item quality catalog — covers S-tier, A-tier, C-tier, and toxic unlocks.
 * Achievement IDs not in this catalog default to b-tier at lookup time.
 * All IDs verified against src/data/achievements.ts.
 */
export const ITEM_VALUES: ItemValueEntry[] = [
  // === S-tier ===
  { achievementId: 470, itemName: "Revelation", quality: "s-tier", reason: "Bethany vs Mother — flying + holy laser" },
  { achievementId: 190, itemName: "Incubus", quality: "s-tier", reason: "Lilith vs Hush — familiar clone of tears" },
  { achievementId: 491, itemName: "Glitched Crown", quality: "s-tier", reason: "T.Isaac vs Beast — cycle 5 items on pedestals" },
  { achievementId: 417, itemName: "Book of Virtues", quality: "s-tier", reason: "Bethany vs Isaac — wisp-generating active synergy" },
  { achievementId: 431, itemName: "Birthright", quality: "s-tier", reason: "Jacob vs ??? — unique character upgrades" },
  { achievementId: 43, itemName: "Mom's Knife", quality: "s-tier", reason: "Isaac vs Satan — massive damage melee" },
  { achievementId: 29, itemName: "The D6", quality: "s-tier", reason: "??? vs Isaac — reroll pedestals (Isaac starting item)" },
  { achievementId: 433, itemName: "Rock Bottom", quality: "s-tier", reason: "Jacob vs Boss Rush — locks stats at highest value" },
  { achievementId: 501, itemName: "Sacred Orb", quality: "s-tier", reason: "T.Lost vs Beast — rerolls bad items automatically" },
  { achievementId: 463, itemName: "C Section", quality: "s-tier", reason: "Lilith vs Beast — homing fetus tears" },
  { achievementId: 502, itemName: "Twisted Pair", quality: "s-tier", reason: "T.Lilith vs Beast — two shooting familiars" },

  // === A-tier ===
  { achievementId: 186, itemName: "Maw of the Void", quality: "a-tier", reason: "Azazel vs Hush — black heart ring" },
  { achievementId: 250, itemName: "Holy Mantle (Lost)", quality: "a-tier", reason: "879 greed donation — Lost starting item (essential)" },
  { achievementId: 103, itemName: "Death's Touch", quality: "a-tier", reason: "Challenge #17 — damage up + piercing" },
  { achievementId: 289, itemName: "Eden's Soul", quality: "a-tier", reason: "Eden vs Delirium — spawns 2 random items" },
  { achievementId: 282, itemName: "D Infinity", quality: "a-tier", reason: "Isaac vs Delirium — cycles through all dice" },
  { achievementId: 429, itemName: "The Stairway", quality: "a-tier", reason: "Jacob vs Isaac — angel shop every floor" },
  { achievementId: 187, itemName: "Empty Vessel", quality: "a-tier", reason: "Lazarus vs Hush — flight + shield at 0 red hearts" },
  { achievementId: 401, itemName: "Book of the Dead", quality: "a-tier", reason: "Forgotten vs Delirium — bone orbital army" },
  { achievementId: 448, itemName: "Eternal D6", quality: "a-tier", reason: "??? vs Mother — reroll with vanish chance" },
  { achievementId: 292, itemName: "Euthanasia", quality: "a-tier", reason: "Lilith vs Delirium — instant-kill needle tears" },
  { achievementId: 425, itemName: "Star of Bethlehem", quality: "a-tier", reason: "Bethany vs Delirium — guiding star + damage aura" },
  { achievementId: 454, itemName: "Devil's Crown", quality: "a-tier", reason: "Azazel vs Mother — treasure rooms become devil deals" },
  { achievementId: 294, itemName: "Crooked Penny", quality: "a-tier", reason: "Keeper vs Delirium — 50/50 double or nothing" },
  { achievementId: 108, itemName: "Judas' Shadow", quality: "a-tier", reason: "Judas vs Boss Rush — revive as Dark Judas" },
  { achievementId: 293, itemName: "Holy Card", quality: "a-tier", reason: "Lost vs Delirium — one-time holy mantle effect" },

  // === C-tier (weak unlocks) ===
  { achievementId: 51, itemName: "Abel", quality: "c-tier", reason: "Cain vs Lamb — mirrored familiar, nearly useless" },
  { achievementId: 55, itemName: "Blood Penny", quality: "c-tier", reason: "Samson vs ??? — half red heart from pennies" },
  { achievementId: 106, itemName: "Isaac's Tears", quality: "c-tier", reason: "Isaac vs Isaac — weak tear burst" },
  { achievementId: 129, itemName: "Isaac's Heart", quality: "c-tier", reason: "Lost vs Isaac — body follows heart, very hard to use" },
  { achievementId: 133, itemName: "The D100", quality: "c-tier", reason: "Lost vs Boss Rush — chaotic full reroll" },
  { achievementId: 179, itemName: "Fart Baby", quality: "c-tier", reason: "Isaac vs Hush — blocks projectiles with farts" },
  { achievementId: 200, itemName: "Key Bum", quality: "c-tier", reason: "Lazarus vs Greed — eats keys, gives random chests" },
  { achievementId: 112, itemName: "Eve's Mascara", quality: "c-tier", reason: "Eve vs Boss Rush — damage up but halves fire rate" },

  // === Toxic (pool pollution) ===
  { achievementId: 105, itemName: "Missing No.", quality: "toxic", reason: "Lazarus vs Boss Rush — rerolls all items every floor, run-ruining" },
  { achievementId: 30, itemName: "The Scissors", quality: "toxic", reason: "Die 100 times — weak active item" },
  { achievementId: 240, itemName: "Sticky Nickels", quality: "toxic", reason: "Keeper vs Boss Rush — nickels stick to ground, annoying" },
];

const valueMap = new Map<number, ItemValueEntry>();
for (const entry of ITEM_VALUES) {
  valueMap.set(entry.achievementId, entry);
}

export function getItemValue(achievementId: number): ItemValueEntry | undefined {
  return valueMap.get(achievementId);
}
