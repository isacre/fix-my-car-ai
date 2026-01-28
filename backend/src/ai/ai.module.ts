import { Module } from '@nestjs/common';
import { AIService } from './ai.service';
import { ConfigModule } from '@nestjs/config';
import { ChromaModule } from 'src/chroma/chroma.module';

@Module({
    providers: [AIService],
    imports: [ConfigModule, ChromaModule],
    exports: [AIService]
})
export class AIModule { }
