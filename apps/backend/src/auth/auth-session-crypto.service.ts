/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { EncryptionService } from '../encryption/encryption.service.js';
import type { EncryptedPayload } from '../encryption/encryption.types.js';

type TokenField = 'access-token' | 'refresh-token' | 'id-token';

// Adapter over EncryptionService for OIDC session tokens. Handles two things
// the storage layer needs but the generic crypto API does not own:
//   1. domain separation per token field via HKDF info ('auth-session:${field}')
//   2. JSON envelope on top of EncryptedPayload so each ciphertext column
//      stores a single string
@Injectable()
export class AuthSessionCryptoService {
  constructor(private readonly encryptionService: EncryptionService) {}

  encrypt(userId: string, field: TokenField, plaintext: string): string {
    const payload = this.encryptionService.encrypt(userId, plaintext, contextFor(field));

    return JSON.stringify(payload);
  }

  decrypt(userId: string, field: TokenField, payload: string): string {
    try {
      const parsed = JSON.parse(payload) as Partial<EncryptedPayload>;

      if (
        typeof parsed.ciphertext !== 'string' ||
        typeof parsed.iv !== 'string' ||
        typeof parsed.tag !== 'string'
      ) {
        throw new Error('Invalid encrypted payload');
      }

      return this.encryptionService.decrypt(
        userId,
        { ciphertext: parsed.ciphertext, iv: parsed.iv, tag: parsed.tag },
        contextFor(field)
      );
    } catch {
      throw new UnauthorizedException('Stored auth session token can not be decrypted');
    }
  }
}

function contextFor(field: TokenField): string {
  return `auth-session:${field}`;
}
