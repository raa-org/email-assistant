/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import type { CommandBus, QueryBus } from '@nestjs/cqrs';
import { MailController } from '../src/mail/mail.controller.js';
import type { AuthService } from '../src/auth/auth.service.js';
import type { MailAuthContext } from '../src/mail/mail.types.js';
import { GetMessageQuery } from '../src/mail/queries/get-message.query.js';
import { ListFoldersQuery } from '../src/mail/queries/list-folders.query.js';
import { ListMessagesQuery } from '../src/mail/queries/list-messages.query.js';

class FakeQueryBus {
  executedQueries: unknown[] = [];
  result: unknown = [];

  async execute(query: unknown): Promise<unknown> {
    this.executedQueries.push(query);
    return this.result;
  }
}

class FakeAuthService {
  authContext: MailAuthContext = {
    accessToken: 'oidc-access-token',
    email: 'user@example.com'
  };

  cookieHeaders: Array<string | undefined> = [];

  async getMailAuthContextFromCookie(cookieHeader: string | undefined): Promise<MailAuthContext> {
    this.cookieHeaders.push(cookieHeader);
    return this.authContext;
  }
}

class FakeCommandBus {
  executedCommands: unknown[] = [];
  result: unknown = 0;

  async execute(command: unknown): Promise<unknown> {
    this.executedCommands.push(command);
    return this.result;
  }
}

function createController(): {
  authService: FakeAuthService;
  commandBus: FakeCommandBus;
  controller: MailController;
  queryBus: FakeQueryBus;
} {
  const queryBus = new FakeQueryBus();
  const commandBus = new FakeCommandBus();
  const authService = new FakeAuthService();

  return {
    authService,
    commandBus,
    controller: new MailController(
      queryBus as unknown as QueryBus,
      commandBus as unknown as CommandBus,
      authService as unknown as AuthService
    ),
    queryBus
  };
}

test('MailController issues ListFoldersQuery with auth context from cookie', async () => {
  const { controller, queryBus, authService } = createController();

  await controller.listFolders({
    headers: {
      cookie: 'raa_assistant_session=session-token'
    },
    user: {
      displayName: 'User Example',
      email: 'user@example.com',
      id: 'user-1',
      oidcSubject: 'oidc-user-1'
    }
  });

  assert.equal(authService.cookieHeaders[0], 'raa_assistant_session=session-token');
  assert.ok(queryBus.executedQueries[0] instanceof ListFoldersQuery);
  assert.equal((queryBus.executedQueries[0] as ListFoldersQuery).auth.email, 'user@example.com');
});

test('MailController issues ListMessagesQuery with requested folder', async () => {
  const { controller, queryBus } = createController();

  await controller.listMessages(
    {
      headers: {
        cookie: 'raa_assistant_session=session-token'
      },
      user: {
        displayName: 'User Example',
        email: 'user@example.com',
        id: 'user-1',
        oidcSubject: 'oidc-user-1'
      }
    },
    'Projects',
    '10',
    '5',
    'platform'
  );

  assert.ok(queryBus.executedQueries[0] instanceof ListMessagesQuery);
  assert.equal((queryBus.executedQueries[0] as ListMessagesQuery).folder, 'Projects');
  assert.equal((queryBus.executedQueries[0] as ListMessagesQuery).limit, 10);
  assert.equal((queryBus.executedQueries[0] as ListMessagesQuery).offset, 5);
  assert.equal((queryBus.executedQueries[0] as ListMessagesQuery).search, 'platform');
});

test('MailController issues GetMessageQuery with uid and folder', async () => {
  const { controller, queryBus } = createController();

  await controller.getMessage(
    {
      headers: {
        cookie: 'raa_assistant_session=session-token'
      },
      user: {
        displayName: 'User Example',
        email: 'user@example.com',
        id: 'user-1',
        oidcSubject: 'oidc-user-1'
      }
    },
    '1002',
    'INBOX'
  );

  assert.ok(queryBus.executedQueries[0] instanceof GetMessageQuery);
  assert.equal((queryBus.executedQueries[0] as GetMessageQuery).uid, '1002');
  assert.equal((queryBus.executedQueries[0] as GetMessageQuery).folder, 'INBOX');
});
