import type {
  AnalysisResult,
  CharacterProgress,
  TaintedCharacterProgress,
  ChallengeInfo,
  LaneRecommendation,
  Lane,
} from "./types";

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

function renderTaintedCompletionGrid(grid: TaintedCharacterProgress[]): void {
  const bossHeaders = ["Main", "Mom2", "Beast", "Grd+", "Deli", "MSat", "H+BR"];

  const headerRow = `<tr><th>Character</th>${bossHeaders.map((b) => `<th>${b}</th>`).join("")}<th>Done</th></tr>`;

  const rows = grid.map((char) => {
    const nearComplete = char.total - char.done > 0 && char.total - char.done <= 3 && char.done > 0;
    const rowClass = nearComplete ? "near-complete" : char.done === char.total ? "complete" : "";
    const cells = char.marks
      .map((m) =>
        m.done
          ? `<td class="mark done" title="Achievement #${m.achievementId}">&#10003;</td>`
          : `<td class="mark missing" title="Achievement #${m.achievementId}">&#10007;</td>`,
      )
      .join("");
    return `<tr class="${rowClass}"><td class="char-name">${char.name}</td>${cells}<td class="done-count">${char.done}/${char.total}</td></tr>`;
  });

  const container = document.getElementById("tainted-completion-grid");
  if (!container) return;
  container.innerHTML = `
    <table class="marks-table">
      <thead>${headerRow}</thead>
      <tbody>${rows.join("")}</tbody>
    </table>
  `;
}

const LANE_LABELS: Record<Lane, string> = {
  "progression-gate": "Progression Gates",
  "character-unlock": "Character Unlocks",
  "completion-mark": "Completion Marks",
  "challenge": "Challenges",
  "donation": "Donation Milestones",
  "guardrail": "Tips & Guardrails",
};

const LANE_BADGE_CLASS: Record<Lane, string> = {
  "progression-gate": "high",
  "character-unlock": "high",
  "completion-mark": "med",
  "challenge": "med",
  "donation": "low",
  "guardrail": "opt",
};

function renderLaneRecommendations(recs: LaneRecommendation[]): void {
  const container = document.getElementById("lane-recommendations");
  if (!container) return;

  if (recs.length === 0) {
    container.innerHTML = `<p class="empty">No recommendations — you're done!</p>`;
    return;
  }

  // Group by lane
  const byLane = new Map<Lane, LaneRecommendation[]>();
  for (const r of recs) {
    const list = byLane.get(r.lane) ?? [];
    list.push(r);
    byLane.set(r.lane, list);
  }

  // Render top blended recommendations first
  const actionable = recs.filter((r) => r.lane !== "guardrail");
  const guardrails = recs.filter((r) => r.lane === "guardrail");
  const topRecs = actionable.slice(0, 10);

  let html = "";

  // Guardrails panel
  if (guardrails.length > 0) {
    html += `<div class="guardrails-panel">`;
    for (const g of guardrails) {
      const icon = g.whyNow.length > 0 ? "" : "";
      html += `<div class="guardrail-item"><strong>${g.target}</strong><p>${g.whyNow}</p></div>`;
    }
    html += `</div>`;
  }

  // Top recommendations
  html += `<h3>Top Recommendations</h3>`;
  for (const r of topRecs) {
    const badge = `<span class="badge ${LANE_BADGE_CLASS[r.lane]}">${LANE_LABELS[r.lane]}</span>`;
    const blockedHtml =
      r.blockedBy.length > 0
        ? `<div class="blocked-by">Blocked: ${r.blockedBy.map((b) => b.description).join("; ")}</div>`
        : "";
    html += `
      <div class="rec-card lane-${r.lane}">
        <div class="rec-header">${badge} ${r.target}</div>
        <div class="rec-reason">${r.whyNow}</div>
        ${blockedHtml}
      </div>`;
  }

  // Lane sections (collapsible)
  const laneOrder: Lane[] = [
    "progression-gate",
    "character-unlock",
    "completion-mark",
    "challenge",
    "donation",
  ];
  for (const lane of laneOrder) {
    const laneRecs = byLane.get(lane);
    if (!laneRecs || laneRecs.length === 0) continue;

    html += `<details class="lane-section"><summary>${LANE_LABELS[lane]} (${laneRecs.length})</summary>`;
    for (const r of laneRecs) {
      const blockedHtml =
        r.blockedBy.length > 0
          ? `<div class="blocked-by">Blocked: ${r.blockedBy.map((b) => b.description).join("; ")}</div>`
          : "";
      html += `
        <div class="rec-card lane-${r.lane}">
          <div class="rec-header">${r.target}</div>
          <div class="rec-reason">${r.whyNow}</div>
          ${blockedHtml}
        </div>`;
    }
    html += `</details>`;
  }

  container.innerHTML = html;
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
  renderTaintedCompletionGrid(result.taintedCompletionGrid);
  renderLaneRecommendations(result.laneRecommendations);
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
