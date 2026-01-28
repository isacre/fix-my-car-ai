import { MemorySaver } from "@langchain/langgraph";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { ChatOpenAI } from '@langchain/openai';
import { Injectable, InternalServerErrorException, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChromaService } from 'src/chroma/chroma.service';
import { SYSTEM_PROMPT } from './system_prompt';
import { tool, StructuredTool } from "@langchain/core/tools";
import { z } from "zod";

@Injectable()
export class AIService implements OnModuleInit {
    private agent: Awaited<ReturnType<typeof createReactAgent>>;
    private tools: StructuredTool[] = [];

    constructor(
        private readonly configService: ConfigService,
        private readonly chromaService: ChromaService,
    ) { }

    async onModuleInit() {
        try {
            const searchCarsTool = tool(
                async ({ query }) => {
                    const result = await this.chromaService.queryDocuments(query);
                    const documents = result.documents?.[0] || [];
                    return documents.join("\n---\n");
                },
                {
                    name: "search_car_info",
                    description: "Search for car information in the database.",
                    schema: z.object({
                        query: z.string().describe("The technical search term or user question"),
                    }),
                }
            );

            this.tools = [searchCarsTool];
            const memory = new MemorySaver();
            const model = new ChatOpenAI({
                model: "gpt-4o-mini",
                temperature: 0.1,
                openAIApiKey: this.configService.get('OPENAI_API_KEY'),
            });

            this.agent = createReactAgent({
                llm: model,
                tools: this.tools,
                checkpointSaver: memory,
                messageModifier: SYSTEM_PROMPT,
            });

        } catch (error) {
            throw new InternalServerErrorException('Failed to initialize agent', error);
        }
    }

    async generateResponse(message: string, threadId: string) {
        try {
            const config = { configurable: { thread_id: threadId } };
            const result = await this.agent.invoke(
                { messages: [{ role: "user", content: message }] },
                config
            );

            return result.messages[result.messages.length - 1].content;

        } catch (error) {
            console.log("Error generating response", error);
            throw new InternalServerErrorException('Failed to generate response');
        }
    }


}