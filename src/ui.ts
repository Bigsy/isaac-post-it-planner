import type { AnalysisResult, CharacterProgress, ChallengeInfo, Recommendation } from "./types";

function $(id: string): HTMLElement {
  return document.getElementById(id)!;
}

function pct(n: number, total: number): string {
  return total === 0 ? "0.0" : ((n / total) * 100).toFixed(1);
}

function renderOverview(result: AnalysisResult): void {
  const s = result.stats;
  const completedChallenges = result.challenges.filter((c) => c.completed).length;

  $("overview").innerHTML = `
    <div class="stat-grid">
      <div class="stat-card primary">
        <div class="stat-value">${result.unlockedCount}/${result.totalAchievements}</div>
        <div class="stat-label">Achievements (${pct(result.unlockedCount, result.totalAchievements)}%)</div>
        <div class="progress-bar"><div class="progress-fill" style="width:${pct(result.unlockedCount, result.totalAchievements)}%"></div></div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${s.deaths}</div>
        <div class="stat-label">Deaths</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${s.itemsCollected}</div>
        <div class="stat-label">Items Collected</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${completedChallenges}/45</div>
        <div class="stat-label">Challenges</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${s.momKills}</div>
        <div class="stat-label">Mom Kills</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${s.momsHeartKills}</div>
        <div class="stat-label">Mom's Heart</div>
      </div>
    </div>
  `;
}

function markCell(mark: CharacterProgress["marks"][0]): string {
  if (mark.achievementId === null) {
    return `<td class="mark na">-</td>`;
  }
  return mark.done
    ? `<td class="mark done" title="Achievement #${mark.achievementId}">&#10003;</td>`
    : `<td class="mark missing" title="Achievement #${mark.achievementId}">&#10007;</td>`;
}

function renderCompletionGrid(grid: CharacterProgress[]): void {
  const bossHeaders = [
    "Heart", "Isaac", "Satan", "BB", "Lamb",
    "Rush", "Hush", "MSat", "Deli", "Mom2",
    "Beast", "Greed", "Grd+",
  ];

  const headerRow = `<tr><th>Character</th>${bossHeaders.map((b) => `<th>${b}</th>`).join("")}<th>Done</th></tr>`;

  const rows = grid.map((char) => {
    const nearComplete = char.total - char.done > 0 && char.total - char.done <= 4 && char.done > 0;
    const rowClass = nearComplete ? "near-complete" : char.done === char.total && char.total > 0 ? "complete" : "";
    const cells = char.marks.map(markCell).join("");
    return `<tr class="${rowClass}"><td class="char-name">${char.name}</td>${cells}<td class="done-count">${char.done}/${char.total}</td></tr>`;
  });

  $("completion-grid").innerHTML = `
    <table class="marks-table">
      <thead>${headerRow}</thead>
      <tbody>${rows.join("")}</tbody>
    </table>
  `;
}

function priorityBadge(p: number): string {
  const labels: Record<number, string> = { 1: "HIGH", 2: "MED", 3: "LOW", 4: "OPT" };
  const classes: Record<number, string> = { 1: "high", 2: "med", 3: "low", 4: "opt" };
  return `<span class="badge ${classes[p] ?? "opt"}">${labels[p] ?? "?"}</span>`;
}

function renderRecommendations(recs: Recommendation[]): void {
  if (recs.length === 0) {
    $("recommendations").innerHTML = `<p class="empty">No recommendations — you're done!</p>`;
    return;
  }
  const cards = recs.map(
    (r) => `
    <div class="rec-card priority-${r.priority}">
      <div class="rec-header">${priorityBadge(r.priority)} ${r.text}</div>
      <div class="rec-reason">${r.reason}</div>
    </div>`,
  );
  $("recommendations").innerHTML = cards.join("");
}

function renderChallenges(challenges: ChallengeInfo[]): void {
  const incomplete = challenges.filter((c) => !c.completed);
  const completed = challenges.filter((c) => c.completed);

  const renderList = (list: ChallengeInfo[], done: boolean) =>
    list
      .map((c) => {
        const reward = c.reward ? `<span class="reward">Unlocks: ${c.reward}</span>` : "";
        const cls = done ? "challenge done" : "challenge";
        return `<div class="${cls}"><span class="ch-id">#${c.id}</span> ${c.name} ${reward}</div>`;
      })
      .join("");

  $("challenges").innerHTML = `
    <h3>Incomplete (${incomplete.length})</h3>
    <div class="challenge-list">${renderList(incomplete, false)}</div>
    <h3>Completed (${completed.length})</h3>
    <div class="challenge-list">${renderList(completed, true)}</div>
  `;
}

function renderCharacterUnlocks(result: AnalysisResult): void {
  const renderGroup = (chars: typeof result.baseCharacters, title: string) => {
    const items = chars
      .map((c) => {
        const cls = c.unlocked ? "char-unlock unlocked" : "char-unlock locked";
        const status = c.unlocked ? "&#10003;" : "&#10007;";
        const desc = c.unlocked ? "" : `<div class="unlock-how">${c.unlockDescription}</div>`;
        return `<div class="${cls}"><span class="status">${status}</span> ${c.name}${desc}</div>`;
      })
      .join("");
    return `<h3>${title}</h3><div class="char-list">${items}</div>`;
  };

  $("characters").innerHTML =
    renderGroup(result.baseCharacters, "Base Characters") +
    renderGroup(result.taintedCharacters, "Tainted Characters");
}

export function renderResults(result: AnalysisResult): void {
  $("upload-section").classList.add("collapsed");
  $("results").classList.remove("hidden");

  renderOverview(result);
  renderCharacterUnlocks(result);
  renderCompletionGrid(result.completionGrid);
  renderRecommendations(result.recommendations);
  renderChallenges(result.challenges);
}

export function showError(message: string): void {
  $("error").textContent = message;
  $("error").classList.remove("hidden");
}

export function clearError(): void {
  $("error").textContent = "";
  $("error").classList.add("hidden");
}
