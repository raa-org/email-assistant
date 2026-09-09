/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import type { ProviderModelDto } from '@raa/assistant/common';
import { ProviderModelResponseDto } from './dto/provider-response.dto.js';
import { ListProviderModelsQuery } from './queries/list-provider-models.query.js';
import type { LlmProviderKind } from './provider.types.js';

@ApiTags('provider')
@Controller('provider')
export class ProviderController {
  constructor(private readonly queryBus: QueryBus) {}

  @ApiOperation({ summary: 'List available LLM models for a provider' })
  @ApiQuery({ name: 'provider', required: false, enum: ['ollama', 'openai-compatible'] })
  @ApiOkResponse({ type: ProviderModelResponseDto, isArray: true })
  @Get('models')
  async listModels(@Query('provider') provider: string | undefined): Promise<ProviderModelDto[]> {
    return this.queryBus.execute(new ListProviderModelsQuery(parseProvider(provider)));
  }
}

function parseProvider(provider: string | undefined): LlmProviderKind | undefined {
  if (provider === undefined) {
    return undefined;
  }

  if (provider === 'ollama' || provider === 'openai-compatible') {
    return provider;
  }

  throw new BadRequestException('Unsupported LLM provider');
}
