/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

import 'reflect-metadata'
import { config as dotenvConfig } from 'dotenv'
dotenvConfig({ override: true })

import { ValidationPipe } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { AppModule } from './app.module.js'
import type { AppEnv } from './config/env.js'
import { getAppEnv } from './config/env.js'

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    cors: false,
  })
  const configService = app.get<ConfigService<AppEnv>>(ConfigService)
  const env = getAppEnv(configService)

  app.enableCors({
    origin: env.appBaseUrl ?? true,
    credentials: true,
  })
  app.setGlobalPrefix('api')
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  )

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Email Assistant API')
    .setDescription('Internal API for authentication, mail access, provider discovery, and AI summaries.')
    .setVersion('1.0.0')
    .addCookieAuth(env.authCookieName, {
      in: 'cookie',
      type: 'apiKey',
    })
    .build()
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig)

  SwaggerModule.setup('api/docs', app, swaggerDocument, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  })

  await app.listen(env.backendPort, env.backendHost)
}

void bootstrap()
