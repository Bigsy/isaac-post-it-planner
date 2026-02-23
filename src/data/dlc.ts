export type DlcLevel = "rebirth" | "afterbirth" | "afterbirth-plus" | "repentance";

/**
 * Infer DLC level from the achievements array length.
 * Upper-bound ranges based on known save format slot counts:
 *   Rebirth=179, Afterbirth=277, AB+=349/404, Repentance=638-642
 */
export function inferDlcLevel(achievementsLength: number): DlcLevel {
  if (achievementsLength <= 179) return "rebirth";
  if (achievementsLength <= 277) return "afterbirth";
  if (achievementsLength <= 404) return "afterbirth-plus";
  return "repentance";
}

export const DLC_LABELS: Record<DlcLevel, string> = {
  "rebirth": "Rebirth",
  "afterbirth": "Afterbirth",
  "afterbirth-plus": "Afterbirth+",
  "repentance": "Repentance+",
};
