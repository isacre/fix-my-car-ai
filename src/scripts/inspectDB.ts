import { ChromaService } from "../chroma/chroma.service";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "../app.module";

async function inspectChromaDB() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const service = app.get(ChromaService);

    try {
        const count = await service.count();
        console.log(`📊 Total documents in the database: ${count}\n`);
    } catch (error) {
        console.error('❌ Error inspecting ChromaDB:', error);
    } finally {
        await app.close();
    }
}

inspectChromaDB();