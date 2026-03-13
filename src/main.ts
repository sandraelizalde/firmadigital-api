import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import compression from 'compression';
import * as express from 'express';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import 'dotenv/config';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.use(compression());

  app.use(express.json({ limit: '600mb' }));
  app.use(express.urlencoded({ limit: '600mb', extended: true }));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );
  const env = process.env.ENVIRONMENT ?? 'development';

  // Lista de orígenes permitidos
  const baseOrigins = [
    process.env.FRONTEND_URL!,
    process.env.ELIZALDE_FRONTEND_URL!,
  ].filter(Boolean);

  const allowedOrigins = [
    ...baseOrigins,
    ...baseOrigins.map((o) => o.replace('https://www.', 'https://')),
    'http://localhost:3000',
    'http://localhost:5173',
  ];

  // Eliminar duplicados
  const uniqueOrigins = [...new Set(allowedOrigins)];

  app.enableCors({
    origin: (origin, callback) => {
      if (env === 'development') {
        return callback(null, true);
      }

      if (!origin) {
        return callback(null, true);
      }

      if (uniqueOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`Not allowed by CORS: ${origin}`));
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: 'Content-Type, Accept, Authorization',
    credentials: true,
  });

  const assetsPath = join(process.cwd(), 'src', 'assets');
  const uploadsPath = join(process.cwd(), 'uploads');

  // app.useStaticAssets(assetsPath, {
  //   prefix: '/static/',
  // });

  app.useStaticAssets(uploadsPath, {
    prefix: '/uploads/',
  });

  // Solo habilitar Swagger en desarrollo
  if (process.env.ENVIRONMENT === 'development') {
    const config = new DocumentBuilder()
      .setTitle('Distribuidores Elizalde API')
      .setDescription('API documentation for Distribuidores Elizalde Backend')
      .setVersion('1.0')
      .addBearerAuth({
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        in: 'header',
        name: 'Authorization',
        description: 'Enter JWT token',
      })
      .addSecurityRequirements('bearer')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document);

    console.log(
      'Swagger habilitado en: http://localhost:' +
        (process.env.PORT ?? 8080) +
        '/api',
    );
  } else {
    console.log('Swagger deshabilitado en producción');
  }

  await app.listen(process.env.PORT ?? 8080);
  console.log(
    `Aplicación corriendo en: http://localhost:${process.env.PORT ?? 8080}`,
  );
}
bootstrap();
