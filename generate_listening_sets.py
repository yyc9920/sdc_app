import pandas as pd
import json
import csv
import re
import math


def calculate_level(sentences):
    word_counts = [len(s["english"].split()) for s in sentences]
    avg_words = sum(word_counts) / len(word_counts) if word_counts else 0

    if avg_words <= 3:
        return 1
    elif avg_words <= 5:
        return 2
    elif avg_words <= 7:
        return 3
    elif avg_words <= 9:
        return 4
    elif avg_words <= 12:
        return 5
    else:
        return 6


def extract_proper_nouns(sentence):
    words = sentence.split()
    indices = []
    for i, word in enumerate(words):
        clean_word = re.sub(r"[^\w\s]", "", word)
        if not clean_word:
            continue

        if (clean_word[0].isupper() and i > 0) or clean_word == "I":
            indices.append(i)
    return indices


def read_custom_csv(file_path):
    data = []
    with open(file_path, "r", encoding="utf-8") as f:
        reader = csv.reader(f)
        headers = next(reader)
        for row in reader:
            if not row:
                continue
            if len(row) > 4:
                row[3] = ",".join(row[3:])
                row = row[:4]
            elif len(row) < 4:
                row.extend([""] * (4 - len(row)))

            data.append(
                {
                    "English Sentence": row[0],
                    "Korean Pronounce": row[1],
                    "Direct Comprehension": row[2],
                    "Comprehension": row[3],
                }
            )
    return pd.DataFrame(data)


def process_csv(input_file, output_file, prefix):
    df = read_custom_csv(input_file)

    is_1050 = "1050" in input_file

    themes = []
    if is_1050:
        for i in range(len(df)):
            if 0 <= i <= 30:
                themes.append("Greetings")
            elif 100 <= i <= 110:
                themes.append("Introduction")
            elif 115 <= i <= 132:
                themes.append("Possession")
            elif 500 <= i <= 535:
                themes.append("Shopping")
            elif 536 <= i <= 545:
                themes.append("Health")
            else:
                themes.append(f"General Part {i // 50 + 1}")
    else:
        for i in range(len(df)):
            themes.append(f"Travel Phrases Part {i // 10 + 1}")

    df["Theme"] = themes

    grouped = df.groupby("Theme", sort=False)

    all_sets = []
    set_counter = 1

    for theme, group in grouped:
        sentences = []
        for idx, row in group.iterrows():
            eng = str(row["English Sentence"]).strip()
            kor = str(row["Comprehension"]).strip()

            sentences.append(
                {
                    "id": idx,
                    "english": eng,
                    "korean": kor,
                    "properNounIndices": extract_proper_nouns(eng),
                }
            )

        for s in sentences:
            word_count = len(s["english"].split())
            if word_count <= 3:
                s["temp_level"] = 1
            elif word_count <= 5:
                s["temp_level"] = 2
            elif word_count <= 7:
                s["temp_level"] = 3
            elif word_count <= 9:
                s["temp_level"] = 4
            elif word_count <= 12:
                s["temp_level"] = 5
            else:
                s["temp_level"] = 6

        level_groups = {}
        for s in sentences:
            lvl = s["temp_level"]
            if lvl not in level_groups:
                level_groups[lvl] = []
            level_groups[lvl].append(s)

        while True:
            small_levels = [l for l, v in level_groups.items() if 0 < len(v) < 4]
            if not small_levels:
                break

            lvl = small_levels[0]
            available_levels = [
                l for l in level_groups.keys() if l != lvl and len(level_groups[l]) > 0
            ]
            if not available_levels:
                break

            closest_lvl = min(available_levels, key=lambda x: abs(x - lvl))
            level_groups[closest_lvl].extend(level_groups[lvl])
            level_groups[lvl] = []

            level_groups = {k: v for k, v in level_groups.items() if len(v) > 0}

        for lvl, lvl_sentences in level_groups.items():
            lvl_sentences.sort(key=lambda x: x["id"])
            for s in lvl_sentences:
                del s["temp_level"]

            chunk_size = min(4 + (lvl - 1) * 2, 15)

            chunks = [
                lvl_sentences[i : i + chunk_size]
                for i in range(0, len(lvl_sentences), chunk_size)
            ]

            if len(chunks) > 1 and len(chunks[-1]) < 4:
                if len(chunks[-2]) + len(chunks[-1]) <= 15:
                    chunks[-2].extend(chunks[-1])
                    chunks.pop()
                else:
                    # Rebalance the last two chunks evenly
                    total = len(chunks[-2]) + len(chunks[-1])
                    first_half = total // 2
                    second_half = total - first_half

                    # Ensure both halves are >= 4
                    if first_half >= 4 and second_half >= 4:
                        combined = chunks[-2] + chunks[-1]
                        chunks[-2] = combined[:first_half]
                        chunks[-1] = combined[first_half:]

            for chunk in chunks:
                chunk_level = calculate_level(chunk)

                set_id = f"{prefix}_{str(theme).lower().replace(' ', '_')}_level{chunk_level}_set{set_counter}"

                quiz = {
                    "question": f"What is the main topic of this conversation?",
                    "options": [theme, "Weather", "Food", "Sports"],
                    "answer": 0,
                }

                all_sets.append(
                    {
                        "setId": set_id,
                        "theme": theme,
                        "level": chunk_level,
                        "sentences": chunk,
                        "quiz": quiz,
                    }
                )

                set_counter += 1

    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(all_sets, f, ensure_ascii=False, indent=2)

    print(f"Generated {len(all_sets)} sets for {output_file}")


if __name__ == "__main__":
    process_csv(
        "public/essential_travel_english_phrases_100.csv",
        "public/speed_listening_travel.json",
        "travel",
    )
    process_csv(
        "public/ultimate_speaking_beginner_1_1050.csv",
        "public/speed_listening_beginner.json",
        "beginner",
    )
