/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

const DEFAULT_FRONTEND_PORT = '3000';
const DEFAULT_BACKEND_PORT = '3001';

export function getAppBaseUrl(): string {
  return process.env.APP_BASE_URL ?? `http://localhost:${process.env.FRONTEND_PORT ?? DEFAULT_FRONTEND_PORT}`;
}

// Server-only: direct loopback URL to the colocated backend, bypassing the
// public reverse proxy. Used for SSR/RSC fetches where the public origin may
// be unreachable from the Next.js process (e.g. local dev without a proxy).
export function getInternalBackendUrl(): string {
  const port = process.env.BACKEND_PORT ?? DEFAULT_BACKEND_PORT;

  return `http://localhost:${port}`;
}

export function getAuthCookieName(): string {
  return process.env.AUTH_COOKIE_NAME ?? 'raa_assistant_session';
}
