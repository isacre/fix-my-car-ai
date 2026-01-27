import { OpenAIEmbeddingFunction } from '@chroma-core/openai';
import { Injectable, OnModuleInit, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChromaClient, Collection, Metadata } from "chromadb";
import { generateID } from 'src/utils';
import { v4 } from 'uuid';

@Injectable()
export class ChromaService implements OnModuleInit {
    private client: ChromaClient;
    private collection: Collection;
    private readonly logger = new Logger(ChromaService.name);

    constructor(private configService: ConfigService) {

    }

    async onModuleInit() {
        try {
            this.client = new ChromaClient({
                path: this.configService.get('CHROMA_DB_PATH'),
            });

            this.collection = await this.client.getOrCreateCollection({
                name: 'cars-data',
                embeddingFunction: new OpenAIEmbeddingFunction({
                    modelName: 'text-embedding-3-small',
                    apiKey: this.configService.get('OPENAI_API_KEY'),
                })
            });

            this.logger.log('ChromaDB collection initialized successfully');

        } catch (error) {
            this.logger.error('Failed to initialize ChromaDB', error.stack);
            throw new InternalServerErrorException('Failed to initialize ChromaDB', error);
        }
    }



    async addDocuments(documents: string[], metadatas: Metadata[] = []) {
        try {
            return await this.collection.upsert({
                ids: documents.map((chunk) => generateID(chunk)),
                documents: documents,
                metadatas: metadatas
            })
        } catch (error) {
            throw new InternalServerErrorException('Failed to add documents', error);
        }

    }

    async queryDocuments(text: string, limit: number = 5) {
        try {
            return await this.collection.query({
                queryTexts: [text],
                nResults: limit,
            })
        } catch (error) {
            throw new InternalServerErrorException('Failed to query documents', error);
        }
    }

    async deleteCollection() {
        return await this.client.deleteCollection({
            name: 'cars-data',
        });
    }

    async peek() {
        return await this.collection.peek({ limit: 100 });
    }


    async count(): Promise<number> {
        try {
            return await this.collection.count();
        } catch (error) {
            throw new InternalServerErrorException('Failed to count documents', error);
        }
    }

    async getAll(limit?: number) {
        try {
            const totalCount = await this.collection.count();
            const actualLimit = limit || totalCount;

            return await this.collection.get({
                limit: actualLimit
            });
        } catch (error) {
            throw new InternalServerErrorException('Failed to get all documents', error);
        }
    }
}
