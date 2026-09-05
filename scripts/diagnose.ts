import { readFileSync, readdirSync } from "node:fs";
import { parseSaveFile } from "../src/parser";
import { analyze } from "../src/analyzer";
const paths = process.argv.slice(2);
for (const path of paths.length
  ? paths
  : readdirSync("sample-saves")
      .filter((p) => p.endsWith(".dat"))
      .map((p) => `sample-saves/${p}`)) {
  const bytes = readFileSync(path);
  const result = analyze(
    parseSaveFile(
      bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    ),
    { debug: true },
  );
  console.log(
    JSON.stringify({
      path,
      dlc: result.dlcLevel,
      unlocked: result.unlockedCount,
      phase: result.phaseProgress?.phaseName,
      actions: result.actionItems
        .filter((a) => a.category !== "warning")
        .map((a) => ({
          id: a.id,
          headline: a.headline,
          score: a.score,
          tier: a.tier,
          blocked: a.blocked,
          effort: a.effort,
        })),
    }),
  );
}
