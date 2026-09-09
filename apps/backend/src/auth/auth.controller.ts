/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

import { Controller, Get, Inject, Query, Req, Res } from '@nestjs/common';
import { ApiCookieAuth, ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import type { AppEnv } from '../config/env.js';
import {
  AUTH_STATE_COOKIE_NAME,
  OIDC_ID_TOKEN_COOKIE_NAME,
  buildSessionCookieOptions,
  buildStateCookieOptions,
  type CookieOptions
} from './auth-cookie.js';
import { APP_ENV_TOKEN } from './auth.constants.js';
import { AuthService } from './auth.service.js';
import { CurrentUserResponseDto } from './dto/current-user-response.dto.js';
import type { OidcCallbackParams } from './auth.types.js';
import { Public } from './public.decorator.js';

interface AuthRequest {
  headers: {
    cookie?: string;
  };
}

interface AuthResponse {
  clearCookie(name: string, options?: CookieOptions): void;
  cookie(name: string, value: string, options?: CookieOptions): void;
  redirect(url: string): void;
  status(code: number): {
    json(value: Record<string, unknown>): void;
  };
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    @Inject(APP_ENV_TOKEN) private readonly env: AppEnv
  ) {}

  @Public()
  @ApiOperation({ summary: 'Redirect the user to the OIDC login flow' })
  @ApiQuery({ name: 'returnTo', required: false })
  @Get('login')
  async login(
    @Query('returnTo') returnTo: string | undefined,
    @Res() response: AuthResponse
  ): Promise<void> {
    const target = returnTo ?? this.env.appBaseUrl ?? `http://localhost:${this.env.frontendPort}/`;
    const { authorizationUrl, stateToken } = await this.authService.buildLoginRedirect(target);

    response.cookie(AUTH_STATE_COOKIE_NAME, stateToken, buildStateCookieOptions(this.env));
    response.redirect(authorizationUrl);
  }

  @Public()
  @ApiOperation({ summary: 'Handle the OIDC callback' })
  @Get('callback')
  async callback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Query('iss') issuer: string | undefined,
    @Req() request: AuthRequest,
    @Res() response: AuthResponse
  ): Promise<void> {
    if (!code || !state) {
      response.status(400).json({ message: 'Missing OIDC callback parameters' });
      return;
    }

    const result = await this.authService.completeLogin({ code, state, issuer }, request.headers.cookie);
    const sessionCookieOptions = buildSessionCookieOptions(this.env);
    const stateCookieOptions = buildStateCookieOptions(this.env);

    response.clearCookie(AUTH_STATE_COOKIE_NAME, stateCookieOptions);
    if (result.idToken) {
      response.cookie(OIDC_ID_TOKEN_COOKIE_NAME, result.idToken, sessionCookieOptions);
    }
    response.cookie(this.env.authCookieName, result.sessionToken, sessionCookieOptions);
    response.redirect(result.redirectTo);
  }

  @Public()
  @ApiOperation({ summary: 'Logout the current user and redirect to the identity provider' })
  @ApiQuery({ name: 'returnTo', required: false })
  @Get('logout')
  async logout(
    @Query('returnTo') returnTo: string | undefined,
    @Req() request: AuthRequest,
    @Res() response: AuthResponse
  ): Promise<void> {
    const sessionCookieOptions = buildSessionCookieOptions(this.env);
    const stateCookieOptions = buildStateCookieOptions(this.env);
    const idTokenHint = this.authService.readOidcIdTokenFromCookie(request.headers.cookie);

    await this.authService.revokeSessionFromCookie(request.headers.cookie);

    response.clearCookie(this.env.authCookieName, sessionCookieOptions);
    response.clearCookie(OIDC_ID_TOKEN_COOKIE_NAME, sessionCookieOptions);
    response.clearCookie(AUTH_STATE_COOKIE_NAME, stateCookieOptions);
    const { redirectUrl, stateToken } = await this.authService.buildLogoutRedirect(
      returnTo,
      idTokenHint
    );

    if (stateToken) {
      response.cookie(AUTH_STATE_COOKIE_NAME, stateToken, stateCookieOptions);
    }

    response.redirect(redirectUrl);
  }

  @ApiCookieAuth()
  @ApiOperation({ summary: 'Get the currently authenticated user' })
  @ApiOkResponse({ type: CurrentUserResponseDto })
  @Get('me')
  async getCurrentUser(@Req() request: AuthRequest): Promise<{ id: string; email: string; displayName: string }> {
    const user = await this.authService.readUserFromCookie(request.headers.cookie);

    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName
    };
  }
}
