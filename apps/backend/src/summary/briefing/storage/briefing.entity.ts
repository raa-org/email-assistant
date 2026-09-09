/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity({ name: 'briefings' })
@Index('IDX_briefings_user_generated', ['userId', 'generatedAt'])
export class BriefingEntity {
  @PrimaryColumn({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @PrimaryColumn({ name: 'folder', type: 'varchar', length: 255 })
  folder!: string;

  @PrimaryColumn({ name: 'kind', type: 'varchar', length: 16 })
  kind!: string;

  @PrimaryColumn({ name: 'date_from', type: 'varchar', length: 10, default: '_' })
  dateFrom!: string;

  @PrimaryColumn({ name: 'date_to', type: 'varchar', length: 10, default: '_' })
  dateTo!: string;

  @PrimaryColumn({ name: 'type', type: 'varchar', length: 16 })
  type!: string;

  @Column({ name: 'message_count', type: 'int' })
  messageCount!: number;

  @Column({ name: 'uids_hash', type: 'varchar', length: 64 })
  uidsHash!: string;

  @Column({ name: 'llm_params_hash', type: 'varchar', length: 64, default: '' })
  llmParamsHash!: string;

  @Column({ name: 'payload_encrypted', type: 'text' })
  payloadEncrypted!: string;

  @Column({ name: 'llm_model', type: 'varchar', length: 128 })
  llmModel!: string;

  @Column({ name: 'llm_provider', type: 'varchar', length: 32 })
  llmProvider!: string;

  @Column({ name: 'generated_at', type: 'timestamptz' })
  generatedAt!: Date;
}
