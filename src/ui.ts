import type {
  ActionItem,
  AnalysisResult,
  BossKillMilestoneGroupStatus,
  BestiaryEntry,
  CharacterProgress,
  ChallengeInfo,
  MissingUnlocksResult,
  PhaseProgress,
  RunGoal,
  SuppressedItem,
  TaintedCharacterProgress,
} from "./types";
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

function renderTimedBadge(timed: boolean, timedDescription?: string): string {
  if (!timed) return "";
  const description = timedDescription ?? "Timed route";
  const escaped = escapeHtmlAttr(description);
  return `<span class="run-timed" title="${escaped}" aria-label="${escaped}">timed</span>`;
}

function actionAnchorId(item: ActionItem): string {
  return `action-${item.id}`;
}

function renderSummaryFeaturedAction(item: ActionItem): string {
  if (item.category === "run" && item.character && item.route) {
    const portrait = charSpritePath(item.character);
    return `
      <a href="#${actionAnchorId(item)}" class="summary-feature-link">
        <div class="summary-route">
          <div class="summary-route-line">
            ${portrait ? `<img src="${portrait}" alt="" class="run-portrait">` : ""}
            <span class="summary-route-character">${wikiLink(characterWikiUrl(item.character), item.character)}</span>
            <span class="summary-route-arrow">-&gt;</span>
            <span class="summary-route-destination">${item.routeWikiPath ? wikiLink(routeWikiUrl(item.routeWikiPath), item.route) : item.route}</span>
            ${renderTimedBadge(!!item.timed, item.timedDescription)}
          </div>
          <div class="summary-route-why">${item.headline}</div>
          <div class="summary-route-goal">${item.whyFirst ?? item.detail}</div>
        </div>
      </a>
    `;
  }

  return `
    <a href="#${actionAnchorId(item)}" class="summary-feature-link">
      <div class="summary-route">
        <div class="summary-route-line">
          <span class="summary-route-character">${item.headline}</span>
        </div>
        <div class="summary-route-why">${item.whyFirst ?? item.detail}</div>
      </div>
    </a>
  `;
}

function renderSummaryFollowUps(items: ActionItem[]): string {
  if (items.length === 0) {
    return `<p class="summary-empty">No additional strong alternatives right now.</p>`;
  }

  return `
    <ol class="summary-focus-list">
      ${items.map((item, index) => `
        <li class="summary-focus-item">
          <span class="summary-focus-index">${index + 2}</span>
          <div>
            <a href="#${actionAnchorId(item)}"><strong>${item.headline}</strong></a>
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
  const phaseCriteriaHtml = phase
    ? `
      <ul class="phase-criteria summary-phase-criteria">
        ${phase.criteria.map((criterion) => {
          const description = criterion.wikiUrl
            ? wikiLink(criterion.wikiUrl, criterion.description)
            : criterion.description;
          const howTo = criterion.howTo ? `<span class="phase-how-to">${criterion.howTo}</span>` : "";
          return `<li class="phase-criterion ${criterion.met ? "met" : "unmet"}">${description}${howTo}</li>`;
        }).join("")}
      </ul>
    `
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
  const actionableItems = result.actionItems.filter((item) => item.category !== "warning");
  const topAction = actionableItems[0];
  const followUps = actionableItems.slice(1, 3);
  const toxicWarnings = result.actionItems.filter((item) => item.isToxicWarning).length;

  const metrics = [
    renderSummaryMetric("Base Marks", baseMarks, baseTotal),
    taintedTotal > 0 ? renderSummaryMetric("Tainted Marks", taintedMarks, taintedTotal) : "",
    renderSummaryMetric("Challenges", completedChallenges, result.challenges.length),
    renderSummaryMetric("Characters", unlockedCharacters, totalCharacters),
    renderSummaryMetric("Collectibles", result.collectiblesSeen, result.totalCollectibles),
    result.bestiaryTotal > 0 ? renderSummaryMetric("Bestiary", result.bestiaryEncountered, result.bestiaryTotal) : "",
  ].filter(Boolean).join("");

  const summaryCopy = phase
    ? `You're in ${phase.phaseName}. ${result.totalAchievements - result.unlockedCount} achievements remain. The sections below split out your best next play, strong follow-ups, and longer-term cleanup.`
    : `${result.totalAchievements - result.unlockedCount} achievements remain. The sections below split out your best next play, strong follow-ups, and longer-term cleanup.`;

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
              ${phaseCriteriaHtml}
            `
            : `
              <div class="summary-phase-name">No phase detected</div>
              <p class="summary-card-copy">Load a save file to see the progression phase and its gating criteria.</p>
            `}
        </div>
      </div>

      <div class="summary-card summary-focus">
        <div class="summary-card-heading">Featured Pick</div>
        <p class="summary-card-copy">The summary points at the top priority, then links you down into the full Play Next queue without duplicating cards.</p>
        ${topAction ? renderSummaryFeaturedAction(topAction) : `<p class="summary-empty">No action shortlist generated for this save.</p>`}
        <div class="summary-card-heading summary-card-subheading">Rotate Into</div>
        ${renderSummaryFollowUps(followUps)}
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

const CATEGORY_LABELS: Record<ActionItem["category"], string> = {
  run: "Boss route",
  gate: "Progression goal",
  unlock: "Character unlock",
  mark: "Character mark",
  challenge: "Challenge",
  donation: "Donation grind",
  daily: "Daily challenge",
  warning: "Warning",
};

const CATEGORY_BADGE_CLASS: Record<ActionItem["category"], string> = {
  run: "high",
  gate: "high",
  unlock: "med",
  mark: "med",
  challenge: "med",
  donation: "low",
  daily: "high",
  warning: "opt",
};

function renderItemBadge(quality?: ItemQuality, name?: string): string {
  if (!quality) return "";
  const title = name ? ` title="${name}"` : "";
  return `<span class="item-badge ${quality}"${title}>${quality}</span>`;
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

function renderActionHeadline(item: ActionItem): string {
  if (item.category === "run" && item.character && item.route) {
    const portrait = charSpritePath(item.character);
    const routeHtml = item.routeWikiPath ? wikiLink(routeWikiUrl(item.routeWikiPath), item.route) : item.route;
    return `
      <div class="run-plan-header">
        ${portrait ? `<img src="${portrait}" alt="" class="run-portrait">` : ""}
        <span class="run-character">${wikiLink(characterWikiUrl(item.character), item.character)}</span>
        <span class="run-arrow">-&gt;</span>
        <span class="run-destination">${routeHtml}</span>
        ${renderTimedBadge(!!item.timed, item.timedDescription)}
      </div>
    `;
  }

  if (item.category === "mark" && item.character && item.headline.includes("->")) {
    const [character, boss] = item.headline.split("->").map((part) => part.trim());
    return `${wikiLink(characterWikiUrl(character), character)} -> ${wikiLink(bossWikiUrl(boss), boss)}`;
  }

  if (item.category === "unlock" && item.character) {
    return `Unlock ${wikiLink(characterWikiUrl(item.character), item.character)}`;
  }

  if (item.category === "challenge") {
    const match = item.headline.match(/^(Complete #\d+\s+)(.+?)(\s+—\s+unlocks\s+(.+))?$/);
    if (match) {
      const [, prefix, challengeName, rewardPart, reward] = match;
      return `${prefix}${wikiLink(challengeWikiUrl(challengeName), challengeName)}${rewardPart ? ` — unlocks ${wikiLink(rewardWikiUrl(reward), reward)}` : ""}`;
    }
  }

  return linkifyText(item.headline, item.links);
}

function renderScoreBreakdown(item: ActionItem): string {
  if (!item.scoreBreakdown) return "";
  const b = item.scoreBreakdown;
  return `
    <details class="action-debug">
      <summary>Score breakdown</summary>
      <div class="action-debug-grid">
        <span>impact</span><strong>${b.impact.toFixed(1)}</strong>
        <span>readiness</span><strong>${b.readiness.toFixed(1)}</strong>
        <span>effort</span><strong>${b.effort.toFixed(1)}</strong>
        <span>item quality</span><strong>${b.itemQuality.toFixed(1)}</strong>
        <span>phase</span><strong>${b.phaseAlignment.toFixed(1)}</strong>
        <span>community</span><strong>${b.communityMeta.toFixed(1)}</strong>
        <span>blocker decay</span><strong>${b.blockerDecay.toFixed(2)}</strong>
        <span>diversity</span><strong>${b.diversityPenalty.toFixed(1)}</strong>
        <span>base</span><strong>${b.baseScore.toFixed(1)}</strong>
        <span>final</span><strong>${b.finalScore.toFixed(1)}</strong>
      </div>
    </details>
  `;
}

function renderActionCard(item: ActionItem, expanded: boolean): string {
  const badge = `<span class="badge ${CATEGORY_BADGE_CLASS[item.category]}">${CATEGORY_LABELS[item.category]}</span>`;
  const itemBadge = renderItemBadge(item.itemQuality, item.itemName);
  const blockedHtml = item.blockedBy && item.blockedBy.length > 0
    ? `<div class="blocked-by">Blocked: ${item.blockedBy.map((blocker) => {
        if (blocker.achievementId != null) {
          const achievement = getAchievement(blocker.achievementId);
          const url = achievementWikiUrl(achievement.name);
          return url ? `${blocker.description} ${wikiLink(url, "↗")}` : blocker.description;
        }
        return blocker.description;
      }).join("; ")}</div>`
    : "";
  const whyFirst = item.whyFirst ? `<div class="action-why-first">${item.whyFirst}</div>` : "";
  const goals = item.category === "run" && item.goals && item.goals.length > 0
    ? `<div class="run-goals">${item.goals.map((goal, index) => renderRunGoal(goal, index === 0)).join("")}</div>`
    : "";
  const detail = `<div class="rec-reason">${item.detail}</div>`;
  const debug = renderScoreBreakdown(item);
  const compact = !expanded && (item.detail.length > 150 || (item.goals?.length ?? 0) > 2);
  const body = compact
    ? `
      <details class="card-details">
        <summary class="card-details-summary">More detail</summary>
        <div class="card-details-body">${detail}${whyFirst}${goals}${blockedHtml}${debug}</div>
      </details>
    `
    : `${detail}${whyFirst}${goals}${blockedHtml}${debug}`;

  return `
    <article id="${actionAnchorId(item)}" class="rec-card action-card tier-${item.tier}${item.isToxicWarning ? " toxic-warning" : ""}">
      <div class="rec-header">${badge}${itemBadge} ${renderActionHeadline(item)}</div>
      ${compact ? `<div class="rec-reason rec-reason-preview">${item.detail}</div>` : ""}
      ${body}
    </article>
  `;
}

function renderSuppressedItems(suppressedItems: SuppressedItem[] | undefined): string {
  if (!suppressedItems || suppressedItems.length === 0) return "";
  return `
    <details class="lane-section">
      <summary>Suppressed (${suppressedItems.length})</summary>
      <div class="guardrails-panel">
        ${suppressedItems.map((entry) => `
          <div class="guardrail-item">
            <strong>${entry.item.headline}</strong>
            <p>${entry.reason}</p>
            <p>Suppressed by <code>${entry.suppressedBy}</code> at ${entry.originalScore.toFixed(1)}</p>
          </div>
        `).join("")}
      </div>
    </details>
  `;
}

function renderActionPlan(
  actionItems: ActionItem[],
  suppressedItems: SuppressedItem[] | undefined,
): void {
  const warningsEl = document.getElementById("warnings");
  const tierOneEl = document.getElementById("tier-1");
  const tierTwoThreeEl = document.getElementById("tier-2-3");
  if (!warningsEl || !tierOneEl || !tierTwoThreeEl) return;

  const warnings = actionItems.filter((item) => item.isToxicWarning);
  const guardrails = actionItems.filter((item) => item.category === "warning" && !item.isToxicWarning);
  const actionable = actionItems.filter((item) => item.category !== "warning");
  const tierOne = actionable.filter((item) => item.tier === 1);
  const tierTwo = actionable.filter((item) => item.tier === 2);
  const tierThree = actionable.filter((item) => item.tier === 3);
  const backlog = actionable.filter((item) => item.tier === "backlog");

  warningsEl.innerHTML = warnings.length > 0
    ? `<div class="path-group path-group-warning"><div class="path-group-header">Toxic Item Warnings</div><div class="path-group-cards">${warnings.map((item) => renderActionCard(item, true)).join("")}</div></div>`
    : "";

  if (actionable.length === 0) {
    tierOneEl.innerHTML = `<p class="empty">Nothing major stands out right now. You're mostly down to cleanup and edge cases.</p>`;
    tierTwoThreeEl.innerHTML = guardrails.length > 0
      ? `<details class="lane-section"><summary>Tips &amp; Warnings (${guardrails.length})</summary><div class="guardrails-panel">${guardrails.map((item) => `<div class="guardrail-item"><strong>${item.headline}</strong><p>${item.detail}</p></div>`).join("")}</div></details>`
      : "";
    return;
  }

  if (actionable.length <= 5) {
    tierOneEl.innerHTML = `
      <div class="path-group tier-1">
        <div class="path-group-header">Nearly There</div>
        <div class="path-group-cards">${actionable.map((item) => renderActionCard(item, true)).join("")}</div>
      </div>
    `;
  } else {
    tierOneEl.innerHTML = `
      <div class="path-group tier-1">
        <div class="path-group-header">Do This</div>
        <div class="path-group-cards">${tierOne.map((item) => renderActionCard(item, true)).join("")}</div>
      </div>
    `;
  }

  const sections: string[] = [];
  if (tierTwo.length > 0) {
    sections.push(`<div class="path-group path-group-secondary path-group-grid tier-2"><div class="path-group-header">Rotate Into</div><div class="path-group-cards">${tierTwo.map((item) => renderActionCard(item, false)).join("")}</div></div>`);
  } else if (actionable.length < 3) {
    sections.push(`<div class="path-group path-group-secondary"><div class="path-group-header">Getting Started</div><p class="section-intro">There are not many equally strong alternatives yet, so focus on the top card first.</p></div>`);
  }

  if (tierThree.length > 0) {
    sections.push(`<details class="lane-section"><summary>When You're Ready (${tierThree.length})</summary><div class="path-group-cards">${tierThree.map((item) => renderActionCard(item, false)).join("")}</div></details>`);
  }

  sections.push(`<details class="lane-section"><summary>Backlog (${backlog.length})</summary><div class="path-group-cards">${backlog.map((item) => renderActionCard(item, false)).join("")}</div></details>`);

  if (guardrails.length > 0) {
    sections.push(`<details class="lane-section"><summary>Tips &amp; Warnings (${guardrails.length})</summary><div class="guardrails-panel">${guardrails.map((item) => `<div class="guardrail-item"><strong>${item.headline}</strong><p>${item.detail}</p></div>`).join("")}</div></details>`);
  }

  sections.push(renderSuppressedItems(suppressedItems));
  tierTwoThreeEl.innerHTML = sections.join("");
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
  renderActionPlan(result.actionItems, result.suppressedItems);
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
