import pandas as pd
import os
import asyncio
import edge_tts
import argparse
import csv

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

            data.append(row[0])
    return data

async def generate_tts(input_csv, output_key):
    voices = {
        "female": "en-US-JennyNeural",
        "male": "en-US-GuyNeural"
    }
    
    for gender, voice in voices.items():
        output_dir = f'public/tts/{output_key}/{gender}'
        os.makedirs(output_dir, exist_ok=True)
        
        sentences = read_custom_csv(input_csv)
        
        for index, sentence in enumerate(sentences):
            output_file = f"{output_dir}/{index}.mp3"
            
            # Don't skip if file is 0 bytes
            if not os.path.exists(output_file) or os.path.getsize(output_file) == 0:
                print(f"Generating for {output_key}: {gender} {index}.mp3...")
                try:
                    communicate = edge_tts.Communicate(sentence, voice)
                    await communicate.save(output_file)
                    await asyncio.sleep(0.5)
                except Exception as e:
                    print(f"Failed at {gender} {index}: {e}")
                    await asyncio.sleep(5)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate TTS files from a CSV.")
    parser.add_argument("input_csv", help="Path to the input CSV file.")
    parser.add_argument("output_key", help="Key for the output directory under public/tts/.")
    args = parser.parse_args()
    
    asyncio.run(generate_tts(args.input_csv, args.output_key))
