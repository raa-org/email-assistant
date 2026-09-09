/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { UnauthorizedException } from '@nestjs/common';
import type { CommandBus } from '@nestjs/cqrs';
import { AUTH_STATE_COOKIE_NAME } from '../src/auth/auth-cookie.js';
import type { AuthSessionService } from '../src/auth/auth-session.service.js';
import { AuthService } from '../src/auth/auth.service.js';
import { AuthTokenService } from '../src/auth/auth-token.service.js';
import type { OidcClientService } from '../src/auth/oidc-client.service.js';
import type { AuthenticatedUser, OidcCallbackParams, OidcLoginResult } from '../src/auth/auth.types.js';
import type { AppEnv } from '../src/config/env.js';
import { EnsureUserFromOidcCommand } from '../src/user/commands/ensure-user-from-oidc.command.js';

class FakeOidcClientService {
  authorizationUrl = 'https://sso.example.com/auth';
  loginResult: OidcLoginResult = {
    accessToken: 'oidc-access-token',
    accessTokenExpiresAt: new Date('2026-04-09T12:15:00.000Z'),
    idToken: 'oidc-id-token',
    refreshToken: 'oidc-refresh-token',
    refreshTokenExpiresAt: new Date('2026-04-10T12:00:00.000Z'),
    userInfo: {
      sub: 'user-1',
      email: 'user@example.com',
      name: 'User Example'
    }
  };

  buildAuthorizationUrlCalls: Array<{ forceLogin: boolean; state: string }> = [];

  async buildAuthorizationUrl(state: string, forceLogin = false): Promise<string> {
    this.buildAuthorizationUrlCalls.push({ state, forceLogin });
    return this.authorizationUrl;
  }

  async buildEndSessionUrl(postLogoutRedirectUri: string): Promise<string> {
    return `https://sso.example.com/logout?post_logout_redirect_uri=${encodeURIComponent(postLogoutRedirectUri)}`;
  }

  async exchangeCodeForUserInfo(): Promise<OidcLoginResult> {
    return this.loginResult;
  }

  generateState(): string {
    return 'generated-state';
  }
}

class FakeAuthSessionService {
  createdSessionId = 'auth-session-1';
  createSessionCalls: Array<{ loginResult: OidcLoginResult; user: AuthenticatedUser }> = [];
  assertedSessions: string[] = [];
  revokedSessions: string[] = [];
  validAccessToken = 'refreshed-access-token';

  async createSession(user: AuthenticatedUser, loginResult: OidcLoginResult): Promise<{ id: string }> {
    this.createSessionCalls.push({ user, loginResult });
    return { id: this.createdSessionId };
  }

  async assertActiveSession(owner: { sessionId: string }): Promise<void> {
    this.assertedSessions.push(owner.sessionId);
  }

  async getValidAccessToken(): Promise<string> {
    return this.validAccessToken;
  }

  async revokeSession(sessionId: string): Promise<void> {
    this.revokedSessions.push(sessionId);
  }
}

class FakeCommandBus {
  result: AuthenticatedUser = {
    id: 'app-user-1',
    oidcSubject: 'user-1',
    email: 'user@example.com',
    displayName: 'User Example'
  };

  executedCommands: unknown[] = [];

  async execute(command: unknown): Promise<AuthenticatedUser> {
    this.executedCommands.push(command);
    return this.result;
  }
}

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

function createService(overrides: Partial<AppEnv> = {}): {
  authService: AuthService;
  fakeAuthSessionService: FakeAuthSessionService;
  fakeOidcClientService: FakeOidcClientService;
  tokenService: AuthTokenService;
  fakeCommandBus: FakeCommandBus;
} {
  const env = createEnv(overrides);
  const tokenService = new AuthTokenService(env);
  const fakeOidcClientService = new FakeOidcClientService();
  const fakeAuthSessionService = new FakeAuthSessionService();
  const fakeCommandBus = new FakeCommandBus();

  return {
    authService: new AuthService(
      env,
      fakeOidcClientService as unknown as OidcClientService,
      fakeAuthSessionService as unknown as AuthSessionService,
      tokenService,
      fakeCommandBus as unknown as CommandBus
    ),
    fakeAuthSessionService,
    fakeOidcClientService,
    tokenService,
    fakeCommandBus
  };
}

test('AuthService normalizes returnTo to the configured frontend origin', async () => {
  const { authService, tokenService } = createService();

  const result = await authService.buildLoginRedirect('https://evil.example.com/steal-session');
  const stateClaims = await tokenService.verifyStateToken(result.stateToken);

  assert.equal(result.authorizationUrl, 'https://sso.example.com/auth');
  assert.equal(stateClaims.state, 'generated-state');
  assert.equal(stateClaims.returnTo, 'http://localhost:3000/');
});

test('AuthService rejects login callback without state cookie', async () => {
  const { authService } = createService();

  await assert.rejects(
    () => authService.completeLogin({ code: 'oidc-code', state: 'generated-state' }, undefined),
    (error: unknown) => error instanceof UnauthorizedException && error.message === 'Missing auth state cookie'
  );
});

test('AuthService rejects login callback with mismatched state', async () => {
  const { authService, tokenService } = createService();
  const stateToken = await tokenService.issueStateToken('different-state', 'http://localhost:3000/digest');

  await assert.rejects(
    () =>
      authService.completeLogin(
        { code: 'oidc-code', state: 'generated-state' },
        `${AUTH_STATE_COOKIE_NAME}=${stateToken}`
      ),
    (error: unknown) => error instanceof UnauthorizedException && error.message === 'OIDC state mismatch'
  );
});

test('AuthService rejects login when OIDC user email is missing', async () => {
  const { authService, fakeOidcClientService, tokenService } = createService();
  const stateToken = await tokenService.issueStateToken('generated-state', 'http://localhost:3000/digest');

  fakeOidcClientService.loginResult = {
    idToken: 'oidc-id-token',
    refreshToken: 'oidc-refresh-token',
    accessTokenExpiresAt: new Date('2026-04-09T12:15:00.000Z'),
    refreshTokenExpiresAt: new Date('2026-04-10T12:00:00.000Z'),
    userInfo: {
      sub: 'user-1',
      name: 'User Example'
    }
  };

  await assert.rejects(
    () =>
      authService.completeLogin(
        { code: 'oidc-code', state: 'generated-state' },
        `${AUTH_STATE_COOKIE_NAME}=${stateToken}`
      ),
    (error: unknown) => error instanceof UnauthorizedException && error.message === 'OIDC user email is missing'
  );
});

test('AuthService provisions a user through CommandBus during login', async () => {
  const { authService, tokenService, fakeAuthSessionService, fakeCommandBus } = createService();
  const stateToken = await tokenService.issueStateToken('generated-state', 'http://localhost:3000/digest');

  const result = await authService.completeLogin(
    { code: 'oidc-code', state: 'generated-state', issuer: 'https://sso.example.com/realms/raa' },
    `${AUTH_STATE_COOKIE_NAME}=${stateToken}`
  );

  assert.equal(result.user.id, 'app-user-1');
  assert.equal(fakeAuthSessionService.createSessionCalls.length, 1);
  assert.equal(fakeAuthSessionService.createSessionCalls[0]?.loginResult.refreshToken, 'oidc-refresh-token');
  assert.equal(fakeCommandBus.executedCommands.length, 1);
  assert.ok(fakeCommandBus.executedCommands[0] instanceof EnsureUserFromOidcCommand);

  const command = fakeCommandBus.executedCommands[0] as EnsureUserFromOidcCommand;
  assert.equal(command.oidcSubject, 'user-1');
  assert.equal(command.email, 'user@example.com');
  assert.equal(command.displayName, 'User Example');
});

test('AuthService reads a user from the configured session cookie', async () => {
  const { authService, fakeAuthSessionService, tokenService } = createService();
  const sessionToken = await tokenService.issueSessionToken({
    id: 'app-user-1',
    oidcSubject: 'user-1',
    email: 'user@example.com',
    displayName: 'User Example'
  }, 'auth-session-1');

  const claims = await authService.readUserFromCookie(`raa_assistant_session=${sessionToken}`);

  assert.equal(claims.id, 'app-user-1');
  assert.equal(claims.oidcSubject, 'user-1');
  assert.equal(claims.email, 'user@example.com');
  assert.equal(claims.displayName, 'User Example');
  assert.deepEqual(fakeAuthSessionService.assertedSessions, ['auth-session-1']);
});

test('AuthService resolves mail auth context from the current app session', async () => {
  const { authService, tokenService } = createService();
  const sessionToken = await tokenService.issueSessionToken({
    id: 'app-user-1',
    oidcSubject: 'user-1',
    email: 'user@example.com',
    displayName: 'User Example'
  }, 'auth-session-1');

  const authContext = await authService.getMailAuthContextFromCookie(`raa_assistant_session=${sessionToken}`);

  assert.equal(authContext.email, 'user@example.com');
  assert.equal(authContext.accessToken, 'refreshed-access-token');
});
