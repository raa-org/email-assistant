/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from 'node:crypto';
import type { AppEnv } from '../config/env.js';
import type { EncryptedPayload } from './encryption.types.js';

const HKDF_HASH = 'sha256';
const KEY_LENGTH_BYTES = 32;
const IV_LENGTH_BYTES = 12;
const CIPHER_ALGORITHM = 'aes-256-gcm';

// Per-user envelope encryption: master key from env + per-user HKDF derivation
// produces a deterministic DEK per (userId, context) pair. DEKs are never
// stored — they are recomputed on each call. Callers should pass a non-empty
// `context` to achieve domain separation between unrelated payload kinds (e.g.
// 'auth-session:access-token' vs 'cache:summary'); shared context across
// domains means a key leak compromises every payload that used it.
@Injectable()
export class EncryptionService {
  private readonly masterSecret: Buffer;

  constructor(configService: ConfigService<AppEnv>) {
    this.masterSecret = parseMasterSecret(
      configService.getOrThrow('encryptionMasterSecret', { infer: true })
    );
  }

  encrypt(userId: string, plaintext: string, context: string): EncryptedPayload {
    const key = this.deriveUserKey(userId, context);
    const iv = randomBytes(IV_LENGTH_BYTES);
    const cipher = createCipheriv(CIPHER_ALGORITHM, key, iv);
    const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);

    return {
      ciphertext: ciphertext.toString('base64'),
      iv: iv.toString('base64'),
      tag: cipher.getAuthTag().toString('base64')
    };
  }

  decrypt(userId: string, payload: EncryptedPayload, context: string): string {
    const key = this.deriveUserKey(userId, context);
    const decipher = createDecipheriv(CIPHER_ALGORITHM, key, Buffer.from(payload.iv, 'base64'));

    decipher.setAuthTag(Buffer.from(payload.tag, 'base64'));

    return Buffer.concat([
      decipher.update(Buffer.from(payload.ciphertext, 'base64')),
      decipher.final()
    ]).toString('utf8');
  }

  private deriveUserKey(userId: string, context: string): Buffer {
    return Buffer.from(
      hkdfSync(
        HKDF_HASH,
        this.masterSecret,
        Buffer.from(userId, 'utf8'),
        context,
        KEY_LENGTH_BYTES
      )
    );
  }
}

function parseMasterSecret(value: string): Buffer {
  const normalized = value.trim();

  if (normalized.length >= 32 && normalized.length % 2 === 0 && /^[0-9a-f]+$/i.test(normalized)) {
    return Buffer.from(normalized, 'hex');
  }

  return Buffer.from(normalized, 'utf8');
}
