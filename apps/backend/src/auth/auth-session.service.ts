/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

import { BadGatewayException, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { DataSource, IsNull, Repository } from 'typeorm';
import type { AuthSessionOwner, AuthenticatedUser, OidcLoginResult, OidcTokenResult } from './auth.types.js';
import { OidcClientService } from './oidc-client.service.js';
import { AuthSessionCryptoService } from './auth-session-crypto.service.js';
import { AuthSessionEntity } from './auth-session.entity.js';

interface StoredSessionTokens {
  accessToken: string;
  idToken?: string;
  refreshToken: string;
}

@Injectable()
export class AuthSessionService {
  private readonly refreshSkewMs = 60 * 1000;

  constructor(
    @InjectRepository(AuthSessionEntity)
    private readonly authSessionRepository: Repository<AuthSessionEntity>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly cryptoService: AuthSessionCryptoService,
    private readonly oidcClientService: OidcClientService
  ) {}

  async createSession(user: AuthenticatedUser, loginResult: OidcLoginResult): Promise<AuthSessionEntity> {
    const sessionId = randomUUID();
    const now = new Date();

    return this.authSessionRepository.save(
      this.authSessionRepository.create({
        id: sessionId,
        userId: user.id,
        oidcSubject: user.oidcSubject,
        accessTokenEncrypted: this.cryptoService.encrypt(user.id, 'access-token', loginResult.accessToken),
        refreshTokenEncrypted: this.cryptoService.encrypt(user.id, 'refresh-token', loginResult.refreshToken),
        idTokenEncrypted: loginResult.idToken
          ? this.cryptoService.encrypt(user.id, 'id-token', loginResult.idToken)
          : null,
        accessTokenExpiresAt: loginResult.accessTokenExpiresAt,
        refreshTokenExpiresAt: loginResult.refreshTokenExpiresAt ?? null,
        lastUsedAt: now,
        lastRefreshedAt: now,
        revokedAt: null
      })
    );
  }

  async assertActiveSession(owner: AuthSessionOwner): Promise<void> {
    const session = await this.authSessionRepository.findOne({
      where: {
        id: owner.sessionId,
        revokedAt: IsNull()
      }
    });

    if (!session || !sessionMatchesOwner(session, owner)) {
      throw new UnauthorizedException('Auth session is unavailable');
    }
  }

  async getValidAccessToken(owner: AuthSessionOwner): Promise<string> {
    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(AuthSessionEntity);
      const session = await repository.findOne({
        where: {
          id: owner.sessionId,
          revokedAt: IsNull()
        },
        lock: {
          mode: 'pessimistic_write'
        }
      });

      if (!session || !sessionMatchesOwner(session, owner)) {
        throw new UnauthorizedException('Auth session is unavailable');
      }

      const tokens = this.decryptTokens(session);
      const now = new Date();

      if (session.accessTokenExpiresAt.getTime() - now.getTime() > this.refreshSkewMs) {
        session.lastUsedAt = now;
        await repository.save(session);
        return tokens.accessToken;
      }

      if (session.refreshTokenExpiresAt && session.refreshTokenExpiresAt.getTime() <= now.getTime()) {
        await this.revokeLockedSession(repository, session, now);
        throw new UnauthorizedException('OIDC session expired');
      }

      try {
        const refreshed = await this.oidcClientService.refreshTokens(tokens.refreshToken);
        const nextRefreshToken = refreshed.refreshToken ?? tokens.refreshToken;
        const nextRefreshExpiresAt = refreshed.refreshToken
          ? (refreshed.refreshTokenExpiresAt ?? null)
          : session.refreshTokenExpiresAt;

        this.applyTokens(session, {
          accessToken: refreshed.accessToken,
          idToken: refreshed.idToken ?? tokens.idToken,
          refreshToken: nextRefreshToken
        });
        session.accessTokenExpiresAt = refreshed.accessTokenExpiresAt;
        session.refreshTokenExpiresAt = nextRefreshExpiresAt;
        session.lastRefreshedAt = now;
        session.lastUsedAt = now;

        await repository.save(session);

        return refreshed.accessToken;
      } catch (error) {
        if (isInvalidGrantError(error)) {
          await this.revokeLockedSession(repository, session, now);
          throw new UnauthorizedException('OIDC session expired');
        }

        throw new BadGatewayException('OIDC token refresh failed');
      }
    });
  }

  async revokeSession(sessionId: string): Promise<void> {
    const revokedAt = new Date();

    await this.authSessionRepository.update(
      {
        id: sessionId,
        revokedAt: IsNull()
      },
      {
        revokedAt,
        lastUsedAt: revokedAt
      }
    );
  }

  private decryptTokens(session: AuthSessionEntity): StoredSessionTokens {
    return {
      accessToken: this.cryptoService.decrypt(session.userId, 'access-token', session.accessTokenEncrypted),
      refreshToken: this.cryptoService.decrypt(session.userId, 'refresh-token', session.refreshTokenEncrypted),
      idToken:
        session.idTokenEncrypted === null
          ? undefined
          : this.cryptoService.decrypt(session.userId, 'id-token', session.idTokenEncrypted)
    };
  }

  private applyTokens(session: AuthSessionEntity, tokens: StoredSessionTokens): void {
    session.accessTokenEncrypted = this.cryptoService.encrypt(session.userId, 'access-token', tokens.accessToken);
    session.refreshTokenEncrypted = this.cryptoService.encrypt(session.userId, 'refresh-token', tokens.refreshToken);
    session.idTokenEncrypted = tokens.idToken
      ? this.cryptoService.encrypt(session.userId, 'id-token', tokens.idToken)
      : null;
  }

  private async revokeLockedSession(
    repository: Repository<AuthSessionEntity>,
    session: AuthSessionEntity,
    revokedAt: Date
  ): Promise<void> {
    session.revokedAt = revokedAt;
    session.lastUsedAt = revokedAt;
    await repository.save(session);
  }
}

function sessionMatchesOwner(
  session: Pick<AuthSessionEntity, 'id' | 'oidcSubject' | 'userId'>,
  owner: AuthSessionOwner
): boolean {
  return session.id === owner.sessionId && session.userId === owner.userId && session.oidcSubject === owner.oidcSubject;
}

function isInvalidGrantError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) {
    return false;
  }

  const maybeError = error as {
    cause?: { error?: string };
    error?: string;
  };

  return maybeError.error === 'invalid_grant' || maybeError.cause?.error === 'invalid_grant';
}
