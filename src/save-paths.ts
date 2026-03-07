export type SavePathPlatform = "macos" | "windows" | "linux" | "unknown";

export interface SavePathEntry {
  version: string;
  path: string;
}

export interface SavePathGroup {
  id: Exclude<SavePathPlatform, "unknown">;
  label: string;
  entries: SavePathEntry[];
}

const BASE_ORDER: SavePathGroup["id"][] = ["macos", "windows", "linux"];

const SAVE_PATH_GROUPS: SavePathGroup[] = [
  {
    id: "macos",
    label: "macOS",
    entries: [
      { version: "Steam current save", path: "~/Library/Application Support/Steam/userdata/{steam-id}/250900/remote/" },
      { version: "Rebirth", path: "~/Library/Application Support/Binding of Isaac Rebirth/" },
      { version: "Afterbirth", path: "~/Library/Application Support/Binding of Isaac Afterbirth/" },
      { version: "Afterbirth+", path: "~/Library/Application Support/Binding of Isaac Afterbirth+/" },
    ],
  },
  {
    id: "windows",
    label: "Windows",
    entries: [
      { version: "Steam current save", path: "C:\\Program Files (x86)\\Steam\\userdata\\{steam-id}\\250900\\remote\\" },
      { version: "Rebirth", path: "C:\\Users\\{you}\\Documents\\My Games\\Binding of Isaac Rebirth\\" },
      { version: "Afterbirth", path: "C:\\Users\\{you}\\Documents\\My Games\\Binding of Isaac Afterbirth\\" },
      { version: "Afterbirth+", path: "C:\\Users\\{you}\\Documents\\My Games\\Binding of Isaac Afterbirth+\\" },
      { version: "Repentance", path: "C:\\Users\\{you}\\Documents\\My Games\\Binding of Isaac Repentance\\" },
    ],
  },
  {
    id: "linux",
    label: "Linux",
    entries: [
      { version: "Steam current save", path: "~/.local/share/Steam/userdata/{steam-id}/250900/remote/" },
      { version: "Steam current save (alt)", path: "~/.steam/steam/userdata/{steam-id}/250900/remote/" },
    ],
  },
];

export function detectSavePathPlatform(platformValue?: string, userAgent = ""): SavePathPlatform {
  const normalizedPlatform = (platformValue ?? "").toLowerCase();
  const normalizedAgent = userAgent.toLowerCase();
  const platformText = `${normalizedPlatform} ${normalizedAgent}`;

  if (platformText.includes("mac")) return "macos";
  if (platformText.includes("win")) return "windows";
  if (platformText.includes("linux") || platformText.includes("x11")) return "linux";
  return "unknown";
}

export function getOrderedSavePathGroups(platform: SavePathPlatform): SavePathGroup[] {
  if (platform === "unknown") {
    return [...SAVE_PATH_GROUPS];
  }

  const order = [platform, ...BASE_ORDER.filter((id) => id !== platform)];
  return order
    .map((id) => SAVE_PATH_GROUPS.find((group) => group.id === id))
    .filter((group): group is SavePathGroup => Boolean(group));
}
