import { ChromaService } from "../chroma/chroma.service";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "../app.module";
import axios from 'axios';
import * as cheerio from 'cheerio';
import { generateID } from '../utils';

async function fetchWikipediaHTML(title: string): Promise<string> {
    const url = `https://en.wikipedia.org/w/api.php`;
    const { data } = await axios.get(url, {
        params: { action: 'parse', page: title, format: 'json', prop: 'text', redirects: true },
        headers: { 'User-Agent': 'FixMyCarAI/1.0' }
    });

    return data.parse.text['*'];
}

async function fetchWikipediaPlainText(title: string) {
    const url = `https://en.wikipedia.org/w/api.php`;
    const { data } = await axios.get(url, {
        params: { action: 'query', titles: title, format: 'json', prop: 'extracts', redirects: true, explaintext: 1 },
        headers: { 'User-Agent': 'FixMyCarAI/1.0' }
    });
    const value = Object.values(data.query.pages) as { extract: string }[];
    return value[0].extract;
}

/**
 * In the HTML page, get the links to the subtopics that contain the given title 
 *@example 
 * ```title: Honda_Civic
 * [retrieved]: Honda_Civic(first_generation)
 * [not_retrieved]: Honda_Prelude
 * ```
 * @returns An array of titles to the relevant subtopics
 */
async function getSubtopicsLinks(title: string): Promise<string[]> {
    const html = await fetchWikipediaHTML(title);

    const categoriesToRemove = [
        'style',
        'script',
        '.hatnote',
        'img',
        '#External_links',
        '.gallery',
        '#References',
        '.infobox-image',
        '.references'
    ]

    const $ = cheerio.load(html);
    $(categoriesToRemove.join(", ")).remove();
    const links = $(`a[href^="/wiki/${title}"]:not([href*=":"])`).map((i, el) => $(el).attr('href')).get();
    const uniqueLinks = Array.from(new Set(links));
    return [title, ...uniqueLinks].map(link => link.replace('/wiki/', ''));
}






/**
 * Get the chunks and metadata for the given text
 * @param text - The text to get the chunks and metadata for
 * @returns An object with the chunks and metadata
 * @metadata {category: string} (== Honda_Civic ==)
 */
export function getChunksAndMetadata(text: string) {
    const regex = /==+\s*(.*?)\s*==+/g;
    const chunks = text.split(regex);

    const documents: string[] = [];
    const metadata: any[] = [];

    let currentCategory = 'General';

    // Process the array: pair index are content, odd index are titles
    for (let i = 0; i < chunks.length; i++) {
        const content = i % 2 === 0;
        if (content) {
            const content = chunks[i].trim().replace(/\n+/g, ' ').replace(/\s+/g, ' ');
            if (content && content.length > 0) {
                documents.push(content);
                metadata.push({ category: currentCategory });
            }
        } else {
            currentCategory = chunks[i].trim();
        }
    }

    return { chunks: documents, metadata };
}



export async function ingest(title: string) {
    const app = await NestFactory.createApplicationContext(AppModule);
    const service = app.get(ChromaService);
    const links = await getSubtopicsLinks(title);

    console.log(`Found ${links.length} topics to process`);

    let totalSuccessCount = 0;
    let totalErrorCount = 0;
    let totalDocumentsAdded = 0;
    const allGeneratedIDs = new Set<string>();
    const duplicateChunks = new Map<string, number>();

    for (let i = 0; i < links.length; i++) {
        const topic = links[i];
        console.log(`\nProcessing topic ${i + 1}/${links.length}: ${topic}`);

        try {
            const text = await fetchWikipediaPlainText(topic);
            const { chunks, metadata } = getChunksAndMetadata(text);

            console.log(`  - Generated ${chunks.length} chunks`);

            if (chunks.length === 0) {
                console.log(`  - Skipping: no chunks found`);
                continue;
            }

            const enrichedMetadata = metadata.map((meta, idx) => ({
                ...meta,
                topic: topic,
                chunkIndex: idx
            }));

            // Gera IDs únicos incluindo o contexto (tópico + categoria + índice + conteúdo)
            const ids = chunks.map((chunk, idx) => {
                const idString = `${topic}||${enrichedMetadata[idx].category}||${idx}||${chunk}`;
                const id = generateID(idString);

                if (allGeneratedIDs.has(id)) {
                    const count = duplicateChunks.get(id) || 0;
                    duplicateChunks.set(id, count + 1);
                } else {
                    allGeneratedIDs.add(id);
                }

                return id;
            });

            const uniqueIdsCount = new Set(ids).size;

            await service.addDocuments(chunks as string[], enrichedMetadata as any[], ids);
            totalSuccessCount++;
            totalDocumentsAdded += chunks.length;
            console.log(`  ✓ Successfully added ${chunks.length} documents (${uniqueIdsCount} unique IDs)`);
        } catch (error) {
            totalErrorCount++;
            console.error(`  ✗ Error processing ${topic}:`, error.message);
            continue;
        }
    }

    console.log(`\n=== Summary ===`);
    console.log(`Total topics processed: ${links.length}`);
    console.log(`Successful: ${totalSuccessCount}`);
    console.log(`Errors: ${totalErrorCount}`);
    console.log(`Total documents attempted: ${totalDocumentsAdded}`);
    console.log(`Unique IDs generated: ${allGeneratedIDs.size}`);
    console.log(`Total duplicates detected: ${Array.from(duplicateChunks.values()).reduce((a, b) => a + b, 0)}`);
    console.log(`\nExpected documents in DB: ${allGeneratedIDs.size} (may differ due to upsert behavior)`);

    await app.close();
}

