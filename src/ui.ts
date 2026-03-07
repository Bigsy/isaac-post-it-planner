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
  RunGoal,
  RunPlan,
  BossKillMilestoneGroupStatus,
  TldrItem,
} from "./types";
import type { ProgressionPhase } from "./data/phases";
import type { ItemQuality } from "./data/item-values";
import { BOSS_SHORT_NAME } from "./data/characters";
import { TAINTED_BOSS_SHORT_NAMES } from "./data/tainted-marks";
import { DLC_LABELS } from "./data/dlc";
import { getAchievement } from "./data/achievements";
import { markSpritePath, bossIconPath, charSpritePath, hudIconPath } from "./data/sprites";
import {
  bossWikiUrl,
  characterWikiUrl,
  challengeWikiUrl,
  rewardWikiUrl,
  routeWikiUrl,
  achievementWikiUrl,
  bestiaryWikiUrl,
  wikiLink,
  wikiUrl,
} from "./data/wiki";

function $(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing element #${id}`);
  return el;
}

function pct(n: number, total: number): string {
  return total === 0 ? "0.0" : ((n / total) * 100).toFixed(1);
}

function hudIcon(statKey: string): string {
  const src = hudIconPath(statKey);
  if (!src) return "";
  return `<img src="${src}" alt="" class="hud-icon">`;
}

function linkifyText(text: string, links?: { text: string; url: string }[]): string {
  if (!links || links.length === 0) return text;

  let html = text;
  for (const link of links) {
    html = html.replace(link.text, wikiLink(link.url, link.text));
  }
  return html;
}

function escapeHtmlAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function renderDlcBadge(result: AnalysisResult): void {
  const el = document.getElementById("dlc-badge");
  if (!el) return;
  el.textContent = DLC_LABELS[result.dlcLevel];
  el.className = `dlc-badge dlc-${result.dlcLevel}`;
}

function renderSummaryMetric(label: string, value: number, total: number): string {
  const percentage = pct(value, total);
  return `
    <div class="summary-metric">
      <div class="summary-metric-label">${label}</div>
      <div class="summary-metric-value">${value}/${total}</div>
      <div class="summary-metric-subtitle">${percentage}% complete</div>
      <div class="progress-bar"><div class="progress-fill" style="width:${percentage}%"></div></div>
    </div>
  `;
}

function renderQuickStat(label: string, value: string, statKey: string): string {
  return `
    <div class="quick-stat">
      ${hudIcon(statKey)}
      <div>
        <span class="quick-stat-label">${label}</span>
        <span class="quick-stat-value">${value}</span>
      </div>
    </div>
  `;
}

function renderSummaryGoal(goal: RunGoal): string {
  if (goal.type === "gate-progress" || goal.type === "phase-criterion") {
    return goal.description;
  }

  const bossLink = wikiLink(bossWikiUrl(goal.boss), goal.boss);
  const itemHtml = goal.itemName
    ? ` -> ${wikiLink(wikiUrl(goal.itemName), goal.itemName)} ${renderItemBadge(goal.itemQuality, goal.itemName)}`
    : "";
  const bundledNote = goal.isBundled ? " (bundled progress)" : "";
  return `${bossLink} mark${itemHtml}${bundledNote}`;
}

function renderTimedBadge(timed: boolean, timedDescription?: string): string {
  if (!timed) return "";
  const description = timedDescription ?? "Timed route";
  const escaped = escapeHtmlAttr(description);
  return `<span class="run-timed" title="${escaped}" aria-label="${escaped}">timed</span>`;
}

function renderSummaryFocusList(result: AnalysisResult): string {
  const focusItems = result.tldr && result.tldr.length > 0
    ? result.tldr.slice(0, 3).map((item) => ({
        summary: linkifyText(item.summary, item.links),
        detail: item.detail,
      }))
    : result.laneRecommendations
        .filter((r) => r.lane !== "guardrail" && !r.isToxicWarning)
        .slice(0, 3)
        .map((rec) => ({
          summary: rec.target,
          detail: rec.whyNow,
        }));

  if (focusItems.length === 0) {
    return `<p class="summary-empty">No action shortlist generated for this save.</p>`;
  }

  return `
    <ol class="summary-focus-list">
      ${focusItems.map((item, index) => `
        <li class="summary-focus-item">
          <span class="summary-focus-index">${index + 1}</span>
          <div>
            <strong>${item.summary}</strong>
            <span class="summary-focus-detail">${item.detail}</span>
          </div>
        </li>
      `).join("")}
    </ol>
  `;
}

function renderSummary(result: AnalysisResult): void {
  const container = document.getElementById("summary");
  if (!container) return;

  const s = result.stats;
  const phase = result.phaseProgress;
  const criteriaTotal = phase?.criteria.length ?? 0;
  const criteriaMet = phase?.criteria.filter((criterion) => criterion.met).length ?? 0;
  const criteriaPct = criteriaTotal === 0 ? "0.0" : ((criteriaMet / criteriaTotal) * 100).toFixed(1);
  const nextCriterion = phase?.criteria.find((criterion) => !criterion.met);
  const nextCriterionHtml = nextCriterion
    ? nextCriterion.wikiUrl
      ? wikiLink(nextCriterion.wikiUrl, nextCriterion.description)
      : nextCriterion.description
    : "";

  const baseMarks = result.completionGrid.reduce((sum, char) => sum + char.done, 0);
  const baseTotal = result.completionGrid.reduce((sum, char) => sum + char.total, 0);
  const taintedMarks = result.taintedCompletionGrid.reduce((sum, char) => sum + char.done, 0);
  const taintedTotal = result.taintedCompletionGrid.reduce((sum, char) => sum + char.total, 0);
  const completedChallenges = result.challenges.filter((challenge) => challenge.completed).length;
  const unlockedCharacters =
    result.baseCharacters.filter((char) => char.unlocked).length +
    result.taintedCharacters.filter((char) => char.unlocked).length;
  const totalCharacters = result.baseCharacters.length + result.taintedCharacters.length;
  const actionableCount = result.laneRecommendations.filter((r) => r.lane !== "guardrail" && !r.isToxicWarning).length;
  const toxicWarnings = result.laneRecommendations.filter((r) => r.isToxicWarning).length;
  const nextPlan = result.runPlans[0];

  const metrics = [
    renderSummaryMetric("Base Marks", baseMarks, baseTotal),
    taintedTotal > 0 ? renderSummaryMetric("Tainted Marks", taintedMarks, taintedTotal) : "",
    renderSummaryMetric("Challenges", completedChallenges, result.challenges.length),
    renderSummaryMetric("Characters", unlockedCharacters, totalCharacters),
    renderSummaryMetric("Collectibles", result.collectiblesSeen, result.totalCollectibles),
    result.bestiaryTotal > 0 ? renderSummaryMetric("Bestiary", result.bestiaryEncountered, result.bestiaryTotal) : "",
  ].filter(Boolean).join("");

  const summaryCopy = phase
    ? `You're in ${phase.phaseName}. ${result.totalAchievements - result.unlockedCount} achievements remain, and ${actionableCount} actionable recommendations are queued below.`
    : `${result.totalAchievements - result.unlockedCount} achievements remain, and ${actionableCount} actionable recommendations are queued below.`;

  const nextPlanHtml = nextPlan
    ? `
      <div class="summary-route">
        <div class="summary-route-line">
          ${charSpritePath(nextPlan.character) ? `<img src="${charSpritePath(nextPlan.character)!}" alt="" class="run-portrait">` : ""}
          <span class="summary-route-character">${wikiLink(characterWikiUrl(nextPlan.character), nextPlan.character)}</span>
          <span class="summary-route-arrow">-&gt;</span>
          <span class="summary-route-destination">${wikiLink(routeWikiUrl(nextPlan.routeWikiPath), nextPlan.route)}</span>
          ${renderTimedBadge(nextPlan.timed, nextPlan.timedDescription)}
        </div>
        <div class="summary-route-why">${nextPlan.whyThisRun}</div>
        <div class="summary-route-goal"><strong>Main goal:</strong> ${renderSummaryGoal(nextPlan.primaryGoal)}</div>
      </div>
    `
    : `<p class="summary-empty">No single run has been highlighted yet. Use the shortlist below as your queue.</p>`;

  container.innerHTML = `
    <div class="summary-shell">
      <div class="summary-card summary-hero">
        <div class="summary-kicker">Campaign Snapshot</div>
        <div class="summary-title">
          ${result.unlockedCount}
          <span class="summary-title-total">/ ${result.totalAchievements}</span>
        </div>
        <div class="summary-subtitle">achievements unlocked</div>
        <p class="summary-copy">${summaryCopy}</p>
        <div class="summary-pill-row">
          <span class="summary-pill">${DLC_LABELS[result.dlcLevel]}</span>
          ${phase ? `<span class="summary-pill">${criteriaMet}/${criteriaTotal} phase checks met</span>` : ""}
          <span class="summary-pill">${completedChallenges}/${result.challenges.length} challenges cleared</span>
          <span class="summary-pill">${result.missingUnlocks.totalMissing} unlocks remaining</span>
          ${toxicWarnings > 0 ? `<span class="summary-pill warning">${toxicWarnings} toxic warning${toxicWarnings === 1 ? "" : "s"}</span>` : ""}
        </div>
        <div class="summary-progress-label">
          <span>Overall completion</span>
          <strong>${pct(result.unlockedCount, result.totalAchievements)}%</strong>
        </div>
        <div class="progress-bar"><div class="progress-fill" style="width:${pct(result.unlockedCount, result.totalAchievements)}%"></div></div>
        <div class="summary-hero-phase">
          <div class="summary-card-heading">Phase Status</div>
          ${phase
            ? `
              <div class="summary-phase-name">${phase.phaseName}</div>
              <p class="summary-card-copy">${phase.phaseDescription}</p>
              <div class="summary-progress-label">
                <span>Criteria met</span>
                <strong>${criteriaMet}/${criteriaTotal}</strong>
              </div>
              <div class="progress-bar"><div class="progress-fill" style="width:${criteriaPct}%"></div></div>
              ${nextCriterion
                ? `<div class="summary-phase-next"><span class="summary-phase-next-label">Next breakpoint</span><strong>${nextCriterionHtml}</strong></div>`
                : `<div class="summary-phase-next complete"><span class="summary-phase-next-label">Status</span><strong>Current phase criteria complete</strong></div>`}
            `
            : `
              <div class="summary-phase-name">No phase detected</div>
              <p class="summary-card-copy">Load a save file to see the progression phase and its gating criteria.</p>
            `}
        </div>
      </div>

      <div class="summary-card summary-focus">
        <div class="summary-card-heading">Focus Now</div>
        <p class="summary-card-copy">Start with the most useful run, then work down the shortlist.</p>
        ${nextPlanHtml}
        ${renderSummaryFocusList(result)}
      </div>
    </div>

    <div class="summary-metrics">${metrics}</div>

    <div class="summary-stats">
      ${renderQuickStat("Mom Kills", s.momKills.toLocaleString(), "momKills")}
      ${renderQuickStat("Deaths", s.deaths.toLocaleString(), "deaths")}
      ${renderQuickStat("Win Streak", s.winStreak.toLocaleString(), "winStreak")}
      ${renderQuickStat("Best Streak", s.bestStreak.toLocaleString(), "bestStreak")}
      ${renderQuickStat("Normal Donation", s.normalDonationCoins.toLocaleString(), "donationMachine")}
      ${renderQuickStat("Greed Donation", s.greedDonationCoins.toLocaleString(), "greedDonation")}
      ${renderQuickStat("Eden Tokens", s.edenTokens.toLocaleString(), "edenTokens")}
    </div>
  `;
}

function renderOverview(result: AnalysisResult): void {
  const s = result.stats;
  const renderOverviewStat = (label: string, value: string, statKey: string): string => `
    <div class="overview-stat">
      <div class="overview-stat-label">${hudIcon(statKey)}<span>${label}</span></div>
      <div class="overview-stat-value">${value}</div>
    </div>
  `;

  const renderOverviewPanel = (
    title: string,
    description: string,
    items: string[],
  ): string => `
    <div class="overview-panel">
      <h3>${title}</h3>
      <p class="overview-panel-copy">${description}</p>
      <div class="overview-stat-list">${items.join("")}</div>
    </div>
  `;

  $("overview").innerHTML = `
    <div class="overview-panels">
      ${renderOverviewPanel("Run History", "High-signal counters that show how the save has been progressing overall.", [
        renderOverviewStat("Mom Kills", s.momKills.toLocaleString(), "momKills"),
        renderOverviewStat("Mom's Heart Kills", s.momsHeartKills.toLocaleString(), "momKills"),
        renderOverviewStat("Deaths", s.deaths.toLocaleString(), "deaths"),
        renderOverviewStat("Win Streak", s.winStreak.toLocaleString(), "winStreak"),
        renderOverviewStat("Best Streak", s.bestStreak.toLocaleString(), "bestStreak"),
      ])}
      ${renderOverviewPanel("Economy", "Run-level resources and donation progress that affect unlock pace.", [
        renderOverviewStat("Eden Tokens", s.edenTokens.toLocaleString(), "edenTokens"),
        renderOverviewStat("Normal Donation", s.normalDonationCoins.toLocaleString(), "donationMachine"),
        renderOverviewStat("Greed Donation", s.greedDonationCoins.toLocaleString(), "greedDonation"),
      ])}
      ${renderOverviewPanel("Environment", "Low-priority world counters that are useful as supporting context.", [
        renderOverviewStat("Rocks Destroyed", s.rocksDestroyed.toLocaleString(), "rocksDestroyed"),
        renderOverviewStat("Tinted Rocks", s.tintedRocksDestroyed.toLocaleString(), "tintedRocks"),
        renderOverviewStat("Poop Destroyed", s.poopDestroyed.toLocaleString(), "poopDestroyed"),
        renderOverviewStat("Shopkeepers Killed", s.shopkeeperKills.toLocaleString(), "shopkeepers"),
      ])}
    </div>
  `;
}

function markCell(mark: { done: boolean; achievementId: number | null; boss: string }): string {
  if (mark.achievementId === null) {
    return `<td class="mark na">-</td>`;
  }
  const src = markSpritePath(mark.boss, mark.done);
  const state = mark.done ? "done" : "missing";
  if (src) {
    return `<td class="mark ${state}" title="Achievement #${mark.achievementId}"><img src="${src}" alt="${state}" class="mark-icon"></td>`;
  }
  return mark.done
    ? `<td class="mark done" title="Achievement #${mark.achievementId}">&#10003;</td>`
    : `<td class="mark missing" title="Achievement #${mark.achievementId}">&#10007;</td>`;
}

interface GridConfig {
  elementId: string;
  nearCompleteThreshold: number;
  bossFullNames: string[];
}

function bossHeaderCell(shortName: string, fullName: string): string {
  const iconSrc = bossIconPath(fullName);
  const link = bossWikiUrl(shortName);
  const iconHtml = iconSrc
    ? `<img src="${iconSrc}" alt="${shortName}" class="boss-icon" title="${shortName}">`
    : "";
  const label = wikiLink(link, shortName);
  return `<th>${iconHtml}<span class="boss-label">${label}</span></th>`;
}

function renderGrid(
  grid: (CharacterProgress | TaintedCharacterProgress)[],
  bossHeaders: string[],
  config: GridConfig,
): void {
  const container = document.getElementById(config.elementId);
  if (!container) return;

  if (grid.length === 0) {
    container.innerHTML = `<p class="empty">No completion marks available for this DLC version.</p>`;
    return;
  }

  const headerRow = `<tr><th>Character</th>${bossHeaders.map((b, i) =>
    bossHeaderCell(b, config.bossFullNames[i] ?? b),
  ).join("")}<th>Done</th></tr>`;

  const rows = grid.map((char) => {
    const remaining = char.total - char.done;
    const nearComplete = remaining > 0 && remaining <= config.nearCompleteThreshold && char.done > 0;
    const rowClass = nearComplete ? "near-complete" : char.done === char.total && char.total > 0 ? "complete" : "";
    const cells = char.marks.map(markCell).join("");
    const portrait = charSpritePath(char.name);
    const portraitHtml = portrait
      ? `<img src="${portrait}" alt="" class="char-portrait">`
      : "";
    const charLink = wikiLink(characterWikiUrl(char.name), char.name);
    return `<tr class="${rowClass}"><td class="char-name">${portraitHtml}${charLink}</td>${cells}<td class="done-count">${char.done}/${char.total}</td></tr>`;
  });

  container.innerHTML = `
    <div class="marks-table-wrapper">
      <table class="marks-table">
        <thead>${headerRow}</thead>
        <tbody>${rows.join("")}</tbody>
      </table>
    </div>
  `;
}

function renderCompletionGrid(grid: CharacterProgress[]): void {
  const bossHeaders = grid.length > 0
    ? grid[0].marks.map((m) => BOSS_SHORT_NAME[m.boss] ?? m.boss)
    : [];
  const bossFullNames = grid.length > 0
    ? grid[0].marks.map((m) => m.boss)
    : [];
  renderGrid(grid, bossHeaders, { elementId: "completion-grid", nearCompleteThreshold: 4, bossFullNames });
}

function renderTaintedCompletionGrid(grid: TaintedCharacterProgress[]): void {
  const bossFullNames = grid.length > 0
    ? grid[0].marks.map((m) => m.boss)
    : [];
  renderGrid(grid, [...TAINTED_BOSS_SHORT_NAMES], { elementId: "tainted-completion-grid", nearCompleteThreshold: 3, bossFullNames });
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
    .map((c) => {
      const descHtml = c.wikiUrl ? wikiLink(c.wikiUrl, c.description) : c.description;
      const howToHtml = c.howTo ? `<span class="phase-how-to">${c.howTo}</span>` : "";
      return `<li class="phase-criterion ${c.met ? "met" : "unmet"}">${descHtml}${howToHtml}</li>`;
    })
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
): { warnings: LaneRecommendation[]; critical: LaneRecommendation[]; secondary: LaneRecommendation[]; guardrails: LaneRecommendation[] } {
  const warnings: LaneRecommendation[] = [];
  const critical: LaneRecommendation[] = [];
  const secondary: LaneRecommendation[] = [];
  const guardrails: LaneRecommendation[] = [];

  for (const r of recs) {
    if (r.lane === "guardrail" && !r.isToxicWarning) {
      guardrails.push(r);
    } else if (r.isToxicWarning) {
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

  return { warnings, critical, secondary, guardrails };
}

function renderItemBadge(quality?: ItemQuality, name?: string): string {
  if (!quality) return "";
  const title = name ? ` title="${name}"` : "";
  return `<span class="item-badge ${quality}"${title}>${quality}</span>`;
}

function shouldCollapseRecommendation(rec: LaneRecommendation): boolean {
  return rec.blockedBy.length > 0 || rec.whyNow.length > 120;
}

function shouldCollapseRunPlan(plan: RunPlan): boolean {
  return plan.goals.length > 1 || plan.whyThisRun.length > 110;
}

function renderRecCard(r: LaneRecommendation): string {
  const laneBadge = `<span class="badge ${LANE_BADGE_CLASS[r.lane]}">${LANE_LABELS[r.lane]}</span>`;
  const itemBadge = renderItemBadge(r.itemQuality, r.itemName);
  const collapsed = shouldCollapseRecommendation(r);

  // Link entities in blocked-by descriptions
  const blockedHtml =
    r.blockedBy.length > 0
      ? `<div class="blocked-by">Blocked: ${r.blockedBy.map((b) => {
          if (b.achievementId != null) {
            const achUrl = achievementWikiUrl(getAchievement(b.achievementId).name);
            return achUrl ? `${b.description} ${wikiLink(achUrl, '↗')}` : b.description;
          }
          return b.description;
        }).join("; ")}</div>`
      : "";

  const toxicClass = r.isToxicWarning ? " toxic-warning" : "";
  let achievementLink = "";
  if (r.achievementIds.length > 0) {
    const ach = getAchievement(r.achievementIds[0]);
    const url = achievementWikiUrl(ach.name);
    if (url) {
      achievementLink = ` <a href="${url}" target="_blank" rel="noopener" class="rec-wiki-link">wiki</a>`;
    }
  }

  // Link entities in the target text
  let targetHtml = r.target;
  if (r.lane === "character-unlock") {
    const unlockMatch = r.target.match(/^Unlock (.+)$/);
    if (unlockMatch) {
      const charName = unlockMatch[1];
      targetHtml = `Unlock ${wikiLink(characterWikiUrl(charName), charName)}`;
    }
  } else if (r.lane === "challenge") {
    // Target format: "Complete #N Name — unlocks Reward"
    const chMatch = r.target.match(/^(Complete #\d+\s+)(.+?)(\s+—\s+unlocks\s+)(.+)$/);
    if (chMatch) {
      const [, prefix, chName, mid, reward] = chMatch;
      const rewardLink = wikiLink(rewardWikiUrl(reward), reward);
      targetHtml = `${prefix}${wikiLink(challengeWikiUrl(chName), chName)}${mid}${rewardLink}`;
    } else {
      // No reward variant: "Complete #N Name"
      const chMatchNoReward = r.target.match(/^(Complete #\d+\s+)(.+)$/);
      if (chMatchNoReward) {
        const [, prefix, chName] = chMatchNoReward;
        targetHtml = `${prefix}${wikiLink(challengeWikiUrl(chName), chName)}`;
      }
    }
  } else if (r.itemName && targetHtml.includes(r.itemName)) {
    targetHtml = targetHtml.replace(r.itemName, wikiLink(wikiUrl(r.itemName), r.itemName));
  }

  const reasonPreview = `<div class="rec-reason rec-reason-preview">${r.whyNow}</div>`;
  const reasonFull = `<div class="rec-reason rec-reason-full">${r.whyNow}</div>`;
  const detailsHtml = collapsed
    ? `
      <details class="card-details rec-details">
        <summary class="card-details-summary">More detail</summary>
        <div class="card-details-body">
          ${reasonFull}
          ${blockedHtml}
        </div>
      </details>
    `
    : "";

  return `
    <div class="rec-card lane-${r.lane}${toxicClass}">
      <div class="rec-header">${laneBadge}${itemBadge} ${targetHtml}${achievementLink}</div>
      ${collapsed ? reasonPreview : reasonFull}
      ${collapsed ? detailsHtml : blockedHtml}
    </div>`;
}

function renderRunGoal(goal: RunGoal, isPrimary: boolean): string {
  const qualityBadge = renderItemBadge(goal.itemQuality, goal.itemName);
  const baseClass = `run-goal${isPrimary ? " primary" : ""}`;

  if (goal.type === "gate-progress") {
    return `<div class="${baseClass} gate">${goal.description}</div>`;
  }

  if (goal.type === "phase-criterion") {
    return `<div class="${baseClass} note">${goal.description}</div>`;
  }

  if (goal.isBundled) {
    const bossLink = wikiLink(bossWikiUrl(goal.boss), goal.boss);
    return `<div class="${baseClass} bundled">Works toward: ${bossLink} mark (partial progress unknown)</div>`;
  }

  const prefix = isPrimary ? "" : "Also: ";
  const bossLink = wikiLink(bossWikiUrl(goal.boss), goal.boss);
  const itemPart = goal.itemName ? ` -> ${wikiLink(wikiUrl(goal.itemName), goal.itemName)}` : "";
  return `<div class="${baseClass}">${prefix}${bossLink} mark${itemPart} ${qualityBadge}</div>`;
}

function renderRunPlanCard(plan: RunPlan, currentPhase?: ProgressionPhase, phaseName?: string): string {
  const portrait = charSpritePath(plan.character);
  const portraitHtml = portrait ? `<img src="${portrait}" alt="" class="run-portrait">` : "";
  const characterLink = wikiLink(characterWikiUrl(plan.character), plan.character);
  const routeLink = wikiLink(routeWikiUrl(plan.routeWikiPath), plan.route);
  const timedBadge = renderTimedBadge(plan.timed, plan.timedDescription);
  const phaseBadge = currentPhase && plan.phase === currentPhase && phaseName
    ? `<span class="badge high">${phaseName}</span>`
    : "";
  const collapsed = shouldCollapseRunPlan(plan);
  const secondaryGoals: string[] = [];
  let angelRequirementAdded =
    plan.primaryGoal.description.includes("Angel Room") ||
    plan.primaryGoal.description.includes("Key Piece");

  for (const goal of plan.goals) {
    if (goal === plan.primaryGoal) continue;
    secondaryGoals.push(renderRunGoal(goal, false));
    if (goal.type !== "completion-mark" && goal.description.includes("Angel Room")) {
      angelRequirementAdded = true;
    }
  }
  if ((plan.routeId === "mega-satan-dr" || plan.routeId === "mega-satan-ch") && !angelRequirementAdded) {
    secondaryGoals.push(`<div class="run-goal note">Requires Angel Room key pieces in-run</div>`);
  }

  const primaryGoalHtml = renderRunGoal(plan.primaryGoal, true);
  const whyPreview = `<div class="run-why run-why-preview">${plan.whyThisRun}</div>`;
  const whyFull = `<div class="run-why run-why-full">${plan.whyThisRun}</div>`;
  const primaryGoalsBlock = `<div class="run-goals run-goals-primary">${primaryGoalHtml}</div>`;
  const secondaryGoalsBlock = secondaryGoals.length > 0
    ? `<div class="run-goals run-goals-secondary">${secondaryGoals.join("")}</div>`
    : "";
  const detailsHtml = collapsed
    ? `
      <details class="card-details run-plan-details">
        <summary class="card-details-summary">Show full run breakdown</summary>
        <div class="card-details-body">
          ${whyFull}
          ${secondaryGoalsBlock}
        </div>
      </details>
    `
    : "";

  return `
    <div class="run-plan">
      <div class="run-plan-header">
        ${portraitHtml}<span class="run-character">${characterLink}</span>
        <span class="run-arrow">-&gt;</span>
        <span class="run-destination">${routeLink}</span>
        ${phaseBadge}
        ${timedBadge}
      </div>
      ${collapsed ? whyPreview : whyFull}
      ${collapsed ? primaryGoalsBlock : `<div class="run-goals">${[primaryGoalHtml, ...secondaryGoals].join("")}</div>`}
      ${detailsHtml}
    </div>
  `;
}

function renderTldr(tldr: TldrItem[] | undefined): void {
  const container = document.getElementById("tldr");
  if (!container) return;

  if (!tldr || tldr.length === 0) {
    container.innerHTML = "";
    return;
  }

  const items = tldr.map((item, i) => {
    const summaryText = linkifyText(item.summary, item.links);
    return `<li class="tldr-item"><span class="tldr-num">${i + 1}.</span> <strong>${summaryText}</strong><span class="tldr-detail">${item.detail}</span></li>`;
  }).join("");

  container.innerHTML = `
    <div class="tldr-panel">
      <div class="tldr-header">TL;DR — Do These Next</div>
      <ol class="tldr-list">${items}</ol>
    </div>
  `;
}

function selectSecondaryRecommendations(
  secondary: LaneRecommendation[],
  limit: number,
): LaneRecommendation[] {
  const laneCaps: Partial<Record<Lane, number>> = {
    challenge: 3,
    "character-unlock": 3,
  };
  const selected: LaneRecommendation[] = [];
  const counts = new Map<Lane, number>();

  for (const rec of secondary) {
    if (selected.length >= limit) break;
    const cap = laneCaps[rec.lane];
    const used = counts.get(rec.lane) ?? 0;
    if (cap != null && used >= cap) continue;
    selected.push(rec);
    counts.set(rec.lane, used + 1);
  }

  return selected;
}

function renderPathRecommendations(
  runPlans: RunPlan[],
  recs: LaneRecommendation[],
  currentPhase?: ProgressionPhase,
  phaseName?: string,
  tldr?: TldrItem[],
): void {
  const warningsEl = document.getElementById("warnings");
  const criticalEl = document.getElementById("critical-path");
  const secondaryEl = document.getElementById("secondary-path");
  if (!warningsEl || !criticalEl || !secondaryEl) return;

  renderTldr(tldr);

  if (recs.length === 0 && runPlans.length === 0) {
    warningsEl.innerHTML = "";
    criticalEl.innerHTML = `<p class="empty">No recommendations — you're done!</p>`;
    secondaryEl.innerHTML = "";
    return;
  }

  const { warnings, critical, secondary, guardrails } = partitionRecommendations(recs, currentPhase);

  // Warnings: toxic panel only (toxic warnings are urgent — keep at top)
  let warningsHtml = "";
  if (warnings.length > 0) {
    warningsHtml += `<div class="toxic-panel"><div class="toxic-panel-header">Toxic Item Warnings</div>`;
    for (const r of warnings) {
      warningsHtml += renderRecCard(r);
    }
    warningsHtml += `</div>`;
  }
  warningsEl.innerHTML = warningsHtml;

  // Critical Path: show run plans first, then current-phase gate recs.
  let criticalHtml = "";
  if (runPlans.length > 0) {
    criticalHtml += `<div class="path-group path-group-runs"><div class="path-group-header">Suggested Runs</div><div class="path-group-cards">`;
    for (const plan of runPlans.slice(0, 3)) {
      criticalHtml += renderRunPlanCard(plan, currentPhase, phaseName);
    }
    criticalHtml += `</div></div>`;
  }
  if (critical.length > 0) {
    const heading = runPlans.length > 0
      ? phaseName ? `Current-Phase Gates: ${phaseName}` : "Current-Phase Gates"
      : phaseName ? `Critical Path: ${phaseName}` : "Critical Path";
    criticalHtml += `<div class="path-group path-group-critical"><div class="path-group-header">${heading}</div><div class="path-group-cards">`;
    for (const rec of critical.slice(0, runPlans.length > 0 ? 4 : 8)) {
      criticalHtml += renderRecCard(rec);
    }
    criticalHtml += `</div></div>`;
  }
  criticalEl.innerHTML = criticalHtml;

  // Secondary: top 6
  let secondaryHtml = "";
  const compactSecondary = selectSecondaryRecommendations(secondary, 6);
  if (compactSecondary.length > 0) {
    secondaryHtml += `<div class="path-group path-group-secondary path-group-grid"><div class="path-group-header">Also Worth Doing</div><div class="path-group-cards">`;
    for (const r of compactSecondary) {
      secondaryHtml += renderRecCard(r);
    }
    secondaryHtml += `</div></div>`;
  }

  // Guardrails: collapsed below actionable recs
  if (guardrails.length > 0) {
    secondaryHtml += `<details class="lane-section"><summary>Tips &amp; Warnings (${guardrails.length})</summary>`;
    secondaryHtml += `<div class="guardrails-panel">`;
    for (const g of guardrails) {
      secondaryHtml += `<div class="guardrail-item"><strong>${g.target}</strong><p>${g.whyNow}</p></div>`;
    }
    secondaryHtml += `</div></details>`;
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
        const portrait = charSpritePath(c.name);
        const portraitHtml = portrait ? `<img src="${portrait}" alt="" class="char-unlock-portrait">` : "";
        const nameLink = wikiLink(characterWikiUrl(c.name), c.name);
        const desc = c.unlocked ? "" : `<div class="unlock-how">${c.unlockDescription}</div>`;
        return `<div class="${cls}">${portraitHtml} ${nameLink}${desc}</div>`;
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
    const nameHtml = wikiLink(bestiaryWikiUrl(e.name), e.name);
    return `<tr${cls}><td>${nameHtml}</td><td>${e.encountered}</td><td>${e.kills}</td><td>${e.hitsTaken}</td><td>${e.deathsTo}</td></tr>`;
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

function renderBossKillMilestones(milestones: BossKillMilestoneGroupStatus[]): void {
  const section = document.getElementById("boss-milestones-section");
  const container = document.getElementById("boss-milestones");
  if (!section || !container) return;

  if (milestones.length === 0) {
    section.classList.add("hidden");
    return;
  }
  section.classList.remove("hidden");

  let html = "";
  for (const group of milestones) {
    const done = group.milestones.filter((m) => m.unlocked).length;
    const total = group.milestones.length;
    const allDone = done === total;
    const pctVal = total === 0 ? "0" : ((done / total) * 100).toFixed(1);

    const killsLabel = group.killCountKnown
      ? `${group.currentKills} kills`
      : `${group.currentKills}+ kills (estimated)`;

    const rows = group.milestones.map((m) => {
      const icon = m.unlocked ? "&#10003;" : "&#10007;";
      const stateClass = m.unlocked ? "unlocked" : "locked";
      const nextClass = !m.unlocked && group.nextMilestone?.achievementId === m.achievementId ? " next" : "";
      const milestoneUrl = achievementWikiUrl(m.name);
      const milestoneName = wikiLink(milestoneUrl, m.name);
      return `
        <div class="milestone-row ${stateClass}${nextClass}">
          <span class="milestone-icon">${icon}</span>
          <span class="milestone-kills">${m.kills} kills</span>
          <span class="milestone-name">${milestoneName}</span>
        </div>`;
    }).join("");

    const openAttr = allDone ? "" : " open";
    const completeClass = allDone ? " complete" : "";

    html += `
      <details class="milestone-group${completeClass}"${openAttr}>
        <summary>
          <span class="milestone-summary">
            ${allDone ? "&#10003; " : ""}${wikiLink(bossWikiUrl(group.bossName), group.bossDisplayName)}
            <span class="progress-bar"><span class="progress-fill" style="width:${pctVal}%"></span></span>
            <span class="milestone-count">${done}/${total} — ${killsLabel}</span>
          </span>
        </summary>
        <div class="milestone-rows">${rows}</div>
      </details>`;
  }

  container.innerHTML = html;
}

export function renderResults(result: AnalysisResult): void {
  $("upload-section").classList.add("collapsed");
  $("results").classList.remove("hidden");

  renderDlcBadge(result);
  renderSummary(result);
  renderOverview(result);
  renderPathRecommendations(
    result.runPlans,
    result.laneRecommendations,
    result.phaseProgress?.currentPhase,
    result.phaseProgress?.phaseName,
    result.tldr,
  );
  renderPhaseProgress(result.phaseProgress);
  renderBossKillMilestones(result.bossKillMilestones);
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
