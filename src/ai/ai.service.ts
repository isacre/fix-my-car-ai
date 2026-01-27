import { Tool } from '@langchain/core/tools';
import { CompiledStateGraph, MemorySaver } from "@langchain/langgraph";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { ChatOpenAI } from '@langchain/openai';
import { Injectable, InternalServerErrorException, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SYSTEM_PROMPT } from './system_prompt';

@Injectable()
export class AIService implements OnModuleInit {
    private agent: CompiledStateGraph<any, any, any, any, any, any, any, any, any>;
    private tools: Tool[] = [];

    constructor(
        private readonly configService: ConfigService,
    ) { }

    async onModuleInit() {
        try {
            const memory = new MemorySaver();
            const model = new ChatOpenAI({
                model: "gpt-4o-mini",
                temperature: 0,
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