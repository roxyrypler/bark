import os
import soundfile as sf
import nltk  # we'll use this to split into sentences
import numpy as np
import PyPDF2  # for reading PDFs
from bark.generation import generate_text_semantic, preload_models
from bark.api import semantic_to_waveform
from bark import generate_audio, SAMPLE_RATE

# Preload models
preload_models()

# Function to read PDFs and extract text with start and stop pages
def extract_text_from_pdfs(folder_path, start_page=0, end_page=None):
    pdf_texts = []
    for filename in os.listdir(folder_path):
        if filename.endswith(".pdf"):
            pdf_path = os.path.join(folder_path, filename)
            with open(pdf_path, "rb") as file:
                reader = PyPDF2.PdfReader(file)
                text = ""
                total_pages = len(reader.pages)
                if end_page is None or end_page > total_pages:
                    end_page = total_pages
                for page_num in range(start_page, end_page):
                    page = reader.pages[page_num]
                    text += page.extract_text()
                pdf_texts.append(text)
    return pdf_texts

# Function to convert text to audio
def text_to_audio(text, speaker, gen_temp=0.6):
    sentences = nltk.sent_tokenize(text)
    silence = np.zeros(int(0.25 * SAMPLE_RATE))  # quarter second of silence
    pieces = []
    for sentence in sentences:
        semantic_tokens = generate_text_semantic(
            sentence,
            history_prompt=speaker,
            temp=gen_temp,
            min_eos_p=0.05,  # this controls how likely the generation is to end
        )
        audio_array = semantic_to_waveform(semantic_tokens, history_prompt=speaker)
        pieces += [audio_array, silence.copy()]
    final_audio = np.concatenate(pieces)
    return final_audio

# Main function to create audiobook from PDFs
def create_audiobook_from_pdfs(folder_path, output_file, start_page=0, end_page=None, speaker="v2/en_speaker_6"):
    pdf_texts = extract_text_from_pdfs(folder_path, start_page, end_page)
    all_audio_pieces = []
    for text in pdf_texts:
        audio_pieces = text_to_audio(text, speaker)
        all_audio_pieces.append(audio_pieces)
    final_audio = np.concatenate(all_audio_pieces)
    sf.write(output_file, final_audio, SAMPLE_RATE)
    print(f"Audiobook saved to {output_file}")

# Specify the folder containing PDFs and the output file name
pdf_folder_path = "pdf"
output_audio_file = "TheAliens.wav"

# Define start and end pages (example: start at page 2 and end at page 10)
start_page = 2  # start at page 2 (0-indexed)
end_page = 52  # stop at page 10

# Create audiobook from PDFs with specified page range
create_audiobook_from_pdfs(pdf_folder_path, output_audio_file, start_page, end_page)
