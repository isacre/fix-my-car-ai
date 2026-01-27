import { Module } from '@nestjs/common';
import { AIService } from './ai.service';
import { ConfigModule } from '@nestjs/config';

@Module({
    providers: [AIService],
    imports: [ConfigModule],
    exports: [AIService]
})
export class AIModule { }
