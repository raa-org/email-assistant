/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import type { CommandBus, EventBus, QueryBus } from '@nestjs/cqrs';
import { Subject } from 'rxjs';
import { SummaryController } from '../src/summary/summary.controller.js';
import type { AuthService } from '../src/auth/auth.service.js';
import type { MailReadService } from '../src/mail/mail.read-service.js';
import type { MailAuthContext } from '../src/mail/mail.types.js';
import type { LlmProviderRegistryService } from '../src/provider/llm-provider-registry.service.js';
import { GenerateBatchSummaryCommand } from '../src/summary/commands/generate-batch-summary.command.js';
import { GenerateMessageSummaryCommand } from '../src/summary/commands/generate-message-summary.command.js';
import type { SummaryService } from '../src/summary/summary.service.js';

class FakeCommandBus {
  executedCommands: unknown[] = [];
  result: unknown = {
    actionItems: [],
    deadlines: [],
    questions: [],
    summary: 'summary',
    title: 'title'
  };

  async execute(command: unknown): Promise<unknown> {
    this.executedCommands.push(command);
    return this.result;
  }
}

class FakeAuthService {
  authContext: MailAuthContext = {
    accessToken: 'oidc-access-token',
    email: 'user@example.com'
  };

  async getMailAuthContextFromCookie(): Promise<MailAuthContext> {
    return this.authContext;
  }
}

function createController(): {
  authService: FakeAuthService;
  commandBus: FakeCommandBus;
  controller: SummaryController;
} {
  const commandBus = new FakeCommandBus();
  const authService = new FakeAuthService();
  const eventBus = new Subject() as unknown as EventBus;

  const queryBus = new FakeCommandBus();

  return {
    authService,
    commandBus,
    controller: new SummaryController(
      commandBus as unknown as CommandBus,
      queryBus as unknown as QueryBus,
      eventBus,
      authService as unknown as AuthService,
      {} as unknown as MailReadService,
      {} as unknown as LlmProviderRegistryService,
      {} as unknown as SummaryService
    )
  };
}

function createRequest() {
  return {
    headers: {
      cookie: 'raa_assistant_session=session-token'
    },
    user: {
      displayName: 'User Example',
      email: 'user@example.com',
      id: 'user-1',
      oidcSubject: 'oidc-user-1'
    }
  };
}

test('SummaryController issues GenerateMessageSummaryCommand with runtime llm options', async () => {
  const { controller, commandBus } = createController();

  await controller.summarizeMessage(createRequest(), {
    folder: 'INBOX',
    llm: {
      model: 'llama3.1:8b',
      parameters: {
        maxTokens: 256
      },
      provider: 'ollama'
    },
    uid: '1002'
  });

  assert.ok(commandBus.executedCommands[0] instanceof GenerateMessageSummaryCommand);
  assert.equal((commandBus.executedCommands[0] as GenerateMessageSummaryCommand).userId, 'user-1');
  assert.equal((commandBus.executedCommands[0] as GenerateMessageSummaryCommand).uid, '1002');
  assert.equal((commandBus.executedCommands[0] as GenerateMessageSummaryCommand).llm?.model, 'llama3.1:8b');
});

test('SummaryController issues GenerateBatchSummaryCommand with provided limit', async () => {
  const { controller, commandBus } = createController();

  await controller.summarizeBatch(createRequest(), {
    folder: 'Projects',
    limit: 5,
    llm: undefined
  });

  assert.ok(commandBus.executedCommands[0] instanceof GenerateBatchSummaryCommand);
  assert.equal((commandBus.executedCommands[0] as GenerateBatchSummaryCommand).folder, 'Projects');
  assert.equal((commandBus.executedCommands[0] as GenerateBatchSummaryCommand).limit, 5);
});

test('SummaryController issues GenerateBatchSummaryCommand for today and week presets', async () => {
  const { controller, commandBus } = createController();

  await controller.summarizeToday(createRequest());
  await controller.summarizeWeek(createRequest());

  assert.ok(commandBus.executedCommands[0] instanceof GenerateBatchSummaryCommand);
  assert.ok(commandBus.executedCommands[1] instanceof GenerateBatchSummaryCommand);
  assert.equal((commandBus.executedCommands[0] as GenerateBatchSummaryCommand).limit, 10);
  assert.equal((commandBus.executedCommands[1] as GenerateBatchSummaryCommand).limit, 25);
});
