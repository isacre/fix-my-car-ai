import { ChromaService } from "../chroma/chroma.service";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "../app.module";

async function wipeDB() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const service = app.get(ChromaService);
    await service.deleteCollection();
    console.log("Database wiped successfully");
    await app.close();
}

wipeDB();