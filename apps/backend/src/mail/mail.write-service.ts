/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

import { BadGatewayException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ImapFlow } from 'imapflow';
import type { AppEnv } from '../config/env.js';
import { getAppEnv } from '../config/env.js';
import type { MailAuthContext } from './mail.types.js';

export type MarkReadTarget = { uids: string[] } | { allUnread: true };

@Injectable()
export class MailWriteService {
  private readonly env: AppEnv;

  constructor(configService: ConfigService<AppEnv>) {
    this.env = getAppEnv(configService);
  }

  async markRead(auth: MailAuthContext, folder: string, target: MarkReadTarget): Promise<number> {
    return this.withClient(auth, async (client) => {
      const lock = await client.getMailboxLock(folder, { readOnly: false });

      try {
        if ('allUnread' in target) {
          const unseenUids = await client.search({ seen: false }, { uid: true });

          if (!unseenUids || unseenUids.length === 0) {
            return 0;
          }

          await client.messageFlagsAdd({ uid: unseenUids.join(',') }, ['\\Seen'], { uid: true });

          return unseenUids.length;
        }

        if (target.uids.length === 0) {
          return 0;
        }

        await client.messageFlagsAdd({ uid: target.uids.join(',') }, ['\\Seen'], { uid: true });

        return target.uids.length;
      } finally {
        lock.release();
      }
    });
  }

  private createClient(auth: MailAuthContext): ImapFlow {
    return new ImapFlow({
      host: this.env.imapHost,
      port: this.env.imapPort,
      secure: this.env.imapTls,
      disableAutoIdle: true,
      auth: {
        user: auth.email,
        accessToken: auth.accessToken
      },
      logger: false
    });
  }

  private async withClient<T>(auth: MailAuthContext, operation: (client: ImapFlow) => Promise<T>): Promise<T> {
    const client = this.createClient(auth);

    try {
      await client.connect();
      return await operation(client);
    } catch (error) {
      throw mapMailError(error);
    } finally {
      try {
        await client.logout();
      } catch {
        // Ignore logout errors after request completion.
      }
    }
  }
}

function mapMailError(error: unknown): Error {
  if (isAuthenticationFailure(error)) {
    return new UnauthorizedException('IMAP access token was rejected');
  }

  if (error instanceof UnauthorizedException) {
    return error;
  }

  return new BadGatewayException(error instanceof Error ? error.message : 'IMAP request failed');
}

function isAuthenticationFailure(error: unknown): error is { authenticationFailed: true } {
  return typeof error === 'object' && error !== null && 'authenticationFailed' in error;
}
