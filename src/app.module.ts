import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ChatModule } from './chat/chat.module';
import { ConfigModule } from '@nestjs/config';
import { ChromaModule } from './chroma/chroma.module';
import { AIModule } from './ai/ai.module';
@Module({
  imports: [ChatModule, ConfigModule.forRoot({
    isGlobal: true,
    envFilePath: '.env',
  }), ChromaModule, AIModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
