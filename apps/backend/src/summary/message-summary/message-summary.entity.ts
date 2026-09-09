/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

// Per-user, per-message store for LLM-generated summaries. The payload
// (title/summary/action items/categories/etc.) is encrypted via the per-user
// EncryptionService with context 'message-summary'. Cache validity is
// determined by (body_hash, llm_model, llm_provider) — any change there
// invalidates the row and a fresh LLM call is performed by the caller.
@Entity({ name: 'message_summaries' })
@Index('IDX_message_summaries_user_generated_at', ['userId', 'generatedAt'])
export class MessageSummaryEntity {
  @PrimaryColumn({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @PrimaryColumn({ name: 'folder', type: 'varchar', length: 255 })
  folder!: string;

  @PrimaryColumn({ name: 'message_uid', type: 'varchar', length: 64 })
  messageUid!: string;

  @Column({ name: 'body_hash', type: 'varchar', length: 64 })
  bodyHash!: string;

  @Column({ name: 'payload_encrypted', type: 'text' })
  payloadEncrypted!: string;

  @Column({ name: 'prompt_version', type: 'varchar', length: 8, default: '1' })
  promptVersion!: string;

  @Column({ name: 'llm_model', type: 'varchar', length: 128 })
  llmModel!: string;

  @Column({ name: 'llm_provider', type: 'varchar', length: 32 })
  llmProvider!: string;

  @Column({ name: 'generated_at', type: 'timestamptz' })
  generatedAt!: Date;
}
