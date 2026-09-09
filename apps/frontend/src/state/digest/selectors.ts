/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

import type { DigestBlockDto, DigestBlockId } from '@raa/assistant/common';
import { createSelector } from 'reselect';
import type { RootState } from '../root-state';

const selectDigestState = (state: RootState) => state.digest;
const selectStream = createSelector(selectDigestState, (digest) => digest.stream);

export const selectDigestPresets = createSelector(selectDigestState, (digest) => digest.presets);
export const selectSelectedPreset = createSelector(selectDigestState, (digest) => digest.selectedPreset);

export const selectDigestStatus = createSelector(selectStream, (stream) => stream.status);
export const selectDigestError = createSelector(selectStream, (stream) => stream.error);
export const selectDigestGeneratedAt = createSelector(selectStream, (stream) => stream.generatedAt);
export const selectDigestTotalProcessed = createSelector(selectStream, (stream) => stream.totalProcessed);

export const selectDigestBlock = (blockId: DigestBlockId) =>
  createSelector(selectStream, (stream): DigestBlockDto | undefined => stream.blocks[blockId]);

export const selectDigestBlockCount = (blockId: DigestBlockId) =>
  createSelector(selectDigestBlock(blockId), (block) => block?.count ?? 0);

export const selectTopContacts = createSelector(selectStream, (stream) => stream.contacts);
export const selectSentReceivedSeries = createSelector(selectStream, (stream) => stream.chart);

// Convenience composite — `true` while we are still waiting for the SSE
// pipeline to finish so UI can keep skeletons visible.
export const selectDigestStreaming = createSelector(
  selectDigestStatus,
  (status) => status === 'streaming' || status === 'idle'
);
