/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

import { Injectable, Logger, NotImplementedException } from '@nestjs/common';
import type { AttachmentScanInput, AttachmentScanResult } from './attachment.types.js';

// Architectural seam for future attachment scanning (anti-virus, anti-phishing,
// social-engineering heuristics). Phase 1 provides the interface and a Not
// Implemented body so callers compile against the real signature; the actual
// scanners will be plugged in via overrideable providers in a later phase.
//
// IMPORTANT: this service is NOT auto-invoked from MailReadService — message
// listings simply expose attachment metadata with scanVerdict='unknown'. The
// scanner gets called when a future workflow (download + display, attachment
// open, etc.) actually needs a verdict.
@Injectable()
export class AttachmentScannerService {
  private readonly logger = new Logger(AttachmentScannerService.name);

  async scan(input: AttachmentScanInput): Promise<AttachmentScanResult> {
    this.logger.warn(
      `Attachment scan requested for ${input.filename} (${input.sizeBytes} bytes, ${input.contentType}) — scanner is not implemented in this phase`
    );

    throw new NotImplementedException(
      'Attachment scanning will be implemented in a later phase. Until then, expose scanVerdict=\'unknown\' in metadata.'
    );
  }
}
