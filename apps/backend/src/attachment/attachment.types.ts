/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

import type { AttachmentScanVerdict } from '@raa/assistant/common';

// Internal scanner contract — kept off the wire because it carries raw bytes.
// Callers extract metadata from IMAP bodyStructure and (when scanning is
// available) feed the downloaded part contents through AttachmentScannerService.
export interface AttachmentScanInput {
  partId: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  contentBase64: string;
}

export interface AttachmentScanResult {
  verdict: AttachmentScanVerdict;
  signals: string[];
}
