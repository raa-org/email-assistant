/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

import type { ConfigService } from '@nestjs/config'
import type { LlmProviderId } from '@raa/assistant/common'

export interface LlmProviderDefaults {
  maxTokens?: number
  seed?: number
  temperature?: number
  topP?: number
}

export interface LlmProviderConfig {
  apiKey?: string
  baseUrl?: string
  defaultModel?: string
  defaultParameters: LlmProviderDefaults
  ollamaPassthrough?: boolean
}

export interface AppEnv {
  frontendHost: string
  frontendPort: number
  backendHost: string
  backendPort: number
  encryptionMasterSecret: string
  imapHost: string
  imapPort: number
  imapTls: boolean
  databaseUrl: string
  redisUrl: string
  llmDefaultProvider: LlmProviderId
  llmRequestTimeoutMs: number
  llmProviders: Record<LlmProviderId, LlmProviderConfig>
  jwtSecret: string
  oidcIssuer: string
  oidcClientId: string
  oidcClientSecret: string
  oidcRedirectUri?: string
  authCookieName: string
  authCookieDomain?: string
  appBaseUrl?: string
  // Time window (in days) used for digest stats blocks (top contacts and
  // sent/received chart). Independent of digest content selection — content
  // is always "all unread" regardless of age.
  digestStatsWindowDays: number
  sentFolder: string
  briefingMaxPromptChars: number
  briefingBatchSize: number
  briefingMaxMessages: number
  briefingCacheTtlMinutes: number
  llmEnrichmentConcurrency: number
}

export function validateEnv(config: Record<string, unknown>): AppEnv {
  return {
    frontendHost: optional(config.FRONTEND_HOST) ?? '0.0.0.0',
    frontendPort: toNumber(config.FRONTEND_PORT ?? 3000, 'FRONTEND_PORT'),
    backendHost: optional(config.BACKEND_HOST) ?? '0.0.0.0',
    backendPort: toNumber(config.BACKEND_PORT ?? config.PORT ?? 3001, 'BACKEND_PORT'),
    encryptionMasterSecret: required(config.ENCRYPTION_MASTER_SECRET, 'ENCRYPTION_MASTER_SECRET'),
    imapHost: required(config.IMAP_HOST, 'IMAP_HOST'),
    imapPort: toNumber(config.IMAP_PORT ?? 993, 'IMAP_PORT'),
    imapTls: toBoolean(config.IMAP_TLS ?? true, 'IMAP_TLS'),
    databaseUrl: resolveDatabaseUrl(config),
    redisUrl: required(config.REDIS_URL, 'REDIS_URL'),
    llmDefaultProvider: toLlmProvider(config.LLM_DEFAULT_PROVIDER ?? 'ollama', 'LLM_DEFAULT_PROVIDER'),
    llmRequestTimeoutMs: toNumber(config.LLM_REQUEST_TIMEOUT_MS ?? 60_000, 'LLM_REQUEST_TIMEOUT_MS'),
    llmProviders: {
      ollama: readProviderConfig(config, 'OLLAMA'),
      'openai-compatible': {
        ...readProviderConfig(config, 'OPENAI_COMPATIBLE'),
        ollamaPassthrough: toBoolean(
          config.LLM_OPENAI_COMPATIBLE_OLLAMA_PASSTHROUGH ?? false,
          'LLM_OPENAI_COMPATIBLE_OLLAMA_PASSTHROUGH',
        ),
      },
    },
    jwtSecret: required(config.JWT_SECRET, 'JWT_SECRET'),
    oidcIssuer: required(config.OIDC_ISSUER, 'OIDC_ISSUER'),
    oidcClientId: required(config.OIDC_CLIENT_ID, 'OIDC_CLIENT_ID'),
    oidcClientSecret: required(config.OIDC_CLIENT_SECRET, 'OIDC_CLIENT_SECRET'),
    oidcRedirectUri: optional(config.OIDC_REDIRECT_URI),
    authCookieName: optional(config.AUTH_COOKIE_NAME) ?? 'raa_assistant_session',
    authCookieDomain: optional(config.AUTH_COOKIE_DOMAIN),
    appBaseUrl: optional(config.APP_BASE_URL),
    digestStatsWindowDays: toNumber(config.DIGEST_STATS_WINDOW_DAYS ?? 7, 'DIGEST_STATS_WINDOW_DAYS'),
    sentFolder: optional(config.SENT_FOLDER) ?? 'Sent',
    briefingMaxPromptChars: toNumber(config.BRIEFING_MAX_PROMPT_CHARS ?? 24_000, 'BRIEFING_MAX_PROMPT_CHARS'),
    briefingBatchSize: toNumber(config.BRIEFING_BATCH_SIZE ?? 10, 'BRIEFING_BATCH_SIZE'),
    briefingMaxMessages: toNumber(config.BRIEFING_MAX_MESSAGES ?? 500, 'BRIEFING_MAX_MESSAGES'),
    briefingCacheTtlMinutes: toNumber(config.BRIEFING_CACHE_TTL_MINUTES ?? 30, 'BRIEFING_CACHE_TTL_MINUTES'),
    llmEnrichmentConcurrency: toNumber(config.LLM_ENRICHMENT_CONCURRENCY ?? 0, 'LLM_ENRICHMENT_CONCURRENCY'),
  }
}

export function loadValidatedProcessEnv(): AppEnv {
  return validateEnv(process.env)
}

export function getAppEnv(configService: ConfigService<AppEnv>): AppEnv {
  return {
    frontendHost: configService.getOrThrow('frontendHost', { infer: true }),
    frontendPort: configService.getOrThrow('frontendPort', { infer: true }),
    backendHost: configService.getOrThrow('backendHost', { infer: true }),
    backendPort: configService.getOrThrow('backendPort', { infer: true }),
    encryptionMasterSecret: configService.getOrThrow('encryptionMasterSecret', { infer: true }),
    imapHost: configService.getOrThrow('imapHost', { infer: true }),
    imapPort: configService.getOrThrow('imapPort', { infer: true }),
    imapTls: configService.getOrThrow('imapTls', { infer: true }),
    databaseUrl: configService.getOrThrow('databaseUrl', { infer: true }),
    redisUrl: configService.getOrThrow('redisUrl', { infer: true }),
    llmDefaultProvider: configService.getOrThrow('llmDefaultProvider', { infer: true }),
    llmRequestTimeoutMs: configService.getOrThrow('llmRequestTimeoutMs', { infer: true }),
    llmProviders: configService.getOrThrow('llmProviders', { infer: true }),
    jwtSecret: configService.getOrThrow('jwtSecret', { infer: true }),
    oidcIssuer: configService.getOrThrow('oidcIssuer', { infer: true }),
    oidcClientId: configService.getOrThrow('oidcClientId', { infer: true }),
    oidcClientSecret: configService.getOrThrow('oidcClientSecret', { infer: true }),
    oidcRedirectUri: configService.get('oidcRedirectUri', { infer: true }),
    authCookieName: configService.getOrThrow('authCookieName', { infer: true }),
    authCookieDomain: configService.get('authCookieDomain', { infer: true }),
    appBaseUrl: configService.get('appBaseUrl', { infer: true }),
    digestStatsWindowDays: configService.getOrThrow('digestStatsWindowDays', { infer: true }),
    sentFolder: configService.getOrThrow('sentFolder', { infer: true }),
    briefingMaxPromptChars: configService.getOrThrow('briefingMaxPromptChars', { infer: true }),
    briefingBatchSize: configService.getOrThrow('briefingBatchSize', { infer: true }),
    briefingMaxMessages: configService.getOrThrow('briefingMaxMessages', { infer: true }),
    briefingCacheTtlMinutes: configService.getOrThrow('briefingCacheTtlMinutes', { infer: true }),
    llmEnrichmentConcurrency: configService.getOrThrow('llmEnrichmentConcurrency', { infer: true }),
  }
}

function readProviderConfig(
  config: Record<string, unknown>,
  prefix: 'OLLAMA' | 'OPENAI_COMPATIBLE',
): LlmProviderConfig {
  return {
    baseUrl: optional(config[`LLM_${prefix}_BASE_URL`]),
    apiKey: optional(config[`LLM_${prefix}_API_KEY`]),
    defaultModel: optional(config[`LLM_${prefix}_DEFAULT_MODEL`]),
    defaultParameters: {
      temperature: optionalNumber(config[`LLM_${prefix}_DEFAULT_TEMPERATURE`], `LLM_${prefix}_DEFAULT_TEMPERATURE`),
      topP: optionalNumber(config[`LLM_${prefix}_DEFAULT_TOP_P`], `LLM_${prefix}_DEFAULT_TOP_P`),
      maxTokens: optionalNumber(config[`LLM_${prefix}_DEFAULT_MAX_TOKENS`], `LLM_${prefix}_DEFAULT_MAX_TOKENS`),
      seed: optionalNumber(config[`LLM_${prefix}_DEFAULT_SEED`], `LLM_${prefix}_DEFAULT_SEED`),
    },
  }
}

function required(value: unknown, key: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Missing required environment variable: ${key}`)
  }

  return value
}

function optional(value: unknown): string | undefined {
  if (typeof value !== 'string' || value.length === 0) {
    return undefined
  }

  return value
}

function resolveDatabaseUrl(config: Record<string, unknown>): string {
  const explicit = optional(config.DATABASE_URL)

  if (explicit) {
    return explicit
  }

  const host = required(config.DB_HOST, 'DB_HOST')
  const port = toNumber(config.DB_PORT ?? 5432, 'DB_PORT')
  const user = required(config.DB_USER, 'DB_USER')
  const password = required(config.DB_PASSWORD, 'DB_PASSWORD')
  const database = required(config.DB_NAME, 'DB_NAME')

  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${database}`
}

function toLlmProvider(value: unknown, key: string): LlmProviderId {
  if (value === 'ollama' || value === 'openai-compatible') {
    return value
  }

  throw new Error(`Environment variable ${key} must be one of: ollama, openai-compatible`)
}

function toNumber(value: unknown, key: string): number {
  const parsed = Number(value)

  if (!Number.isFinite(parsed)) {
    throw new Error(`Environment variable ${key} must be a valid number`)
  }

  return parsed
}

function optionalNumber(value: unknown, key: string): number | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined
  }

  const parsed = Number(value)

  if (!Number.isFinite(parsed)) {
    throw new Error(`Environment variable ${key} must be a valid number`)
  }

  return parsed
}

function toBoolean(value: unknown, key: string): boolean {
  if (typeof value === 'boolean') {
    return value
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()

    if (['true', '1', 'yes', 'on'].includes(normalized)) {
      return true
    }

    if (['false', '0', 'no', 'off'].includes(normalized)) {
      return false
    }
  }

  throw new Error(`Environment variable ${key} must be a valid boolean`)
}
