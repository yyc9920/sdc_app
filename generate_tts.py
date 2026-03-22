import os
import asyncio
import edge_tts
import argparse
import csv
import sys


def read_custom_csv(file_path):
    data = []
    with open(file_path, "r", encoding="utf-8") as f:
        reader = csv.reader(f)
        next(reader, None)
        for row in reader:
            if not row:
                continue
            if len(row) > 4:
                row[3] = ",".join(row[3:])
                row = row[:4]
            elif len(row) < 4:
                row.extend([""] * (4 - len(row)))
            data.append(row[0])
    return data


async def generate_single_file(sentence, voice_config, output_file):
    if os.path.exists(output_file) and os.path.getsize(output_file) > 100:
        return

    try:
        for attempt in range(3):
            try:
                communicate = edge_tts.Communicate(
                    sentence,
                    voice_config["voice"],
                    rate=voice_config["rate"],
                    pitch=voice_config["pitch"],
                )
                await communicate.save(output_file)
                return
            except Exception as e:
                if attempt == 2:
                    print(f"\nFailed to generate {output_file} after 3 attempts: {e}")
                else:
                    await asyncio.sleep(2 * (attempt + 1))
    except Exception as e:
        print(f"\nFailed at {output_file}: {e}")


async def generate_tts(input_csv, output_key):
    voices = {
        #"female": {"voice": "en-US-JennyNeural", "rate": "+0%", "pitch": "+0Hz"},
        #"male": {"voice": "en-US-GuyNeural", "rate": "+0%", "pitch": "+0Hz"},
        #"child_female": {"voice": "en-US-AnaNeural", "rate": "+0%", "pitch": "+0Hz"},
        "child_male": {"voice": "en-US-AnaNeural", "rate": "+0%", "pitch": "-20Hz"},
        "elderly_female": {
            "voice": "en-US-MichelleNeural",
            "rate": "-10%",
            "pitch": "-25Hz",
        },
        "elderly_male": {
            "voice": "en-US-ChristopherNeural",
            "rate": "-10%",
            "pitch": "-30Hz",
        },
    }

    sentences = read_custom_csv(input_csv)
    total_files = len(sentences) * len(voices)

    tasks = []
    for gender, config in voices.items():
        output_dir = f"public/tts/{output_key}/{gender}"
        os.makedirs(output_dir, exist_ok=True)
        for index, sentence in enumerate(sentences):
            output_file = f"{output_dir}/{index}.mp3"
            tasks.append(generate_single_file(sentence, config, output_file))

    processed_count = 0
    batch_size = 5
    print(f"Generating {total_files} files...")

    for i in range(0, len(tasks), batch_size):
        await asyncio.gather(*tasks[i : i + batch_size])
        processed_count += len(tasks[i : i + batch_size])

        # Simple text-based progress bar
        bar_length = 30
        progress = processed_count / total_files
        block = int(round(bar_length * progress))
        text = "\rProgress: [{0}] {1:.1f}%".format(
            "#" * block + "-" * (bar_length - block), progress * 100
        )
        sys.stdout.write(text)
        sys.stdout.flush()

        await asyncio.sleep(0.5)
    print("\nGeneration complete.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate TTS files from a CSV.")
    parser.add_argument("input_csv", help="Path to the input CSV file.")
    parser.add_argument(
        "output_key", help="Key for the output directory under public/tts/."
    )
    args = parser.parse_args()

    asyncio.run(generate_tts(args.input_csv, args.output_key))
