/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EnsureUserFromOidcHandler } from './commands/handlers/ensure-user-from-oidc.handler.js';
import { UserEntity } from './user.entity.js';

@Module({
  imports: [CqrsModule, TypeOrmModule.forFeature([UserEntity])],
  providers: [EnsureUserFromOidcHandler]
})
export class UserModule {}
