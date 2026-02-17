#!/usr/bin/env python3
"""Decode a Binding of Isaac: Repentance persistentgamedata.dat save file."""

import struct
import json
import sys

SAVE_FILE = sys.argv[1] if len(sys.argv) > 1 else "/Users/hedworth/Documents/rep+persistentgamedata1.dat"
ACHIEVEMENTS_JSON = "/tmp/isaac-save-viewer/src/data/achievements.json"

CHUNK_NAMES = {
    1: "achievements",
    2: "counters",
    3: "level_counters",
    4: "collectibles",
    5: "minibosses",
    6: "bosses",
    7: "challenge_counters",
    8: "cutscene_counters",
    9: "game_settings",
    10: "special_seed_counters",
    11: "bestiary_counters",
}

def read_save(path):
    with open(path, "rb") as f:
        data = f.read()

    # Header: 16 bytes magic + 4 bytes CRC
    header = data[:16].decode("ascii", errors="replace").strip("\x00 ")
    crc = struct.unpack_from("<i", data, 16)[0]
    print(f"Header: {header}")
    print(f"CRC: {crc}")
    print()

    offset = 20  # after header (16) + crc (4)
    chunks = {}

    for _ in range(11):
        chunk_type = struct.unpack_from("<i", data, offset)[0]
        chunk_len = struct.unpack_from("<i", data, offset + 4)[0]
        offset += 8

        name = CHUNK_NAMES.get(chunk_type, f"unknown_{chunk_type}")

        if chunk_type == 1:  # achievements - u1 array
            count = struct.unpack_from("<i", data, offset)[0]
            offset += 4
            values = list(data[offset:offset + count])
            offset += count
            chunks[name] = {"count": count, "values": values}
        elif chunk_type in (2, 3):  # counters, level_counters - s4 array
            count = struct.unpack_from("<i", data, offset)[0]
            offset += 4
            values = [struct.unpack_from("<i", data, offset + i*4)[0] for i in range(count)]
            offset += count * 4
            chunks[name] = {"count": count, "values": values}
        elif chunk_type in (4, 5, 6, 7, 10):  # u1 arrays
            count = struct.unpack_from("<i", data, offset)[0]
            offset += 4
            values = list(data[offset:offset + count])
            offset += count
            chunks[name] = {"count": count, "values": values}
        elif chunk_type in (8, 9):  # s4 arrays
            count = struct.unpack_from("<i", data, offset)[0]
            offset += 4
            values = [struct.unpack_from("<i", data, offset + i*4)[0] for i in range(count)]
            offset += count * 4
            chunks[name] = {"count": count, "values": values}
        elif chunk_type == 11:  # bestiary - complex, skip for now
            count = struct.unpack_from("<I", data, offset)[0]
            offset += 4
            # Skip bestiary parsing - it's complex and not needed for unlock analysis
            # Just consume the rest of the file
            chunks[name] = {"count": count, "note": "complex structure, skipped"}
            break
        else:
            break

    return chunks


def analyze_achievements(chunks):
    with open(ACHIEVEMENTS_JSON, "r") as f:
        ach_data = json.load(f)

    ach_values = chunks["achievements"]["values"]

    unlocked = []
    locked = []

    for i in range(1, len(ach_values)):
        is_unlocked = ach_values[i] != 0
        ach_id = str(i)
        info = ach_data.get(ach_id, ach_data.get("NEW"))
        entry = {
            "id": i,
            "name": info["name"],
            "inGameDescription": info["inGameDescription"],
            "unlockDescription": info["unlockDescription"],
        }
        if is_unlocked:
            unlocked.append(entry)
        else:
            locked.append(entry)

    return unlocked, locked


def analyze_challenges(chunks):
    challenge_values = chunks.get("challenge_counters", {}).get("values", [])
    completed = []
    incomplete = []
    for i in range(1, len(challenge_values)):
        if challenge_values[i] != 0:
            completed.append(i)
        else:
            incomplete.append(i)
    return completed, incomplete


def main():
    chunks = read_save(SAVE_FILE)

    # Achievement analysis
    unlocked, locked = analyze_achievements(chunks)
    total = len(unlocked) + len(locked)

    print(f"=== ACHIEVEMENTS: {len(unlocked)}/{total} unlocked ===")
    print(f"    Completion: {len(unlocked)/total*100:.1f}%")
    print()

    # Challenges
    comp_ch, incomp_ch = analyze_challenges(chunks)
    if comp_ch or incomp_ch:
        print(f"=== CHALLENGES: {len(comp_ch)}/{len(comp_ch)+len(incomp_ch)} completed ===")
        if incomp_ch:
            print(f"    Incomplete: {incomp_ch}")
        print()

    # Counters (stats)
    counters = chunks.get("counters", {}).get("values", [])
    if len(counters) > 0:
        # Known counter indices (from community research)
        counter_names = {
            0: "Mom kills",
            1: "Deaths",
            2: "Items collected",
            3: "Mom's Heart kills",
            4: "Satan kills",
            5: "Isaac kills",
            6: "Blue Baby kills",
            7: "The Lamb kills",
            8: "Mega Satan kills",
            9: "Boss Rush completions",
            10: "Hush completions",
            11: "Delirium kills",
            12: "Mother kills",
            13: "Beast kills",
            14: "Ultra Greed kills",
            15: "Ultra Greedier kills",
        }
        print("=== KEY STATS ===")
        for idx, name in sorted(counter_names.items()):
            if idx < len(counters):
                print(f"    {name}: {counters[idx]}")
        print()

    # Print locked achievements (what to unlock next)
    print(f"=== LOCKED ACHIEVEMENTS ({len(locked)} remaining) ===")
    print()

    # Categorize locked achievements
    categories = {
        "Characters": [],
        "Boss Kills / Completion Marks": [],
        "Challenge Completions": [],
        "Item Unlocks": [],
        "Other": [],
    }

    for ach in locked:
        desc = ach["unlockDescription"].lower()
        if "unlocked a new character" in ach["inGameDescription"].lower() or "character" in ach["inGameDescription"].lower():
            categories["Characters"].append(ach)
        elif "challenge" in desc:
            categories["Challenge Completions"].append(ach)
        elif any(w in desc for w in ["defeat", "beat", "kill", "complete"]):
            categories["Boss Kills / Completion Marks"].append(ach)
        else:
            categories["Item Unlocks"].append(ach)

    for cat, achs in categories.items():
        if achs:
            print(f"--- {cat} ({len(achs)}) ---")
            for a in achs:
                print(f"  [{a['id']:3d}] {a['name']}")
                print(f"        How: {a['unlockDescription']}")
                print(f"        Reward: {a['inGameDescription']}")
            print()


if __name__ == "__main__":
    main()
