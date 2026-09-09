/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

import type { LlmProviderKind } from '../provider.types.js';

export class ListProviderModelsQuery {
  constructor(public readonly provider?: LlmProviderKind) {}
}
