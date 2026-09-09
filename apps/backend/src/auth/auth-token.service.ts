/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import type { AppEnv } from '../config/env.js';
import { APP_ENV_TOKEN } from './auth.constants.js';
import type { AppSessionClaims, AuthenticatedUser } from './auth.types.js';

interface SessionPayload extends JWTPayload {
  displayName: string;
  email: string;
  oidcSubject: string;
  sessionId: string;
}

interface StatePayload extends JWTPayload {
  state: string;
  returnTo: string;
}

@Injectable()
export class AuthTokenService {
  private readonly secret: Uint8Array;
  private readonly sessionLifetimeSeconds = 30 * 24 * 60 * 60;

  constructor(@Inject(APP_ENV_TOKEN) private readonly env: AppEnv) {
    this.secret = new TextEncoder().encode(this.env.jwtSecret);
  }

  async issueSessionToken(user: AuthenticatedUser, sessionId: string): Promise<string> {
    const now = this.nowInSeconds();

    return new SignJWT({
      oidcSubject: user.oidcSubject,
      email: user.email,
      displayName: user.displayName,
      sessionId
    })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setIssuer(this.getIssuer())
      .setAudience('raa-assistant')
      .setSubject(user.id)
      .setIssuedAt(now)
      .setExpirationTime(now + this.sessionLifetimeSeconds)
      .sign(this.secret);
  }

  async verifySessionToken(token: string): Promise<AppSessionClaims> {
    const payload = await this.verify(token, 'raa-assistant');

    return {
      id: stringClaim(payload.sub, 'sub'),
      oidcSubject: stringClaim(payload.oidcSubject, 'oidcSubject'),
      email: stringClaim(payload.email, 'email'),
      displayName: stringClaim(payload.displayName, 'displayName'),
      sessionId: stringClaim(payload.sessionId, 'sessionId'),
      iss: stringClaim(payload.iss, 'iss'),
      aud: stringClaim(payload.aud, 'aud'),
      iat: numberClaim(payload.iat, 'iat'),
      exp: numberClaim(payload.exp, 'exp')
    };
  }

  async issueStateToken(state: string, returnTo: string): Promise<string> {
    const now = this.nowInSeconds();

    return new SignJWT({
      state,
      returnTo
    })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setIssuer(this.getIssuer())
      .setAudience('oidc-state')
      .setIssuedAt(now)
      .setExpirationTime(now + 10 * 60)
      .sign(this.secret);
  }

  async verifyStateToken(token: string): Promise<{ returnTo: string; state: string }> {
    const payload = await this.verify(token, 'oidc-state');

    return {
      state: stringClaim(payload.state, 'state'),
      returnTo: stringClaim(payload.returnTo, 'returnTo')
    };
  }

  private async verify<Payload extends JWTPayload>(token: string, audience: string): Promise<Payload> {
    try {
      const result = await jwtVerify<Payload>(token, this.secret, {
        issuer: this.getIssuer(),
        audience
      });

      return result.payload;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private getIssuer(): string {
    return this.env.appBaseUrl ?? `http://localhost:${this.env.frontendPort}`;
  }

  private nowInSeconds(): number {
    return Math.floor(Date.now() / 1000);
  }
}

function stringClaim(value: unknown, name: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new UnauthorizedException(`Invalid token claim: ${name}`);
  }

  return value;
}

function numberClaim(value: unknown, name: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new UnauthorizedException(`Invalid token claim: ${name}`);
  }

  return value;
}
