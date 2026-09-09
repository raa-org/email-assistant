/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

import type { ProviderModelDto } from '@raa/assistant/common'
import { BaseLlmProviderAdapter } from './base-llm-provider.adapter.js'
import type { LlmProviderAdapterConfig } from './base-llm-provider.adapter.js'
import type { LlmCompleteRequest, LlmCompleteResult, LlmStreamChunk } from '../provider.types.js'

interface OpenAiModelsResponse {
  data?: Array<{
    id?: string
  }>
}

interface OpenAiChatResponse {
  choices?: Array<{
    message?: {
      content?: string | null
    }
  }>
  model?: string
}

interface OpenAiStreamResponse {
  choices?: Array<{
    delta?: {
      content?: string | null
    }
    finish_reason?: string | null
  }>
  model?: string
}

export class OpenAiCompatibleLlmProviderAdapter extends BaseLlmProviderAdapter {
  private readonly ollamaPassthrough: boolean

  constructor(config: LlmProviderAdapterConfig) {
    super(config)
    this.ollamaPassthrough = config.ollamaPassthrough ?? false
  }

  async listModels(): Promise<ProviderModelDto[]> {
    const payload = await this.fetchJson<OpenAiModelsResponse>('v1/models')

    return (payload?.data ?? [])
      .map((model) => model.id)
      .filter((id): id is string => typeof id === 'string' && id.length > 0)
      .map((id) => ({
        id,
        label: id,
        provider: this.provider,
        streaming: true,
      }))
  }

  async complete(request: LlmCompleteRequest): Promise<LlmCompleteResult> {
    const model = this.resolveModel(request.model)
    const payload = await this.fetchJson<OpenAiChatResponse>('v1/chat/completions', {
      method: 'POST',
      body: JSON.stringify({
        model,
        messages: request.messages,
        stream: false,
        response_format: request.json ? { type: 'json_object' } : undefined,
        temperature: request.parameters?.temperature,
        top_p: request.parameters?.topP,
        max_tokens: request.parameters?.maxTokens,
        seed: request.parameters?.seed,
        ...this.buildOllamaExtras(request),
      }),
      headers: {
        'content-type': 'application/json',
      },
    })

    return {
      content: payload.choices?.[0]?.message?.content ?? '',
      model: payload.model ?? model,
      provider: this.provider,
    }
  }

  async *streamComplete(request: LlmCompleteRequest): AsyncIterable<LlmStreamChunk> {
    const model = this.resolveModel(request.model)
    const response = await this.fetch('v1/chat/completions', {
      method: 'POST',
      body: JSON.stringify({
        model,
        messages: request.messages,
        stream: true,
        response_format: request.json ? { type: 'json_object' } : undefined,
        temperature: request.parameters?.temperature,
        top_p: request.parameters?.topP,
        max_tokens: request.parameters?.maxTokens,
        seed: request.parameters?.seed,
        ...this.buildOllamaExtras(request),
      }),
      headers: {
        'content-type': 'application/json',
      },
    })

    await this.assertOk(response)

    for await (const payload of readServerSentEvents(response)) {
      yield {
        content: payload.choices?.[0]?.delta?.content ?? '',
        done: payload.choices?.[0]?.finish_reason !== null && payload.choices?.[0]?.finish_reason !== undefined,
        model: payload.model ?? model,
        provider: this.provider,
      }
    }
  }

  private buildOllamaExtras(request: LlmCompleteRequest): Record<string, unknown> {
    if (!this.ollamaPassthrough) {
      return {}
    }

    return {
      keep_alive: '1h',
      options: {
        num_ctx: computeContextSize(request.messages),
        repeat_penalty: 1.1,
      },
    }
  }
}

function computeContextSize(messages: LlmCompleteRequest['messages']): number {
  const totalChars = messages.reduce((sum, msg) => sum + msg.content.length, 0)
  // ~3.5 chars per token is a reasonable heuristic for mixed-language content
  const estimatedTokens = Math.ceil(totalChars / 3.5)
  const systemPromptReserve = 500
  const responseReserve = 1000
  const total = estimatedTokens + systemPromptReserve + responseReserve

  if (total < 4096) return 4096
  if (total < 8192) return 8192
  if (total < 16384) return 16384
  return 32768
}

async function* readServerSentEvents(response: Response): AsyncIterable<OpenAiStreamResponse> {
  const reader = response.body?.getReader()

  if (!reader) {
    return
  }

  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()

    if (done) {
      break
    }

    buffer += decoder.decode(value, { stream: true })
    const events = buffer.split(/\r?\n\r?\n/)
    buffer = events.pop() ?? ''

    for (const event of events) {
      const data = event
        .split(/\r?\n/)
        .find((line) => line.startsWith('data:'))
        ?.slice('data:'.length)
        .trim()

      if (!data || data === '[DONE]') {
        continue
      }

      yield JSON.parse(data) as OpenAiStreamResponse
    }
  }
}
