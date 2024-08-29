import axios from 'axios';
import fs from "fs";
import path from "path";
import pdfParse from 'pdf-parse';

// Define the URL of the API endpoint
const apiUrl = 'http://localhost:5000/generate_audio'; // Replace with your API URL

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
        const outputFolder = './audio';
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
    } catch (error) {
        console.error('Error processing the PDF or generating audio:', error);
    }
}

// Define your PDF path and page range
const pdfPath = './pdf/The-Aliens.pdf'; // Replace with your PDF file path
const fromPage = 5; // Start page
const toPage = 5;   // End page

// Call the function to process the PDF and generate audio
processPdf(pdfPath, fromPage, toPage);
