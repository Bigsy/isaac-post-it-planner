import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { parseSaveFile } from "../src/parser";
import { getAchievement } from "../src/data/achievements";
import {
  BOSS_KILL_MILESTONE_GROUPS,
  type BossKillMilestoneGroup,
} from "../src/data/boss-milestones";
import { BESTIARY_ENTITIES } from "../src/data/bestiary";
import { analyze, analyzeBossKillMilestones } from "../src/analyzer";
import type { CounterStats, BestiaryData } from "../src/types";

const SAMPLE_DIR = join(__dirname, "..", "sample-saves");

function loadSave(filename: string) {
  const buf = readFileSync(join(SAMPLE_DIR, filename));
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  return parseSaveFile(ab);
}

function emptyCounters(): CounterStats {
  return {
    momKills: 0, deaths: 0, momsHeartKills: 0,
    rocksDestroyed: 0, tintedRocksDestroyed: 0, poopDestroyed: 0,
    shopkeeperKills: 0, greedDonationCoins: 0, normalDonationCoins: 0,
    edenTokens: 0, winStreak: 0, bestStreak: 0,
  };
}

describe("boss milestone data integrity", () => {
  it("all achievement IDs resolve to valid achievements", () => {
    for (const group of BOSS_KILL_MILESTONE_GROUPS) {
      for (const m of group.milestones) {
        const ach = getAchievement(m.achievementId);
        expect(ach.name, `${group.bossDisplayName} milestone ${m.name} (ach ${m.achievementId})`).not.toBe("Unknown");
      }
    }
  });

  it("milestones are sorted by ascending kill threshold within each group", () => {
    for (const group of BOSS_KILL_MILESTONE_GROUPS) {
      for (let i = 1; i < group.milestones.length; i++) {
        expect(
          group.milestones[i].kills,
          `${group.bossDisplayName}: milestone ${i} should be >= milestone ${i - 1}`,
        ).toBeGreaterThanOrEqual(group.milestones[i - 1].kills);
      }
    }
  });

  it("no duplicate achievement IDs across all groups", () => {
    const seen = new Set<number>();
    for (const group of BOSS_KILL_MILESTONE_GROUPS) {
      for (const m of group.milestones) {
        expect(seen.has(m.achievementId), `Duplicate achievement ${m.achievementId} (${m.name})`).toBe(false);
        seen.add(m.achievementId);
      }
    }
  });

  it("bestiary entity keys exist in BESTIARY_ENTITIES", () => {
    const entityKeys = new Set(
      BESTIARY_ENTITIES.map((e) => `${e.id}_${e.variant}`),
    );
    for (const group of BOSS_KILL_MILESTONE_GROUPS) {
      if (group.source.type === "bestiary") {
        expect(
          entityKeys.has(group.source.entityKey),
          `Entity key ${group.source.entityKey} for ${group.bossDisplayName} not found in BESTIARY_ENTITIES`,
        ).toBe(true);
      }
    }
  });
});

describe("analyzeBossKillMilestones", () => {
  it("Rep+ save: Mom's Heart group has killCountKnown=true from counter", () => {
    const save = loadSave("rep+persistentgamedata1.dat");
    const result = analyze(save);
    const momsHeart = result.bossKillMilestones.find((g) => g.bossName === "momsHeart");
    expect(momsHeart).toBeDefined();
    expect(momsHeart!.killCountKnown).toBe(true);
    expect(momsHeart!.currentKills).toBe(result.stats.momsHeartKills);
  });

  it("Rep+ save: Isaac/Satan groups present and use bestiary when available", () => {
    const save = loadSave("rep+persistentgamedata1.dat");
    const result = analyze(save);
    const isaac = result.bossKillMilestones.find((g) => g.bossName === "isaac");
    const satan = result.bossKillMilestones.find((g) => g.bossName === "satan");
    expect(isaac).toBeDefined();
    expect(satan).toBeDefined();
    // killCountKnown depends on whether the boss has a bestiary kill entry
    // If the player never killed the boss, the key won't be in the map
    const hasIsaacKills = save.bestiary?.kills.has("102_0") ?? false;
    const hasSatanKills = save.bestiary?.kills.has("84_0") ?? false;
    expect(isaac!.killCountKnown).toBe(hasIsaacKills);
    expect(satan!.killCountKnown).toBe(hasSatanKills);
  });

  it("unlocked milestones match achievement status", () => {
    const save = loadSave("rep+persistentgamedata1.dat");
    const result = analyze(save);
    for (const group of result.bossKillMilestones) {
      for (const m of group.milestones) {
        const expectedUnlocked = save.achievements[m.achievementId] !== 0;
        expect(
          m.unlocked,
          `${group.bossDisplayName}: ${m.name} (ach ${m.achievementId})`,
        ).toBe(expectedUnlocked);
      }
    }
  });

  it("nextMilestone points to first incomplete milestone", () => {
    const save = loadSave("rep+persistentgamedata1.dat");
    const result = analyze(save);
    for (const group of result.bossKillMilestones) {
      const firstIncomplete = group.milestones.find((m) => !m.unlocked);
      if (firstIncomplete) {
        expect(group.nextMilestone).toEqual(firstIncomplete);
      } else {
        expect(group.nextMilestone).toBeNull();
      }
    }
  });

  it("DLC filtering: Rebirth save excludes achievements > 179", () => {
    const save = loadSave("Rebirth_persistentgamedata.dat");
    const result = analyze(save);
    for (const group of result.bossKillMilestones) {
      for (const m of group.milestones) {
        expect(
          m.achievementId,
          `${group.bossDisplayName}: ${m.name} should be <= 179`,
        ).toBeLessThanOrEqual(179);
      }
    }
  });

  it("fallback: infers kills from achievements when bestiary unavailable", () => {
    // Simulate a pre-Rep+ scenario: bestiary is null, use counter for Mom's Heart
    // For Isaac/Satan, no bestiary → infer from achievements
    const unlocked = new Set<number>([57]); // The Polaroid (5 Isaac kills)
    const stats = emptyCounters();
    stats.momsHeartKills = 15;
    const groups = analyzeBossKillMilestones(unlocked, stats, null, 637);

    const isaac = groups.find((g) => g.bossName === "isaac");
    expect(isaac).toBeDefined();
    expect(isaac!.killCountKnown).toBe(false);
    expect(isaac!.currentKills).toBe(5); // inferred from ach 57 (5 kills)

    // Mom's Heart still uses counter
    const momsHeart = groups.find((g) => g.bossName === "momsHeart");
    expect(momsHeart).toBeDefined();
    expect(momsHeart!.killCountKnown).toBe(true);
    expect(momsHeart!.currentKills).toBe(15);
  });
});
