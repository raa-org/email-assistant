/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

import type { LlmGenerationParametersDto, LlmProviderId, ProviderModelDto } from '@raa/assistant/common';

export type LlmProviderKind = LlmProviderId;

export type LlmChatRole = 'assistant' | 'system' | 'user';

export interface LlmChatMessage {
  content: string;
  role: LlmChatRole;
}

export interface LlmRequestOptions {
  model?: string;
  parameters?: LlmGenerationParametersDto;
  provider?: LlmProviderKind;
}

export interface LlmCompleteRequest extends LlmRequestOptions {
  json?: boolean;
  messages: LlmChatMessage[];
}

export interface LlmCompleteResult {
  content: string;
  model: string;
  provider: LlmProviderKind;
}

export interface LlmStreamChunk {
  content: string;
  done: boolean;
  model: string;
  provider: LlmProviderKind;
}

export interface LlmProviderAdapter {
  readonly provider: LlmProviderKind;
  complete(request: LlmCompleteRequest): Promise<LlmCompleteResult>;
  listModels(): Promise<ProviderModelDto[]>;
  streamComplete(request: LlmCompleteRequest): AsyncIterable<LlmStreamChunk>;
}
