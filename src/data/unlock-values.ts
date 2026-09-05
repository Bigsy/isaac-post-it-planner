import { getAchievement } from "./achievements";
import { categorizeAchievement } from "./achievement-categories";
import type { DlcLevel } from "./dlc";

export interface UnlockValue {
  achievementId: number;
  name: string;
  rewardKind:
    | "item"
    | "trinket"
    | "card-rune"
    | "starting-upgrade"
    | "system"
    | "character"
    | "co-op-baby"
    | "completion";
  powerValue: number;
  benefit: string;
  availability: "guaranteed-start" | "random-pool" | "system";
  confidence: "reviewed" | "provisional";
  sourceUrls: string[];
  dlcNote?: string;
}
// Editorial account benefit, not in-game item quality, drop odds, or player success odds.
// Sources and audit method are recorded in docs/reward-audit.md.
const rows: [
  number,
  string,
  number,
  string,
  UnlockValue["rewardKind"]?,
  string?,
][] = [
  [
    518,
    "Sigil of Baphomet",
    0.78,
    "Chains brief protective shields after kills, helping clear crowded rooms.",
    "trinket",
  ],
  [
    520,
    "Spirit Sword",
    0.78,
    "Adds a strong melee weapon with a charged spin attack.",
  ],
  [
    226,
    "Gold Bomb",
    0.68,
    "Adds golden bombs, giving unlimited bombs for the current floor.",
    "system",
  ],
  [
    332,
    "Maggy Now Holds a Pill!",
    0.76,
    "Magdalene starts with a Full Health pill in Repentance (a Speed Up pill in Afterbirth+).",
    "starting-upgrade",
  ],
  [
    547,
    "Mega Mush",
    0.85,
    "Adds a long giant transformation with invulnerability and crushing damage.",
  ],
  [
    636,
    "Death Certificate",
    1,
    "Lets you choose an unlocked item from a special floor. Requires every character’s hard-mode completion set.",
  ],
  [
    57,
    "The Polaroid",
    0.6,
    "Opens the Chest and its character rewards; also provides conditional shielding.",
    "system",
  ],
  [
    78,
    "The Negative",
    0.6,
    "Opens the Dark Room and its character rewards.",
    "system",
  ],
  [
    341,
    "Greedier!",
    0.5,
    "Opens Greedier and its character rewards.",
    "system",
  ],
  [
    407,
    "A Secret Exit",
    0.75,
    "Opens the alternate path to Mother and her powerful character rewards.",
    "system",
  ],
  [
    635,
    "A Strange Door",
    0.85,
    "Opens Home, tainted characters and Beast rewards such as C Section.",
    "system",
  ],
  [
    29,
    "The D6",
    1,
    "Isaac starts every future run with a pedestal reroll; also adds the D6 to item pools.",
    "starting-upgrade",
  ],
  [
    250,
    "Holy Mantle (Lost)",
    1,
    "The Lost starts with protection from one hit in every room.",
    "starting-upgrade",
  ],
  [
    190,
    "Incubus",
    0.96,
    "Adds a familiar that copies your tears and many tear effects.",
  ],
  [
    463,
    "C Section",
    0.98,
    "Adds homing, piercing projectiles that repeatedly damage enemies.",
  ],
  [
    417,
    "Book of Virtues",
    0.9,
    "Adds defensive, damaging wisps and synergies with active items.",
  ],
  [
    470,
    "Revelation",
    0.94,
    "Adds flight and a charged piercing beam alongside normal tears.",
  ],
  [
    431,
    "Birthright",
    0.94,
    "Adds a character-specific upgrade that improves that character’s strengths.",
  ],
  [
    429,
    "The Stairway",
    0.93,
    "Adds an Angel shop at the start of each floor; spare coins buy strong items.",
  ],
  [
    433,
    "Rock Bottom",
    0.87,
    "Preserves high stats after temporary boosts end; needs suitable boosts to shine.",
  ],
  [
    491,
    "Glitched Crown",
    0.98,
    "Each pedestal cycles through five choices; careful pickup timing selects the useful one.",
  ],
  [
    502,
    "Twisted Pair",
    0.97,
    "Adds two familiars that copy tears and many tear effects.",
  ],
  [
    501,
    "Sacred Orb",
    0.96,
    "Filters weak item spawns to improve future choices during the run.",
  ],
  [
    282,
    "D Infinity",
    0.92,
    "Offers several dice effects in one active item for flexible rerolls.",
    "item",
    "Selectable dice in Repentance; earlier DLC cycles effects.",
  ],
  [
    584,
    "Spindown Dice",
    0.94,
    "Changes pedestals along a predictable collectible-ID sequence; checking results enables strong choices.",
  ],
  [
    464,
    "Keeper's Sack",
    0.91,
    "Turns shop spending into damage, speed and range upgrades.",
  ],
  [
    504,
    "Echo Chamber",
    0.9,
    "Replays recent consumable effects, making good cards and runes more useful.",
    "item",
    "Modern Repentance limits the stored sequence; no infinite-stack assumption.",
  ],
  [
    432,
    "Damocles",
    0.77,
    "Creates extra item choices, but using it risks death after taking damage. Optional pickup/use.",
  ],
  [
    444,
    "Guppy's Eye",
    0.73,
    "Reveals chest contents before spending resources and counts toward Guppy.",
  ],
  [
    156,
    "Godhead",
    0.95,
    "Adds homing tears with damaging auras. Requires the Lost’s full hard-mode completion set.",
  ],
  [
    415,
    "Red Key",
    0.83,
    "Opens extra rooms and the Home closet; the first Home chest supplies the key.",
  ],
  [
    43,
    "Mom's Knife",
    0.91,
    "Adds a high-damage piercing weapon, with a different aiming style.",
  ],
  [90, "Rune of Jera", 0.82, "Duplicates useful room pickups.", "card-rune"],
  [
    94,
    "Rune of Perthro",
    0.85,
    "Rerolls unwanted pedestal items.",
    "card-rune",
  ],
  [
    96,
    "Rune of Algiz",
    0.8,
    "Grants temporary invulnerability for dangerous fights.",
    "card-rune",
  ],
  [
    92,
    "Rune of Dagaz",
    0.65,
    "Gives a soul heart and removes the current floor’s curse.",
    "card-rune",
  ],
  [
    93,
    "Rune of Ansuz",
    0.62,
    "Reveals the floor to save exploration time and resources.",
    "card-rune",
  ],
  [
    97,
    "Chaos Card",
    0.8,
    "Can remove many difficult bosses with a well-aimed throw; some bosses are immune.",
    "card-rune",
  ],
  [
    98,
    "Credit Card",
    0.72,
    "Makes purchases in the current shop or deal room free.",
    "card-rune",
  ],
  [103, "Death's Touch", 0.85, "Adds damage and piercing tears."],
  [
    104,
    "Technology .5",
    0.75,
    "Adds extra laser damage while retaining normal tears.",
  ],
  [
    236,
    "Keeper holds Wooden Nickel",
    0.88,
    "Keeper starts with a reusable source of healing coins.",
    "starting-upgrade",
  ],
  [
    191,
    "Keeper holds... A Penny!",
    0.8,
    "Keeper starts with a coin; in Repentance also gains a third coin-heart container.",
    "starting-upgrade",
    "The extra health benefit applies only in Repentance.",
  ],
];
const SOURCE_PAGES: Record<number, string> = {
  29: "D6",
  104: "Tech.5",
  250: "Greed Donation Machine",
  236: "Keeper",
  191: "Keeper",
  332: "Magdalene",
  282: "D infinity",
  226: "Bombs",
  341: "Greedier",
  407: "Mother",
  635: "Home",
};
export const UNLOCK_VALUES: UnlockValue[] = rows.map(
  ([achievementId, name, powerValue, benefit, kind = "item", dlcNote]) => ({
    achievementId,
    name,
    powerValue,
    benefit,
    rewardKind: kind,
    dlcNote,
    availability:
      kind === "starting-upgrade"
        ? "guaranteed-start"
        : kind === "system"
          ? "system"
          : "random-pool",
    confidence: "reviewed",
    sourceUrls: [
      "https://bindingofisaacrebirth.wiki.gg/wiki/Achievements",
      `https://bindingofisaacrebirth.wiki.gg/wiki/${encodeURIComponent((SOURCE_PAGES[achievementId] ?? name.replace(/^Rune of /, "")).replace(/ /g, "_"))}`,
    ],
  }),
);
const catalog = new Map(UNLOCK_VALUES.map((v) => [v.achievementId, v]));
export function unlockValue(id: number, dlc?: DlcLevel): UnlockValue {
  const reviewed = catalog.get(id);
  if (reviewed && dlc && dlc !== "repentance" && id === 332)
    return { ...reviewed, benefit: "Magdalene starts with a Speed Up pill." };
  if (reviewed && dlc && dlc !== "repentance" && id === 282)
    return {
      ...reviewed,
      powerValue: 0.73,
      benefit:
        "Adds an active item that changes between random dice effects after use.",
    };
  if (reviewed)
    return dlc && dlc !== "repentance" && id === 191
      ? {
          ...reviewed,
          powerValue: 0.25,
          benefit: "Keeper starts with one coin.",
        }
      : reviewed;
  const category = categorizeAchievement(id);
  const baby = category === "co-op-babies";
  return {
    achievementId: id,
    name: getAchievement(id).name,
    rewardKind: baby
      ? "co-op-baby"
      : category === "characters"
        ? "character"
        : "completion",
    powerValue: baby ? 0 : 0.1,
    benefit: baby
      ? "Co-op baby; no solo-run power benefit."
      : "Unreviewed reward: conservative planner value.",
    availability: "random-pool",
    confidence: "provisional",
    sourceUrls: [],
  };
}
