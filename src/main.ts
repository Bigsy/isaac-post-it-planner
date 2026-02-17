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

function init(): void {
  const dropZone = document.getElementById("drop-zone")!;
  const fileInput = document.getElementById("file-input") as HTMLInputElement;

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
