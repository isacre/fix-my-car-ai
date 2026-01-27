import axios from 'axios';
import * as cheerio from 'cheerio';

async function fetchAndAtomicTransform(title: string) {
    const url = `https://en.wikipedia.org/w/api.php`;
    const { data } = await axios.get(url, {
        params: { action: 'parse', page: title, format: 'json', prop: 'text', redirects: true },
        headers: { 'User-Agent': 'FixMyCarAI/1.0' }
    });

    const $ = cheerio.load(data.parse.text['*']);
    $('style, script, .hatnote').remove();

    const documents: string[] = [];
    const metadata: any[] = [];

    let currentH2 = '';
    let currentH3 = '';

    // Iteramos por todos os elementos relevantes na ordem em que aparecem
    $('.mw-parser-output').children('h2, h3, p').each((index, el) => {
        const $el = $(el);
        const text = $el.text().trim();
        console.log("\n\n");
        console.log("text:", text);

        //not working with h2 and h3
        if (el.tagName === 'h2') {
            currentH2 = text;
            currentH3 = ''; // Reset h3 quando muda o h2
        } else if (el.tagName === 'h3') {
            currentH3 = text;
        } else if (el.tagName === 'p' && text.length > 1000) {
            // Criamos o chunk atômico
            const cleanText = text.replace(/\s+/g, ' ');
            const fullContextText = `Car: ${title} | Section: ${currentH2}${currentH3 ? ' > ' + currentH3 : ''} | Content: ${cleanText}`;
            documents.push(fullContextText);
            metadata.push({
                source: 'wikipedia',
                car_model: title,
                main_section: currentH2,
                sub_section: currentH3 || 'General'
            });
        }
    });

    return { chunks: documents, metadata };
}

fetchAndAtomicTransform('Honda_Civic_(first_generation)');

/* async function main() {
    const { chunks, metadata } = await fetchAndAtomicTransform('Honda_Civic_(eighth_generation)');
    console.log(chunks[5]);
}

main(); */