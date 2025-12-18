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

  app.use(express.json({ limit: '100mb' }));
  app.use(express.urlencoded({ limit: '100mb', extended: true }));

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

  let allowedOrigins;

  if (process.env.ENVIRONMENT === 'development') {
    allowedOrigins = ['*'];
  } else if (process.env.ENVIRONMENT === 'production') {
    allowedOrigins = [process.env.FRONTEND_URL];
  }

  app.enableCors({
    origin: (origin, callback) => {
      // En desarrollo, permitir todas las solicitudes
      if (process.env.ENVIRONMENT === 'development') {
        callback(null, true);
        return;
      }

      // En producción, validar el origen
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: 'Content-Type, Accept, Authorization',
    credentials: true,
  });

  // Configuración para servir archivos estáticos
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
      .setTitle('Distribuidores Nexus API')
      .setDescription('API documentation for Distribuidores Nexus Backend')
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
