/**
 * Donation machine milestones.
 *
 * Achievement IDs allow coarse progress tracking (which thresholds are passed)
 * without needing exact coin counters from the save file.
 */

export interface DonationMilestone {
  coins: number;
  achievementId: number;
  name: string;
  strategic: boolean; // highlight as strategically important
}

/** Greed Donation Machine milestones (wiki-verified thresholds) */
export const GREED_DONATION_MILESTONES: DonationMilestone[] = [
  { coins: 2,    achievementId: 242, name: "Lucky Pennies",                     strategic: false },
  { coins: 14,   achievementId: 243, name: "Special Hanging Shopkeepers",       strategic: false },
  { coins: 33,   achievementId: 244, name: "Wooden Nickel",                     strategic: false },
  { coins: 68,   achievementId: 245, name: "Cain holds Paperclip",              strategic: false },
  { coins: 111,  achievementId: 246, name: "Everything is Terrible 2!!!",       strategic: false },
  { coins: 234,  achievementId: 247, name: "Special Shopkeepers",               strategic: false },
  { coins: 439,  achievementId: 248, name: "Eve now holds Razor Blade",         strategic: false },
  { coins: 500,  achievementId: 341, name: "Greedier Mode",                     strategic: true },
  { coins: 666,  achievementId: 249, name: "Store Key",                         strategic: false },
  { coins: 879,  achievementId: 250, name: "Lost holds Holy Mantle",            strategic: true },
  { coins: 999,  achievementId: 275, name: "Generosity",                        strategic: false },
  { coins: 1000, achievementId: 251, name: "Keeper (new character)",            strategic: true },
];

/** Normal Donation Machine milestones (wiki-verified thresholds) */
export const NORMAL_DONATION_MILESTONES: DonationMilestone[] = [
  { coins: 10,   achievementId: 134, name: "Blue Map",                          strategic: false },
  { coins: 20,   achievementId: 151, name: "Store Upgrade lv.1",                strategic: false },
  { coins: 50,   achievementId: 135, name: "There's Options",                   strategic: false },
  { coins: 100,  achievementId: 152, name: "Store Upgrade lv.2",                strategic: false },
  { coins: 150,  achievementId: 136, name: "Black Candle",                      strategic: false },
  { coins: 200,  achievementId: 153, name: "Store Upgrade lv.3",                strategic: false },
  { coins: 400,  achievementId: 137, name: "Red Candle",                        strategic: false },
  { coins: 600,  achievementId: 154, name: "Store Upgrade lv.4",                strategic: false },
  { coins: 900,  achievementId: 59,  name: "Blue Candle",                       strategic: false },
  { coins: 999,  achievementId: 138, name: "Stop Watch",                        strategic: true },
];
