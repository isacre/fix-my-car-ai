import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { AIModule } from 'src/ai/ai.module';

@Module({
  controllers: [ChatController],
  providers: [ChatService],
  imports: [AIModule],
})
export class ChatModule { }
