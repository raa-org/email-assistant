/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { SignJWT } from 'jose';
import type { AppEnv } from '../src/config/env.js';
import { AuthTokenService } from '../src/auth/auth-token.service.js';

function createEnv(overrides: Partial<AppEnv> = {}): AppEnv {
  return {
    frontendHost: '0.0.0.0',
    frontendPort: 3000,
    backendHost: '0.0.0.0',
    backendPort: 3001,
    encryptionMasterSecret: 'test-master-secret',
    imapHost: 'mail.corp.example.com',
    imapPort: 993,
    imapTls: true,
    databaseUrl: 'postgres://localhost/raa',
    redisUrl: 'redis://localhost:6379',
    llmDefaultProvider: 'ollama',
    llmRequestTimeoutMs: 60_000,
    llmProviders: {
      ollama: {
        baseUrl: 'http://llm.internal',
        apiKey: undefined,
        defaultModel: 'summarizer',
        defaultParameters: {}
      },
      'openai-compatible': {
        baseUrl: undefined,
        apiKey: undefined,
        defaultModel: undefined,
        defaultParameters: {}
      }
    },
    jwtSecret: 'test-secret',
    oidcIssuer: 'https://sso.example.com/realms/raa',
    oidcClientId: 'raa-assistant',
    oidcClientSecret: 'secret',
    oidcRedirectUri: 'http://localhost:3000/api/auth/callback',
    authCookieName: 'raa_assistant_session',
    authCookieDomain: undefined,
    appBaseUrl: 'http://localhost:3000',
    digestStatsWindowDays: 7,
    ...overrides
  };
}

function createService(envOverrides: Partial<AppEnv> = {}): AuthTokenService {
  return new AuthTokenService(createEnv(envOverrides));
}

async function signToken(
  claims: Record<string, string>,
  envOverrides: Partial<AppEnv> = {},
  options: { audience?: string; expirationTime?: number; issuer?: string } = {}
): Promise<string> {
  const env = createEnv(envOverrides);
  const secret = new TextEncoder().encode(env.jwtSecret);
  const now = Math.floor(Date.now() / 1000);

  return new SignJWT(claims)
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuer(options.issuer ?? (env.appBaseUrl ?? `http://localhost:${env.frontendPort}`))
    .setAudience(options.audience ?? 'raa-assistant')
    .setIssuedAt(now - 60)
    .setExpirationTime(options.expirationTime ?? now + 300)
    .sign(secret);
}

test('AuthTokenService issues and verifies session tokens', async () => {
  const service = createService();
  const token = await service.issueSessionToken({
    id: 'app-user-1',
    oidcSubject: 'oidc-user-1',
    email: 'user@example.com',
    displayName: 'User Example'
  }, 'auth-session-1');

  const claims = await service.verifySessionToken(token);

  assert.equal(claims.id, 'app-user-1');
  assert.equal(claims.oidcSubject, 'oidc-user-1');
  assert.equal(claims.email, 'user@example.com');
  assert.equal(claims.displayName, 'User Example');
  assert.equal(claims.sessionId, 'auth-session-1');
  assert.equal(claims.aud, 'raa-assistant');
});

test('AuthTokenService rejects expired tokens', async () => {
  const service = createService();
  const now = Math.floor(Date.now() / 1000);
  const token = await signToken(
    {
      sub: 'app-user-1',
      oidcSubject: 'oidc-user-1',
      email: 'user@example.com',
      displayName: 'User Example',
      sessionId: 'auth-session-1'
    },
    {},
    { expirationTime: now - 10 }
  );

  await assert.rejects(() => service.verifySessionToken(token), /Invalid or expired token/);
});

test('AuthTokenService rejects wrong audience', async () => {
  const service = createService();
  const token = await signToken(
    {
      sub: 'app-user-1',
      oidcSubject: 'oidc-user-1',
      email: 'user@example.com',
      displayName: 'User Example',
      sessionId: 'auth-session-1'
    },
    {},
    { audience: 'other-service' }
  );

  await assert.rejects(() => service.verifySessionToken(token), /Invalid or expired token/);
});

test('AuthTokenService rejects wrong issuer', async () => {
  const service = createService();
  const token = await signToken(
    {
      sub: 'app-user-1',
      oidcSubject: 'oidc-user-1',
      email: 'user@example.com',
      displayName: 'User Example',
      sessionId: 'auth-session-1'
    },
    {},
    { issuer: 'https://issuer.example.com' }
  );

  await assert.rejects(() => service.verifySessionToken(token), /Invalid or expired token/);
});

test('AuthTokenService rejects malformed tokens', async () => {
  const service = createService();

  await assert.rejects(() => service.verifySessionToken('not-a-jwt'), /Invalid or expired token/);
});
