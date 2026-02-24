import type { AchievementCategory, CategorySummary, MissingAchievement, MissingUnlocksResult } from "../types";
import { getAchievement, TOTAL_ACHIEVEMENTS } from "./achievements";

export const CATEGORY_LABELS: Record<AchievementCategory, string> = {
  items: "Items & Trinkets",
  characters: "Characters",
  challenges: "Challenges",
  "co-op-babies": "Co-op Babies",
  "starting-items": "Starting Items",
  "cards-runes": "Cards & Runes",
  "stages-bosses": "Stages & Bosses",
  milestones: "Milestones",
};

export const CATEGORY_ORDER: AchievementCategory[] = [
  "characters",
  "items",
  "cards-runes",
  "challenges",
  "starting-items",
  "co-op-babies",
  "stages-bosses",
  "milestones",
];

// --- Explicit overrides for achievements that don't fit pattern matching ---

/** IDs that unlock new stages, alt stages, areas, or bosses */
const STAGES_BOSSES_IDS = new Set([
  4,    // The Womb
  5,    // The Harbingers
  16,   // Something From The Future (boss in basement)
  17,   // Something Cute (boss in caves)
  18,   // Something Sticky (boss in depths)
  66,   // A Forgotten Horseman (angel boss)
  68,   // Something Icky (boss in womb)
  86,   // The Cellar
  87,   // The Catacombs
  88,   // The Necropolis
  142,  // Krampus
  234,  // Blue Womb
  320,  // New Area (Void)
  342,  // Burning Basement
  343,  // Flooded Caves
  344,  // Dank Depths
  345,  // Scarred Womb
  346,  // Something wicked this way comes!
  347,  // Something wicked this way comes+!
  348,  // The gate is open!
  406,  // The Planetarium
  407,  // A Secret Exit
  411,  // Rotten Heart (Corpse)
  412,  // Dross
  413,  // Ashpit
  414,  // Gehenna
  635,  // A Strange Door (Home)
]);

/** Meta-achievements, game modifiers, and completion markers */
const MILESTONE_IDS = new Set([
  29,   // The D6 (Isaac now holds the D6!)
  33,   // Everything Is Terrible!!!
  34,   // It Lives!
  37,   // Basement Boy
  38,   // Spelunker Boy
  39,   // Dark Boy
  40,   // Mama's Boy
  41,   // Golden God!
  69,   // Platinum God!
  83,   // Dead Boy
  84,   // The Real Platinum God
  85,   // Lucky Rock
  144,  // Super Meat Boy
  155,  // Angels
  178,  // Lord of the Flies
  235,  // 1001%
  243,  // Special Hanging Shopkeepers
  246,  // Everything is Terrible 2!!!
  247,  // Special Shopkeepers
  275,  // Generosity
  276,  // Mega
  321,  // Once More with Feeling!
  322,  // Hat trick!
  323,  // 5 Nights at Mom's
  324,  // Sin collector
  325,  // Dedication
  326,  // ZIP!
  327,  // It's the Key
  328,  // Mr. Resetter!
  329,  // Living on the edge
  330,  // U Broke It!
  336,  // The Marathon
  337,  // RERUN
  338,  // Delirious
  339,  // 1000000%
  341,  // Greedier!
  408,  // Forgotten Lullaby
  409,  // Fruity Plum
  410,  // Plum Flute
  415,  // Red Key
  516,  // DELETE THIS
  523,  // Charged Penny
  545,  // Old Capacitor
  546,  // Brimstone Bombs
  547,  // Mega Mush
  582,  // Member Card
  583,  // Golden Razor
  636,  // Death Certificate
  637,  // Dead God
]);

/** Character unlocks with non-standard descriptions (Repentance) */
const CHARACTER_IDS = new Set([
  404,  // Bethany
  405,  // Jacob and Esau
]);

/** Co-op babies with non-standard descriptions (Repentance) */
const COOP_BABY_IDS = new Set([
  416,  // Wisp Baby
  426,  // Hope Baby
  427,  // Glowing Baby
  428,  // Double Baby
  438,  // Solomon's Baby
  439,  // Illusion Baby
]);

/** Tarot card names for matching within the 524-544 range */
const TAROT_CARD_NAMES = new Set([
  "The Fool", "The Magician", "The High Priestess", "The Empress",
  "The Emperor", "The Hierophant", "The Lovers", "The Chariot",
  "Justice", "The Hermit", "Wheel of Fortune", "Strength",
  "The Hanged Man", "Death", "Temperance", "The Devil",
  "The Tower", "The Stars", "The Sun and the Moon", "Judgement", "The World",
]);

export function categorizeAchievement(id: number): AchievementCategory {
  // 1. Explicit ID overrides
  if (STAGES_BOSSES_IDS.has(id)) return "stages-bosses";
  if (MILESTONE_IDS.has(id)) return "milestones";
  if (CHARACTER_IDS.has(id)) return "characters";
  if (COOP_BABY_IDS.has(id)) return "co-op-babies";

  // 2. ID ranges for tainted characters
  if (id >= 474 && id <= 490) return "characters";

  // 3. ID ranges for tarot cards and Soul cards
  if (id >= 524 && id <= 544) return "cards-runes";
  if (id >= 618 && id <= 634) return "cards-runes";

  const ach = getAchievement(id);
  const desc = ach.inGameDescription;
  const name = ach.name;

  // 4. Name pattern matching (before description — runes/souls have "Unlocked a new item." descriptions)
  if (name.startsWith("Rune of ")) return "cards-runes";
  if (name.startsWith("Soul of ")) return "cards-runes";
  if (TAROT_CARD_NAMES.has(name)) return "cards-runes";

  // 5. Description pattern matching
  if (desc === "Unlocked a new character.") return "characters";
  if (desc.startsWith("Unlocked a new item")) return "items";
  if (desc === "Unlocked a new co-player baby.") return "co-op-babies";
  if (desc === "Unlocked a new starting item.") return "starting-items";
  if (desc.startsWith("Unlocked Challenge #")) return "challenges";
  if (desc === "Unlocked a new challenge.") return "challenges";

  // 6. Donation store upgrades → items (they unlock shop tiers)
  if (desc.startsWith("Donated ")) return "items";

  // 7. Challenge completion rewards (e.g., "Complete Challenge 36.")
  if (desc.startsWith("Complete Challenge")) return "items";

  // 8. Remaining ??? descriptions are item unlocks from tainted completion marks
  if (desc === "???") return "items";

  // 9. Repentance boss completion descriptions for base characters
  // e.g., "Complete the Corpse with Isaac." / "Complete the final chapter with X."
  if (desc.startsWith("Complete the Corpse") || desc.startsWith("Complete the final chapter")) return "items";
  if (desc.startsWith("Complete the Cathedral") || desc.startsWith("Complete Sheol")) return "items";
  if (desc.startsWith("Complete the Chest") || desc.startsWith("Complete the Dark Room")) return "items";
  if (desc.startsWith("Complete Boss Rush") || desc.startsWith("Complete the Void")) return "items";
  if (desc.startsWith("Beat Greed mode") || desc.startsWith("Beat Greedier mode")) return "items";
  if (desc.startsWith("Beat the Void")) return "items";
  if (desc.includes("with") && desc.includes(".") && desc.startsWith("Complete")) return "items";
  if (desc.includes("with") && desc.includes(".") && desc.startsWith("Defeat Mega Satan")) return "co-op-babies";

  // 10. Fallback
  return "milestones";
}

export function analyzeMissingUnlocks(
  unlocked: Set<number>,
  maxAchId: number = TOTAL_ACHIEVEMENTS,
): MissingUnlocksResult {
  // Build per-category totals and missing lists
  const categoryData = new Map<AchievementCategory, { total: number; unlocked: number; missing: MissingAchievement[] }>();

  for (const cat of CATEGORY_ORDER) {
    categoryData.set(cat, { total: 0, unlocked: 0, missing: [] });
  }

  for (let id = 1; id <= maxAchId; id++) {
    const category = categorizeAchievement(id);
    const data = categoryData.get(category)!;
    data.total++;
    if (unlocked.has(id)) {
      data.unlocked++;
    } else {
      const ach = getAchievement(id);
      data.missing.push({
        id,
        name: ach.name,
        unlockDescription: ach.unlockDescription,
        category,
      });
    }
  }

  let totalMissing = 0;
  const categories: CategorySummary[] = CATEGORY_ORDER.map((cat) => {
    const data = categoryData.get(cat)!;
    totalMissing += data.missing.length;
    return {
      category: cat,
      label: CATEGORY_LABELS[cat],
      total: data.total,
      unlocked: data.unlocked,
      missing: data.missing,
    };
  });

  return { categories, totalMissing };
}
