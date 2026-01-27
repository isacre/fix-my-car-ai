import { readFileSync } from "fs";
import { ChromaService } from "../chroma/chroma.service";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "../app.module";
import { join } from "path";
import { Metadata } from "chromadb";


// Input: Cleaned text with markdown headings (###)
function getChunksAndMetadata() {
    const file = readFileSync(join(__dirname, 'data.txt'), "utf-8");
    const regex = /###\s*(.*)/g;
    const chunks = file.split(regex);
    const documents = chunks.map((chunk, index) => {
        const title = index % 2 !== 0
        if (!title) {
            return chunk.trim().replace("\n", "");
        }
    }).filter(Boolean);

    const metadata = chunks.map((document, index) => {
        const title = index % 2 !== 0
        if (title) {
            return {
                category: document
            }
        } else {
            return null;
        }
    }).filter(Boolean);

    return { chunks: documents, metadata };
}

async function ingest() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const service = app.get(ChromaService);
    const { chunks, metadata } = getChunksAndMetadata();
    try {
        await service.addDocuments(chunks as string[], metadata as any[]);
    } catch (error) {
        console.error("Error adding documents", error);
    }
    console.log("Documents added successfully");

    await app.close();
}


// ingest();
const { chunks, metadata } = getChunksAndMetadata();
console.log(chunks);
console.log(metadata);


