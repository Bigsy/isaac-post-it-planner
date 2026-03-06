import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const INDEX_HTML = readFileSync(join(__dirname, "..", "dist", "index.html"), "utf8");

describe("static results layout", () => {
  it("places the Phase section before What Next", () => {
    expect(INDEX_HTML.indexOf('href="#phase-section"')).toBeLessThan(
      INDEX_HTML.indexOf('href="#path-section"'),
    );
    expect(INDEX_HTML.indexOf('id="phase-section"')).toBeLessThan(
      INDEX_HTML.indexOf('id="path-section"'),
    );
  });
});
