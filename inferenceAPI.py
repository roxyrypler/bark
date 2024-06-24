import os
import nltk
import numpy as np
import soundfile as sf
from flask import Flask, request, send_file, jsonify
from bark.generation import generate_text_semantic, preload_models
from bark.api import semantic_to_waveform
from bark import SAMPLE_RATE

# Preload models
preload_models()

# Initialize Flask app
app = Flask(__name__)

# Define constants
GEN_TEMP = 0.6
SPEAKER = "v2/en_speaker_6"
silence = np.zeros(int(0.25 * SAMPLE_RATE))  # quarter second of silence

# Endpoint to generate audio from text
@app.route('/generate_audio', methods=['POST'])
def generate_audio():
    try:
        data = request.get_json()
        script = data.get('text', '').replace("\n", " ").strip()

        if not script:
            return jsonify({"error": "No text provided"}), 400

        sentences = nltk.sent_tokenize(script)

        pieces = []
        for sentence in sentences:
            semantic_tokens = generate_text_semantic(
                sentence,
                history_prompt=SPEAKER,
                temp=GEN_TEMP,
                min_eos_p=0.05,  # this controls how likely the generation is to end
            )

            audio_array = semantic_to_waveform(semantic_tokens, history_prompt=SPEAKER)
            pieces += [audio_array, silence.copy()]

        # Concatenate all audio pieces
        final_audio = np.concatenate(pieces)

        # Save the audio to a file
        output_file = "output_audio.wav"
        sf.write(output_file, final_audio, SAMPLE_RATE)

        return send_file(output_file, as_attachment=True)

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
