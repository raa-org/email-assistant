/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

import type { MailMessageDetailDto, MailMessageDto, SummaryResultDto } from '@raa/assistant/common';
import { ActionType, createReducer } from 'typesafe-actions';
import { inboxActions, type InboxTab } from './actions';

export interface InboxState {
  activeTab: InboxTab;
  showNewOnly: boolean;
  searchQuery: string;
  messages: MailMessageDto[];
  loading: boolean;
  error: string | null;
  folderTotal: number;
  folderUnread: number;
  // Detail panel
  selectedUid: string | null;
  selectedFolder: string | null;
  messageDetail: MailMessageDetailDto | null;
  messageDetailLoading: boolean;
  summary: SummaryResultDto | null;
  summaryLoading: boolean;
  summaryStreamingText: string;
}

const initialState: InboxState = {
  activeTab: 'all',
  showNewOnly: false,
  searchQuery: '',
  messages: [],
  loading: false,
  error: null,
  folderTotal: 0,
  folderUnread: 0,
  selectedUid: null,
  selectedFolder: null,
  messageDetail: null,
  messageDetailLoading: false,
  summary: null,
  summaryLoading: false,
  summaryStreamingText: ''
};

type InboxAction = ActionType<typeof inboxActions>;

export const inboxReducer = createReducer<InboxState, InboxAction>(initialState)
  .handleAction(inboxActions.setActiveTab, (state, action) => ({
    ...state,
    activeTab: action.payload
  }))
  .handleAction(inboxActions.setShowNewOnly, (state, action) => ({
    ...state,
    showNewOnly: action.payload
  }))
  .handleAction(inboxActions.setSearchQuery, (state, action) => ({
    ...state,
    searchQuery: action.payload
  }))
  .handleAction(inboxActions.requestMessages, (state) => ({
    ...state,
    loading: true,
    error: null
  }))
  .handleAction(inboxActions.messagesLoaded, (state, action) => ({
    ...state,
    messages: action.payload,
    loading: false,
    error: null
  }))
  .handleAction(inboxActions.messagesFailed, (state, action) => ({
    ...state,
    loading: false,
    error: action.payload.message
  }))
  .handleAction(inboxActions.folderStatsLoaded, (state, action) => ({
    ...state,
    folderTotal: action.payload.total,
    folderUnread: action.payload.unread
  }))
  .handleAction(inboxActions.selectMessage, (state, action) => ({
    ...state,
    selectedUid: action.payload.uid,
    selectedFolder: action.payload.folder,
    messageDetail: null,
    messageDetailLoading: true,
    summary: null,
    summaryLoading: true
  }))
  .handleAction(inboxActions.closeMessage, (state) => ({
    ...state,
    selectedUid: null,
    selectedFolder: null,
    messageDetail: null,
    messageDetailLoading: false,
    summary: null,
    summaryLoading: false
  }))
  .handleAction(inboxActions.messageDetailLoaded, (state, action) => ({
    ...state,
    messageDetail: action.payload,
    messageDetailLoading: false
  }))
  .handleAction(inboxActions.messageDetailFailed, (state) => ({
    ...state,
    messageDetailLoading: false
  }))
  .handleAction(inboxActions.summaryLoading, (state) => ({
    ...state,
    summaryLoading: true,
    summary: null,
    summaryStreamingText: ''
  }))
  .handleAction(inboxActions.summaryChunk, (state, action) => ({
    ...state,
    summaryStreamingText: action.payload.accumulated
  }))
  .handleAction(inboxActions.summaryLoaded, (state, action) => ({
    ...state,
    summary: action.payload,
    summaryLoading: false,
    summaryStreamingText: ''
  }))
  .handleAction(inboxActions.summaryFailed, (state) => ({
    ...state,
    summaryLoading: false
  }))
  .handleAction(inboxActions.requestResummarize, (state) => ({
    ...state,
    summaryLoading: true,
    summary: null
  }))
  .handleAction(inboxActions.markReadSuccess, (state, action) => ({
    ...state,
    messages: state.messages.map((m) =>
      action.payload.uids.includes(m.uid) ? { ...m, isUnread: false } : m
    )
  }));
