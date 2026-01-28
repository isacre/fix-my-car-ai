import { Body, Controller, Post } from '@nestjs/common';
import { AIService } from '../ai/ai.service';

@Controller('chat')
export class ChatController {
  constructor(
    private readonly AIService: AIService
  ) { }

  @Post('send-message')
  sendMessage(@Body() body: { message: string, threadId: string }) {
    return this.AIService.generateResponse(body.message, body.threadId);
  }


}
