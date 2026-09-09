/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

// HKDF info / domain-separation context for EncryptionService when encrypting
// per-message summary payloads. Keep distinct from any other encryption
// context (e.g. 'auth-session:*') so a leaked DEK from one domain cannot
// decrypt another.
//
// NOTE: literal value stays 'cache:summary' for backward compatibility — it
// is baked into HKDF info for every encrypted row already in the
// `message_summaries` table; changing the string would orphan all existing
// payloads. Renamed only the symbol.
export const MESSAGE_SUMMARY_ENCRYPTION_CONTEXT = 'cache:summary';
