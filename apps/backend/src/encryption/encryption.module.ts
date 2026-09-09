/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

import { Global, Module } from '@nestjs/common';
import { EncryptionService } from './encryption.service.js';

// Global so any module needing per-user envelope encryption (auth sessions,
// cached summaries, prompts, settings) can inject EncryptionService without
// re-importing this module.
@Global()
@Module({
  providers: [EncryptionService],
  exports: [EncryptionService]
})
export class EncryptionModule {}
