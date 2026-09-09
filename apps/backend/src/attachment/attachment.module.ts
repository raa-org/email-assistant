/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

import { Global, Module } from '@nestjs/common';
import { AttachmentScannerService } from './attachment-scanner.service.js';

// Global so any module that surfaces attachment metadata (mail, summary, future
// download endpoints) can request a scan verdict without re-importing.
@Global()
@Module({
  providers: [AttachmentScannerService],
  exports: [AttachmentScannerService]
})
export class AttachmentModule {}
