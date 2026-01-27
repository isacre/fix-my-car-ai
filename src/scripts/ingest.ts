import { ChromaService } from "../chroma/chroma.service";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "../app.module";
import axios from 'axios';
import * as cheerio from 'cheerio';



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
                category: document.replace("=", "").trim()
            }
        } else {
            return null;
        }
    }).filter(Boolean);

    return { chunks: documents, metadata };
}



export async function ingest(title: string) {
    const app = await NestFactory.createApplicationContext(AppModule);
    const service = app.get(ChromaService);
    const links = await getSubtopicsLinks(title);

    for (let i = 0; i < links.length; i++) {
        let successCount = 0;
        let errorCount = 0;
        const topic = links[i];
        const text = await fetchWikipediaPlainText(topic);
        const { chunks, metadata } = getChunksAndMetadata(text);
        try {
            await service.addDocuments(chunks as string[], metadata as any[]);
            successCount++;
            console.log(`${successCount} documents added successfully for ${topic}`);
        } catch (error) {
            errorCount++;
            console.log(`${errorCount} documents failed to add for ${topic}`);
            continue;
        }
    }

    await app.close();
}

ingest('Honda_Civic');
