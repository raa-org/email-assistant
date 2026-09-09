/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { ProviderModelDto } from '@raa/assistant/common';
import { ProviderCatalogService } from '../../provider-catalog.service.js';
import { ListProviderModelsQuery } from '../list-provider-models.query.js';

@QueryHandler(ListProviderModelsQuery)
export class ListProviderModelsHandler implements IQueryHandler<ListProviderModelsQuery, ProviderModelDto[]> {
  constructor(private readonly providerCatalogService: ProviderCatalogService) {}

  async execute(query: ListProviderModelsQuery): Promise<ProviderModelDto[]> {
    return this.providerCatalogService.listModels(query.provider);
  }
}
