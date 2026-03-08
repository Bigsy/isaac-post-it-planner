export interface RouteDef {
  id: string;
  name: string;
  wikiPath: string;
  bosses: string[];
  requiredGates: string[];
  greedMode: boolean;
  timed: boolean;
  timedDescription?: string;
}

export const ROUTES: RouteDef[] = [
  {
    id: "dark-room",
    name: "Dark Room",
    wikiPath: "Dark_Room",
    bosses: ["Mom's Heart", "Satan", "The Lamb"],
    requiredGates: ["sheol-cathedral", "negative"],
    greedMode: false,
    timed: false,
  },
  {
    id: "chest",
    name: "The Chest",
    wikiPath: "The_Chest",
    bosses: ["Mom's Heart", "Isaac", "???"],
    requiredGates: ["sheol-cathedral", "polaroid"],
    greedMode: false,
    timed: false,
  },
  {
    id: "void",
    name: "Void",
    wikiPath: "The_Void",
    bosses: ["Mom's Heart", "Hush", "Delirium"],
    requiredGates: ["blue-womb", "void-delirium"],
    greedMode: false,
    timed: true,
    timedDescription: "Timed route: keep the Hush timer alive so the Void path stays open.",
  },
  {
    id: "sheol",
    name: "Sheol",
    wikiPath: "Sheol",
    bosses: ["Mom's Heart", "Satan"],
    requiredGates: ["sheol-cathedral"],
    greedMode: false,
    timed: false,
  },
  {
    id: "cathedral",
    name: "Cathedral",
    wikiPath: "Cathedral",
    bosses: ["Mom's Heart", "Isaac"],
    requiredGates: ["sheol-cathedral"],
    greedMode: false,
    timed: false,
  },
  {
    id: "blue-womb",
    name: "Blue Womb",
    wikiPath: "Blue_Womb",
    bosses: ["Mom's Heart", "Hush"],
    requiredGates: ["blue-womb"],
    greedMode: false,
    timed: true,
    timedDescription: "Timed route: defeat Mom's Heart / It Lives within 30:00 to open Blue Womb.",
  },
  {
    id: "boss-rush",
    name: "Boss Rush",
    wikiPath: "Boss_Rush",
    bosses: ["Mom's Heart", "Boss Rush"],
    requiredGates: ["mom"],
    greedMode: false,
    timed: true,
    timedDescription: "Timed route: reach Mom within 20:00 to open Boss Rush.",
  },
  {
    id: "mega-satan-dr",
    name: "Mega Satan",
    wikiPath: "Mega_Satan",
    bosses: ["Mom's Heart", "Satan", "The Lamb", "Mega Satan"],
    requiredGates: ["sheol-cathedral", "negative"],
    greedMode: false,
    timed: false,
  },
  {
    id: "mega-satan-ch",
    name: "Mega Satan",
    wikiPath: "Mega_Satan",
    bosses: ["Mom's Heart", "Isaac", "???", "Mega Satan"],
    requiredGates: ["sheol-cathedral", "polaroid"],
    greedMode: false,
    timed: false,
  },
  {
    id: "corpse",
    name: "Mother",
    wikiPath: "Mother_(Boss)",
    bosses: ["Mother"],
    requiredGates: ["alt-path"],
    greedMode: false,
    timed: false,
  },
  {
    id: "home",
    name: "Home",
    wikiPath: "Home_(Floor)",
    bosses: ["Beast"],
    requiredGates: ["home-beast"],
    greedMode: false,
    timed: false,
  },
  {
    id: "greedier",
    name: "Greedier",
    wikiPath: "Greedier",
    bosses: ["Greedier", "Ultra Greedier"],
    requiredGates: [],
    greedMode: true,
    timed: false,
  },
  {
    id: "greed",
    name: "Greed Mode",
    wikiPath: "Greed_Mode",
    bosses: ["Greed"],
    requiredGates: [],
    greedMode: true,
    timed: false,
  },
];

export const GATE_ROUTE_ALIGNMENT: Record<string, string[]> = {
  negative: ["sheol"],
  polaroid: ["cathedral"],
  "mega-satan": ["mega-satan-dr", "mega-satan-ch"],
  "void-delirium": ["blue-womb"],
  "alt-path": ["blue-womb"],
  "home-beast": ["corpse"],
};

export const TAINTED_BUNDLE_BOSSES: Record<string, string[]> = {
  "Main Bosses": ["Isaac", "???", "Satan", "The Lamb"],
  "Hush + Boss Rush": ["Hush", "Boss Rush"],
};
