/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

import { BadGatewayException } from '@nestjs/common';
import type { ProviderModelDto } from '@raa/assistant/common';
import type { LlmCompleteRequest, LlmCompleteResult, LlmProviderAdapter, LlmProviderKind, LlmStreamChunk } from '../provider.types.js';

export interface LlmProviderAdapterConfig {
  apiKey?: string;
  baseUrl: string;
  defaultModel: string;
  provider: LlmProviderKind;
  timeoutMs: number;
  ollamaPassthrough?: boolean;
}

export abstract class BaseLlmProviderAdapter implements LlmProviderAdapter {
  readonly provider: LlmProviderKind;
  protected readonly baseUrl: URL;
  protected readonly defaultModel: string;
  private readonly apiKey?: string;
  private readonly timeoutMs: number;

  protected constructor(config: LlmProviderAdapterConfig) {
    this.provider = config.provider;
    this.baseUrl = new URL(config.baseUrl);
    this.defaultModel = config.defaultModel;
    this.apiKey = config.apiKey;
    this.timeoutMs = config.timeoutMs;
  }

  abstract complete(request: LlmCompleteRequest): Promise<LlmCompleteResult>;
  abstract listModels(): Promise<ProviderModelDto[]>;
  abstract streamComplete(request: LlmCompleteRequest): AsyncIterable<LlmStreamChunk>;

  protected resolveModel(model: string | undefined): string {
    return model?.trim() || this.defaultModel;
  }

  protected buildUrl(path: string): URL {
    return new URL(path, this.baseUrl);
  }

  protected async fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await this.fetch(path, init);
    const payload = await response.json().catch(() => undefined);

    if (!response.ok) {
      throw new BadGatewayException(`${this.provider} request failed with status ${response.status}`);
    }

    return payload as T;
  }

  protected async fetch(path: string, init?: RequestInit): Promise<Response> {
    try {
      return await fetch(this.buildUrl(path), {
        ...init,
        headers: {
          accept: 'application/json',
          ...this.buildAuthHeaders(),
          ...init?.headers
        },
        signal: init?.signal ?? AbortSignal.timeout(this.timeoutMs)
      });
    } catch (error) {
      if (error instanceof BadGatewayException) {
        throw error;
      }

      throw new BadGatewayException(`${this.provider} provider is unavailable`);
    }
  }

  protected async assertOk(response: Response): Promise<void> {
    if (!response.ok) {
      throw new BadGatewayException(`${this.provider} request failed with status ${response.status}`);
    }
  }

  private buildAuthHeaders(): HeadersInit {
    if (!this.apiKey) {
      return {};
    }

    return {
      authorization: `Bearer ${this.apiKey}`
    };
  }
}
