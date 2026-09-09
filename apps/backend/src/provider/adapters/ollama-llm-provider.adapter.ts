/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

import type { ProviderModelDto } from '@raa/assistant/common';
import { BaseLlmProviderAdapter } from './base-llm-provider.adapter.js';
import type { LlmProviderAdapterConfig } from './base-llm-provider.adapter.js';
import type { LlmCompleteRequest, LlmCompleteResult, LlmStreamChunk } from '../provider.types.js';

interface OllamaTagsResponse {
  models?: Array<{
    model?: string;
    name?: string;
  }>;
}

interface OllamaChatResponse {
  message?: {
    content?: string;
  };
  model?: string;
}

export class OllamaLlmProviderAdapter extends BaseLlmProviderAdapter {
  constructor(config: LlmProviderAdapterConfig) {
    super(config);
  }

  async listModels(): Promise<ProviderModelDto[]> {
    const payload = await this.fetchJson<OllamaTagsResponse>('api/tags');

    return (payload?.models ?? [])
      .map((model) => model.model ?? model.name)
      .filter((id): id is string => typeof id === 'string' && id.length > 0)
      .map((id) => ({
        id,
        label: id,
        provider: this.provider,
        streaming: true
      }));
  }

  async complete(request: LlmCompleteRequest): Promise<LlmCompleteResult> {
    const model = this.resolveModel(request.model);
    const payload = await this.fetchJson<OllamaChatResponse>('api/chat', {
      method: 'POST',
      body: JSON.stringify({
        model,
        messages: request.messages,
        stream: false,
        format: request.json ? 'json' : undefined,
        keep_alive: '1h',
        options: buildOllamaOptions(request.parameters, request.messages)
      }),
      headers: {
        'content-type': 'application/json'
      }
    });

    return {
      content: payload.message?.content ?? '',
      model: payload.model ?? model,
      provider: this.provider
    };
  }

  async *streamComplete(request: LlmCompleteRequest): AsyncIterable<LlmStreamChunk> {
    const model = this.resolveModel(request.model);
    const response = await this.fetch('api/chat', {
      method: 'POST',
      body: JSON.stringify({
        model,
        messages: request.messages,
        stream: true,
        format: request.json ? 'json' : undefined,
        keep_alive: '1h',
        options: buildOllamaOptions(request.parameters, request.messages)
      }),
      headers: {
        'content-type': 'application/json'
      }
    });

    await this.assertOk(response);

    for await (const payload of readNdjson<OllamaChatResponse & { done?: boolean }>(response)) {
      yield {
        content: payload.message?.content ?? '',
        done: payload.done === true,
        model: payload.model ?? model,
        provider: this.provider
      };
    }
  }
}

function buildOllamaOptions(parameters: LlmCompleteRequest['parameters'], messages: LlmCompleteRequest['messages']): Record<string, number> {
  const options: Record<string, number> = {
    num_ctx: computeContextSize(messages),
    repeat_penalty: 1.1,
  };

  if (parameters) {
    assignNumber(options, 'temperature', parameters.temperature);
    assignNumber(options, 'top_p', parameters.topP);
    assignNumber(options, 'num_predict', parameters.maxTokens);
    assignNumber(options, 'seed', parameters.seed);
  }

  return options;
}

function computeContextSize(messages: LlmCompleteRequest['messages']): number {
  const totalChars = messages.reduce((sum, msg) => sum + msg.content.length, 0);
  // ~3.5 chars per token is a reasonable heuristic for mixed-language content
  const estimatedTokens = Math.ceil(totalChars / 3.5);
  const systemPromptReserve = 500;
  const responseReserve = 1000;
  const total = estimatedTokens + systemPromptReserve + responseReserve;

  if (total < 4096) return 4096;
  if (total < 8192) return 8192;
  if (total < 16384) return 16384;
  return 32768;
}

function assignNumber(target: Record<string, number>, key: string, value: number | undefined): void {
  if (typeof value === 'number' && Number.isFinite(value)) {
    target[key] = value;
  }
}

async function* readNdjson<T>(response: Response): AsyncIterable<T> {
  const reader = response.body?.getReader();

  if (!reader) {
    return;
  }

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      if (line.trim().length > 0) {
        yield JSON.parse(line) as T;
      }
    }
  }

  const finalLine = buffer.trim();

  if (finalLine.length > 0) {
    yield JSON.parse(finalLine) as T;
  }
}
