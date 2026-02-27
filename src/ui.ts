import type {
  AnalysisResult,
  CharacterProgress,
  TaintedCharacterProgress,
  ChallengeInfo,
  LaneRecommendation,
  BestiaryEntry,
  Lane,
  MissingUnlocksResult,
  PhaseProgress,
} from "./types";
import type { ProgressionPhase } from "./data/phases";
import type { ItemQuality } from "./data/item-values";
import { BOSS_SHORT_NAME } from "./data/characters";
import { TAINTED_BOSS_SHORT_NAMES } from "./data/tainted-marks";
import { DLC_LABELS } from "./data/dlc";
import {
  bossWikiUrl,
  characterWikiUrl,
  challengeWikiUrl,
  rewardWikiUrl,
  achievementWikiUrl,
  wikiLink,
} from "./data/wiki";

function $(id: string): HTMLElement {
  return document.getElementById(id)!;
}

function pct(n: number, total: number): string {
  return total === 0 ? "0.0" : ((n / total) * 100).toFixed(1);
}

function renderDlcBadge(result: AnalysisResult): void {
  const el = document.getElementById("dlc-badge");
  if (!el) return;
  el.textContent = DLC_LABELS[result.dlcLevel];
  el.className = `dlc-badge dlc-${result.dlcLevel}`;
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
        <div class="stat-value">${result.collectiblesSeen}/${result.totalCollectibles}</div>
        <div class="stat-label">Collectibles Seen (${pct(result.collectiblesSeen, result.totalCollectibles)}%)</div>
        <div class="progress-bar"><div class="progress-fill" style="width:${pct(result.collectiblesSeen, result.totalCollectibles)}%"></div></div>
      </div>${result.bestiaryTotal > 0 ? `
      <div class="stat-card">
        <div class="stat-value">${result.bestiaryEncountered}/${result.bestiaryTotal}</div>
        <div class="stat-label">Bestiary (${pct(result.bestiaryEncountered, result.bestiaryTotal)}%)</div>
        <div class="progress-bar"><div class="progress-fill" style="width:${pct(result.bestiaryEncountered, result.bestiaryTotal)}%"></div></div>
      </div>` : ""}
      <div class="stat-card">
        <div class="stat-value">${s.momKills}</div>
        <div class="stat-label">Mom Kills</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${s.deaths}</div>
        <div class="stat-label">Deaths</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${completedChallenges}/${result.challenges.length}</div>
        <div class="stat-label">Challenges</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${s.winStreak}</div>
        <div class="stat-label">Win Streak</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${s.bestStreak}</div>
        <div class="stat-label">Best Streak</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${s.edenTokens}</div>
        <div class="stat-label">Eden Tokens</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${s.rocksDestroyed.toLocaleString()}</div>
        <div class="stat-label">Rocks Destroyed</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${s.tintedRocksDestroyed}</div>
        <div class="stat-label">Tinted Rocks</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${s.poopDestroyed.toLocaleString()}</div>
        <div class="stat-label">Poop Destroyed</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${s.shopkeeperKills}</div>
        <div class="stat-label">Shopkeepers Killed</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${s.greedDonationCoins}</div>
        <div class="stat-label">Greed Donation</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${s.normalDonationCoins}</div>
        <div class="stat-label">Normal Donation</div>
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
  if (grid.length === 0) {
    $("completion-grid").innerHTML = `<p class="empty">No completion marks available for this DLC version.</p>`;
    return;
  }

  // Derive boss columns from the grid data
  const bossNames = grid[0].marks.map((m) => m.boss);
  const headerRow = `<tr><th>Character</th>${bossNames.map((b) => {
    const short = BOSS_SHORT_NAME[b] ?? b;
    return `<th>${wikiLink(bossWikiUrl(short), short)}</th>`;
  }).join("")}<th>Done</th></tr>`;

  const rows = grid.map((char) => {
    const nearComplete = char.total - char.done > 0 && char.total - char.done <= 4 && char.done > 0;
    const rowClass = nearComplete ? "near-complete" : char.done === char.total && char.total > 0 ? "complete" : "";
    const cells = char.marks.map(markCell).join("");
    const charLink = wikiLink(characterWikiUrl(char.name), char.name);
    return `<tr class="${rowClass}"><td class="char-name">${charLink}</td>${cells}<td class="done-count">${char.done}/${char.total}</td></tr>`;
  });

  $("completion-grid").innerHTML = `
    <table class="marks-table">
      <thead>${headerRow}</thead>
      <tbody>${rows.join("")}</tbody>
    </table>
  `;
}

function renderTaintedCompletionGrid(grid: TaintedCharacterProgress[]): void {
  const headerRow = `<tr><th>Character</th>${TAINTED_BOSS_SHORT_NAMES.map((b) => `<th>${wikiLink(bossWikiUrl(b), b)}</th>`).join("")}<th>Done</th></tr>`;

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
    const charLink = wikiLink(characterWikiUrl(char.name), char.name);
    return `<tr class="${rowClass}"><td class="char-name">${charLink}</td>${cells}<td class="done-count">${char.done}/${char.total}</td></tr>`;
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

function renderPhaseProgress(phase: PhaseProgress | undefined): void {
  const section = document.getElementById("phase-section");
  const container = document.getElementById("phase-progress");
  if (!section || !container) return;

  if (!phase) {
    section.classList.add("hidden");
    return;
  }
  section.classList.remove("hidden");

  const criteriaHtml = phase.criteria
    .map(
      (c) =>
        `<li class="phase-criterion ${c.met ? "met" : "unmet"}">${c.description}</li>`,
    )
    .join("");

  container.innerHTML = `
    <div class="phase-banner">
      <div class="phase-header">
        <span class="phase-label">Current Phase</span>
        <span class="phase-name">${phase.phaseName}</span>
      </div>
      <div class="phase-description">${phase.phaseDescription}</div>
      <ul class="phase-criteria">${criteriaHtml}</ul>
    </div>
  `;
}

function partitionRecommendations(
  recs: LaneRecommendation[],
  currentPhase?: ProgressionPhase,
): { warnings: LaneRecommendation[]; critical: LaneRecommendation[]; secondary: LaneRecommendation[] } {
  const warnings: LaneRecommendation[] = [];
  const critical: LaneRecommendation[] = [];
  const secondary: LaneRecommendation[] = [];

  for (const r of recs) {
    if (r.isToxicWarning || r.lane === "guardrail") {
      warnings.push(r);
    } else if (
      (r.lane === "progression-gate" && r.blockedBy.length === 0 && (!currentPhase || r.phase === currentPhase)) ||
      (currentPhase && r.phase === currentPhase)
    ) {
      critical.push(r);
    } else {
      secondary.push(r);
    }
  }

  return { warnings, critical, secondary };
}

function renderItemBadge(quality?: ItemQuality, name?: string): string {
  if (!quality) return "";
  const title = name ? ` title="${name}"` : "";
  return `<span class="item-badge ${quality}"${title}>${quality}</span>`;
}

function renderRecCard(r: LaneRecommendation): string {
  const laneBadge = `<span class="badge ${LANE_BADGE_CLASS[r.lane]}">${LANE_LABELS[r.lane]}</span>`;
  const itemBadge = renderItemBadge(r.itemQuality, r.itemName);
  const blockedHtml =
    r.blockedBy.length > 0
      ? `<div class="blocked-by">Blocked: ${r.blockedBy.map((b) => b.description).join("; ")}</div>`
      : "";
  const toxicClass = r.isToxicWarning ? " toxic-warning" : "";
  return `
    <div class="rec-card lane-${r.lane}${toxicClass}">
      <div class="rec-header">${laneBadge}${itemBadge} ${r.target}</div>
      <div class="rec-reason">${r.whyNow}</div>
      ${blockedHtml}
    </div>`;
}

function renderPathRecommendations(
  recs: LaneRecommendation[],
  currentPhase?: ProgressionPhase,
  phaseName?: string,
): void {
  const warningsEl = document.getElementById("warnings");
  const criticalEl = document.getElementById("critical-path");
  const secondaryEl = document.getElementById("secondary-path");
  if (!warningsEl || !criticalEl || !secondaryEl) return;

  if (recs.length === 0) {
    warningsEl.innerHTML = "";
    criticalEl.innerHTML = `<p class="empty">No recommendations — you're done!</p>`;
    secondaryEl.innerHTML = "";
    return;
  }

  const { warnings, critical, secondary } = partitionRecommendations(recs, currentPhase);

  // Warnings: toxic panel first, then guardrails
  let warningsHtml = "";
  const toxicRecs = warnings.filter((r) => r.isToxicWarning);
  const guardrails = warnings.filter((r) => r.lane === "guardrail" && !r.isToxicWarning);

  if (toxicRecs.length > 0) {
    warningsHtml += `<div class="toxic-panel"><div class="toxic-panel-header">Toxic Item Warnings</div>`;
    for (const r of toxicRecs) {
      warningsHtml += renderRecCard(r);
    }
    warningsHtml += `</div>`;
  }
  if (guardrails.length > 0) {
    warningsHtml += `<div class="guardrails-panel">`;
    for (const g of guardrails) {
      warningsHtml += `<div class="guardrail-item"><strong>${g.target}</strong><p>${g.whyNow}</p></div>`;
    }
    warningsHtml += `</div>`;
  }
  warningsEl.innerHTML = warningsHtml;

  // Critical Path: top 8
  let criticalHtml = "";
  if (critical.length > 0) {
    const heading = phaseName ? `Critical Path: ${phaseName}` : "Critical Path";
    criticalHtml += `<div class="path-group"><div class="path-group-header">${heading}</div>`;
    for (const r of critical.slice(0, 8)) {
      criticalHtml += renderRecCard(r);
    }
    criticalHtml += `</div>`;
  }
  criticalEl.innerHTML = criticalHtml;

  // Secondary: top 10
  let secondaryHtml = "";
  if (secondary.length > 0) {
    secondaryHtml += `<div class="path-group"><div class="path-group-header">Also Worth Doing</div>`;
    for (const r of secondary.slice(0, 10)) {
      secondaryHtml += renderRecCard(r);
    }
    secondaryHtml += `</div>`;
  }

  // All Recommendations: collapsed toggle with full actionable list
  const actionable = recs.filter((r) => r.lane !== "guardrail" && !r.isToxicWarning);
  if (actionable.length > 0) {
    secondaryHtml += `<details class="lane-section"><summary>All Recommendations (${actionable.length})</summary>`;
    for (const r of actionable) {
      secondaryHtml += renderRecCard(r);
    }
    secondaryHtml += `</details>`;
  }
  secondaryEl.innerHTML = secondaryHtml;
}

function renderChallenges(challenges: ChallengeInfo[]): void {
  const incomplete = challenges.filter((c) => !c.completed);
  const completed = challenges.filter((c) => c.completed);

  const renderList = (list: ChallengeInfo[], done: boolean) =>
    list
      .map((c) => {
        const rewardHtml = c.reward
          ? `<span class="reward">Unlocks: ${wikiLink(rewardWikiUrl(c.reward), c.reward)}</span>`
          : "";
        const nameLink = wikiLink(challengeWikiUrl(c.name), c.name);
        const cls = done ? "challenge done" : "challenge";
        return `<div class="${cls}"><span class="ch-id">#${c.id}</span> ${nameLink} ${rewardHtml}</div>`;
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
        const nameLink = wikiLink(characterWikiUrl(c.name), c.name);
        const desc = c.unlocked ? "" : `<div class="unlock-how">${c.unlockDescription}</div>`;
        return `<div class="${cls}"><span class="status">${status}</span> ${nameLink}${desc}</div>`;
      })
      .join("");
    return `<h3>${title}</h3><div class="char-list">${items}</div>`;
  };

  let html = renderGroup(result.baseCharacters, "Base Characters");
  if (result.taintedCharacters.length > 0) {
    html += renderGroup(result.taintedCharacters, "Tainted Characters");
  }
  $("characters").innerHTML = html;
}

function renderBestiaryGroup(entries: BestiaryEntry[], label: string, open: boolean): string {
  if (entries.length === 0) return "";
  const encountered = entries.filter((e) => e.encountered > 0).length;

  const rows = entries.map((e) => {
    const cls = e.encountered === 0 ? ' class="not-encountered"' : "";
    return `<tr${cls}><td>${e.name}</td><td>${e.encountered}</td><td>${e.kills}</td><td>${e.hitsTaken}</td><td>${e.deathsTo}</td></tr>`;
  }).join("");

  return `
    <details class="bestiary-group"${open ? " open" : ""}>
      <summary>${label} (${encountered}/${entries.length} encountered)</summary>
      <table class="bestiary-table">
        <thead><tr><th>Name</th><th>Seen</th><th>Kills</th><th>Hits</th><th>Deaths</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </details>`;
}

function renderBestiary(result: AnalysisResult): void {
  const container = document.getElementById("bestiary");
  const section = document.getElementById("bestiary-section");
  if (!container || !section) return;

  if (result.bestiary.length === 0) {
    section.classList.add("hidden");
    return;
  }
  section.classList.remove("hidden");

  const bosses = result.bestiary.filter((e) => e.isBoss);
  const enemies = result.bestiary.filter((e) => !e.isBoss);

  container.innerHTML = `
    <p class="bestiary-summary">${result.bestiaryEncountered}/${result.bestiaryTotal} entities encountered (${pct(result.bestiaryEncountered, result.bestiaryTotal)}%)</p>
    ${renderBestiaryGroup(bosses, "Bosses", false)}
    ${renderBestiaryGroup(enemies, "Regular Enemies", false)}
  `;
}

function renderCompletionDashboard(result: AnalysisResult): void {
  const container = document.getElementById("completion-dashboard");
  if (!container) return;

  const baseMarks = result.completionGrid.reduce((a, c) => a + c.done, 0);
  const baseTotal = result.completionGrid.reduce((a, c) => a + c.total, 0);
  const taintedMarks = result.taintedCompletionGrid.reduce((a, c) => a + c.done, 0);
  const taintedTotal = result.taintedCompletionGrid.reduce((a, c) => a + c.total, 0);
  const completedChallenges = result.challenges.filter((c) => c.completed).length;
  const unlockedBase = result.baseCharacters.filter((c) => c.unlocked).length;
  const unlockedTainted = result.taintedCharacters.filter((c) => c.unlocked).length;

  let html = `<div class="stat-grid">`;
  html += `
    <div class="stat-card">
      <div class="stat-value">${result.unlockedCount}/${result.totalAchievements}</div>
      <div class="stat-label">Achievements (${pct(result.unlockedCount, result.totalAchievements)}%)</div>
      <div class="progress-bar"><div class="progress-fill" style="width:${pct(result.unlockedCount, result.totalAchievements)}%"></div></div>
    </div>`;
  if (baseTotal > 0) {
    html += `
    <div class="stat-card">
      <div class="stat-value">${baseMarks}/${baseTotal}</div>
      <div class="stat-label">Base Marks (${pct(baseMarks, baseTotal)}%)</div>
      <div class="progress-bar"><div class="progress-fill" style="width:${pct(baseMarks, baseTotal)}%"></div></div>
    </div>`;
  }
  if (taintedTotal > 0) {
    html += `
    <div class="stat-card">
      <div class="stat-value">${taintedMarks}/${taintedTotal}</div>
      <div class="stat-label">Tainted Marks (${pct(taintedMarks, taintedTotal)}%)</div>
      <div class="progress-bar"><div class="progress-fill" style="width:${pct(taintedMarks, taintedTotal)}%"></div></div>
    </div>`;
  }
  html += `
    <div class="stat-card">
      <div class="stat-value">${completedChallenges}/${result.challenges.length}</div>
      <div class="stat-label">Challenges (${pct(completedChallenges, result.challenges.length)}%)</div>
      <div class="progress-bar"><div class="progress-fill" style="width:${pct(completedChallenges, result.challenges.length)}%"></div></div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${unlockedBase + unlockedTainted}/${result.baseCharacters.length + result.taintedCharacters.length}</div>
      <div class="stat-label">Characters Unlocked</div>
    </div>`;
  if (result.bestiaryTotal > 0) {
    html += `
    <div class="stat-card">
      <div class="stat-value">${result.bestiaryEncountered}/${result.bestiaryTotal}</div>
      <div class="stat-label">Bestiary (${pct(result.bestiaryEncountered, result.bestiaryTotal)}%)</div>
      <div class="progress-bar"><div class="progress-fill" style="width:${pct(result.bestiaryEncountered, result.bestiaryTotal)}%"></div></div>
    </div>`;
  }
  html += `</div>`;

  container.innerHTML = html;
}

const DEDUPLICATED_CATEGORIES = new Set(["characters", "challenges"]);

function renderMissingUnlocks(missingUnlocks: MissingUnlocksResult): void {
  const container = document.getElementById("missing-unlocks");
  if (!container) return;

  if (missingUnlocks.totalMissing === 0) {
    container.innerHTML = `<p class="empty">All achievements unlocked!</p>`;
    return;
  }

  let html = "";
  for (const cat of missingUnlocks.categories) {
    if (cat.total === 0) continue;
    if (DEDUPLICATED_CATEGORIES.has(cat.category)) continue;

    const isComplete = cat.missing.length === 0;
    const pctVal = pct(cat.unlocked, cat.total);
    const openAttr = "";
    const completeClass = isComplete ? " complete" : "";

    let entriesHtml = "";
    if (!isComplete) {
      entriesHtml = `<div class="unlock-entries">`;
      for (const ach of cat.missing) {
        const url = achievementWikiUrl(ach.name);
        const nameHtml = wikiLink(url, ach.name);
        entriesHtml += `<div class="unlock-entry"><span class="unlock-name">${nameHtml}</span><span class="unlock-how">${ach.unlockDescription}</span></div>`;
      }
      entriesHtml += `</div>`;
    }

    html += `
      <details class="unlock-category${completeClass}"${openAttr}>
        <summary>
          <span class="category-progress">
            ${isComplete ? "&#10003; " : ""}${cat.label}
            <span class="progress-bar"><span class="progress-fill" style="width:${pctVal}%"></span></span>
            <span class="progress-text">${cat.unlocked}/${cat.total}</span>
          </span>
        </summary>
        ${entriesHtml}
      </details>`;
  }

  container.innerHTML = html;
}

export function renderResults(result: AnalysisResult): void {
  $("upload-section").classList.add("collapsed");
  $("results").classList.remove("hidden");

  renderDlcBadge(result);
  renderOverview(result);
  renderPhaseProgress(result.phaseProgress);
  renderPathRecommendations(result.laneRecommendations, result.phaseProgress?.currentPhase, result.phaseProgress?.phaseName);
  renderCompletionDashboard(result);
  renderCompletionGrid(result.completionGrid);

  // Conditionally show/hide tainted section
  const taintedSection = document.getElementById("tainted-section");
  if (taintedSection) {
    if (result.dlcLevel === "repentance") {
      taintedSection.classList.remove("hidden");
      renderTaintedCompletionGrid(result.taintedCompletionGrid);
    } else {
      taintedSection.classList.add("hidden");
    }
  }

  renderChallenges(result.challenges);
  renderCharacterUnlocks(result);
  renderBestiary(result);
  renderMissingUnlocks(result.missingUnlocks);
}

export function showError(message: string): void {
  $("error").textContent = message;
  $("error").classList.remove("hidden");
}

export function clearError(): void {
  $("error").textContent = "";
  $("error").classList.add("hidden");
}
