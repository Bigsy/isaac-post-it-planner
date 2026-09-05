export type ItemQuality = "s-tier" | "a-tier" | "b-tier" | "c-tier" | "toxic" | "unreviewed";

export interface ItemValueEntry {
  achievementId: number;
  itemName: string;
  quality: ItemQuality;
  reason?: string;
}

export const QUALITY_SCORE: Record<ItemQuality, number> = {
  "unreviewed": 0.1,
  "s-tier": 1.0,
  "a-tier": 0.7,
  "b-tier": 0.4,
  "c-tier": 0.15,
  "toxic": -0.15,
};

/**
 * Item quality catalog — describes reward strength separately from reviewed account benefit.
 * Uncatalogued rewards are unreviewed, not B-tier.
 * All IDs verified against src/data/achievements.ts.
 */
export const ITEM_VALUES: ItemValueEntry[] = [
  { achievementId: 584, itemName: "Spindown Dice", quality: "s-tier", reason: "Predictable pedestal transformations; requires checking collectible IDs." },
  { achievementId: 464, itemName: "Keeper's Sack", quality: "s-tier", reason: "Shop purchases build permanent stats for the run." },
  { achievementId: 504, itemName: "Echo Chamber", quality: "s-tier", reason: "Replays recent consumables; powerful with useful cards and runes." },
  { achievementId: 432, itemName: "Damocles", quality: "a-tier", reason: "Extra item pedestals with a potentially fatal risk after taking damage; optional use." },
  { achievementId: 444, itemName: "Guppy's Eye", quality: "a-tier", reason: "Preview chest contents and contribute to Guppy transformation." },
  // === S-tier ===
  { achievementId: 470, itemName: "Revelation", quality: "s-tier", reason: "Bethany vs Mother — flying + holy laser" },
  { achievementId: 190, itemName: "Incubus", quality: "s-tier", reason: "Lilith vs Hush — familiar clone of tears" },
  { achievementId: 491, itemName: "Glitched Crown", quality: "s-tier", reason: "T.Isaac vs Beast — cycle 5 items on pedestals" },
  { achievementId: 417, itemName: "Book of Virtues", quality: "s-tier", reason: "Bethany vs Isaac — wisp-generating active synergy" },
  { achievementId: 431, itemName: "Birthright", quality: "s-tier", reason: "Jacob vs ??? — unique character upgrades" },
  { achievementId: 43, itemName: "Mom's Knife", quality: "s-tier", reason: "Isaac vs Satan — massive damage melee" },
  { achievementId: 29, itemName: "The D6", quality: "s-tier", reason: "??? vs Isaac — reroll pedestals (Isaac starting item)" },
  { achievementId: 156, itemName: "Godhead", quality: "s-tier", reason: "The Lost full hard-mode post-it — huge homing damage aura" },
  { achievementId: 433, itemName: "Rock Bottom", quality: "s-tier", reason: "Jacob vs Boss Rush — locks stats at highest value" },
  { achievementId: 501, itemName: "Sacred Orb", quality: "s-tier", reason: "T.Lost vs Beast — rerolls bad items automatically" },
  { achievementId: 463, itemName: "C Section", quality: "s-tier", reason: "Lilith vs Beast — homing fetus tears" },
  { achievementId: 502, itemName: "Twisted Pair", quality: "s-tier", reason: "T.Lilith vs Beast — two shooting familiars" },
  { achievementId: 282, itemName: "D Infinity", quality: "s-tier", reason: "Isaac vs Delirium — most versatile dice item" },
  { achievementId: 429, itemName: "The Stairway", quality: "s-tier", reason: "Jacob vs Isaac — Angel shop every floor" },

  // === A-tier ===
  { achievementId: 186, itemName: "Maw of the Void", quality: "a-tier", reason: "Azazel vs Hush — charged damaging ring; no black-heart generation in Repentance" },
  { achievementId: 250, itemName: "Holy Mantle (Lost)", quality: "a-tier", reason: "879 greed donation — Lost starting item (essential)" },
  { achievementId: 103, itemName: "Death's Touch", quality: "a-tier", reason: "Challenge #17 — damage up + piercing" },
  { achievementId: 289, itemName: "Eden's Soul", quality: "a-tier", reason: "Eden vs Delirium — spawns 2 random items" },
  { achievementId: 187, itemName: "Empty Vessel", quality: "a-tier", reason: "Lazarus vs Hush — flight + shield at 0 red hearts" },
  { achievementId: 401, itemName: "Book of the Dead", quality: "a-tier", reason: "Forgotten vs Delirium — bone orbital army" },
  { achievementId: 448, itemName: "Eternal D6", quality: "a-tier", reason: "??? vs Mother — reroll with vanish chance" },
  { achievementId: 292, itemName: "Euthanasia", quality: "a-tier", reason: "Lilith vs Delirium — instant-kill needle tears" },
  { achievementId: 425, itemName: "Star of Bethlehem", quality: "a-tier", reason: "Bethany vs Delirium — guiding star + damage aura" },
  { achievementId: 454, itemName: "Devil's Crown", quality: "a-tier", reason: "Azazel vs Mother — treasure rooms become devil deals" },
  { achievementId: 294, itemName: "Crooked Penny", quality: "a-tier", reason: "Keeper vs Delirium — 50/50 double or nothing" },
  { achievementId: 108, itemName: "Judas' Shadow", quality: "a-tier", reason: "Judas vs Boss Rush — revive as Dark Judas" },
  { achievementId: 293, itemName: "Holy Card", quality: "a-tier", reason: "Lost vs Delirium — one-time holy mantle effect" },

  // === B-tier (fills gaps that appear as "Unknown" in sample saves) ===
  { achievementId: 168, itemName: "Cute Baby", quality: "b-tier", reason: "Magdalene vs Mom's Heart (Hard) — co-op baby" },
  { achievementId: 171, itemName: "Glass Baby", quality: "b-tier", reason: "Cain vs Mom's Heart (Hard) — co-op baby" },
  { achievementId: 169, itemName: "Crow Baby", quality: "b-tier", reason: "Eve vs Mom's Heart (Hard) — co-op baby" },
  { achievementId: 177, itemName: "Fighting Baby", quality: "b-tier", reason: "Samson vs Mom's Heart (Hard) — co-op baby" },
  { achievementId: 318, itemName: "Smelter", quality: "b-tier", reason: "Apollyon vs Mom's Heart (Hard) — absorb trinkets permanently" },
  // Tainted character Main Bosses marks (show in unlock recs)
  { achievementId: 550, itemName: "Holy Crown", quality: "b-tier" },
  { achievementId: 552, itemName: "Gilded Key", quality: "b-tier" },
  { achievementId: 554, itemName: "Your Soul", quality: "b-tier" },
  { achievementId: 556, itemName: "Dingle Berry", quality: "b-tier" },
  { achievementId: 558, itemName: "Strange Key", quality: "b-tier" },
  { achievementId: 560, itemName: "Temporary Tattoo", quality: "b-tier" },
  { achievementId: 562, itemName: "Wicked Crown", quality: "b-tier" },
  { achievementId: 564, itemName: "Torn Pocket", quality: "b-tier" },
  { achievementId: 566, itemName: "Nuh Uh!", quality: "b-tier" },
  { achievementId: 572, itemName: "Keeper's Bargain", quality: "b-tier" },
  { achievementId: 574, itemName: "Cricket Leg", quality: "b-tier" },
  { achievementId: 576, itemName: "Polished Bone", quality: "b-tier" },
  { achievementId: 578, itemName: "Expansion Pack", quality: "b-tier" },
  { achievementId: 580, itemName: "RC Remote", quality: "c-tier", reason: "Optional trinket: remote familiar control is situational" },

  // === C-tier (weak unlocks) ===
  { achievementId: 472, itemName: "Magic Skin", quality: "c-tier", reason: "Optional active: trades health for items; repeated use has drawbacks" },
  { achievementId: 51, itemName: "Abel", quality: "c-tier", reason: "Cain vs Lamb — mirrored familiar, nearly useless" },
  { achievementId: 55, itemName: "Blood Penny", quality: "c-tier", reason: "Samson vs ??? — half red heart from pennies" },
  { achievementId: 106, itemName: "Isaac's Tears", quality: "c-tier", reason: "Isaac vs Isaac — weak tear burst" },
  { achievementId: 129, itemName: "Isaac's Heart", quality: "c-tier", reason: "Lost vs Isaac — body follows heart, very hard to use" },
  { achievementId: 133, itemName: "The D100", quality: "c-tier", reason: "Lost vs Boss Rush — chaotic full reroll" },
  { achievementId: 179, itemName: "Fart Baby", quality: "c-tier", reason: "Isaac vs Hush — blocks projectiles with farts" },
  { achievementId: 200, itemName: "Key Bum", quality: "c-tier", reason: "Lazarus vs Greed — eats keys, gives random chests" },
  { achievementId: 112, itemName: "Eve's Mascara", quality: "c-tier", reason: "Eve vs Boss Rush — damage up but halves fire rate" },

  // === Situational / low-priority unlocks (not blanket pool warnings) ===
  { achievementId: 105, itemName: "Missing No.", quality: "c-tier", reason: "Lazarus vs Boss Rush — optional pickup that rerolls the build each floor" },
  { achievementId: 30, itemName: "The Scissors", quality: "c-tier", reason: "Die 100 times — weak active item" },
  { achievementId: 240, itemName: "Sticky Nickels", quality: "c-tier", reason: "Keeper vs Boss Rush — nickels stick to ground, annoying" },
  { achievementId: 500, itemName: "TMTRAINER", quality: "c-tier", reason: "T.Eden vs Beast — optional pickup with unpredictable glitched effects" },
  { achievementId: 593, itemName: "Corrupted Data", quality: "c-tier", reason: "T.Eden vs Delirium — changes some Secret Room / I AM ERROR item spawns unpredictably" },
];

const valueMap = new Map<number, ItemValueEntry>();
for (const entry of ITEM_VALUES) {
  valueMap.set(entry.achievementId, entry);
}

export function getItemValue(achievementId: number): ItemValueEntry | undefined {
  return valueMap.get(achievementId);
}
