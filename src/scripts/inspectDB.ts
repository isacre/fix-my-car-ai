import { ChromaService } from "../chroma/chroma.service";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "../app.module";

async function inspectChromaDB() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const service = app.get(ChromaService);

    try {
        console.log('\n🔍 Inspecionando ChromaDB...\n');

        // Contar total de documentos
        const count = await service.count();
        console.log(`📊 Total de documentos no banco: ${count}\n`);

        // Pegar todos os documentos
        const allData = await service.getAll();

        console.log(`📝 Detalhes dos documentos:\n`);
        console.log(`IDs encontrados: ${allData.ids.length}`);
        console.log(`Documentos encontrados: ${allData.documents?.length || 0}`);
        console.log(`Metadados encontrados: ${allData.metadatas?.length || 0}\n`);

        // Agrupar por categoria (metadata)
        const categories: Record<string, number> = {};
        if (allData.metadatas) {
            allData.metadatas.forEach((meta: any) => {
                const category = meta?.category || 'sem categoria';
                categories[category] = (categories[category] || 0) + 1;
            });
        }

    } catch (error) {
        console.error('❌ Erro ao inspecionar ChromaDB:', error);
    } finally {
        await app.close();
    }
}

inspectChromaDB();