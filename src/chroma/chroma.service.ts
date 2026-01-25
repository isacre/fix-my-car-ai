import { Injectable, OnModuleInit, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChromaClient, Collection } from "chromadb";

@Injectable()
export class ChromaService implements OnModuleInit {
    private client: ChromaClient;
    private collection: Collection;

    constructor(private configService: ConfigService) {

    }

    async onModuleInit() {
        try {
            this.client = new ChromaClient({
                path: this.configService.get('CHROMA_DB_PATH'),
            });

            this.collection = await this.client.getOrCreateCollection({
                name: 'cars-data-collection',
            });
        } catch (error) {
            throw new InternalServerErrorException('Failed to initialize ChromaDB', error);
        }
    }



    async addDocuments(documents: string[], ids: string[]) {
        try {
            return await this.collection.upsert({
                ids: ids,
                documents: documents
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
}
