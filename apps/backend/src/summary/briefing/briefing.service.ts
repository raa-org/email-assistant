/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AgendaItemDto, MailMessageDto, SummaryPeriodKind } from '@raa/assistant/common';
import type { AppEnv } from '../../config/env.js';
import { getAppEnv } from '../../config/env.js';
import { LlmProviderRegistryService } from '../../provider/llm-provider-registry.service.js';
import type { LlmRequestOptions, LlmStreamChunk } from '../../provider/provider.types.js';
import { LlmSanitizationService } from '../sanitization/llm-sanitization.service.js';
import type { BriefingInput } from '../digest/digest-aggregator.service.js';

const VALID_PRIORITIES = new Set(['high', 'normal', 'low']);
const VALID_CATEGORIES = new Set(['urgent', 'action', 'info']);

@Injectable()
export class BriefingService {
  private readonly logger = new Logger(BriefingService.name);
  private readonly env: AppEnv;

  constructor(
    private readonly llmProviderRegistry: LlmProviderRegistryService,
    private readonly sanitization: LlmSanitizationService,
    configService: ConfigService<AppEnv>
  ) {
    this.env = getAppEnv(configService);
  }

  async generatePeriodSummary(
    input: BriefingInput,
    periodKind: SummaryPeriodKind,
    llm?: LlmRequestOptions
  ): Promise<string> {
    if (input.totalMessages === 0) {
      return 'No emails found for the selected period.';
    }

    const result = await this.llmProviderRegistry.complete({
      ...this.llmProviderRegistry.resolveRequestOptions(llm),
      json: false,
      messages: [
        { role: 'system', content: this.buildPeriodSummarySystemPrompt(periodKind) },
        { role: 'user', content: this.buildBriefingUserPrompt(input) }
      ]
    });

    return result.content.trim();
  }

  streamPeriodSummary(
    input: BriefingInput,
    periodKind: SummaryPeriodKind,
    llm?: LlmRequestOptions
  ): AsyncIterable<LlmStreamChunk> {
    if (input.totalMessages === 0) {
      return emptyStream('No emails found for the selected period.');
    }

    return this.llmProviderRegistry.streamComplete({
      ...this.llmProviderRegistry.resolveRequestOptions(llm),
      json: false,
      messages: [
        { role: 'system', content: this.buildPeriodSummarySystemPrompt(periodKind) },
        { role: 'user', content: this.buildBriefingUserPrompt(input) }
      ]
    });
  }

  async generateAgenda(
    envelopes: MailMessageDto[],
    periodKind: SummaryPeriodKind,
    llm?: LlmRequestOptions
  ): Promise<AgendaItemDto[]> {
    if (envelopes.length === 0) {
      return [];
    }

    // Process in batches to avoid prompt truncation and LLM attention loss.
    const batches = splitIntoBatches(envelopes, this.env.briefingBatchSize);
    const allItems: AgendaItemDto[] = [];

    this.logger.debug(`Agenda: processing ${envelopes.length} envelopes in ${batches.length} batch(es)`);

    for (const batch of batches) {
      const userPrompt = this.buildEnvelopesUserPrompt(batch, periodKind);

      const result = await this.llmProviderRegistry.complete({
        ...this.llmProviderRegistry.resolveRequestOptions(llm),
        json: true,
        messages: [
          { role: 'system', content: this.buildAgendaSystemPrompt() },
          { role: 'user', content: userPrompt }
        ]
      });

      this.logger.debug(`Agenda batch response (${result.content.length} chars): ${result.content.slice(0, 200)}`);
      const items = parseAgendaResult(result.content, envelopes);
      allItems.push(...items);
    }

    // Deduplicate by sourceUid (same email may appear in context overlap)
    const seen = new Set<string>();
    const deduped = allItems.filter((item) => {
      const uid = item.metadata.sourceUid;
      if (!uid || seen.has(uid)) return !uid ? true : false;
      seen.add(uid);
      return true;
    });

    return deduped.sort((a, b) => priorityWeight(a.priority) - priorityWeight(b.priority));
  }

  streamAgenda(
    envelopes: MailMessageDto[],
    periodKind: SummaryPeriodKind,
    llm?: LlmRequestOptions
  ): AsyncIterable<LlmStreamChunk> {
    if (envelopes.length === 0) {
      return emptyStream('[]');
    }

    return this.llmProviderRegistry.streamComplete({
      ...this.llmProviderRegistry.resolveRequestOptions(llm),
      json: true,
      messages: [
        { role: 'system', content: this.buildAgendaSystemPrompt() },
        { role: 'user', content: this.buildEnvelopesUserPrompt(envelopes, periodKind) }
      ]
    });
  }

  private buildBriefingUserPrompt(input: BriefingInput): string {
    const lines: string[] = [
      `Total emails: ${input.totalMessages}`,
      `Unread: ${input.unreadCount}`,
      `Unique senders: ${input.uniqueSenders}`,
      `Junk: ${input.junkCount}`,
      `Low-priority: ${input.lowPriorityCount}`,
    ];

    if (input.criticalItems.length > 0) {
      lines.push('', 'Critical:');

      for (const item of input.criticalItems) {
        lines.push(`- [${item.from}] "${item.subject}" — ${item.summary}`);
      }
    }

    if (input.notableItems.length > 0) {
      lines.push('', 'Notable:');

      for (const item of input.notableItems) {
        lines.push(`- [${item.from}] "${item.subject}" — ${item.summary}`);
      }
    }

    const categoryParts = Object.entries(input.categoryCounts)
      .filter(([, count]) => count > 0)
      .map(([cat, count]) => `${cat}: ${count}`);

    if (categoryParts.length > 0) {
      lines.push('', `Categories: ${categoryParts.join(', ')}`);
    }

    return lines.join('\n');
  }

  private buildEnvelopesUserPrompt(envelopes: MailMessageDto[], periodKind: SummaryPeriodKind): string {
    const allUnread = periodKind === 'unread';
    const unreadCount = envelopes.filter((e) => e.isUnread).length;
    const readCount = envelopes.length - unreadCount;
    const uniqueSenders = new Set(envelopes.map((e) => e.from)).size;

    const headerLines = [
      `Period: ${periodKind}`,
      `Total emails: ${envelopes.length}`,
      `Unique senders: ${uniqueSenders}`
    ];

    if (allUnread) {
      headerLines.push('Note: all messages in this set are unread (filtered by unread status).');
    } else {
      headerLines.push(`Unread: ${unreadCount}`);
      headerLines.push(`Read: ${readCount}`);
    }

    const items = envelopes
      .map((envelope, index) => {
        const tag = `email-${index + 1}`;
        const lines = [
          `Message ${index + 1} [uid=${envelope.uid} folder=${envelope.folder}]:`,
          `subject: ${this.sanitization.wrapUntrustedInput(`${tag}-subject`, envelope.subject)}`,
          `from: ${this.sanitization.wrapUntrustedInput(`${tag}-from`, envelope.from)}`,
          `received: ${this.sanitization.wrapUntrustedInput(`${tag}-received`, envelope.receivedAt)}`
        ];

        if (!allUnread) {
          lines.push(`unread: ${String(envelope.isUnread)}`);
        }

        lines.push(`preview: ${this.sanitization.wrapUntrustedInput(`${tag}-preview`, envelope.preview)}`);

        return lines.join('\n');
      })
      .join('\n\n');

    return truncateForPrompt(`${headerLines.join('\n')}\n\n${items}`, this.env.briefingMaxPromptChars);
  }

  private buildPeriodSummarySystemPrompt(periodKind: SummaryPeriodKind): string {
    const allUnread = periodKind === 'unread';

    const lines = [
      'IMPORTANT: Output PLAIN TEXT ONLY. Never use markdown. Never use **, ##, ---, bullet points, or numbered lists.',
      '',
      'You are a personal assistant. Your boss just sat down at their desk and you are telling them what happened in their inbox. Speak naturally, like a real person — conversational, warm, concise.',
      '',
      'Use the statistics provided (Total, Unread, etc.) — do not count emails yourself.',
      'Mention the most important things first: urgent requests, deadlines, security alerts.',
      'Name specific people and subjects when relevant.',
      'Briefly mention low-priority stuff (newsletters, notifications) in one sentence at the end.',
      'End with a short recommendation on what to tackle first.',
      '',
      'Write flowing paragraphs. Do not use any formatting — no bold, no headers, no lists, no dashes.',
      'Do not end with "Let me know", "Feel free to ask", or anything like that. Just the briefing.',
    ];

    if (allUnread) {
      lines.push('All messages are unread — do not state this, it is implied.');
    }

    lines.push('', this.sanitization.buildSystemDirective());
    lines.push('', 'Remember: PLAIN TEXT ONLY. No **, no ##, no markdown of any kind.');

    return lines.join('\n');
  }

  private buildAgendaSystemPrompt(): string {
    return [
      'Extract action items from emails. Return ONLY a JSON array. No text before or after the JSON.',
      '',
      'Skip newsletters, notifications, and junk. Only include emails that need the user to DO something.',
      '',
      'Each message header has uid and folder: "Message N [uid=VALUE folder=VALUE]:" — copy these values exactly.',
      '',
      'Priority: "high" = urgent/security/deadline today. "normal" = standard request. "low" = optional.',
      'Category: "urgent" = incidents/security. "action" = approvals/replies/reviews. "info" = FYI items.',
      '',
      'JSON format — follow this example exactly:',
      '[{"title":"Review leave request","description":"Sergey requested days off Apr 16-17","reason":"Needs approval","category":"action","priority":"normal","metadata":{"sourceSubject":"Day off","sourceFrom":"Sergey S.","sourceUid":"19832","sourceFolder":"INBOX","deadline":null}}]',
      '',
      'Rules: title is short (3-6 words). description explains what and why. sourceUid and sourceFolder must come from the message header.',
      'If nothing actionable, return [].',
      '',
      this.sanitization.buildSystemDirective()
    ].join('\n');
  }
}

export function parseAgendaResult(value: string, envelopes: MailMessageDto[]): AgendaItemDto[] {
  const parsed = tryParseJsonArray(value);

  if (!Array.isArray(parsed)) {
    return [];
  }

  const uidSet = new Set(envelopes.map((e) => e.uid));
  const folderByUid = new Map(envelopes.map((e) => [e.uid, e.folder]));

  return parsed
    .filter(isPlainObject)
    .filter(hasRequiredAgendaFields)
    .map((item) => {
      const meta = isPlainObject(item.metadata) ? (item.metadata as Record<string, unknown>) : {};
      const sourceUid = readString(meta.sourceUid, '');

      // Validate sourceUid exists in the original envelope set — reject
      // fabricated UIDs that the LLM might hallucinate or an injected
      // prompt might try to forge.
      const validatedUid = uidSet.has(sourceUid) ? sourceUid : '';
      const validatedFolder = validatedUid ? (folderByUid.get(validatedUid) ?? '') : '';

      const category = readCategory(item.category);

      return {
        title: readString(item.title, 'Untitled task'),
        description: readString(item.description, ''),
        reason: readString(item.reason, ''),
        category,
        priority: readPriority(item.priority),
        metadata: {
          sourceSubject: readString(meta.sourceSubject, ''),
          sourceFrom: readString(meta.sourceFrom, ''),
          sourceUid: validatedUid,
          sourceFolder: validatedFolder,
          ...(typeof meta.deadline === 'string' && meta.deadline.trim().length > 0
            ? { deadline: meta.deadline.trim() }
            : {})
        }
      };
    })
    .filter((item) => item.title !== 'Untitled task' || item.description.length > 0)
    .sort((a, b) => priorityWeight(a.priority) - priorityWeight(b.priority));
}

const PRIORITY_WEIGHT: Record<string, number> = { high: 0, normal: 1, low: 2 };
function priorityWeight(p: string): number {
  return PRIORITY_WEIGHT[p] ?? 1;
}

const CATEGORY_ALIASES: Record<string, AgendaItemDto['category']> = {
  escalation: 'urgent',
  approval: 'action',
  reply: 'action',
  review: 'action',
  schedule: 'action',
  follow_up: 'action',
};

function readCategory(value: unknown): AgendaItemDto['category'] {
  if (typeof value === 'string') {
    const lower = value.toLowerCase();
    if (VALID_CATEGORIES.has(lower)) return lower as AgendaItemDto['category'];
    if (CATEGORY_ALIASES[lower]) return CATEGORY_ALIASES[lower];
  }

  return 'info';
}



function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasRequiredAgendaFields(item: Record<string, unknown>): boolean {
  return (
    typeof item.title === 'string' &&
    typeof item.description === 'string' &&
    typeof item.reason === 'string'
  );
}

function tryParseJsonArray(value: string): unknown[] | undefined {
  try {
    const trimmed = value.trim();
    const start = trimmed.indexOf('[');
    const end = trimmed.lastIndexOf(']');

    if (start >= 0 && end > start) {
      const parsed = JSON.parse(trimmed.slice(start, end + 1)) as unknown;

      return Array.isArray(parsed) ? parsed : undefined;
    }

    return undefined;
  } catch {
    return undefined;
  }
}

function readString(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback;
}

function readPriority(value: unknown): 'high' | 'normal' | 'low' {
  if (typeof value === 'string' && VALID_PRIORITIES.has(value.toLowerCase())) {
    return value.toLowerCase() as 'high' | 'normal' | 'low';
  }

  return 'normal';
}

function truncateForPrompt(value: string, maxChars: number): string {
  return value.length > maxChars ? `${value.slice(0, maxChars)}\n[truncated]` : value;
}

function splitIntoBatches<T>(items: T[], size: number): T[][] {
  const batches: T[][] = [];

  for (let i = 0; i < items.length; i += size) {
    batches.push(items.slice(i, i + size));
  }

  return batches;
}

async function* emptyStream(content: string): AsyncIterable<LlmStreamChunk> {
  yield { content, done: true, model: '', provider: 'ollama' };
}
