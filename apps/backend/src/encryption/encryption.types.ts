/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

// Encrypted payload as produced by EncryptionService. All fields are
// base64-encoded; iv must be unique per encryption call (never reused).
export interface EncryptedPayload {
  ciphertext: string;
  iv: string;
  tag: string;
}
