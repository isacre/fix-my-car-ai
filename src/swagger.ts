import { INestApplication } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

export function setupSwagger(app: INestApplication) {
    try {
        const config = new DocumentBuilder()
            .setTitle('Fix My Car AI')
            .build();

        const documentFactory = () => SwaggerModule.createDocument(app, config);

        SwaggerModule.setup('api', app, documentFactory);

    } catch (error) {
        console.error('Failed to setup Swagger', error);
    }
}