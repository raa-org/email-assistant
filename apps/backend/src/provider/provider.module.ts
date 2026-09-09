/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { ProviderController } from './provider.controller.js';
import { LlmProviderRegistryService } from './llm-provider-registry.service.js';
import { ProviderCatalogService } from './provider-catalog.service.js';
import { ListProviderModelsHandler } from './queries/handlers/list-provider-models.handler.js';

@Module({
  imports: [CqrsModule],
  controllers: [ProviderController],
  providers: [LlmProviderRegistryService, ProviderCatalogService, ListProviderModelsHandler],
  exports: [LlmProviderRegistryService]
})
export class ProviderModule {}
