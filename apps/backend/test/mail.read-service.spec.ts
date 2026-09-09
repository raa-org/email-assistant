/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { ConfigService } from '@nestjs/config';
import type { FetchMessageObject, ImapFlow, ListResponse } from 'imapflow';
import { MailReadService } from '../src/mail/mail.read-service.js';
import type { MailAuthContext } from '../src/mail/mail.types.js';
import type { AppEnv } from '../src/config/env.js';

class FakeImapClient {
  mailbox = { exists: 2 };
  connectCalls = 0;
  logoutCalls = 0;
  releasedLocks = 0;

  async connect(): Promise<void> {
    this.connectCalls += 1;
  }

  async logout(): Promise<void> {
    this.logoutCalls += 1;
  }

  async list(): Promise<ListResponse[]> {
    return [
      {
        path: 'INBOX',
        pathAsListed: 'INBOX',
        name: 'Inbox',
        delimiter: '/',
        parent: [],
        parentPath: '',
        flags: new Set(),
        listed: true,
        subscribed: true,
        status: {
          path: 'INBOX',
          unseen: 3
        }
      }
    ];
  }

  async getMailboxLock(path: string): Promise<{ path: string; release: () => void }> {
    return {
      path,
      release: () => {
        this.releasedLocks += 1;
      }
    };
  }

  async *fetch(): AsyncIterableIterator<FetchMessageObject> {
    yield {
      seq: 1,
      uid: 1001,
      envelope: {
        subject: 'Quarterly budget review',
        from: [{ address: 'finance@corp.example.com', name: 'Finance' }]
      },
      internalDate: new Date('2026-04-07T08:30:00.000Z'),
      source: Buffer.from('Subject: Quarterly budget review\r\n\r\nPlease review the attached budget changes.')
    };
    yield {
      seq: 2,
      uid: 1002,
      envelope: {
        subject: 'Platform migration checkpoint',
        from: [{ address: 'platform@corp.example.com', name: 'Platform' }]
      },
      internalDate: new Date('2026-04-07T09:15:00.000Z'),
      source: Buffer.from('Subject: Platform migration checkpoint\r\n\r\nCheckpoint moved to Friday.')
    };
  }

  async fetchOne(): Promise<FetchMessageObject> {
    return {
      seq: 2,
      uid: 1002,
      envelope: {
        subject: 'Platform migration checkpoint',
        from: [{ address: 'platform@corp.example.com', name: 'Platform' }]
      },
      internalDate: new Date('2026-04-07T09:15:00.000Z'),
      bodyStructure: {
        part: '1',
        type: 'text/plain'
      },
      source: Buffer.from('Subject: Platform migration checkpoint\r\n\r\nCheckpoint moved to Friday.')
    };
  }

  async download(): Promise<{ content: NodeJS.ReadableStream }> {
    return {
      content: ReadableFromString('Checkpoint moved to Friday due to environment validation.')
    };
  }
}

class TestMailReadService extends MailReadService {
  constructor(private readonly fakeClient: FakeImapClient) {
    super(createConfigService());
  }

  protected override createClient(): ImapFlow {
    return this.fakeClient as unknown as ImapFlow;
  }
}

test('MailReadService lists folders and unread counters from IMAP', async () => {
  const fakeClient = new FakeImapClient();
  const service = new TestMailReadService(fakeClient);

  const folders = await service.listFolders(createAuthContext());

  assert.deepEqual(folders, [{ name: 'Inbox', path: 'INBOX', totalCount: 0, unreadCount: 3 }]);
  assert.equal(fakeClient.connectCalls, 1);
  assert.equal(fakeClient.logoutCalls, 1);
});

test('MailReadService lists inbox messages from IMAP', async () => {
  const fakeClient = new FakeImapClient();
  const service = new TestMailReadService(fakeClient);

  const messages = await service.listMessages(createAuthContext(), 'INBOX', {
    limit: 25,
    offset: 0
  });

  assert.equal(messages.length, 2);
  assert.equal(messages[0].uid, '1002');
  assert.equal(messages[0].preview, 'Checkpoint moved to Friday.');
  assert.equal(messages[1].from, 'Finance <finance@corp.example.com>');
  assert.equal(fakeClient.releasedLocks, 1);
});

test('MailReadService applies search, limit, and offset to listed messages', async () => {
  const fakeClient = new FakeImapClient();
  const service = new TestMailReadService(fakeClient);

  const messages = await service.listMessages(createAuthContext(), 'INBOX', {
    limit: 1,
    offset: 0,
    search: 'platform'
  });

  assert.equal(messages.length, 1);
  assert.equal(messages[0]?.uid, '1002');
});

test('MailReadService loads message detail body text from IMAP', async () => {
  const fakeClient = new FakeImapClient();
  const service = new TestMailReadService(fakeClient);

  const message = await service.getMessage(createAuthContext(), 'INBOX', '1002');

  assert.equal(message.uid, '1002');
  assert.equal(message.bodyText, 'Checkpoint moved to Friday due to environment validation.');
  assert.equal(message.preview, 'Checkpoint moved to Friday due to environment validation.');
  assert.equal(fakeClient.releasedLocks, 1);
});

function createConfigService(): ConfigService<AppEnv> {
  const env: AppEnv = {
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
    digestStatsWindowDays: 7
  };

  return {
    getOrThrow(key: keyof AppEnv) {
      return env[key];
    },
    get(key: keyof AppEnv) {
      return env[key];
    }
  } as ConfigService<AppEnv>;
}

function createAuthContext(): MailAuthContext {
  return {
    email: 'user@example.com',
    accessToken: 'oidc-access-token'
  };
}

function ReadableFromString(value: string): NodeJS.ReadableStream {
  async function* iterate(): AsyncIterable<Buffer> {
    yield Buffer.from(value);
  }

  return iterate() as unknown as NodeJS.ReadableStream;
}
