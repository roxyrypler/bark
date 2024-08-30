import axios from 'axios';
import fs from "fs";
import path from "path";
import pdfParse from 'pdf-parse';
import ffmpeg from 'fluent-ffmpeg';

// Define the URL of the API endpoint
const apiUrl = 'http://localhost:5000/generate_audio'; // Replace with your API URL
const outputFolder = './audio';
// Define your PDF path and page range
const pdfPath = './pdf/The-Aliens.pdf'; // Replace with your PDF file path
const fromPage = 5; // Start page
const toPage = 5;   // End page

// the whole book is from 4 - 54

// Function to split text into sentences and group into chunks of 5 sentences each
function splitTextIntoChunks(text: string, chunkSize: number): string[] {
    const sentences = text.match(/[^\.!\?]+[\.!\?]+/g) || [];
    const chunks: any = [];

    for (let i = 0; i < sentences.length; i += chunkSize) {
        const chunk = sentences.slice(i, i + chunkSize).join(' ');
        chunks.push(chunk);
    }

    return chunks;
}

// Function to process PDF and generate audio files
async function processPdf(pdfPath: string, fromPage: number, toPage: number) {
    try {
        const dataBuffer = fs.readFileSync(pdfPath);
        const pdfData = await pdfParse(dataBuffer, { max: toPage });
        
        // Extract text from the selected page range
        let text = '';
        const pages = pdfData.text.split('\n\n').filter((page, index) => index + 1 >= fromPage && index + 1 <= toPage);
        text = pages.join(' ');

        // Split the text into chunks of 5 sentences each
        const chunks = splitTextIntoChunks(text, 5);
        console.log(pages);
        // Ensure the output folder exists
        
        if (!fs.existsSync(outputFolder)) {
            fs.mkdirSync(outputFolder);
        }

        // Send each chunk to the API and save the resulting audio file
        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            const requestBody = { text: chunk };

            const response = await axios.post(apiUrl, requestBody, {
                responseType: 'arraybuffer',
            });

            // Define the path where the file will be saved
            const filePath = path.join(outputFolder, `output-audio-${i + 1}.wav`);

            // Write the response data to a file
            fs.writeFileSync(filePath, response.data);

            console.log(`Audio file saved successfully at: ${filePath}`);
        }
        //await combineAudioFiles(outputFolder, './audio/combined-output.wav');
    } catch (error) {
        console.error('Error processing the PDF or generating audio:', error);
    }
}

// Function to combine all WAV files in the folder into one using ffmpeg
async function combineAudioFiles(inputFolder: string, outputFile: string) {
    return new Promise<void>((resolve, reject) => {
        const files = fs.readdirSync(inputFolder)
            .filter(file => file.endsWith('.wav'))
            .sort((a, b) => {
                const aIndex = parseInt(a.split('-')[2], 10);
                const bIndex = parseInt(b.split('-')[2], 10);
                return aIndex - bIndex;
            })
            .map(file => path.join(inputFolder, file));

        const ffmpegCommand = ffmpeg();

        // Add all the input files to ffmpeg
        files.forEach(file => ffmpegCommand.input(file));

        // Output the combined file
        ffmpegCommand
            .on('end', () => {
                console.log(`Combined audio file saved successfully at: ${outputFile}`);
                resolve();
            })
            .on('error', (err) => {
                console.error('Error combining WAV files:', err);
                reject(err);
            })
            .mergeToFile(outputFile, inputFolder);
    });
}

// Call the function to process the PDF and generate audio
processPdf(pdfPath, fromPage, toPage);
//combineAudioFiles(outputFolder, './audio/combined-output.wav');
