import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { detectSavePathPlatform, getOrderedSavePathGroups } from "../src/save-paths";

const INDEX_HTML = readFileSync(join(__dirname, "..", "dist", "index.html"), "utf8");
const README = readFileSync(join(__dirname, "..", "README.md"), "utf8");

describe("save path helper", () => {
  it("detects common desktop platforms", () => {
    expect(detectSavePathPlatform("MacIntel", "")).toBe("macos");
    expect(detectSavePathPlatform("Win32", "")).toBe("windows");
    expect(detectSavePathPlatform("Linux x86_64", "")).toBe("linux");
    expect(detectSavePathPlatform("", "X11; Linux x86_64")).toBe("linux");
    expect(detectSavePathPlatform("", "Unknown Device")).toBe("unknown");
  });

  it("sorts the detected platform first while keeping all OS groups visible", () => {
    expect(getOrderedSavePathGroups("linux").map((group) => group.id)).toEqual(["linux", "macos", "windows"]);
    expect(getOrderedSavePathGroups("windows").map((group) => group.id)).toEqual(["windows", "macos", "linux"]);
    expect(getOrderedSavePathGroups("unknown").map((group) => group.id)).toEqual(["macos", "windows", "linux"]);
  });

  it("covers the supported version-specific save folders", () => {
    const macPaths = getOrderedSavePathGroups("macos")
      .find((group) => group.id === "macos")!
      .entries
      .map((entry) => entry.path);
    const windowsPaths = getOrderedSavePathGroups("windows")
      .find((group) => group.id === "windows")!
      .entries
      .map((entry) => entry.path);
    const linuxPaths = getOrderedSavePathGroups("linux")
      .find((group) => group.id === "linux")!
      .entries
      .map((entry) => entry.path);

    expect(macPaths).toContain("~/Library/Application Support/Steam/userdata/{steam-id}/250900/remote/");
    expect(macPaths).toContain("~/Library/Application Support/Binding of Isaac Afterbirth+/");
    expect(macPaths).not.toContain("~/Library/Application Support/Binding of Isaac Repentance/");
    expect(macPaths).not.toContain("~/Library/Application Support/Binding of Isaac Repentance+/");
    expect(windowsPaths).toContain("C:\\Program Files (x86)\\Steam\\userdata\\{steam-id}\\250900\\remote\\");
    expect(windowsPaths).toContain("C:\\Users\\{you}\\Documents\\My Games\\Binding of Isaac Repentance\\");
    expect(windowsPaths).not.toContain("C:\\Users\\{you}\\Documents\\My Games\\Binding of Isaac Repentance+\\");
    expect(linuxPaths).toContain("~/.local/share/Steam/userdata/{steam-id}/250900/remote/");
    expect(linuxPaths).toContain("~/.steam/steam/userdata/{steam-id}/250900/remote/");
  });

  it("keeps upload and docs copy generic", () => {
    expect(INDEX_HTML).not.toContain("rep+persistentgamedata1.dat");
    expect(README).not.toContain("rep+persistentgamedata1.dat");
    expect(INDEX_HTML).toContain("Isaac save");
    expect(README).toContain("Isaac save `.dat` file");
  });
});
