/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

import type { LlmProviderId } from './provider.dto.js';

export interface LlmGenerationParametersDto {
  maxTokens?: number;
  seed?: number;
  temperature?: number;
  topP?: number;
}

export interface LlmRequestOptionsDto {
  model?: string;
  parameters?: LlmGenerationParametersDto;
  provider?: LlmProviderId;
}

export interface MessageSummaryRequestDto {
  uid: string;
  folder: string;
  llm?: LlmRequestOptionsDto;
}

export interface BatchSummaryRequestDto {
  folder: string;
  limit?: number;
  llm?: LlmRequestOptionsDto;
}

// Categories used to bucket emails into digest blocks. A single message can
// be assigned multiple categories (e.g. an invoice that is also critical).
// Aggregator decides which block(s) the message ends up in.
export type SummaryCategory =
  | 'critical'
  | 'suspicious'
  | 'invoice'
  | 'meeting'
  | 'junk'
  | 'important'
  | 'new'
  | 'received'
  | 'requires_attention';

export type SummaryPriority = 'high' | 'normal' | 'low';

export type SummaryUrgency = 'critical' | 'high' | 'normal' | 'low';

export interface SummarySignals {
  hasAttachment: boolean;
  potentialPhishing: boolean;
  isInvoice: boolean;
  isMeetingInvite: boolean;
}

export interface SummaryResultDto {
  title: string;
  summary: string;
  actionItems: string[];
  questions: string[];
  deadlines: string[];
  categories: SummaryCategory[];
  priority: SummaryPriority;
  signals: SummarySignals;

  // L1 enrichment fields (optional for backward compatibility with cached payloads)
  priorityScore?: number;          // 0–100, absolute anchored scale
  urgency?: SummaryUrgency;
  isJunk?: boolean;
  isAutomated?: boolean;
  actionRequired?: boolean;
  agendaItem?: string | null;      // short imperative phrase if actionRequired, else null
  deadline?: string | null;        // ISO date if detected
}
