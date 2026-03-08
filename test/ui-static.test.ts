import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const INDEX_HTML = readFileSync(join(__dirname, "..", "dist", "index.html"), "utf8");

describe("static results layout", () => {
  it("removes the standalone Phase section and keeps Play Next in the nav", () => {
    expect(INDEX_HTML).not.toContain('href="#phase-section"');
    expect(INDEX_HTML).not.toContain('id="phase-section"');
    expect(INDEX_HTML.indexOf('href="#path-section"')).toBeGreaterThanOrEqual(0);
  });
});
