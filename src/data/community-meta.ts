export interface CommunityMetaEntry {
  achievementId: number;
  weight: number;
  note: string;
}

export const COMMUNITY_META: Record<number, CommunityMetaEntry> = {
  29: { achievementId: 29, weight: 1.0, note: "D6" },
  156: { achievementId: 156, weight: 1.0, note: "Godhead" },
  250: { achievementId: 250, weight: 0.9, note: "Holy Mantle for The Lost" },
  429: { achievementId: 429, weight: 0.9, note: "The Stairway" },
  431: { achievementId: 431, weight: 0.9, note: "Birthright" },
  433: { achievementId: 433, weight: 0.9, note: "Rock Bottom" },
  470: { achievementId: 470, weight: 1.0, note: "Revelation" },
  491: { achievementId: 491, weight: 1.0, note: "Glitched Crown" },
  499: { achievementId: 499, weight: 0.9, note: "Red Key" },
  502: { achievementId: 502, weight: 0.9, note: "Twisted Pair" },
};
