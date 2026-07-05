import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AppConfigService } from './config/config.service';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(AppConfigService);

  app.setGlobalPrefix('api');
  app.enableCors({
    origin: configService.getCorsOrigin(),
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('TerraPanel API')
    .setDescription('泰拉瑞亚服务器 Web 管理面板后端 API')
    .setVersion('1.0')
    .addTag('terraria', 'Terraria 服务器管理')
    .addTag('config', '配置管理')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const port = configService.getAppPort();
  await app.listen(port);

  console.log(`TerraPanel API: http://localhost:${port}/api`);
  console.log(`Swagger Docs:   http://localhost:${port}/api/docs`);
  console.log(`WebSocket:      ws://localhost:${port}/terminal`);
}

void bootstrap();
