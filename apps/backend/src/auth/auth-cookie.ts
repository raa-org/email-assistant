/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

import type { AppEnv } from '../config/env.js';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export const AUTH_STATE_COOKIE_NAME = 'raa_assistant_auth_state';
export const OIDC_ID_TOKEN_COOKIE_NAME = 'raa_assistant_oidc_id_token';

export interface CookieOptions {
  domain?: string;
  httpOnly?: boolean;
  maxAge?: number;
  path?: string;
  sameSite?: 'lax' | 'strict' | 'none';
  secure?: boolean;
}

export function buildSessionCookieOptions(env: AppEnv): CookieOptions {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: shouldUseSecureCookies(env),
    path: '/',
    domain: env.authCookieDomain,
    maxAge: THIRTY_DAYS_MS
  };
}

export function buildStateCookieOptions(env: AppEnv): CookieOptions {
  return {
    ...buildSessionCookieOptions(env),
    maxAge: 10 * 60 * 1000
  };
}

export function parseCookieHeader(header: string | undefined): Record<string, string> {
  if (!header) {
    return {};
  }

  return header
    .split(';')
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .reduce<Record<string, string>>((cookies, part) => {
      const separatorIndex = part.indexOf('=');

      if (separatorIndex === -1) {
        return cookies;
      }

      const name = part.slice(0, separatorIndex).trim();
      const value = part.slice(separatorIndex + 1).trim();

      cookies[name] = decodeURIComponent(value);

      return cookies;
    }, {});
}

function shouldUseSecureCookies(env: AppEnv): boolean {
  const baseUrl = env.appBaseUrl;

  if (!baseUrl) {
    return false;
  }

  return new URL(baseUrl).protocol === 'https:';
}
