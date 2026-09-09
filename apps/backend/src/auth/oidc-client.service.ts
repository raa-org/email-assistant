/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import {
  authorizationCodeGrant,
  buildAuthorizationUrl,
  buildEndSessionUrl,
  discovery,
  fetchUserInfo,
  randomState,
  refreshTokenGrant,
  skipSubjectCheck,
  type Configuration
} from 'openid-client';
import type { AppEnv } from '../config/env.js';
import { APP_ENV_TOKEN } from './auth.constants.js';
import type { OidcCallbackParams, OidcLoginResult, OidcTokenResult, OidcUserInfo } from './auth.types.js';

@Injectable()
export class OidcClientService {
  private configurationPromise?: Promise<Configuration>;

  constructor(@Inject(APP_ENV_TOKEN) private readonly env: AppEnv) {}

  async buildAuthorizationUrl(state: string, forceLogin = false): Promise<string> {
    const config = await this.getConfiguration();

    return buildAuthorizationUrl(config, this.createAuthorizationParams(state, forceLogin)).toString();
  }

  async buildEndSessionUrl(postLogoutRedirectUri: string, idTokenHint?: string): Promise<string | null> {
    const config = await this.getConfiguration();

    if (!config.serverMetadata().end_session_endpoint) {
      return null;
    }

    const params: Record<string, string> = {
      post_logout_redirect_uri: postLogoutRedirectUri
    };

    if (idTokenHint !== undefined) {
      params.id_token_hint = idTokenHint;
    }

    return buildEndSessionUrl(config, params).toString();
  }

  async exchangeCodeForUserInfo(params: OidcCallbackParams): Promise<OidcLoginResult> {
    const config = await this.getConfiguration();

    let tokens;

    try {
      tokens = await authorizationCodeGrant(config, this.createCallbackUrl(params), {
        expectedState: params.state
      });
    } catch {
      throw new UnauthorizedException('OIDC token exchange failed');
    }

    if (!tokens.access_token || !config.serverMetadata().userinfo_endpoint) {
      throw new UnauthorizedException('OIDC userinfo endpoint is unavailable');
    }

    try {
      const claims = tokens.claims();
      const expectedSubject = claims?.sub ?? skipSubjectCheck;
      const userInfo = (await fetchUserInfo(config, tokens.access_token, expectedSubject)) as OidcUserInfo;
      const tokenResult = this.toOidcTokenResult(tokens);

      if (!tokenResult.refreshToken) {
        throw new UnauthorizedException('OIDC refresh token is unavailable');
      }

      return {
        ...tokenResult,
        refreshToken: tokenResult.refreshToken,
        userInfo
      };
    } catch {
      throw new UnauthorizedException('OIDC userinfo endpoint is unavailable');
    }
  }

  async refreshTokens(refreshToken: string): Promise<OidcTokenResult> {
    const config = await this.getConfiguration();

    try {
      const tokens = await refreshTokenGrant(config, refreshToken);

      if (!tokens.access_token) {
        throw new UnauthorizedException('OIDC refresh token exchange failed');
      }

      return this.toOidcTokenResult(tokens);
    } catch (error) {
      throw error;
    }
  }

  generateState(): string {
    return randomState();
  }

  private async getConfiguration(): Promise<Configuration> {
    this.configurationPromise ??= this.createConfiguration();

    return this.configurationPromise;
  }

  private async createConfiguration(): Promise<Configuration> {
    try {
      return await discovery(new URL(this.env.oidcIssuer), this.env.oidcClientId, {
        client_secret: this.env.oidcClientSecret
      });
    } catch {
      throw new UnauthorizedException('Unable to load OIDC discovery document');
    }
  }

  private getRedirectUri(): string {
    return (
      this.env.oidcRedirectUri ??
      new URL('/api/auth/callback', this.env.appBaseUrl ?? `http://localhost:${this.env.frontendPort}`).toString()
    );
  }

  private createAuthorizationParams(state: string, forceLogin: boolean): Record<string, string> {
    const params: Record<string, string> = {
      response_type: 'code',
      scope: 'openid profile email offline_access',
      redirect_uri: this.getRedirectUri(),
      state
    };

    if (forceLogin) {
      params.login = 'true';
      params.prompt = 'login';
      params.max_age = '0';
    }

    return params;
  }

  private createCallbackUrl(params: OidcCallbackParams): URL {
    const callbackUrl = new URL(this.getRedirectUri());

    callbackUrl.searchParams.set('code', params.code);
    callbackUrl.searchParams.set('state', params.state);

    if (params.issuer) {
      callbackUrl.searchParams.set('iss', params.issuer);
    }

    return callbackUrl;
  }

  private toOidcTokenResult(tokens: {
    access_token?: string;
    expiresIn(): number | undefined;
    id_token?: string;
    refresh_token?: string;
    [key: string]: unknown;
  }): OidcTokenResult {
    if (!tokens.access_token) {
      throw new UnauthorizedException('OIDC access token is unavailable');
    }

    const expiresIn = tokens.expiresIn();

    if (expiresIn === undefined) {
      throw new UnauthorizedException('OIDC access token expiry is unavailable');
    }

    const refreshExpiresIn = readOptionalNumber(tokens.refresh_expires_in);
    const now = Date.now();

    return {
      accessToken: tokens.access_token,
      accessTokenExpiresAt: new Date(now + expiresIn * 1000),
      idToken: typeof tokens.id_token === 'string' ? tokens.id_token : undefined,
      refreshToken: typeof tokens.refresh_token === 'string' ? tokens.refresh_token : undefined,
      refreshTokenExpiresAt:
        refreshExpiresIn === undefined ? undefined : new Date(now + refreshExpiresIn * 1000)
    };
  }
}

function readOptionalNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.length > 0) {
    const parsed = Number(value);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return undefined;
}
