/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { SummaryService } from '../src/summary/summary.service.js';
import type { MailReadService } from '../src/mail/mail.read-service.js';
import type { MailAuthContext } from '../src/mail/mail.types.js';
import type { LlmCompleteRequest, LlmCompleteResult, LlmRequestOptions } from '../src/provider/provider.types.js';
import type { LlmProviderRegistryService } from '../src/provider/llm-provider-registry.service.js';
import { LlmSanitizationService } from '../src/summary/sanitization/llm-sanitization.service.js';

class FakeMailReadService {
  async getMessage(): Promise<{
    bodyText: string;
    folder: string;
    from: string;
    preview: string;
    receivedAt: string;
    subject: string;
    uid: string;
  }> {
    return {
      bodyText: 'Please approve the migration plan by Friday.',
      folder: 'INBOX',
      from: 'Platform <platform@corp.example.com>',
      preview: 'Please approve the migration plan by Friday.',
      receivedAt: '2026-04-10T08:00:00.000Z',
      subject: 'Migration approval',
      uid: '1001'
    };
  }

  async listMessages(): Promise<Array<{ folder: string; from: string; preview: string; receivedAt: string; subject: string; uid: string }>> {
    return [
      {
        folder: 'INBOX',
        from: 'Platform <platform@corp.example.com>',
        preview: 'Approve the migration plan by Friday.',
        receivedAt: '2026-04-10T08:00:00.000Z',
        subject: 'Migration approval',
        uid: '1001'
      }
    ];
  }
}

class FakeLlmProviderRegistryService {
  completeCalls: LlmCompleteRequest[] = [];
  result = JSON.stringify({
    title: 'Migration approval',
    summary: 'The migration plan needs approval by Friday.',
    actionItems: ['Approve the migration plan'],
    questions: [],
    deadlines: ['Friday']
  });

  resolveRequestOptions(options: LlmRequestOptions | undefined): Required<Pick<LlmRequestOptions, 'model' | 'provider'>> & {
    parameters: LlmRequestOptions['parameters'];
  } {
    return {
      model: options?.model ?? 'llama3.1:8b',
      parameters: options?.parameters,
      provider: options?.provider ?? 'ollama'
    };
  }

  async complete(request: LlmCompleteRequest): Promise<LlmCompleteResult> {
    this.completeCalls.push(request);

    return {
      content: this.result,
      model: request.model ?? 'llama3.1:8b',
      provider: request.provider ?? 'ollama'
    };
  }
}

test('SummaryService generates message summaries through the selected LLM provider and model options', async () => {
  const llmRegistry = new FakeLlmProviderRegistryService();
  const sanitization = new LlmSanitizationService();
  const service = new SummaryService(
    new FakeMailReadService() as unknown as MailReadService,
    llmRegistry as unknown as LlmProviderRegistryService,
    sanitization
  );

  const result = await service.generateMessageSummary(createAuthContext(), 'INBOX', '1001', {
    model: 'gpt-oss:20b',
    parameters: {
      maxTokens: 512,
      temperature: 0.1
    },
    provider: 'openai-compatible'
  });

  assert.equal(result.summary, 'The migration plan needs approval by Friday.');
  assert.deepEqual(result.actionItems, ['Approve the migration plan']);
  assert.equal(llmRegistry.completeCalls.length, 1);
  assert.equal(llmRegistry.completeCalls[0]?.provider, 'openai-compatible');
  assert.equal(llmRegistry.completeCalls[0]?.model, 'gpt-oss:20b');
  assert.equal(llmRegistry.completeCalls[0]?.parameters?.temperature, 0.1);
  assert.equal(llmRegistry.completeCalls[0]?.json, true);
});

function createAuthContext(): MailAuthContext {
  return {
    accessToken: 'oidc-access-token',
    email: 'user@example.com'
  };
}
