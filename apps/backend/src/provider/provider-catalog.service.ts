/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

import { Injectable } from '@nestjs/common';
import type { ProviderModelDto } from '@raa/assistant/common';
import { LlmProviderRegistryService } from './llm-provider-registry.service.js';
import type { LlmProviderKind } from './provider.types.js';

@Injectable()
export class ProviderCatalogService {
  constructor(private readonly llmProviderRegistry: LlmProviderRegistryService) {}

  async listModels(provider?: LlmProviderKind): Promise<ProviderModelDto[]> {
    return this.llmProviderRegistry.listModels(provider);
  }
}
