import type { SaveData } from "./types";

const MAGIC_PREFIX = "ISAACNGSAVE";
const SUPPORTED_VERSIONS = ["06", "08", "09"];
const HEADER_SIZE = 20; // 16 bytes magic (padded to 16) + 4 bytes CRC

// Chunk types that store u8 arrays
const U8_CHUNKS = new Set([1, 4, 5, 6, 7, 10]);
// Chunk types that store i32 arrays
const I32_CHUNKS = new Set([2, 3, 8, 9]);

// Number of chunks varies by version
const CHUNKS_BY_VERSION: Record<string, number> = {
  "06": 9,  // Rebirth: no special seeds or bestiary
  "08": 10, // Afterbirth: adds special seed counters
  "09": 11, // Afterbirth+/Repentance: adds bestiary
};

export function detectVersion(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const header = String.fromCharCode(...bytes.slice(0, 16));
  if (!header.startsWith(MAGIC_PREFIX)) {
    throw new Error(`Invalid save file: header "${header.slice(0, 14)}" does not start with "${MAGIC_PREFIX}"`);
  }
  const version = header.slice(MAGIC_PREFIX.length, MAGIC_PREFIX.length + 2);
  if (!SUPPORTED_VERSIONS.includes(version)) {
    throw new Error(`Unsupported save version: ${version} (supported: ${SUPPORTED_VERSIONS.join(", ")})`);
  }
  return version;
}

export function parseSaveFile(buffer: ArrayBuffer): SaveData {
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);

  const version = detectVersion(buffer);
  const numChunks = CHUNKS_BY_VERSION[version];

  let offset = HEADER_SIZE;
  const chunks: Record<number, number[]> = {};

  for (let i = 0; i < numChunks; i++) {
    if (offset + 8 > buffer.byteLength) break;

    const chunkType = view.getInt32(offset, true);
    // Skip declared length (offset + 4) — it's unreliable per ksy docs
    offset += 8;

    if (chunkType === 11) {
      // Bestiary — skip, not needed for analysis
      break;
    }

    if (offset + 4 > buffer.byteLength) break;
    const count = view.getInt32(offset, true);
    offset += 4;

    if (U8_CHUNKS.has(chunkType)) {
      const values: number[] = [];
      for (let j = 0; j < count; j++) {
        values.push(bytes[offset + j]);
      }
      offset += count;
      chunks[chunkType] = values;
    } else if (I32_CHUNKS.has(chunkType)) {
      const values: number[] = [];
      for (let j = 0; j < count; j++) {
        values.push(view.getInt32(offset + j * 4, true));
      }
      offset += count * 4;
      chunks[chunkType] = values;
    } else {
      break;
    }
  }

  return {
    achievements: chunks[1] ?? [],
    counters: chunks[2] ?? [],
    levelCounters: chunks[3] ?? [],
    collectibles: chunks[4] ?? [],
    minibosses: chunks[5] ?? [],
    bosses: chunks[6] ?? [],
    challenges: chunks[7] ?? [],
    cutsceneCounters: chunks[8] ?? [],
    gameSettings: chunks[9] ?? [],
    specialSeedCounters: chunks[10] ?? [],
  };
}
