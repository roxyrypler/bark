import os
import soundfile as sf

os.environ["CUDA_VISIBLE_DEVICES"] = "0"

#from IPython.display import Audio
import nltk  # we'll use this to split into sentences
import numpy as np

from bark.generation import (
    generate_text_semantic,
    preload_models,
)
from bark.api import semantic_to_waveform
from bark import generate_audio, SAMPLE_RATE

preload_models()

script = """
Hey, have you heard about this new text-to-audio model called "Bark"? 
Apparently, it's the most realistic and natural-sounding text-to-audio model 
out there right now. 
""".replace("\n", " ").strip()

sentences = nltk.sent_tokenize(script)

GEN_TEMP = 0.6
SPEAKER = "v2/en_speaker_6"
silence = np.zeros(int(0.25 * SAMPLE_RATE))  # quarter second of silence

pieces = []
for sentence in sentences:
    semantic_tokens = generate_text_semantic(
        sentence,
        history_prompt=SPEAKER,
        temp=GEN_TEMP,
        min_eos_p=0.05,  # this controls how likely the generation is to end
    )

    audio_array = semantic_to_waveform(semantic_tokens, history_prompt=SPEAKER,)
    pieces += [audio_array, silence.copy()]

# Concatenate all audio pieces
final_audio = np.concatenate(pieces)

# Save the audio to a file
output_file = "output_audio.wav"
sf.write(output_file, final_audio, SAMPLE_RATE)

print(f"Audio saved to {output_file}")
