/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

export type LlmProviderId = 'ollama' | 'openai-compatible';

export interface ProviderModelDto {
  id: string;
  label: string;
  provider: LlmProviderId;
  streaming: boolean;
}
