import type { DlcLevel } from "./dlc";
import type { CounterStats } from "../types";

export type ProgressionPhase =
  | "phase-1-foundations"
  | "phase-2-expansion"
  | "phase-3-repentance"
  | "phase-4-completion";

export interface PhaseCriterion {
  type: "achievement" | "counter-threshold" | "achievement-count";
  achievementId?: number;
  counterField?: keyof CounterStats;
  counterThreshold?: number;
  minCount?: number;
  description: string;
  requiredDlc?: DlcLevel;
}

export interface PhaseDefinition {
  id: ProgressionPhase;
  name: string;
  description: string;
  completionCriteria: PhaseCriterion[];
  minDlc?: DlcLevel;
}

const DLC_ORDER: DlcLevel[] = [
  "rebirth",
  "afterbirth",
  "afterbirth-plus",
  "repentance",
];

function dlcAtLeast(current: DlcLevel, required: DlcLevel): boolean {
  return DLC_ORDER.indexOf(current) >= DLC_ORDER.indexOf(required);
}

export const PHASE_DEFINITIONS: PhaseDefinition[] = [
  {
    id: "phase-1-foundations",
    name: "Foundations",
    description: "Core unlocks and first donation milestone",
    completionCriteria: [
      { type: "achievement", achievementId: 79, description: "Unlock Azazel" },
      { type: "achievement", achievementId: 4, description: "Beat Mom / reach Womb" },
      { type: "achievement", achievementId: 34, description: "Beat It Lives!" },
      { type: "achievement", achievementId: 78, description: "Unlock The Negative" },
      { type: "achievement", achievementId: 57, description: "Unlock The Polaroid" },
      { type: "achievement", achievementId: 138, description: "Donation machine to 999 (Stop Watch)" },
    ],
  },
  {
    id: "phase-2-expansion",
    name: "Expansion",
    description: "Post-Womb bosses and alternate paths",
    minDlc: "afterbirth",
    completionCriteria: [
      { type: "achievement", achievementId: 234, description: "Blue Womb access" },
      { type: "achievement", achievementId: 320, description: "Hush / Void access" },
      { type: "achievement", achievementId: 407, description: "Alt path (Repentance)", requiredDlc: "repentance" },
      { type: "achievement", achievementId: 58, description: "Beat Mega Satan" },
    ],
  },
  {
    id: "phase-3-repentance",
    name: "Repentance",
    description: "Repentance endgame and key tainted unlocks",
    minDlc: "repentance",
    completionCriteria: [
      { type: "achievement", achievementId: 635, description: "Beat Mother" },
      { type: "achievement", achievementId: 474, description: "Unlock Tainted Isaac" },
      { type: "achievement", achievementId: 490, description: "Unlock Tainted Jacob" },
    ],
  },
  {
    id: "phase-4-completion",
    name: "Completion",
    description: "Greedier, donation grinds, and Dead God",
    completionCriteria: [
      { type: "achievement", achievementId: 341, description: "Greedier (500 greed donation)" },
      { type: "achievement", achievementId: 250, description: "Holy Mantle for Lost (879 greed donation)" },
      { type: "achievement", achievementId: 251, description: "Unlock Keeper (1000 greed donation)" },
      { type: "achievement", achievementId: 637, description: "Dead God (100% completion)" },
    ],
  },
];

/**
 * Returns the first phase where any applicable criterion is unmet.
 * Skips phases whose minDlc exceeds the player's DLC level.
 * Within a phase, skips criteria whose requiredDlc exceeds the player's DLC.
 */
export function detectPhase(
  unlocked: Set<number>,
  stats: CounterStats,
  dlcLevel: DlcLevel,
): ProgressionPhase {
  for (const phase of PHASE_DEFINITIONS) {
    if (phase.minDlc && !dlcAtLeast(dlcLevel, phase.minDlc)) continue;

    const applicableCriteria = phase.completionCriteria.filter(
      (c) => !c.requiredDlc || dlcAtLeast(dlcLevel, c.requiredDlc),
    );

    for (const criterion of applicableCriteria) {
      if (criterion.type === "achievement" && criterion.achievementId != null) {
        if (!unlocked.has(criterion.achievementId)) return phase.id;
      }
      if (criterion.type === "counter-threshold" && criterion.counterField && criterion.counterThreshold != null) {
        if (stats[criterion.counterField] < criterion.counterThreshold) return phase.id;
      }
    }
  }

  return "phase-4-completion";
}
