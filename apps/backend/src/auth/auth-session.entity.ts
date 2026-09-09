/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn
} from 'typeorm';

@Entity({ name: 'auth_sessions' })
@Index('IDX_auth_sessions_user_id', ['userId'])
@Index('IDX_auth_sessions_oidc_subject', ['oidcSubject'])
export class AuthSessionEntity {
  @PrimaryColumn({ type: 'uuid' })
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ name: 'oidc_subject', type: 'varchar', length: 255 })
  oidcSubject!: string;

  @Column({ name: 'access_token_encrypted', type: 'text' })
  accessTokenEncrypted!: string;

  @Column({ name: 'refresh_token_encrypted', type: 'text' })
  refreshTokenEncrypted!: string;

  @Column({ name: 'id_token_encrypted', type: 'text', nullable: true })
  idTokenEncrypted!: string | null;

  @Column({ name: 'access_token_expires_at', type: 'timestamptz' })
  accessTokenExpiresAt!: Date;

  @Column({ name: 'refresh_token_expires_at', type: 'timestamptz', nullable: true })
  refreshTokenExpiresAt!: Date | null;

  @Column({ name: 'last_used_at', type: 'timestamptz' })
  lastUsedAt!: Date;

  @Column({ name: 'last_refreshed_at', type: 'timestamptz' })
  lastRefreshedAt!: Date;

  @Column({ name: 'revoked_at', type: 'timestamptz', nullable: true })
  revokedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
