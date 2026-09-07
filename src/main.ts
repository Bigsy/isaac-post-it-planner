import { parseSaveFile } from "./parser";
import { analyze } from "./analyzer";
import { renderResults, showError, clearError } from "./ui";
import {
  detectSavePathPlatform,
  getOrderedSavePathGroups,
  type SavePathPlatform,
} from "./save-paths";

import type { SaveData, PlannerPreferences } from "./types";
import { DEFAULT_PREFERENCES } from "./planner-scoring";
let currentSave: SaveData | undefined;
let preferences: PlannerPreferences = {
  ...DEFAULT_PREFERENCES,
  avoidedCharacters: [],
};
function refreshAnalysis(): void {
  if (!currentSave) return;
  const result = analyze(currentSave, {
    debug: new URLSearchParams(location.search).has("debug"),
    preferences,
  });
  renderResults(result);
  let controls = document.getElementById("planner-preferences");
  if (!controls) {
    controls = document.createElement("section");
    controls.id = "planner-preferences";
    document.getElementById("tier-1")?.before(controls);
  }
  const characters = [
    ...result.completionGrid,
    ...result.taintedCompletionGrid,
  ].map((c) => c.name);
  controls.innerHTML = `<h3>Choose your next run</h3><label>Objective <select id="planner-objective"><option value="power" ${preferences.objective === "power" ? "selected" : ""}>Power unlocks</option><option value="completion" ${preferences.objective === "completion" ? "selected" : ""}>Completion</option></select></label>
    <label><input type="checkbox" id="planner-no-timed" ${preferences.noTimedRuns ? "checked" : ""}> Avoid timed runs</label>
    <details><summary>Avoid characters this session (${preferences.avoidedCharacters.length})</summary><div class="character-preferences">${characters.map((c, i) => `<label><input id="avoid-character-${i}" type="checkbox" data-avoid-character="${escapeHtmlAttr(c)}" ${preferences.avoidedCharacters.includes(c) ? "checked" : ""}> ${escapeHtmlAttr(c)}</label>`).join("")}</div></details>
    <button type="button" id="planner-reset">Reset preferences</button>`;
  controls.onchange = (event) => {
    const target = event.target as HTMLInputElement;
    if (target.id === "planner-objective")
      preferences.objective = target.value as PlannerPreferences["objective"];
    if (target.id === "planner-no-timed")
      preferences.noTimedRuns = target.checked;
    if (target.dataset.avoidCharacter)
      preferences.avoidedCharacters = target.checked
        ? [...preferences.avoidedCharacters, target.dataset.avoidCharacter]
        : preferences.avoidedCharacters.filter(
            (c) => c !== target.dataset.avoidCharacter,
          );
    const open = controls!.querySelector("details")!.open;
    refreshAnalysis();
    if (open)
      document.querySelector<HTMLDetailsElement>(
        "#planner-preferences details",
      )!.open = true;
    document.getElementById(target.id)?.focus({ preventScroll: true });
  };
  document.getElementById("planner-reset")!.onclick = () => {
    preferences = { ...DEFAULT_PREFERENCES, avoidedCharacters: [] };
    refreshAnalysis();
  };
}

function setLoadingState(loading: boolean): void {
  const dropZone = document.getElementById("drop-zone");
  if (!dropZone) return;
  if (loading) {
    dropZone.classList.add("drop-zone--loading");
  } else {
    dropZone.classList.remove("drop-zone--loading");
  }
}

function handleFile(file: File): void {
  clearError();

  if (!file.name.endsWith(".dat")) {
    showError("Please select an Isaac save file (.dat)");
    return;
  }

  setLoadingState(true);

  const reader = new FileReader();
  reader.onload = () => {
    try {
      currentSave = parseSaveFile(reader.result as ArrayBuffer);
      refreshAnalysis();
    } catch (e) {
      showError(e instanceof Error ? e.message : "Failed to parse save file");
    } finally {
      setLoadingState(false);
    }
  };
  reader.onerror = () => {
    setLoadingState(false);
    showError("Failed to read file");
  };
  reader.readAsArrayBuffer(file);
}

function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text);
  }
  // Fallback for insecure contexts (file://)
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.select();
  document.execCommand("copy");
  document.body.removeChild(ta);
  return Promise.resolve();
}

function escapeHtmlAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function pickerTip(platform: SavePathPlatform): string {
  if (platform === "macos") {
    return "Tip: In the file picker, press <kbd>⌘</kbd><kbd>Shift</kbd><kbd>G</kbd> and paste a folder path. Or open it in Finder and drag the save file here.";
  }
  if (platform === "windows") {
    return "Tip: Paste a folder path into the file picker address bar. Or open it in Explorer and drag the save file here.";
  }
  if (platform === "linux") {
    return "Tip: Paste a folder path into your file picker if it supports location entry, or open it in your file manager and drag the save file here.";
  }
  return "Tip: Open one of these folders in your file manager and drag the save file here, or paste the path into the file picker if supported.";
}

function steamCloudTip(): string {
  return "For Steam installs, <code>userdata/&lt;steam-id&gt;/250900/remote/</code> is usually the live save folder. Version-named folders are local copies or cloud-off restore locations.";
}

function renderPathHelper(): void {
  const container = document.getElementById("path-helper");
  if (!container) return;

  const nav = navigator as Navigator & {
    userAgentData?: { platform?: string };
  };
  const platform = detectSavePathPlatform(
    nav.userAgentData?.platform ?? navigator.platform,
    navigator.userAgent,
  );
  const groups = getOrderedSavePathGroups(platform);

  const groupHtml = groups
    .map((group) => {
      const rows = group.entries
        .map((entry) => {
          const escapedPath = escapeHtmlAttr(entry.path);
          return `<div class="path-row">
            <div class="path-row-main">
              <span class="path-row-label">${entry.version}</span>
              <code title="${escapedPath}">${entry.path}</code>
            </div>
            <button class="path-copy-btn" data-path="${escapedPath}">Copy</button>
          </div>`;
        })
        .join("");

      const isCurrent = group.id === platform;
      const shouldOpen = platform === "unknown" || isCurrent;

      return `<details class="path-os-group${isCurrent ? " current" : ""}"${shouldOpen ? " open" : ""}>
        <summary class="path-os-header">
          <div class="path-os-header-main">
            <div class="path-os-title">${group.label}</div>
            ${isCurrent ? '<span class="path-os-badge">Current OS</span>' : ""}
          </div>
          <span class="path-os-toggle" aria-hidden="true"></span>
        </summary>
        <div class="path-os-body">
          ${rows}
        </div>
      </details>`;
    })
    .join("");

  container.innerHTML = `
    <details class="path-helper-toggle">
      <summary class="path-helper-summary">Can't find your save file?</summary>
      <div class="path-helper-body">
        <p class="path-label">Common save folders:</p>
        <div class="path-groups">${groupHtml}</div>
        <p class="path-tip">${pickerTip(platform)}</p>
        <p class="path-tip path-tip-secondary">${steamCloudTip()}</p>
      </div>
    </details>
  `;

  container.addEventListener("click", (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>(
      ".path-copy-btn",
    );
    if (!btn) return;
    e.stopPropagation();
    const path = btn.dataset.path!;
    copyToClipboard(path).then(() => {
      btn.textContent = "Copied!";
      btn.classList.add("copied");
      setTimeout(() => {
        btn.textContent = "Copy";
        btn.classList.remove("copied");
      }, 1500);
    });
  });
}

function init(): void {
  const dropZone = document.getElementById("drop-zone")!;
  const fileInput = document.getElementById("file-input") as HTMLInputElement;

  renderPathHelper();

  // "Load another save" button in sticky nav
  const reuploadBtn = document.getElementById("nav-reupload");
  if (reuploadBtn) {
    reuploadBtn.addEventListener("click", () => fileInput.click());
  }

  // File picker
  fileInput.addEventListener("change", () => {
    const file = fileInput.files?.[0];
    // Allow selecting the same save again after the game updates it.
    fileInput.value = "";
    if (file) handleFile(file);
  });

  // Click to open picker
  dropZone.addEventListener("click", (event) => {
    if (event.target !== fileInput) fileInput.click();
  });

  // Drag and drop
  dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.classList.add("drag-over");
  });

  dropZone.addEventListener("dragleave", () => {
    dropZone.classList.remove("drag-over");
  });

  dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.classList.remove("drag-over");
    if (e.dataTransfer?.files[0]) handleFile(e.dataTransfer.files[0]);
  });
}

document.addEventListener("DOMContentLoaded", init);
