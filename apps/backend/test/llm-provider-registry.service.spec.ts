/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { ConfigService } from '@nestjs/config';
import { LlmProviderRegistryService } from '../src/provider/llm-provider-registry.service.js';
import type { AppEnv, LlmProviderConfig } from '../src/config/env.js';

test('LlmProviderRegistryService lists Ollama models through the configured internal endpoint', async () => {
  const fetchCalls: Array<{ body?: string; url: string }> = [];
  const restoreFetch = stubFetch(async (input, init) => {
    fetchCalls.push({ body: init?.body as string | undefined, url: input.toString() });

    return jsonResponse({
      models: [{ name: 'llama3.1:8b' }]
    });
  });

  try {
    const service = new LlmProviderRegistryService(createConfigService());
    const models = await service.listModels();

    assert.deepEqual(models, [
      {
        id: 'llama3.1:8b',
        label: 'llama3.1:8b',
        provider: 'ollama',
        streaming: true
      }
    ]);
    assert.equal(fetchCalls[0]?.url, 'http://llm.internal/api/tags');
  } finally {
    restoreFetch();
  }
});

test('LlmProviderRegistryService sends OpenAI-compatible chat completions with runtime options', async () => {
  const fetchCalls: Array<{ body?: string; url: string }> = [];
  const restoreFetch = stubFetch(async (input, init) => {
    fetchCalls.push({ body: init?.body as string | undefined, url: input.toString() });

    return jsonResponse({
      model: 'gpt-oss:20b',
      choices: [
        {
          message: {
            content: '{"summary":"done"}'
          }
        }
      ]
    });
  });

  try {
    const service = new LlmProviderRegistryService(
      createConfigService({
        llmDefaultProvider: 'openai-compatible',
        llmProviders: {
          ollama: emptyProviderConfig(),
          'openai-compatible': {
            baseUrl: 'http://openai-compatible.internal',
            apiKey: undefined,
            defaultModel: 'gpt-oss:20b',
            defaultParameters: {}
          }
        }
      })
    );
    const result = await service.complete({
      messages: [{ role: 'user', content: 'Summarize this' }],
      model: 'gpt-oss:20b',
      parameters: {
        maxTokens: 512,
        seed: 7,
        temperature: 0.2,
        topP: 0.9
      },
      provider: 'openai-compatible',
      json: true
    });
    const body = JSON.parse(fetchCalls[0]?.body ?? '{}') as Record<string, unknown>;

    assert.equal(fetchCalls[0]?.url, 'http://openai-compatible.internal/v1/chat/completions');
    assert.equal(body.model, 'gpt-oss:20b');
    assert.equal(body.temperature, 0.2);
    assert.equal(body.top_p, 0.9);
    assert.equal(body.max_tokens, 512);
    assert.equal(body.seed, 7);
    assert.deepEqual(body.response_format, { type: 'json_object' });
    assert.equal(result.content, '{"summary":"done"}');
    assert.equal(result.provider, 'openai-compatible');
  } finally {
    restoreFetch();
  }
});

test('LlmProviderRegistryService merges per-call parameters over provider defaults', () => {
  const service = new LlmProviderRegistryService(
    createConfigService({
      llmDefaultProvider: 'ollama',
      llmProviders: {
        ollama: {
          baseUrl: 'http://llm.internal',
          apiKey: undefined,
          defaultModel: 'llama3.1:8b',
          defaultParameters: { temperature: 0.4, topP: 0.95 }
        },
        'openai-compatible': emptyProviderConfig()
      }
    })
  );

  const resolved = service.resolveRequestOptions({ parameters: { temperature: 0.1 } });

  assert.equal(resolved.provider, 'ollama');
  assert.equal(resolved.model, 'llama3.1:8b');
  assert.deepEqual(resolved.parameters, { temperature: 0.1, topP: 0.95 });
});

test('LlmProviderRegistryService throws when no provider has a base URL configured', () => {
  assert.throws(
    () =>
      new LlmProviderRegistryService(
        createConfigService({
          llmProviders: {
            ollama: emptyProviderConfig(),
            'openai-compatible': emptyProviderConfig()
          }
        })
      ),
    /No LLM provider is configured/
  );
});

function createConfigService(overrides: Partial<AppEnv> = {}): ConfigService<AppEnv> {
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
        defaultModel: 'llama3.1:8b',
        defaultParameters: {}
      },
      'openai-compatible': emptyProviderConfig()
    },
    jwtSecret: 'test-secret',
    oidcIssuer: 'https://sso.example.com/realms/raa',
    oidcClientId: 'raa-assistant',
    oidcClientSecret: 'secret',
    oidcRedirectUri: 'http://localhost:3000/api/auth/callback',
    authCookieName: 'raa_assistant_session',
    authCookieDomain: undefined,
    appBaseUrl: 'http://localhost:3000',
    digestStatsWindowDays: 7,
    ...overrides
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

function emptyProviderConfig(): LlmProviderConfig {
  return {
    baseUrl: undefined,
    apiKey: undefined,
    defaultModel: undefined,
    defaultParameters: {}
  };
}

function jsonResponse(value: unknown): Response {
  return new Response(JSON.stringify(value), {
    headers: {
      'content-type': 'application/json'
    },
    status: 200
  });
}

function stubFetch(fetchImpl: typeof fetch): () => void {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = fetchImpl;

  return () => {
    globalThis.fetch = originalFetch;
  };
}
