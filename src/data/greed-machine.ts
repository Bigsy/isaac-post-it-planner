import type { DlcLevel } from "./dlc";

export interface GreedDonationCounter {
  character: string;
  counterIndex: number;
  isTainted: boolean;
}

const AFTERBIRTH_CHARACTERS = [
  "Isaac",
  "Magdalene",
  "Cain",
  "Judas",
  "???",
  "Eve",
  "Samson",
  "Azazel",
  "Lazarus",
  "Eden",
  "The Lost",
  "Lilith",
  "Keeper",
] as const;

const MODERN_BASE_CHARACTERS = [
  ...AFTERBIRTH_CHARACTERS,
  "Apollyon",
] as const;

const TAINTED_CHARACTERS = [
  "T.Isaac",
  "T.Magdalene",
  "T.Cain",
  "T.Judas",
  "T.???",
  "T.Eve",
  "T.Samson",
  "T.Azazel",
  "T.Lazarus",
  "T.Eden",
  "T.Lost",
  "T.Lilith",
  "T.Keeper",
  "T.Apollyon",
  "T.Forgotten",
  "T.Bethany",
  "T.Jacob",
] as const;

/**
 * Counter layouts changed when Afterbirth+ inserted Apollyon completion data.
 * Repentance retained the Afterbirth+ indices and appended its new characters.
 */
export function greedDonationCounters(
  dlcLevel: DlcLevel,
  maxAchievementId: number,
): GreedDonationCounter[] {
  if (dlcLevel === "rebirth") return [];

  if (dlcLevel === "afterbirth") {
    return AFTERBIRTH_CHARACTERS.map((character, index) => ({
      character,
      counterIndex: 149 + index,
      isTainted: false,
    }));
  }

  const counters: GreedDonationCounter[] = MODERN_BASE_CHARACTERS.map((character, index) => ({
    character,
    counterIndex: 159 + index,
    isTainted: false,
  }));

  if (maxAchievementId >= 390) {
    counters.push({ character: "Forgotten", counterIndex: 212, isTainted: false });
  }

  if (dlcLevel === "repentance") {
    counters.push(
      { character: "Bethany", counterIndex: 385, isTainted: false },
      { character: "Jacob", counterIndex: 386, isTainted: false },
      ...TAINTED_CHARACTERS.map((character, index) => ({
        character,
        counterIndex: 387 + index,
        isTainted: true,
      })),
    );
  }

  return counters;
}

export function greedDonationTotalCounter(dlcLevel: DlcLevel): number | null {
  if (dlcLevel === "rebirth") return null;
  return dlcLevel === "afterbirth" ? 108 : 115;
}

/** Displayed per-coin jam percentage in normal Greed mode. */
export function greedJamChance(coinsDonated: number): number {
  const coins = Math.max(0, coinsDonated);
  return Math.floor(0.2 * Math.min(100, Math.exp(0.023 * coins) - 1) + 0.5);
}

/** Greedier uses the normal calculation but caps it at 1%. */
export function greedierJamChance(coinsDonated: number): number {
  return Math.min(1, greedJamChance(coinsDonated));
}
