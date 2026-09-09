/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import type { AppEnv } from '../config/env.js';
import { getAppEnv } from '../config/env.js';
import { AuthController } from './auth.controller.js';
import { APP_ENV_TOKEN } from './auth.constants.js';
import { AuthSessionCryptoService } from './auth-session-crypto.service.js';
import { AuthSessionEntity } from './auth-session.entity.js';
import { AuthSessionService } from './auth-session.service.js';
import { AuthService } from './auth.service.js';
import { AuthTokenService } from './auth-token.service.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { OidcClientService } from './oidc-client.service.js';

@Module({
  imports: [CqrsModule, TypeOrmModule.forFeature([AuthSessionEntity])],
  controllers: [AuthController],
  providers: [
    {
      provide: APP_ENV_TOKEN,
      inject: [ConfigService],
      useFactory: (configService: ConfigService<AppEnv>) => getAppEnv(configService)
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard
    },
    AuthTokenService,
    AuthSessionCryptoService,
    AuthSessionService,
    OidcClientService,
    AuthService,
    JwtAuthGuard
  ],
  exports: [AuthService]
})
export class AuthModule {}
