/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

import { BadGatewayException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ProviderModelDto } from '@raa/assistant/common';
import type { AppEnv, LlmProviderConfig } from '../config/env.js';
import { getAppEnv } from '../config/env.js';
import { OllamaLlmProviderAdapter } from './adapters/ollama-llm-provider.adapter.js';
import { OpenAiCompatibleLlmProviderAdapter } from './adapters/openai-compatible-llm-provider.adapter.js';
import type {
  LlmCompleteRequest,
  LlmCompleteResult,
  LlmProviderAdapter,
  LlmProviderKind,
  LlmRequestOptions,
  LlmStreamChunk
} from './provider.types.js';

@Injectable()
export class LlmProviderRegistryService {
  private readonly adapters: Map<LlmProviderKind, LlmProviderAdapter>;
  private readonly env: AppEnv;

  constructor(configService: ConfigService<AppEnv>) {
    this.env = getAppEnv(configService);
    this.adapters = new Map(this.createAdapters().map((adapter) => [adapter.provider, adapter]));
  }

  async listModels(provider?: LlmProviderKind): Promise<ProviderModelDto[]> {
    if (provider) {
      return this.getAdapter(provider).listModels();
    }

    return this.getDefaultAdapter().listModels();
  }

  async complete(request: LlmCompleteRequest): Promise<LlmCompleteResult> {
    return this.getAdapter(request.provider).complete(request);
  }

  streamComplete(request: LlmCompleteRequest): AsyncIterable<LlmStreamChunk> {
    return this.getAdapter(request.provider).streamComplete(request);
  }

  resolveRequestOptions(options: LlmRequestOptions | undefined): Required<Pick<LlmRequestOptions, 'provider'>> & {
    model: string;
    parameters: LlmRequestOptions['parameters'];
  } {
    const provider = options?.provider ?? this.env.llmDefaultProvider;
    const providerConfig = this.requireProviderConfig(provider);
    const model = options?.model?.trim() || providerConfig.defaultModel;

    if (!model) {
      throw new BadGatewayException(
        `LLM provider ${provider} has no model configured. Set LLM_${prefixFor(provider)}_DEFAULT_MODEL or pass llm.model explicitly.`
      );
    }

    return {
      provider,
      model,
      parameters: mergeParameters(providerConfig, options?.parameters)
    };
  }

  private getDefaultAdapter(): LlmProviderAdapter {
    return this.getAdapter(this.env.llmDefaultProvider);
  }

  private getAdapter(provider = this.env.llmDefaultProvider): LlmProviderAdapter {
    const adapter = this.adapters.get(provider);

    if (!adapter) {
      throw new BadGatewayException(`LLM provider ${provider} is not configured`);
    }

    return adapter;
  }

  private requireProviderConfig(provider: LlmProviderKind): LlmProviderConfig {
    const config = this.env.llmProviders[provider];

    if (!config?.baseUrl) {
      throw new BadGatewayException(`LLM provider ${provider} is not configured`);
    }

    return config;
  }

  private createAdapters(): LlmProviderAdapter[] {
    const adapters: LlmProviderAdapter[] = [];
    const ollama = this.env.llmProviders.ollama;
    const openaiCompatible = this.env.llmProviders['openai-compatible'];

    if (ollama.baseUrl) {
      adapters.push(
        new OllamaLlmProviderAdapter({
          apiKey: ollama.apiKey,
          baseUrl: ollama.baseUrl,
          defaultModel: ollama.defaultModel ?? '',
          provider: 'ollama',
          timeoutMs: this.env.llmRequestTimeoutMs
        })
      );
    }

    if (openaiCompatible.baseUrl) {
      adapters.push(
        new OpenAiCompatibleLlmProviderAdapter({
          apiKey: openaiCompatible.apiKey,
          baseUrl: openaiCompatible.baseUrl,
          defaultModel: openaiCompatible.defaultModel ?? '',
          provider: 'openai-compatible',
          timeoutMs: this.env.llmRequestTimeoutMs,
          ollamaPassthrough: openaiCompatible.ollamaPassthrough
        })
      );
    }

    if (adapters.length === 0) {
      throw new BadGatewayException(
        'No LLM provider is configured. Set at least one of LLM_OLLAMA_BASE_URL or LLM_OPENAI_COMPATIBLE_BASE_URL.'
      );
    }

    return adapters;
  }
}

function mergeParameters(
  providerConfig: LlmProviderConfig,
  override: LlmRequestOptions['parameters']
): LlmRequestOptions['parameters'] {
  const defaults = providerConfig.defaultParameters;
  const merged = {
    temperature: override?.temperature ?? defaults.temperature,
    topP: override?.topP ?? defaults.topP,
    maxTokens: override?.maxTokens ?? defaults.maxTokens,
    seed: override?.seed ?? defaults.seed
  };

  // Drop undefined keys so adapters can rely on object spread without inserting undefined into LLM payloads
  const result: NonNullable<LlmRequestOptions['parameters']> = {};

  for (const [key, value] of Object.entries(merged) as Array<[keyof typeof merged, number | undefined]>) {
    if (value !== undefined) {
      result[key] = value;
    }
  }

  return Object.keys(result).length > 0 ? result : undefined;
}

function prefixFor(provider: LlmProviderKind): string {
  return provider === 'ollama' ? 'OLLAMA' : 'OPENAI_COMPATIBLE';
}
