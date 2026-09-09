/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

import type {
  DigestBlockDto,
  DigestBlockId,
  SentReceivedDayDto,
  TopContactDto
} from '@raa/assistant/common';
import { createAction } from 'typesafe-actions';
import type { DigestPreset } from '../bootstrap/bootstrap-data';

// Digest content is always "all unread" — no client-side time bound. Stats
// blocks use a server-side env-driven window. The folder is the only knob.
export interface DigestStreamRequest {
  folder: string;
}

export interface DigestStatsPayload {
  totalProcessed: number;
  generatedAt: string;
}

export interface DigestBlockPayload {
  blockId: DigestBlockId;
  block: DigestBlockDto;
}

export const digestActions = {
  // Legacy presets — kept for the period selector wiring even though presets
  // are informational only after the SSE pipeline is in place.
  hydratePresets: createAction('digest/hydrate-presets')<DigestPreset[]>(),
  selectPreset: createAction('digest/select-preset')<string>(),

  // Reset stream state (used when enrichment starts before digest)
  reset: createAction('digest/reset')(),

  // SSE lifecycle
  requestStream: createAction('digest/stream/request')<DigestStreamRequest>(),
  statsReceived: createAction('digest/stream/stats')<DigestStatsPayload>(),
  blockReceived: createAction('digest/stream/block')<DigestBlockPayload>(),
  contactsReceived: createAction('digest/stream/contacts')<TopContactDto[]>(),
  chartReceived: createAction('digest/stream/chart')<SentReceivedDayDto[]>(),
  streamComplete: createAction('digest/stream/complete')(),
  streamFailure: createAction('digest/stream/failure')<{ message: string }>()
};
