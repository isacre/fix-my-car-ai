import { Module } from '@nestjs/common';
import { AIModule } from 'src/ai/ai.module';
import { ChatController } from './chat.controller';

@Module({
  controllers: [ChatController],
  providers: [],
  imports: [AIModule],
})
export class ChatModule { }
