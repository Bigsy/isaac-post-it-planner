import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { parseSaveFile, detectVersion } from "../src/parser";

const SAVES_DIR = join(__dirname, "..", "sample-saves");
const SAMPLE_PATH = join(SAVES_DIR, "rep+persistentgamedata1.dat");

function loadFile(path: string): ArrayBuffer {
  const buf = readFileSync(path);
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

function loadSample(): ArrayBuffer {
  return loadFile(SAMPLE_PATH);
}

function allSaveFiles(): { name: string; path: string }[] {
  return readdirSync(SAVES_DIR)
    .filter((f) => f.endsWith(".dat"))
    .map((f) => ({ name: f, path: join(SAVES_DIR, f) }));
}

describe("parseSaveFile", () => {
  it("parses sample save without throwing", () => {
    const data = loadSample();
    expect(() => parseSaveFile(data)).not.toThrow();
  });

  it("extracts achievements array with 637+ entries", () => {
    const save = parseSaveFile(loadSample());
    expect(save.achievements.length).toBeGreaterThanOrEqual(637);
  });

  it("extracts counters array", () => {
    const save = parseSaveFile(loadSample());
    expect(save.counters.length).toBeGreaterThan(0);
  });

  it("extracts challenges array", () => {
    const save = parseSaveFile(loadSample());
    expect(save.challenges.length).toBeGreaterThan(0);
  });

  it("has non-zero death counter", () => {
    const save = parseSaveFile(loadSample());
    // Counter index 1 = deaths
    expect(save.counters[1]).toBeGreaterThan(0);
  });

  it("rejects file with wrong magic bytes", () => {
    const bad = new ArrayBuffer(100);
    const view = new Uint8Array(bad);
    view.set([0x42, 0x41, 0x44]); // "BAD"
    expect(() => parseSaveFile(bad)).toThrow(/Invalid save file/);
  });

  it("parses all chunk types present in sample", () => {
    const save = parseSaveFile(loadSample());
    // All expected chunks should be non-empty
    expect(save.achievements.length).toBeGreaterThan(0);
    expect(save.counters.length).toBeGreaterThan(0);
    expect(save.levelCounters.length).toBeGreaterThan(0);
    expect(save.collectibles.length).toBeGreaterThan(0);
    expect(save.minibosses.length).toBeGreaterThan(0);
    expect(save.bosses.length).toBeGreaterThan(0);
    expect(save.challenges.length).toBeGreaterThan(0);
    expect(save.cutsceneCounters.length).toBeGreaterThan(0);
    expect(save.gameSettings.length).toBeGreaterThan(0);
    expect(save.specialSeedCounters.length).toBeGreaterThan(0);
  });

  it("achievement values are 0 or 1", () => {
    const save = parseSaveFile(loadSample());
    for (const v of save.achievements) {
      expect(v === 0 || v === 1).toBe(true);
    }
  });
});

describe("detectVersion", () => {
  it("detects version 09 from Repentance+ save", () => {
    expect(detectVersion(loadSample())).toBe("09");
  });

  it("detects version 06 from Rebirth save", () => {
    expect(detectVersion(loadFile(join(SAVES_DIR, "Rebirth_persistentgamedata.dat")))).toBe("06");
  });

  it("detects version 08 from Afterbirth save", () => {
    expect(detectVersion(loadFile(join(SAVES_DIR, "Afterbirth_persistentgamedata.dat")))).toBe("08");
  });

  it("rejects unsupported version", () => {
    const bad = new TextEncoder().encode("ISAACNGSAVE07R  \x00\x00\x00\x00");
    expect(() => detectVersion(bad.buffer.slice(bad.byteOffset, bad.byteOffset + bad.byteLength))).toThrow(/Unsupported save version: 07/);
  });
});

describe("truncated file handling", () => {
  function buildMinimalSave(chunkType: number, count: number, dataBytes: number[]): ArrayBuffer {
    // Build a valid header + one chunk that claims `count` entries but only has `dataBytes`
    const header = new TextEncoder().encode("ISAACNGSAVE09R  ");
    const crc = new Uint8Array(4); // zero CRC
    const chunkHeader = new ArrayBuffer(12); // chunkType(4) + declaredLength(4) + count(4)
    const chView = new DataView(chunkHeader);
    chView.setInt32(0, chunkType, true);
    chView.setInt32(4, 0, true); // declared length (ignored by parser)
    chView.setInt32(8, count, true);
    const data = new Uint8Array(dataBytes);
    const total = header.length + crc.length + chunkHeader.byteLength + data.length;
    const buf = new ArrayBuffer(total);
    const out = new Uint8Array(buf);
    let off = 0;
    out.set(header, off); off += header.length;
    out.set(crc, off); off += crc.length;
    out.set(new Uint8Array(chunkHeader), off); off += chunkHeader.byteLength;
    out.set(data, off);
    return buf;
  }

  it("truncated U8 chunk returns partial array without crash", () => {
    // Claim 10 U8 entries but only provide 3 bytes
    const buf = buildMinimalSave(1, 10, [1, 0, 1]);
    const save = parseSaveFile(buf);
    expect(save.achievements.length).toBe(3);
    expect(save.achievements).not.toContain(undefined);
  });

  it("truncated I32 chunk returns partial array without RangeError", () => {
    // Claim 10 I32 entries but only provide 8 bytes (2 entries)
    const data = new ArrayBuffer(8);
    const dv = new DataView(data);
    dv.setInt32(0, 42, true);
    dv.setInt32(4, 99, true);
    const buf = buildMinimalSave(2, 10, [...new Uint8Array(data)]);
    const save = parseSaveFile(buf);
    expect(save.counters.length).toBe(2);
    expect(save.counters[0]).toBe(42);
    expect(save.counters[1]).toBe(99);
  });

  it("truncated bestiary returns partial data gracefully", () => {
    // Build a save that reaches the bestiary chunk (type 11) but truncates mid-entry
    const header = new TextEncoder().encode("ISAACNGSAVE09R  ");
    const crc = new Uint8Array(4);
    // We need 10 chunks before bestiary (chunks 1-10), make them all empty
    const emptyChunks: number[] = [];
    for (const chunkType of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {
      // chunkType(4) + declaredLength(4) + count(4) = 12 bytes, count=0
      const ch = new ArrayBuffer(12);
      const v = new DataView(ch);
      v.setInt32(0, chunkType, true);
      v.setInt32(4, 0, true);
      v.setInt32(8, 0, true);
      emptyChunks.push(...new Uint8Array(ch));
    }
    // Bestiary chunk header: type=11, declaredLength=0
    const bestiaryHeader = new ArrayBuffer(8);
    const bhv = new DataView(bestiaryHeader);
    bhv.setInt32(0, 11, true);
    bhv.setInt32(4, 0, true);
    // subChunkCount=1, then sub-chunk: type=1, lengthField=8 (2 entries), but only 4 bytes of data
    const bestiaryData = new ArrayBuffer(4 + 8 + 4); // subChunkCount + sub-chunk header + partial entry
    const bdv = new DataView(bestiaryData);
    bdv.setUint32(0, 1, true); // 1 sub-chunk
    bdv.setInt32(4, 1, true);  // type=encounters
    bdv.setInt32(8, 8, true);  // lengthField=8 -> 2 entries, but we only have 4 bytes
    // 4 bytes of partial entry data (less than 8 needed per entry)

    const total = header.length + crc.length + emptyChunks.length +
      bestiaryHeader.byteLength + bestiaryData.byteLength;
    const buf = new ArrayBuffer(total);
    const out = new Uint8Array(buf);
    let off = 0;
    out.set(header, off); off += header.length;
    out.set(crc, off); off += crc.length;
    out.set(new Uint8Array(emptyChunks), off); off += emptyChunks.length;
    out.set(new Uint8Array(bestiaryHeader), off); off += bestiaryHeader.byteLength;
    out.set(new Uint8Array(bestiaryData), off);

    expect(() => parseSaveFile(buf)).not.toThrow();
    const save = parseSaveFile(buf);
    expect(save.bestiary).not.toBeNull();
    // Should have 0 encounters since neither entry had enough bytes
    expect(save.bestiary!.encounters.size).toBe(0);
  });
});

describe("multi-version parsing", () => {
  const saves = allSaveFiles();

  it.each(saves)("parses $name without throwing", ({ path }) => {
    const data = loadFile(path);
    expect(() => parseSaveFile(data)).not.toThrow();
  });

  it.each(saves)("$name has achievements array", ({ path }) => {
    const save = parseSaveFile(loadFile(path));
    expect(save.achievements.length).toBeGreaterThan(0);
  });

  it.each(saves)("$name has counters array", ({ path }) => {
    const save = parseSaveFile(loadFile(path));
    expect(save.counters.length).toBeGreaterThan(0);
  });

  it.each(saves)("$name has challenges array", ({ path }) => {
    const save = parseSaveFile(loadFile(path));
    expect(save.challenges.length).toBeGreaterThan(0);
  });

  it.each(saves)("$name achievement values are 0 or 1", ({ path }) => {
    const save = parseSaveFile(loadFile(path));
    for (const v of save.achievements) {
      expect(v === 0 || v === 1).toBe(true);
    }
  });
});

describe("bestiary parsing", () => {
  it("Repentance+ save has non-null bestiary", () => {
    const save = parseSaveFile(loadFile(join(SAVES_DIR, "rep+persistentgamedata1.dat")));
    expect(save.bestiary).not.toBeNull();
  });

  it("Repentance+ save has all 4 bestiary maps", () => {
    const save = parseSaveFile(loadFile(join(SAVES_DIR, "rep+persistentgamedata1.dat")));
    expect(save.bestiary!.encounters.size).toBeGreaterThan(0);
    expect(save.bestiary!.kills.size).toBeGreaterThan(0);
    expect(save.bestiary!.hits.size).toBeGreaterThanOrEqual(0);
    expect(save.bestiary!.deaths.size).toBeGreaterThanOrEqual(0);
  });

  it("fully-unlocked save has bestiary with many encounters", () => {
    const save = parseSaveFile(loadFile(join(SAVES_DIR, "Repentance+_persistentgamedata.dat")));
    expect(save.bestiary).not.toBeNull();
    expect(save.bestiary!.encounters.size).toBeGreaterThan(100);
  });

  it("AB+ save has bestiary", () => {
    const save = parseSaveFile(loadFile(join(SAVES_DIR, "Afterbirth+_persistentgamedata.dat")));
    expect(save.bestiary).not.toBeNull();
  });

  it("Rebirth save has null bestiary", () => {
    const save = parseSaveFile(loadFile(join(SAVES_DIR, "Rebirth_persistentgamedata.dat")));
    expect(save.bestiary).toBeNull();
  });

  it("Afterbirth save has null bestiary", () => {
    const save = parseSaveFile(loadFile(join(SAVES_DIR, "Afterbirth_persistentgamedata.dat")));
    expect(save.bestiary).toBeNull();
  });

  it("bestiary entity keys contain valid id_variant format", () => {
    const save = parseSaveFile(loadFile(join(SAVES_DIR, "rep+persistentgamedata1.dat")));
    for (const [key] of save.bestiary!.encounters) {
      expect(key).toMatch(/^\d+_\d+$/);
    }
  });
});

describe("version-specific expectations", () => {
  it("Rebirth save has fewer achievements than Repentance+", () => {
    const rebirth = parseSaveFile(loadFile(join(SAVES_DIR, "Rebirth_persistentgamedata.dat")));
    const repPlus = parseSaveFile(loadFile(join(SAVES_DIR, "Repentance+_persistentgamedata.dat")));
    expect(rebirth.achievements.length).toBeLessThan(repPlus.achievements.length);
  });

  it("Rebirth save has no special seed counters (version 06)", () => {
    const rebirth = parseSaveFile(loadFile(join(SAVES_DIR, "Rebirth_persistentgamedata.dat")));
    expect(rebirth.specialSeedCounters.length).toBe(0);
  });

  it("Repentance+ fully-unlocked save has all achievements set to 1", () => {
    const save = parseSaveFile(loadFile(join(SAVES_DIR, "Repentance+_persistentgamedata.dat")));
    // Skip index 0 (unused), all others should be 1 in a fully-unlocked save
    const nonZero = save.achievements.slice(1).filter((v) => v === 1).length;
    expect(nonZero).toBe(save.achievements.length - 1);
  });

  it("Afterbirth save has more achievements than Rebirth", () => {
    const afterbirth = parseSaveFile(loadFile(join(SAVES_DIR, "Afterbirth_persistentgamedata.dat")));
    const rebirth = parseSaveFile(loadFile(join(SAVES_DIR, "Rebirth_persistentgamedata.dat")));
    expect(afterbirth.achievements.length).toBeGreaterThan(rebirth.achievements.length);
  });
});
