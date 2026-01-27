import crypto from 'crypto';

/**
 * Generate a unique ID for a given text for chromaDB upsert to avoid duplicates
 * @param text - The text to generate an ID for
 * @returns The unique ID
 */
export function generateID(text: string) {
    return crypto.createHash('sha256').update(text).digest('hex');
}