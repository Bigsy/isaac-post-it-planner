#!/usr/bin/env python3
"""Analyze an Isaac save file and recommend what to focus on next."""

import struct
import json
import sys

SAVE_FILE = sys.argv[1] if len(sys.argv) > 1 else "/Users/hedworth/Documents/rep+persistentgamedata1.dat"
ACHIEVEMENTS_JSON = "/tmp/isaac-save-viewer/src/data/achievements.json"


def read_save(path):
    with open(path, "rb") as f:
        data = f.read()
    offset = 20
    chunks = {}
    for _ in range(11):
        chunk_type = struct.unpack_from("<i", data, offset)[0]
        offset += 8
        if chunk_type in (1, 4, 5, 6, 7, 10):  # u1 arrays
            count = struct.unpack_from("<i", data, offset)[0]
            offset += 4
            values = list(data[offset:offset + count])
            offset += count
        elif chunk_type in (2, 3, 8, 9):  # s4 arrays
            count = struct.unpack_from("<i", data, offset)[0]
            offset += 4
            values = [struct.unpack_from("<i", data, offset + i*4)[0] for i in range(count)]
            offset += count * 4
        elif chunk_type == 11:
            count = struct.unpack_from("<I", data, offset)[0]
            offset += 4
            chunks[chunk_type] = {"count": count, "values": []}
            break
        else:
            break
        chunks[chunk_type] = {"count": count, "values": values}
    return chunks


def get_unlocked_ids(chunks):
    ach = chunks[1]["values"]
    return {i for i in range(1, len(ach)) if ach[i] != 0}


def main():
    chunks = read_save(SAVE_FILE)
    unlocked = get_unlocked_ids(chunks)
    counters = chunks.get(2, {}).get("values", [])
    challenges = chunks.get(7, {}).get("values", [])

    with open(ACHIEVEMENTS_JSON) as f:
        ach_data = json.load(f)

    total_ach = len([k for k in ach_data.keys() if k.isdigit()])
    print(f"Save completion: {len(unlocked)}/{total_ach} achievements ({len(unlocked)/total_ach*100:.1f}%)")
    print(f"Deaths: {counters[1] if len(counters) > 1 else '?'}")
    print()

    # Characters unlocked
    character_achievements = {
        1: "Magdalene", 2: "Cain", 3: "Judas", 23: "Eve",
        26: "Samson", 29: "Azazel", 82: "The Lost",
        114: "Lazarus", 119: "Lilith", 251: "Keeper",
        331: "Apollyon", 390: "The Forgotten", 403: "Bethany",
        404: "Jacob & Esau",
    }
    # Tainted characters (unlocked by reaching Home with base character)
    tainted_chars = {
        530: "T.Isaac", 531: "T.Magdalene", 532: "T.Cain", 533: "T.Judas",
        534: "T.???", 535: "T.Eve", 536: "T.Samson", 537: "T.Azazel",
        538: "T.Lazarus", 539: "T.Eden", 540: "T.Lost", 541: "T.Lilith",
        542: "T.Keeper", 543: "T.Apollyon", 544: "T.Forgotten",
        545: "T.Bethany", 546: "T.Jacob",
    }

    print("=" * 60)
    print("CHARACTERS")
    print("=" * 60)
    print("\nBase characters:")
    for ach_id, name in sorted(character_achievements.items()):
        status = "UNLOCKED" if ach_id in unlocked else "LOCKED"
        if ach_id not in unlocked:
            info = ach_data.get(str(ach_id), {})
            how = info.get("unlockDescription", "?")
            print(f"  [{status}] {name} - {how}")
        else:
            print(f"  [{status}] {name}")

    print("\nTainted characters:")
    for ach_id, name in sorted(tainted_chars.items()):
        status = "UNLOCKED" if ach_id in unlocked else "LOCKED"
        print(f"  [{status}] {name}")

    # Completion marks by character
    # These are the achievement IDs for each character's completion marks
    # Format: character -> {boss_path: achievement_id}
    bosses = ["Mom's Heart", "Isaac", "Satan", "???", "The Lamb",
              "Boss Rush", "Hush", "Mega Satan", "Delirium",
              "Mother", "Beast", "Greed", "Greedier"]

    # Map of character -> list of achievement IDs for each boss path
    # This is based on the achievement ordering in Repentance
    characters_marks = {
        "Isaac":     [32, 17, 28, 43, 60, 65, 71, 200, 258, 405, 421, 80, 312],
        "Magdalene": [33, 20, 34, 50, 61, 66, 72, 201, 259, 406, 422, 217, 313],
        "Cain":      [34, 21, 35, 51, 62, 67, 73, 202, 260, 407, 423, 218, 314],
        "Judas":     [35, 22, 36, 52, 63, 68, 74, 203, 261, 408, 424, 219, 315],
        "???":       [36, 25, 37, 53, 98, 99, 100, 204, 262, 409, 425, 220, 316],
        "Eve":       [37, 24, 33, 54, 64, 69, 75, 205, 263, 410, 426, 221, 317],
        "Samson":    [181, 27, 38, 55, 182, 183, 184, 206, 264, 411, 427, 222, 318],
        "Azazel":    [177, 178, 179, 180, 185, 9, 76, 207, 265, 412, 428, 223, 319],
        "Lazarus":   [115, 116, 117, 118, 186, 187, 188, 208, 266, 413, 429, 224, 320],
        "Lilith":    [120, 121, 122, 123, 189, 190, 191, 209, 267, 414, 430, 225, 321],
        "Keeper":    [252, 253, 254, 255, 256, 257, 192, 210, 268, 415, 431, 226, 322],
        "Apollyon":  [332, 333, 334, 335, 336, 337, 338, 211, 269, 416, 432, 227, 323],
        "Forgotten": [391, 392, 393, 394, 395, 396, 397, 212, 270, 417, 433, 228, 324],
        "Bethany":   [None, None, None, None, None, None, None, None, None, 418, 434, 229, 325],
        "Jacob":     [None, None, None, None, None, None, None, None, None, 419, 435, 230, 326],
    }

    print()
    print("=" * 60)
    print("COMPLETION MARKS (per character)")
    print("=" * 60)
    print()

    # Header
    short_bosses = ["Heart", "Isaac", "Satan", "BB", "Lamb", "Rush", "Hush", "MSat", "Deli", "Mom2", "Beast", "Greed", "Grd+"]
    header = f"{'Character':<12} " + " ".join(f"{b:>5}" for b in short_bosses) + "  Done"
    print(header)
    print("-" * len(header))

    for char, marks in characters_marks.items():
        # Check if character is unlocked (skip locked chars for now)
        row = f"{char:<12} "
        done = 0
        total = 0
        for i, ach_id in enumerate(marks):
            if ach_id is None:
                row += "    - "
            elif ach_id in unlocked:
                row += "    Y "
                done += 1
                total += 1
            else:
                row += "    . "
                total += 1
        row += f"  {done}/{total}"
        print(row)

    # Challenges
    comp_ch = [i for i in range(1, len(challenges)) if challenges[i] != 0]
    incomp_ch = [i for i in range(1, len(challenges)) if challenges[i] == 0]

    challenge_names = {
        1: "Pitch Black", 2: "High Brow", 3: "Head Trauma", 4: "Darkness Falls",
        5: "The Tank", 6: "Solar System", 7: "Suicide King", 8: "Cat Got Your Tongue",
        9: "Demo Man", 10: "Cursed!", 11: "Glass Cannon", 12: "When Life Gives You Lemons",
        13: "Beans!", 14: "It's in the Cards", 15: "Slow Roll", 16: "Computer Savvy",
        17: "Waka Waka", 18: "The Host", 19: "The Family Man", 20: "Purist",
        21: "XXXXXXXXL", 22: "SPEED!", 23: "Blue Bomber", 24: "PAY TO PLAY",
        25: "Have a Heart", 26: "I RULE!", 27: "BRAINS!", 28: "PRIDE DAY!",
        29: "Onan's Streak", 30: "The Guardian", 31: "Backasswards", 32: "Aprils Fool",
        33: "Pokey Mans", 34: "Ultra Hard", 35: "Pong", 36: "Scat Man",
        37: "Bloody Mary", 38: "Baptism by Fire", 39: "Isaac's Awakening",
        40: "Seeing Double", 41: "Pica Run", 42: "Hot Potato", 43: "Cantripped",
        44: "Red Redemption", 45: "DELETE THIS",
    }

    # Challenge unlock rewards (achievement IDs for challenges)
    challenge_rewards = {
        6: "Halo of Flies", 7: "Mr. Boom (Suicide King)", 8: "Guppy's Hairball",
        9: "Mr. Mega", 11: "Epic Fetus", 13: "The Black Bean", 14: "Book of Sin",
        19: "BFFS!", 20: "Platinum God", 21: "Blue Map", 22: "Stop Watch",
        24: "Pay to Play", 25: "Isaac's Heart", 26: "Blank Card",
        27: "Lil' Loki", 28: "Rainbow Baby", 29: "Abel",
        30: "Holy Grail", 31: "Backasswards reward", 32: "Aprils Fool reward",
        33: "Poke Go", 34: "Death's Touch", 35: "D Infinity",
        36: "Brown Nugget", 37: "Bloody Lust", 38: "Schoolbag",
        39: "Solomon's Key", 40: "Inner Child", 41: "Marbles",
        42: "Hot Potato reward", 43: "Bone Spurs", 44: "Blood Bombs",
        45: "Gello",
    }

    print()
    print("=" * 60)
    print(f"CHALLENGES: {len(comp_ch)}/{len(comp_ch)+len(incomp_ch)} completed")
    print("=" * 60)
    print()
    print("Incomplete:")
    for ch in incomp_ch:
        name = challenge_names.get(ch, f"Challenge {ch}")
        reward = challenge_rewards.get(ch, "")
        extra = f" -> Unlocks: {reward}" if reward else ""
        print(f"  #{ch:2d} {name}{extra}")

    # Priority recommendations
    print()
    print("=" * 60)
    print("RECOMMENDED NEXT STEPS (prioritized)")
    print("=" * 60)
    print()

    priorities = []

    # 1. Unlock missing characters (high impact)
    for ach_id, name in character_achievements.items():
        if ach_id not in unlocked:
            info = ach_data.get(str(ach_id), {})
            priorities.append((1, f"Unlock {name}: {info.get('unlockDescription', '?')}",
                              "New character = new completion marks = many new unlocks"))

    # 2. Characters with most marks done - finish them off
    for char, marks in characters_marks.items():
        valid = [(i, m) for i, m in enumerate(marks) if m is not None]
        done = sum(1 for _, m in valid if m in unlocked)
        remaining = len(valid) - done
        if 0 < remaining <= 4 and done > 0:
            missing = [bosses[i] for i, m in valid if m not in unlocked]
            priorities.append((2, f"Finish {char} ({done}/{len(valid)} done, needs: {', '.join(missing)})",
                              "Close to completion - high value"))

    # 3. Easy challenges (lower numbers tend to be easier)
    easy_challenges = [ch for ch in incomp_ch if ch <= 15]
    if easy_challenges:
        names = [f"#{ch} {challenge_names.get(ch, '?')}" for ch in easy_challenges[:5]]
        priorities.append((3, f"Complete easy challenges: {', '.join(names)}",
                          "Low difficulty, unlock useful items"))

    # 4. Characters with 0 marks - start them
    for char, marks in characters_marks.items():
        valid = [(i, m) for i, m in enumerate(marks) if m is not None]
        done = sum(1 for _, m in valid if m in unlocked)
        if done == 0:
            priorities.append((4, f"Start playing as {char} (0/{len(valid)} marks)",
                              "Untouched character - lots of unlocks available"))

    # 5. Greed mode if not done much
    greed_done = sum(1 for _, marks in characters_marks.items()
                     if marks[11] is not None and marks[11] in unlocked)
    greedier_done = sum(1 for _, marks in characters_marks.items()
                        if marks[12] is not None and marks[12] in unlocked)
    if greed_done < 5:
        priorities.append((3, f"Greed Mode runs ({greed_done} chars done, {greedier_done} Greedier)",
                          "Unlocks Keeper at 1000 coins donated + items per character"))

    priorities.sort(key=lambda x: x[0])

    for i, (prio, text, reason) in enumerate(priorities, 1):
        stars = {1: "***", 2: "**", 3: "*", 4: ""}[prio]
        print(f"  {i:2d}. {stars} {text}")
        print(f"      Why: {reason}")
        print()


if __name__ == "__main__":
    main()
