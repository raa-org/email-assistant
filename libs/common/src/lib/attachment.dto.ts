/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

// Verdict reported by attachment scanners. 'unknown' indicates no scan ran or
// the scanner is unavailable — the client must surface this to the user
// rather than treat as 'clean'.
export type AttachmentScanVerdict = 'clean' | 'suspicious' | 'malicious' | 'unknown';

export interface AttachmentMetadataDto {
  partId: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  scanVerdict: AttachmentScanVerdict;
}
