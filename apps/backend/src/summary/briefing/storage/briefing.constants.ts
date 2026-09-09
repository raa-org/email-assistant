/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

import { createHash } from 'node:crypto';

export const BRIEFING_ENCRYPTION_CONTEXT = 'cache:briefing';

export function computeLlmParamsHash(
  promptVersion: string,
  model: string,
  provider: string,
  parameters?: object
): string {
  return createHash('sha256')
    .update(JSON.stringify({ promptVersion, model, provider, parameters }))
    .digest('hex');
}
