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
import { ActionType, createReducer } from 'typesafe-actions';
import { digestActions } from './actions';
import type { DigestPreset } from '../bootstrap/bootstrap-data';

export type DigestStreamStatus = 'idle' | 'streaming' | 'ready' | 'error';

export interface DigestStreamState {
  totalProcessed: number;
  generatedAt: string | null;
  blocks: Partial<Record<DigestBlockId, DigestBlockDto>>;
  contacts: TopContactDto[];
  chart: SentReceivedDayDto[];
  status: DigestStreamStatus;
  error: string | null;
}

export interface DigestState {
  presets: DigestPreset[];
  selectedPreset: string | null;
  stream: DigestStreamState;
}

const initialStream: DigestStreamState = {
  totalProcessed: 0,
  generatedAt: null,
  blocks: {},
  contacts: [],
  chart: [],
  status: 'idle',
  error: null
};

const initialState: DigestState = {
  presets: [],
  selectedPreset: null,
  stream: initialStream
};

type DigestAction = ActionType<typeof digestActions>;

export const digestReducer = createReducer<DigestState, DigestAction>(initialState)
  .handleAction(digestActions.hydratePresets, (state, action) => ({
    ...state,
    presets: action.payload,
    selectedPreset: state.selectedPreset ?? action.payload[0]?.name ?? null
  }))
  .handleAction(digestActions.selectPreset, (state, action) => ({
    ...state,
    selectedPreset: action.payload
  }))
  .handleAction(digestActions.reset, (state) => ({
    ...state,
    stream: initialStream
  }))
  .handleAction(digestActions.requestStream, (state) => ({
    ...state,
    stream: {
      ...initialStream,
      status: 'streaming'
    }
  }))
  .handleAction(digestActions.statsReceived, (state, action) => ({
    ...state,
    stream: {
      ...state.stream,
      totalProcessed: action.payload.totalProcessed,
      generatedAt: action.payload.generatedAt
    }
  }))
  .handleAction(digestActions.blockReceived, (state, action) => ({
    ...state,
    stream: {
      ...state.stream,
      blocks: {
        ...state.stream.blocks,
        [action.payload.blockId]: action.payload.block
      }
    }
  }))
  .handleAction(digestActions.contactsReceived, (state, action) => ({
    ...state,
    stream: {
      ...state.stream,
      contacts: action.payload
    }
  }))
  .handleAction(digestActions.chartReceived, (state, action) => ({
    ...state,
    stream: {
      ...state.stream,
      chart: action.payload
    }
  }))
  .handleAction(digestActions.streamComplete, (state) => ({
    ...state,
    stream: {
      ...state.stream,
      status: 'ready'
    }
  }))
  .handleAction(digestActions.streamFailure, (state, action) => ({
    ...state,
    stream: {
      ...state.stream,
      status: 'error',
      error: action.payload.message
    }
  }));
