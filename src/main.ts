import { parseSaveFile } from "./parser";
import { analyze } from "./analyzer";
import { renderResults, showError, clearError } from "./ui";

function handleFile(file: File): void {
  clearError();

  if (!file.name.endsWith(".dat")) {
    showError("Please select an Isaac save file (.dat)");
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const saveData = parseSaveFile(reader.result as ArrayBuffer);
      const result = analyze(saveData);
      renderResults(result);
    } catch (e) {
      showError(e instanceof Error ? e.message : "Failed to parse save file");
    }
  };
  reader.onerror = () => showError("Failed to read file");
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

function renderPathHelper(): void {
  const container = document.getElementById("path-helper");
  if (!container) return;

  const isMac = navigator.platform.startsWith("Mac");

  // Mac: all DLCs share one folder. Windows: separate folders per DLC.
  const paths = isMac
    ? ["~/Library/Application Support/Binding of Isaac Afterbirth+/"]
    : [
        "C:\\Users\\{you}\\Documents\\My Games\\Binding of Isaac Repentance\\",
        "C:\\Users\\{you}\\Documents\\My Games\\Binding of Isaac Afterbirth+\\",
      ];

  const rows = paths
    .map((path) => {
      return `<div class="path-row">
        <code title="${path}">${path}</code>
        <button class="path-copy-btn" data-path="${path}">Copy</button>
      </div>`;
    })
    .join("");

  const tip = isMac
    ? `Tip: In the file picker, press <kbd>⌘</kbd><kbd>Shift</kbd><kbd>G</kbd> and paste. Or open the folder in Finder and drag the .dat file here.`
    : `Tip: Paste the path into the file picker address bar. Or open the folder in Explorer and drag the file here.`;

  container.innerHTML = `
    <p class="path-label">Save file location${paths.length > 1 ? "s" : ""}:</p>
    ${rows}
    <p class="path-tip">${tip}</p>
  `;

  container.addEventListener("click", (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>(".path-copy-btn");
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

  // File picker
  fileInput.addEventListener("change", () => {
    if (fileInput.files?.[0]) handleFile(fileInput.files[0]);
  });

  // Click to open picker
  dropZone.addEventListener("click", () => fileInput.click());

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
