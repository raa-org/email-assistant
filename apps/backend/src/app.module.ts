/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AttachmentModule } from './attachment/attachment.module.js';
import { AuthModule } from './auth/auth.module.js';
import { buildNestTypeOrmOptions } from './config/database.config.js';
import type { AppEnv } from './config/env.js';
import { getAppEnv, validateEnv } from './config/env.js';
import { EncryptionModule } from './encryption/encryption.module.js';
import { MailModule } from './mail/mail.module.js';
import { ProviderModule } from './provider/provider.module.js';
import { SummaryModule } from './summary/summary.module.js';
import { UserModule } from './user/user.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService<AppEnv>) =>
        buildNestTypeOrmOptions(getAppEnv(configService))
    }),
    EncryptionModule,
    AttachmentModule,
    AuthModule,
    MailModule,
    ProviderModule,
    SummaryModule,
    UserModule
  ]
})
export class AppModule {}
