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

  const completedChallenges = result.challenges.filter((challenge) => challenge.completed).length;
  const actionableItems = result.actionItems.filter((item) => item.category !== "warning");
  const topAction = actionableItems[0];
  // Count only tier 1+2 items (genuine alternatives), not later goals/backlog
  const peerAlternatives = actionableItems.filter((item) => item.tier === 1 || item.tier === 2).length - 1;
  const alternativeCount = Math.max(0, peerAlternatives);
  const toxicWarnings = result.actionItems.filter((item) => item.isToxicWarning).length;

  const summaryCopy = phase
    ? `You're in ${phase.phaseName} with ${result.totalAchievements - result.unlockedCount} achievements to go.`
    : `${result.totalAchievements - result.unlockedCount} achievements to go.`;

  // Compact callout for #1 action
  let calloutHtml = "";
  if (topAction) {
    let calloutText: string;
    if (topAction.category === "run" && topAction.character && topAction.route) {
      const portrait = charSpritePath(topAction.character);
      const portraitHtml = portrait ? `<img src="${portrait}" alt="" class="run-portrait">` : "";
      calloutText = `${portraitHtml}<span class="summary-callout-label">Next move:</span> ${wikiLink(characterWikiUrl(topAction.character), topAction.character)} <span class="summary-callout-arrow">&#8594;</span> ${topAction.routeWikiPath ? wikiLink(routeWikiUrl(topAction.routeWikiPath), topAction.route) : topAction.route}`;
    } else {
      calloutText = `<span class="summary-callout-label">Next move:</span> ${topAction.headline}`;
    }
    const altLine = alternativeCount > 0
      ? `<div class="summary-callout-alt"><a href="#tier-2-3">+ ${alternativeCount} alternative${alternativeCount === 1 ? "" : "s"} below</a></div>`
      : "";
    calloutHtml = `
      <a href="#${actionAnchorId(topAction)}" class="summary-callout">
        <div class="summary-callout-main">${calloutText}</div>
      </a>
      ${altLine}
    `;
  }

  container.innerHTML = `
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
      ${calloutHtml}
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
            <details class="phase-criteria-toggle">
              <summary class="phase-criteria-toggle-summary">Phase criteria (${criteriaMet}/${criteriaTotal})</summary>
              ${phaseCriteriaHtml}
            </details>
          `
          : `
            <div class="summary-phase-name">No phase detected</div>
            <p class="summary-card-copy">Load a save file to see the progression phase and its gating criteria.</p>
          `}
      </div>
    </div>

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
      ${description ? `<p class="overview-panel-copy">${description}</p>` : ""}
      <div class="overview-stat-list">${items.join("")}</div>
    </div>
  `;

  $("overview").innerHTML = `
    <div class="overview-panels">
      ${renderOverviewPanel("Run History", "", [
        renderOverviewStat("Mom Kills", s.momKills.toLocaleString(), "momKills"),
        renderOverviewStat("Mom's Heart Kills", s.momsHeartKills.toLocaleString(), "momKills"),
        renderOverviewStat("Deaths", s.deaths.toLocaleString(), "deaths"),
        renderOverviewStat("Win Streak", s.winStreak.toLocaleString(), "winStreak"),
        renderOverviewStat("Best Streak", s.bestStreak.toLocaleString(), "bestStreak"),
      ])}
      ${renderOverviewPanel("Economy", "", [
        renderOverviewStat("Eden Tokens", s.edenTokens.toLocaleString(), "edenTokens"),
        renderOverviewStat("Normal Donation", s.normalDonationCoins.toLocaleString(), "donationMachine"),
        renderOverviewStat("Greed Donation", s.greedDonationCoins.toLocaleString(), "greedDonation"),
      ])}
      ${renderOverviewPanel("Environment", "", [
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
  recommendedChars?: Set<string>;
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
  ).join("")}</tr>`;

  const rows = grid.map((char) => {
    const remaining = char.total - char.done;
    const nearComplete = remaining > 0 && remaining <= config.nearCompleteThreshold && char.done > 0;
    const completionPct = char.total === 0 ? 0 : (char.done / char.total) * 100;
    const isComplete = char.done === char.total && char.total > 0;
    const isRecommended = config.recommendedChars?.has(char.name) ?? false;
    const rowClass = nearComplete ? "near-complete" : isComplete ? "complete" : "";
    const filterStatus = isRecommended ? "recommended" : isComplete ? "complete" : nearComplete ? "near-complete" : "incomplete";
    const cells = char.marks.map(markCell).join("");
    const portrait = charSpritePath(char.name);
    const portraitHtml = portrait
      ? `<img src="${portrait}" alt="" class="char-portrait">`
      : "";
    const charLink = wikiLink(characterWikiUrl(char.name), char.name);
    const doneCount = `<span class="char-done-count">${char.done}/${char.total}</span>`;
    const gradientStyle = `background: linear-gradient(90deg, rgba(76,175,80,${(completionPct * 0.06 / 100).toFixed(3)}) 0%, rgba(76,175,80,${(completionPct * 0.06 / 100).toFixed(3)}) ${completionPct.toFixed(0)}%, transparent ${completionPct.toFixed(0)}%)`;
    return `<tr class="${rowClass}" data-status="${filterStatus}" style="${gradientStyle}"><td class="char-name">${portraitHtml}${charLink} ${doneCount}</td>${cells}</tr>`;
  });

  // Mobile card view
  const cards = grid.map((char) => {
    const portrait = charSpritePath(char.name);
    const portraitHtml = portrait ? `<img src="${portrait}" alt="" class="char-portrait">` : "";
    const charLink = wikiLink(characterWikiUrl(char.name), char.name);
    const completionPct = char.total === 0 ? 0 : (char.done / char.total) * 100;
    const remaining = char.total - char.done;
    const nearComplete = remaining > 0 && remaining <= config.nearCompleteThreshold && char.done > 0;
    const isComplete = char.done === char.total && char.total > 0;
    const isRecommended = config.recommendedChars?.has(char.name) ?? false;
    const filterStatus = isRecommended ? "recommended" : isComplete ? "complete" : nearComplete ? "near-complete" : "incomplete";
    const missing = char.marks.filter((m) => m.achievementId !== null && !m.done);
    const missingHtml = missing.length > 0
      ? `<div class="mobile-card-missing">${missing.map((m) => {
          const src = markSpritePath(m.boss, false);
          const shortName = bossHeaders[char.marks.indexOf(m)] ?? m.boss;
          return src
            ? `<span class="mobile-mark" title="${shortName}"><img src="${src}" alt="${shortName}" class="mark-icon"></span>`
            : `<span class="mobile-mark" title="${shortName}">${shortName}</span>`;
        }).join("")}</div>`
      : `<div class="mobile-card-complete">All marks complete</div>`;
    return `<div class="mobile-char-card" data-status="${filterStatus}"><div class="mobile-card-header">${portraitHtml}${charLink} <span class="char-done-count">${char.done}/${char.total}</span></div><div class="progress-bar"><div class="progress-fill" style="width:${completionPct.toFixed(1)}%"></div></div>${missingHtml}</div>`;
  }).join("");

  container.innerHTML = `
    <div class="marks-table-wrapper desktop-only">
      <table class="marks-table">
        <thead>${headerRow}</thead>
        <tbody>${rows.join("")}</tbody>
      </table>
    </div>
    <div class="mobile-char-cards mobile-only">${cards}</div>
  `;
}

function renderCompletionGrid(grid: CharacterProgress[], recommendedChars?: Set<string>): void {
  const bossHeaders = grid.length > 0
    ? grid[0].marks.map((m) => BOSS_SHORT_NAME[m.boss] ?? m.boss)
    : [];
  const bossFullNames = grid.length > 0
    ? grid[0].marks.map((m) => m.boss)
    : [];
  renderGrid(grid, bossHeaders, { elementId: "completion-grid", nearCompleteThreshold: 4, bossFullNames, recommendedChars });
}

function renderTaintedCompletionGrid(grid: TaintedCharacterProgress[], recommendedChars?: Set<string>): void {
  const bossFullNames = grid.length > 0
    ? grid[0].marks.map((m) => m.boss)
    : [];
  renderGrid(grid, [...TAINTED_BOSS_SHORT_NAMES], { elementId: "tainted-completion-grid", nearCompleteThreshold: 3, bossFullNames, recommendedChars });
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
    ? `<div class="blocked-by">Needs: ${item.blockedBy.map((blocker) => {
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
      <div class="rec-header">${badge} ${renderActionHeadline(item)}${itemBadge}</div>
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
    ? `<section class="warning-lane"><div class="warning-lane-header">Toxic Item Warnings</div><div class="warning-lane-cards">${warnings.map((item) => renderActionCard(item, true)).join("")}</div></section>`
    : "";

  if (actionable.length === 0) {
    tierOneEl.innerHTML = `<p class="empty">Nothing major stands out right now. You're mostly down to cleanup and edge cases.</p>`;
    tierTwoThreeEl.innerHTML = guardrails.length > 0
      ? `<details class="lane-section"><summary>Things to Know (${guardrails.length})</summary><div class="guardrails-panel">${guardrails.map((item) => `<div class="guardrail-item"><strong>${item.headline}</strong><p>${item.detail}</p></div>`).join("")}</div></details>`
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
    sections.push(`<div class="path-group path-group-secondary path-group-grid tier-2"><div class="path-group-header">Good Alternatives</div><div class="path-group-cards">${tierTwo.map((item) => renderActionCard(item, false)).join("")}</div></div>`);
  } else if (actionable.length < 3) {
    sections.push(`<div class="path-group path-group-secondary"><div class="path-group-header">Good Alternatives</div><p class="section-intro">Focus on the top pick for now — no equally strong alternatives yet.</p></div>`);
  }

  if (tierThree.length > 0) {
    const TIER3_CAP = 10;
    const visibleThree = tierThree.slice(0, TIER3_CAP);
    const hiddenThree = tierThree.slice(TIER3_CAP);
    const showAllBtn = hiddenThree.length > 0
      ? `<div class="tier3-show-all-wrap"><button class="tier3-show-all" type="button">Show all (${tierThree.length})</button></div>`
      : "";
    const hiddenHtml = hiddenThree.length > 0
      ? `<div class="tier3-overflow hidden">${hiddenThree.map((item) => renderActionCard(item, false)).join("")}</div>`
      : "";
    sections.push(`<details class="lane-section"><summary>Later Goals (${tierThree.length})</summary><div class="path-group-cards">${visibleThree.map((item) => renderActionCard(item, false)).join("")}</div>${hiddenHtml}${showAllBtn}</details>`);
  }

  sections.push(`<details class="lane-section"><summary>Lower Priority (${backlog.length})</summary><div class="path-group-cards">${backlog.map((item) => renderActionCard(item, false)).join("")}</div></details>`);

  if (guardrails.length > 0) {
    sections.push(`<details class="lane-section"><summary>Things to Know (${guardrails.length})</summary><div class="guardrails-panel">${guardrails.map((item) => `<div class="guardrail-item"><strong>${item.headline}</strong><p>${item.detail}</p></div>`).join("")}</div></details>`);
  }

  sections.push(renderSuppressedItems(suppressedItems));
  tierTwoThreeEl.innerHTML = sections.join("");

  // Wire up "Show all" for capped tier 3
  const showAllBtn = tierTwoThreeEl.querySelector(".tier3-show-all");
  if (showAllBtn) {
    showAllBtn.addEventListener("click", () => {
      const overflow = tierTwoThreeEl.querySelector(".tier3-overflow");
      if (overflow) overflow.classList.remove("hidden");
      showAllBtn.parentElement?.remove();
    });
  }
}

function renderChallenges(challenges: ChallengeInfo[], actionItems: ActionItem[]): void {
  // Find recommended challenge IDs from tier 1/2 action items
  const recommendedIds = new Set<number>();
  for (const item of actionItems) {
    if (item.category === "challenge" && item.challengeId != null && (item.tier === 1 || item.tier === 2)) {
      recommendedIds.add(item.challengeId);
    }
  }

  const recommended = challenges.filter((c) => !c.completed && recommendedIds.has(c.id));
  const remainingIncomplete = challenges.filter((c) => !c.completed && !recommendedIds.has(c.id));
  const completed = challenges.filter((c) => c.completed);

  const renderRow = (c: ChallengeInfo, extra?: string) => {
    const rewardHtml = c.reward
      ? `<span class="reward">Unlocks: ${wikiLink(rewardWikiUrl(c.reward), c.reward)}</span>`
      : "";
    const nameLink = wikiLink(challengeWikiUrl(c.name), c.name);
    const status = c.completed ? "completed" : recommendedIds.has(c.id) ? "recommended" : "incomplete";
    const cls = c.completed ? "challenge-row done" : "challenge-row";
    const badge = extra ? `<span class="challenge-rec-badge">${extra}</span>` : "";
    return `<div class="${cls}" data-status="${status}"><span class="ch-id">#${c.id}</span> ${nameLink} ${rewardHtml}${badge}</div>`;
  };

  let html = "";
  if (recommended.length > 0) {
    html += `<h3 data-group="recommended">Recommended (${recommended.length})</h3><div class="challenge-rows" data-group="recommended">${recommended.map((c) => renderRow(c, "Recommended")).join("")}</div>`;
  }
  html += `<h3 data-group="incomplete">Incomplete (${remainingIncomplete.length})</h3><div class="challenge-rows" data-group="incomplete">${remainingIncomplete.map((c) => renderRow(c)).join("")}</div>`;
  if (completed.length > 0) {
    html += `<details class="challenge-completed-toggle" data-group="completed"><summary>Completed (${completed.length})</summary><div class="challenge-rows">${completed.map((c) => renderRow(c)).join("")}</div></details>`;
  }
  $("challenges").innerHTML = html;
}

function renderCharacterUnlocks(result: AnalysisResult): void {
  const COLLAPSE_THRESHOLD = 10;

  const renderCharItem = (c: typeof result.baseCharacters[0]) => {
    const cls = c.unlocked ? "char-unlock unlocked" : "char-unlock locked";
    const status = c.unlocked ? "unlocked" : "locked";
    const portrait = charSpritePath(c.name);
    const portraitHtml = portrait ? `<img src="${portrait}" alt="" class="char-unlock-portrait">` : "";
    const nameLink = wikiLink(characterWikiUrl(c.name), c.name);
    const desc = c.unlocked ? "" : `<div class="unlock-how">${c.unlockDescription}</div>`;
    return `<div class="${cls}" data-status="${status}">${portraitHtml} ${nameLink}${desc}</div>`;
  };

  const renderGroup = (chars: typeof result.baseCharacters, title: string) => {
    const locked = chars.filter((c) => !c.unlocked);
    const unlocked = chars.filter((c) => c.unlocked);

    let html = `<h3>${title}</h3>`;
    if (locked.length > 0) {
      html += `<h4 class="char-group-label">Locked (${locked.length})</h4><div class="char-list">${locked.map(renderCharItem).join("")}</div>`;
    }
    if (unlocked.length > COLLAPSE_THRESHOLD) {
      html += `<details class="char-unlocked-toggle"><summary>Unlocked (${unlocked.length})</summary><div class="char-list">${unlocked.map(renderCharItem).join("")}</div></details>`;
    } else if (unlocked.length > 0) {
      html += `<h4 class="char-group-label">Unlocked (${unlocked.length})</h4><div class="char-list">${unlocked.map(renderCharItem).join("")}</div>`;
    }
    return html;
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
    <details class="bestiary-collapse">
      <summary class="bestiary-collapse-summary">${result.bestiaryEncountered}/${result.bestiaryTotal} entities encountered (${pct(result.bestiaryEncountered, result.bestiaryTotal)}%) — click to expand</summary>
      ${renderBestiaryGroup(bosses, "Bosses", false)}
      ${renderBestiaryGroup(enemies, "Regular Enemies", false)}
    </details>
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

    const renderRow = (m: typeof group.milestones[0]) => {
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
    };

    const remaining = group.milestones.filter((m) => !m.unlocked);
    const completed = group.milestones.filter((m) => m.unlocked);
    const remainingRows = remaining.map(renderRow).join("");
    const completedRows = completed.map(renderRow).join("");

    const completedToggle = completed.length > 0 && remaining.length > 0
      ? `<details class="milestone-completed-toggle"><summary class="milestone-completed-summary">Show completed (${completed.length})</summary><div class="milestone-rows">${completedRows}</div></details>`
      : "";

    const openAttr = allDone ? "" : " open";
    const completeClass = allDone ? " complete" : "";

    // If all done, show all rows directly; otherwise show remaining first, then toggle for completed
    const rowsHtml = allDone
      ? `<div class="milestone-rows">${completedRows}</div>`
      : `<div class="milestone-rows">${remainingRows}</div>${completedToggle}`;

    html += `
      <details class="milestone-group${completeClass}"${openAttr}>
        <summary>
          <span class="milestone-summary">
            ${allDone ? "&#10003; " : ""}${wikiLink(bossWikiUrl(group.bossName), group.bossDisplayName)}
            <span class="progress-bar"><span class="progress-fill" style="width:${pctVal}%"></span></span>
            <span class="milestone-count">${done}/${total} — ${killsLabel}</span>
          </span>
        </summary>
        ${rowsHtml}
      </details>`;
  }

  container.innerHTML = html;
}

function renderFilterBar(containerId: string, filters: { label: string; value: string }[]): string {
  return `<div class="filter-bar" data-target="${containerId}">${filters.map((f, i) =>
    `<button class="filter-btn${i === 0 ? " active" : ""}" data-filter="${f.value}" type="button">${f.label}</button>`
  ).join("")}</div>`;
}

function wireFilterBars(): void {
  document.querySelectorAll<HTMLElement>(".filter-bar").forEach((bar) => {
    const targetId = bar.dataset.target;
    if (!targetId) return;
    const container = document.getElementById(targetId);
    if (!container) return;

    bar.addEventListener("click", (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLButtonElement>(".filter-btn");
      if (!btn) return;
      bar.querySelectorAll(".filter-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const filter = btn.dataset.filter ?? "all";

      // Toggle visibility on all items with data-status
      container.querySelectorAll<HTMLElement>("[data-status]").forEach((el) => {
        if (filter === "all" || el.dataset.status === filter) {
          el.classList.remove("filter-hidden");
        } else {
          el.classList.add("filter-hidden");
        }
      });

      // Toggle visibility on grouped headings/containers (challenges)
      container.querySelectorAll<HTMLElement>("[data-group]").forEach((el) => {
        if (filter === "all" || el.dataset.group === filter) {
          el.classList.remove("filter-hidden");
        } else {
          el.classList.add("filter-hidden");
        }
      });

      // Toggle character group labels and toggles
      container.querySelectorAll<HTMLElement>(".char-group-label, .char-unlocked-toggle").forEach((el) => {
        if (filter === "all") {
          el.classList.remove("filter-hidden");
        } else {
          el.classList.add("filter-hidden");
        }
      });
    });
  });
}

export function renderResults(result: AnalysisResult): void {
  $("upload-section").classList.add("collapsed");
  $("results").classList.remove("hidden");

  // Remove any filter bars from a previous render
  document.querySelectorAll(".filter-bar").forEach((el) => el.remove());

  renderDlcBadge(result);
  renderSummary(result);
  renderOverview(result);
  renderActionPlan(result.actionItems, result.suppressedItems);
  renderBossKillMilestones(result.bossKillMilestones);
  renderCompletionDashboard(result);

  // Build recommended character set from tier 1/2 action items
  const recommendedChars = new Set<string>();
  for (const item of result.actionItems) {
    if (item.character && (item.tier === 1 || item.tier === 2)) {
      recommendedChars.add(item.character);
    }
  }

  renderCompletionGrid(result.completionGrid, recommendedChars);

  // Conditional grid heading: drop "(Base)" when no tainted section
  const gridHeading = document.querySelector("#completion-grid-section h2");
  if (gridHeading) {
    gridHeading.textContent = result.dlcLevel === "repentance" ? "Completion Marks (Base)" : "Completion Marks";
  }

  // Insert filter bar for base completion grid
  const gridSection = document.getElementById("completion-grid-section");
  if (gridSection) {
    const gridContainer = document.getElementById("completion-grid");
    if (gridContainer) {
      gridContainer.insertAdjacentHTML("beforebegin", renderFilterBar("completion-grid", [
        { label: "All", value: "all" },
        { label: "Recommended", value: "recommended" },
        { label: "Incomplete", value: "incomplete" },
        { label: "Near Complete", value: "near-complete" },
        { label: "Complete", value: "complete" },
      ]));
    }
  }

  // Conditionally show/hide tainted section
  const taintedSection = document.getElementById("tainted-section");
  if (taintedSection) {
    if (result.dlcLevel === "repentance") {
      taintedSection.classList.remove("hidden");
      renderTaintedCompletionGrid(result.taintedCompletionGrid, recommendedChars);
      // Insert filter bar for tainted grid
      const taintedContainer = document.getElementById("tainted-completion-grid");
      if (taintedContainer) {
        taintedContainer.insertAdjacentHTML("beforebegin", renderFilterBar("tainted-completion-grid", [
          { label: "All", value: "all" },
          { label: "Recommended", value: "recommended" },
          { label: "Incomplete", value: "incomplete" },
          { label: "Near Complete", value: "near-complete" },
          { label: "Complete", value: "complete" },
        ]));
      }
    } else {
      taintedSection.classList.add("hidden");
    }
  }

  renderChallenges(result.challenges, result.actionItems);

  // Insert filter bar for challenges
  const challengesContainer = document.getElementById("challenges");
  if (challengesContainer) {
    challengesContainer.insertAdjacentHTML("beforebegin", renderFilterBar("challenges", [
      { label: "All", value: "all" },
      { label: "Recommended", value: "recommended" },
      { label: "Incomplete", value: "incomplete" },
      { label: "Completed", value: "completed" },
    ]));
  }

  renderCharacterUnlocks(result);

  // Insert filter bar for characters
  const charsContainer = document.getElementById("characters");
  if (charsContainer) {
    charsContainer.insertAdjacentHTML("beforebegin", renderFilterBar("characters", [
      { label: "All", value: "all" },
      { label: "Locked", value: "locked" },
      { label: "Unlocked", value: "unlocked" },
    ]));
  }

  renderBestiary(result);
  renderMissingUnlocks(result.missingUnlocks);

  // Wire all filter bars
  wireFilterBars();
}

export function showError(message: string): void {
  $("error").textContent = message;
  $("error").classList.remove("hidden");
}

export function clearError(): void {
  $("error").textContent = "";
  $("error").classList.add("hidden");
}
