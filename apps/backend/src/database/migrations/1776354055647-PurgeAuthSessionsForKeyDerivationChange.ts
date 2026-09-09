/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

import { MigrationInterface, QueryRunner } from 'typeorm';

// Stored auth-session ciphertexts were derived from HKDF(masterSecret,
// sessionId, 'auth-session:${field}'). The encryption layer was switched to
// per-user keys: HKDF(masterSecret, userId, 'auth-session:${field}'). Existing
// rows can no longer be decrypted, so they are purged here — affected users
// will be redirected to /api/auth/login on the next protected request and a
// fresh session row will be created.
export class PurgeAuthSessionsForKeyDerivationChange1776354055647 implements MigrationInterface {
  name = 'PurgeAuthSessionsForKeyDerivationChange1776354055647';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "auth_sessions"`);
  }

  public async down(): Promise<void> {
    // Irreversible: deleted ciphertexts cannot be recreated.
  }
}
