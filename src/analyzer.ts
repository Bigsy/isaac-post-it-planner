import type {
  SaveData,
  AnalysisResult,
  CharacterProgress,
  CharacterUnlock,
  ChallengeInfo,
  Recommendation,
  CounterStats,
} from "./types";
import { getAchievement, TOTAL_ACHIEVEMENTS } from "./data/achievements";
import {
  BASE_CHARACTER_UNLOCKS,
  TAINTED_CHARACTER_UNLOCKS,
  BOSS_NAMES,
  COMPLETION_MARKS,
} from "./data/characters";
import { CHALLENGE_NAMES, CHALLENGE_REWARDS } from "./data/challenges";

function getUnlockedIds(achievements: number[]): Set<number> {
  const ids = new Set<number>();
  for (let i = 1; i < achievements.length; i++) {
    if (achievements[i] !== 0) ids.add(i);
  }
  return ids;
}

function parseCounterStats(counters: number[]): CounterStats {
  const get = (i: number) => (i < counters.length ? counters[i] : 0);
  return {
    momKills: get(0),
    deaths: get(1),
    itemsCollected: get(2),
    momsHeartKills: get(3),
    satanKills: get(4),
    isaacKills: get(5),
    blueBabyKills: get(6),
    theLambKills: get(7),
    megaSatanKills: get(8),
    bossRushCompletions: get(9),
    hushCompletions: get(10),
    deliriumKills: get(11),
    motherKills: get(12),
    beastKills: get(13),
    ultraGreedKills: get(14),
    ultraGreedierKills: get(15),
  };
}

function analyzeCharacterUnlocks(
  unlocked: Set<number>,
  charMap: Record<number, string>,
): CharacterUnlock[] {
  return Object.entries(charMap)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([idStr, name]) => {
      const id = Number(idStr);
      const ach = getAchievement(id);
      return {
        achievementId: id,
        name,
        unlocked: unlocked.has(id),
        unlockDescription: ach.unlockDescription,
      };
    });
}

function analyzeCompletionMarks(unlocked: Set<number>): CharacterProgress[] {
  return Object.entries(COMPLETION_MARKS).map(([name, marks]) => {
    let done = 0;
    let total = 0;
    const markDetails = marks.map((achId, i) => {
      if (achId === null) {
        return { boss: BOSS_NAMES[i], done: false, achievementId: null };
      }
      total++;
      const isDone = unlocked.has(achId);
      if (isDone) done++;
      return { boss: BOSS_NAMES[i], done: isDone, achievementId: achId };
    });
    return { name, marks: markDetails, done, total };
  });
}

function analyzeChallenges(challengeData: number[]): ChallengeInfo[] {
  const results: ChallengeInfo[] = [];
  for (let i = 1; i <= 45; i++) {
    const completed = i < challengeData.length && challengeData[i] !== 0;
    results.push({
      id: i,
      name: CHALLENGE_NAMES[i] ?? `Challenge ${i}`,
      reward: CHALLENGE_REWARDS[i] ?? null,
      completed,
    });
  }
  return results;
}

function generateRecommendations(
  unlocked: Set<number>,
  completionGrid: CharacterProgress[],
  challenges: ChallengeInfo[],
): Recommendation[] {
  const priorities: Recommendation[] = [];

  // Priority 1: Unlock missing base characters
  for (const [idStr, name] of Object.entries(BASE_CHARACTER_UNLOCKS)) {
    const id = Number(idStr);
    if (!unlocked.has(id)) {
      const ach = getAchievement(id);
      priorities.push({
        priority: 1,
        text: `Unlock ${name}: ${ach.unlockDescription}`,
        reason: "New character = new completion marks = many new unlocks",
      });
    }
  }

  // Priority 2: Characters nearly complete (≤4 marks remaining)
  for (const char of completionGrid) {
    const remaining = char.total - char.done;
    if (remaining > 0 && remaining <= 4 && char.done > 0) {
      const missing = char.marks
        .filter((m) => m.achievementId !== null && !m.done)
        .map((m) => m.boss);
      priorities.push({
        priority: 2,
        text: `Finish ${char.name} (${char.done}/${char.total} done, needs: ${missing.join(", ")})`,
        reason: "Close to completion — high value",
      });
    }
  }

  // Priority 3: Easy challenges (1-15)
  const incompleteChallenges = challenges.filter((c) => !c.completed);
  const easyChallenges = incompleteChallenges.filter((c) => c.id <= 15);
  if (easyChallenges.length > 0) {
    const names = easyChallenges
      .slice(0, 5)
      .map((c) => `#${c.id} ${c.name}`);
    priorities.push({
      priority: 3,
      text: `Complete easy challenges: ${names.join(", ")}`,
      reason: "Low difficulty, unlock useful items",
    });
  }

  // Priority 3: Greed mode
  const greedDone = completionGrid.filter(
    (c) => c.marks[11]?.achievementId !== null && c.marks[11]?.done,
  ).length;
  const greedierDone = completionGrid.filter(
    (c) => c.marks[12]?.achievementId !== null && c.marks[12]?.done,
  ).length;
  if (greedDone < 5) {
    priorities.push({
      priority: 3,
      text: `Greed Mode runs (${greedDone} chars done, ${greedierDone} Greedier)`,
      reason: "Unlocks Keeper at 1000 coins donated + items per character",
    });
  }

  // Priority 4: Untouched characters (0 marks)
  for (const char of completionGrid) {
    if (char.done === 0 && char.total > 0) {
      priorities.push({
        priority: 4,
        text: `Start playing as ${char.name} (0/${char.total} marks)`,
        reason: "Untouched character — lots of unlocks available",
      });
    }
  }

  priorities.sort((a, b) => a.priority - b.priority);
  return priorities;
}

export function analyze(saveData: SaveData): AnalysisResult {
  const unlocked = getUnlockedIds(saveData.achievements);
  const stats = parseCounterStats(saveData.counters);
  const baseCharacters = analyzeCharacterUnlocks(unlocked, BASE_CHARACTER_UNLOCKS);
  const taintedCharacters = analyzeCharacterUnlocks(unlocked, TAINTED_CHARACTER_UNLOCKS);
  const completionGrid = analyzeCompletionMarks(unlocked);
  const challenges = analyzeChallenges(saveData.challenges);
  const recommendations = generateRecommendations(unlocked, completionGrid, challenges);

  return {
    totalAchievements: TOTAL_ACHIEVEMENTS,
    unlockedCount: unlocked.size,
    stats,
    baseCharacters,
    taintedCharacters,
    completionGrid,
    challenges,
    recommendations,
  };
}

// Export internals for testing
export {
  getUnlockedIds,
  analyzeCompletionMarks,
  analyzeCharacterUnlocks,
  analyzeChallenges,
  generateRecommendations,
};
