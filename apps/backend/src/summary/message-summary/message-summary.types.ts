/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

import type { SummaryResultDto } from '@raa/assistant/common';

export interface StoredMessageSummary {
  payload: SummaryResultDto;
  generatedAt: Date;
  promptVersion: string;
  llmModel: string;
  llmProvider: string;
}
