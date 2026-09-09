/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BriefingEntity } from './briefing.entity.js';
import { StoreBriefingHandler } from './commands/handlers/store-briefing.handler.js';
import { GetBriefingHandler } from './queries/handlers/get-briefing.handler.js';

@Module({
  imports: [CqrsModule, TypeOrmModule.forFeature([BriefingEntity])],
  providers: [StoreBriefingHandler, GetBriefingHandler]
})
export class BriefingStorageModule {}
