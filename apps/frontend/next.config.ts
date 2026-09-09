/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { NextConfig } from 'next'

const frontendRoot = dirname(fileURLToPath(import.meta.url))

const nextConfig: NextConfig = {
  output: 'standalone',
  allowedDevOrigins: ['raa-assistant.local'],
  turbopack: {
    root: resolve(frontendRoot, '../..'),
  },
}

export default nextConfig
