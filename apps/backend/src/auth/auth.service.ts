/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import type { AppEnv } from '../config/env.js';
import {
  AUTH_STATE_COOKIE_NAME,
  OIDC_ID_TOKEN_COOKIE_NAME,
  parseCookieHeader
} from './auth-cookie.js';
import { APP_ENV_TOKEN } from './auth.constants.js';
import { AuthSessionService } from './auth-session.service.js';
import { AuthTokenService } from './auth-token.service.js';
import type { AppSessionClaims, AuthenticatedUser, AuthSessionOwner, OidcCallbackParams, OidcUserInfo } from './auth.types.js';
import { OidcClientService } from './oidc-client.service.js';
import { EnsureUserFromOidcCommand } from '../user/commands/ensure-user-from-oidc.command.js';
import type { MailAuthContext } from '../mail/mail.types.js';

@Injectable()
export class AuthService {
  constructor(
    @Inject(APP_ENV_TOKEN) private readonly env: AppEnv,
    private readonly oidcClientService: OidcClientService,
    private readonly authSessionService: AuthSessionService,
    private readonly authTokenService: AuthTokenService,
    private readonly commandBus: CommandBus
  ) {}

  async buildLoginRedirect(
    returnTo: string,
    forceLogin = false
  ): Promise<{ authorizationUrl: string; stateToken: string }> {
    const normalizedReturnTo = this.normalizeReturnTo(returnTo);
    const state = this.oidcClientService.generateState();

    return {
      authorizationUrl: await this.oidcClientService.buildAuthorizationUrl(state, forceLogin),
      stateToken: await this.authTokenService.issueStateToken(state, normalizedReturnTo)
    };
  }

  async buildLogoutRedirect(
    returnTo: string | undefined,
    idTokenHint?: string
  ): Promise<{ redirectUrl: string; stateToken: string | null }> {
    const target = this.normalizeReturnTo(returnTo ?? this.getDefaultFrontendUrl());
    const { authorizationUrl, stateToken } = await this.buildLoginRedirect(target, true);
    const endSessionUrl = await this.oidcClientService.buildEndSessionUrl(authorizationUrl, idTokenHint);

    return {
      redirectUrl: endSessionUrl ?? authorizationUrl,
      stateToken
    };
  }

  async completeLogin(callback: OidcCallbackParams, cookieHeader: string | undefined): Promise<{
    idToken?: string;
    redirectTo: string;
    sessionToken: string;
    user: AuthenticatedUser;
  }> {
    const stateToken = this.readRequiredCookie(cookieHeader, AUTH_STATE_COOKIE_NAME, 'Missing auth state cookie');

    const savedState = await this.authTokenService.verifyStateToken(stateToken);

    if (savedState.state !== callback.state) {
      throw new UnauthorizedException('OIDC state mismatch');
    }

    const loginResult = await this.oidcClientService.exchangeCodeForUserInfo(callback);
    const profile = this.toOidcProfile(loginResult.userInfo);
    const user = await this.commandBus.execute<EnsureUserFromOidcCommand, AuthenticatedUser>(
      new EnsureUserFromOidcCommand(profile.oidcSubject, profile.email, profile.displayName, new Date())
    );
    const authSession = await this.authSessionService.createSession(user, loginResult);

    return {
      idToken: loginResult.idToken,
      redirectTo: savedState.returnTo,
      sessionToken: await this.authTokenService.issueSessionToken(user, authSession.id),
      user
    };
  }

  async readUserFromCookie(cookieHeader: string | undefined): Promise<AuthenticatedUser> {
    const session = await this.readSessionClaimsFromCookie(cookieHeader);

    return this.commandBus.execute<EnsureUserFromOidcCommand, AuthenticatedUser>(
      new EnsureUserFromOidcCommand(session.oidcSubject, session.email, session.displayName, new Date())
    );
  }

  async getMailAuthContextFromCookie(cookieHeader: string | undefined): Promise<MailAuthContext> {
    const session = await this.readSessionClaimsFromCookie(cookieHeader);

    return {
      email: session.email,
      accessToken: await this.authSessionService.getValidAccessToken(this.toSessionOwner(session))
    };
  }

  async getSessionOwnerFromCookie(cookieHeader: string | undefined): Promise<AuthSessionOwner & { email: string }> {
    const session = await this.readSessionClaimsFromCookie(cookieHeader);

    return {
      ...this.toSessionOwner(session),
      email: session.email
    };
  }

  async refreshMailAuthContext(owner: AuthSessionOwner, email: string): Promise<MailAuthContext> {
    return {
      email,
      accessToken: await this.authSessionService.getValidAccessToken(owner)
    };
  }

  async revokeSessionFromCookie(cookieHeader: string | undefined): Promise<void> {
    const token = parseCookieHeader(cookieHeader)[this.env.authCookieName];

    if (!token) {
      return;
    }

    try {
      const session = await this.authTokenService.verifySessionToken(token);
      await this.authSessionService.revokeSession(session.sessionId);
    } catch {
      // Ignore invalid or expired app sessions during logout cleanup.
    }
  }

  readOidcIdTokenFromCookie(cookieHeader: string | undefined): string | undefined {
    const cookies = parseCookieHeader(cookieHeader);

    return cookies[OIDC_ID_TOKEN_COOKIE_NAME];
  }

  private normalizeReturnTo(value: string): string {
    const fallback = new URL(this.getDefaultFrontendUrl());
    const candidate = new URL(value, fallback);
    const allowedOrigins = new Set(
      [this.env.appBaseUrl]
        .filter((origin): origin is string => typeof origin === 'string' && origin.length > 0)
        .map((origin) => new URL(origin).origin)
    );

    if (allowedOrigins.size > 0 && !allowedOrigins.has(candidate.origin)) {
      return fallback.toString();
    }

    return candidate.toString();
  }

  private getDefaultFrontendUrl(): string {
    return this.env.appBaseUrl ?? `http://localhost:${this.env.frontendPort}/`;
  }

  private async readSessionClaimsFromCookie(cookieHeader: string | undefined): Promise<AppSessionClaims> {
    const token = this.readRequiredCookie(cookieHeader, this.env.authCookieName, 'Missing session cookie');
    const session = await this.authTokenService.verifySessionToken(token);

    await this.authSessionService.assertActiveSession(this.toSessionOwner(session));

    return session;
  }

  private toSessionOwner(session: Pick<AppSessionClaims, 'id' | 'oidcSubject' | 'sessionId'>): AuthSessionOwner {
    return {
      userId: session.id,
      oidcSubject: session.oidcSubject,
      sessionId: session.sessionId
    };
  }

  private readRequiredCookie(cookieHeader: string | undefined, name: string, errorMessage: string): string {
    const token = parseCookieHeader(cookieHeader)[name];

    if (!token) {
      throw new UnauthorizedException(errorMessage);
    }

    return token;
  }

  private toOidcProfile(userInfo: OidcUserInfo): Omit<AuthenticatedUser, 'id'> {
    if (!userInfo.email) {
      throw new UnauthorizedException('OIDC user email is missing');
    }

    return {
      oidcSubject: userInfo.sub,
      email: userInfo.email,
      displayName: userInfo.name ?? userInfo.preferred_username ?? userInfo.email
    };
  }
}
