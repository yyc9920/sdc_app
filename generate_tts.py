import pandas as pd
import os
import asyncio
import edge_tts
import argparse

async def generate_tts(input_csv, output_key):
    voices = {
        "female": "en-US-JennyNeural",
        "male": "en-US-GuyNeural"
    }
    
    for gender, voice in voices.items():
        output_dir = f'public/tts/{output_key}/{gender}'
        os.makedirs(output_dir, exist_ok=True)
        
        df = pd.read_csv(input_csv)
        
        for index, row in df.iterrows():
            sentence = str(row['English Sentence'])
            output_file = f"{output_dir}/{index}.mp3"
            
            if not os.path.exists(output_file):
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
