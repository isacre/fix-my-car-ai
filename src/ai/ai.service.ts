import { ChatPromptTemplate } from '@langchain/core/prompts';
import { ChatOpenAI } from '@langchain/openai';
import { Injectable, InternalServerErrorException, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChromaService } from 'src/chroma/chroma.service';
import { SYSTEM_PROMPT } from './system_prompt';

@Injectable()
export class AIService implements OnModuleInit {
    private model: ChatOpenAI;
    constructor(
        private readonly configService: ConfigService,
        private readonly chromaService: ChromaService
    ) { }

    async onModuleInit() {
        try {
            this.model = new ChatOpenAI({
                model: "gpt-4o-mini",
                temperature: 0,
                openAIApiKey: this.configService.get('OPENAI_API_KEY'),
            })
        } catch (error) {
            console.log("Error initializing agent", error);
            throw new InternalServerErrorException('Failed to initialize agent', error);
        }

    }

    async generateResponse(query: string) {
        try {
            const context = await this.chromaService.queryDocuments(query);
            const prompt = ChatPromptTemplate.fromMessages([
                ["system", SYSTEM_PROMPT],
                ["user", "Context: {context}\n\nQuestion: {query}"],
            ]);
            const chain = prompt.pipe(this.model);
            const response = await chain.invoke({
                context: context.documents,
                query: query,
            });
            return response.content;
        } catch (error) {
            console.log("Error generating response", error);
            throw new InternalServerErrorException('Failed to generate response', error);
        }
    }
}