/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

import { Body, Controller, Logger, MessageEvent, Post, Query, Req, Sse } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommandBus, EventBus, QueryBus } from '@nestjs/cqrs';
import { ApiBody, ApiCookieAuth, ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import type { AgendaResultDto, PeriodSummaryResultDto, SummaryPeriodDto, SummaryResultDto } from '@raa/assistant/common';
import { createHash, randomUUID } from 'node:crypto';
import { Observable, defer, filter, map, merge, takeUntil, takeWhile, timer } from 'rxjs';
import { AuthService } from '../auth/auth.service.js';
import type { AppEnv } from '../config/env.js';
import { getAppEnv } from '../config/env.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { MailReadService } from '../mail/mail.read-service.js';
import type { MailAuthContext } from '../mail/mail.types.js';
import { LlmProviderRegistryService } from '../provider/llm-provider-registry.service.js';
import { GenerateAgendaCommand } from './briefing/commands/generate-agenda.command.js';
import { GeneratePeriodSummaryCommand } from './briefing/commands/generate-period-summary.command.js';
import { AgendaRequestDto } from './briefing/dto/agenda-request.dto.js';
import { PeriodSummaryRequestDto } from './briefing/dto/period-summary-request.dto.js';
import { AgendaFailedEvent } from './briefing/events/agenda-failed.event.js';
import { AgendaReadyEvent } from './briefing/events/agenda-ready.event.js';
import { PeriodSummaryFailedEvent } from './briefing/events/period-summary-failed.event.js';
import { PeriodSummaryReadyEvent } from './briefing/events/period-summary-ready.event.js';
import { BriefingService } from './briefing/briefing.service.js';
import { normalizePeriod, resolvePeriod } from './briefing/period-resolver.js';
import { computeLlmParamsHash } from './briefing/storage/briefing.constants.js';
import { StoreBriefingCommand } from './briefing/storage/commands/store-briefing.command.js';
import { GetBriefingQuery } from './briefing/storage/queries/get-briefing.query.js';
import { GenerateBatchSummaryCommand } from './commands/generate-batch-summary.command.js';
import { GenerateMessageSummaryCommand } from './commands/generate-message-summary.command.js';
import { StoreMessageSummaryCommand } from './message-summary/commands/store-message-summary.command.js';
import type { StoredMessageSummary } from './message-summary/message-summary.types.js';
import { GetMessageSummaryQuery } from './message-summary/queries/get-message-summary.query.js';
import { GetMessageSummariesByUidsQuery } from './message-summary/queries/get-message-summaries-by-uids.query.js';
import type { ClassifiedMessage } from './digest/digest-aggregator.service.js';
import { DigestAggregatorService } from './digest/digest-aggregator.service.js';
import { MessageBodyFetchedEvent } from './enrichment/events/message-body-fetched.event.js';
import { MessageEnrichedEvent } from './enrichment/events/message-enriched.event.js';
import { parseSummaryResult, SUMMARY_PROMPT_VERSION, SummaryService } from './summary.service.js';
import { GenerateDigestCommand } from './digest/commands/generate-digest.command.js';
import { DigestBlockReadyEvent } from './digest/events/digest-block-ready.event.js';
import { DigestChartReadyEvent } from './digest/events/digest-chart-ready.event.js';
import { DigestCompletedEvent } from './digest/events/digest-completed.event.js';
import { DigestContactsReadyEvent } from './digest/events/digest-contacts-ready.event.js';
import { DigestFailedEvent } from './digest/events/digest-failed.event.js';
import { DigestStatsReadyEvent } from './digest/events/digest-stats-ready.event.js';
import { BatchSummaryRequestDto } from './dto/batch-summary-request.dto.js';
import { SummaryResultResponseDto } from './dto/summary-response.dto.js';
import { MessageSummaryRequestDto } from './dto/message-summary-request.dto.js';

interface SummaryRequest {
  headers: {
    cookie?: string;
  };
  user: AuthenticatedUser;
}

const DIGEST_STREAM_TIMEOUT_MS = 2 * 60 * 1000;
const BRIEFING_STREAM_TIMEOUT_MS = 2 * 60 * 1000;

@ApiTags('summary')
@ApiCookieAuth()
@Controller('summary')
export class SummaryController {
  private readonly logger = new Logger(SummaryController.name);
  private readonly env: AppEnv;

  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly eventBus: EventBus,
    private readonly authService: AuthService,
    private readonly mailReadService: MailReadService,
    private readonly llmProviderRegistry: LlmProviderRegistryService,
    private readonly summaryService: SummaryService,
    private readonly briefingService: BriefingService,
    private readonly aggregator: DigestAggregatorService,
    configService: ConfigService<AppEnv>
  ) {
    this.env = getAppEnv(configService);
  }

  @ApiOperation({ summary: 'Generate a summary for a single message' })
  @ApiBody({ type: MessageSummaryRequestDto })
  @ApiOkResponse({ type: SummaryResultResponseDto })
  @Post('message')
  async summarizeMessage(@Req() request: SummaryRequest, @Body() body: MessageSummaryRequestDto): Promise<SummaryResultDto> {
    return this.commandBus.execute(
      new GenerateMessageSummaryCommand(
        request.user.id,
        body.uid,
        body.folder,
        await this.createMailAuthContext(request),
        body.llm
      )
    );
  }

  @ApiOperation({
    summary: 'Stream a single-message summary via SSE',
    description:
      'If the summary is cached, emits a single "result" event immediately. ' +
      'Otherwise streams LLM tokens as "chunk" events followed by a "result" event with the parsed summary.'
  })
  @ApiQuery({ name: 'uid', required: true })
  @ApiQuery({ name: 'folder', required: false, example: 'INBOX' })
  @ApiQuery({ name: 'force', required: false, description: 'Skip cache and re-summarize' })
  @Sse('message/stream')
  streamMessageSummary(
    @Req() request: SummaryRequest,
    @Query('uid') uid: string,
    @Query('folder') folder = 'INBOX',
    @Query('force') force?: string
  ): Observable<MessageEvent> {
    const userId = request.user.id;
    const skipCache = force === 'true' || force === '1';

    return new Observable<MessageEvent>((subscriber) => {
      void (async () => {
        try {
          const auth = await this.createMailAuthContext(request);
          const message = await this.mailReadService.getMessage(auth, folder, uid);
          const bodyHash = createHash('sha256').update(message.bodyText, 'utf8').digest('hex');
          const resolved = this.llmProviderRegistry.resolveRequestOptions(undefined);

          // 1. Check cache (unless forced re-summarize)
          if (!skipCache) {
            const cached = await this.queryBus.execute<GetMessageSummaryQuery, StoredMessageSummary | null>(
              new GetMessageSummaryQuery(userId, folder, uid, bodyHash, SUMMARY_PROMPT_VERSION, resolved.model, resolved.provider)
            );

            if (cached) {
              subscriber.next({ type: 'result', data: cached.payload });
              subscriber.next({ type: 'done', data: {} });
              subscriber.complete();
              return;
            }
          }

          // 2. Stream LLM response
          let accumulated = '';

          for await (const chunk of this.summaryService.streamSummarizeMessage(message)) {
            accumulated += chunk.content;
            subscriber.next({ type: 'chunk', data: { content: chunk.content, accumulated } });

            if (chunk.done) {
              break;
            }
          }

          // 3. Parse + cache the final result
          const parsed = parseSummaryResult(accumulated, `Summary for ${message.subject}`, message.attachments);

          await this.commandBus.execute(
            new StoreMessageSummaryCommand(userId, folder, uid, bodyHash, SUMMARY_PROMPT_VERSION, resolved.model, resolved.provider, parsed)
          );

          subscriber.next({ type: 'result', data: parsed });
          subscriber.next({ type: 'done', data: {} });
          subscriber.complete();
        } catch (error) {
          const msg = error instanceof Error ? error.message : 'Stream failed';

          this.logger.error(`Message summary stream failed: ${msg}`);
          subscriber.next({ type: 'error', data: { message: msg } });
          subscriber.complete();
        }
      })();

      return () => {
        // Cleanup — stream is driven by async iteration, so nothing to
        // explicitly cancel here. The subscriber.complete() above handles
        // normal teardown.
      };
    });
  }

  @ApiOperation({ summary: 'Generate a batch summary for a folder' })
  @ApiBody({ type: BatchSummaryRequestDto })
  @ApiOkResponse({ type: SummaryResultResponseDto })
  @Post('batch')
  async summarizeBatch(@Req() request: SummaryRequest, @Body() body: BatchSummaryRequestDto): Promise<SummaryResultDto> {
    return this.commandBus.execute(
      new GenerateBatchSummaryCommand(body.folder, await this.createMailAuthContext(request), body.limit ?? 10, body.llm)
    );
  }

  @ApiOperation({ summary: 'Generate the default daily summary' })
  @ApiOkResponse({ type: SummaryResultResponseDto })
  @Post('today')
  async summarizeToday(@Req() request: SummaryRequest): Promise<SummaryResultDto> {
    return this.commandBus.execute(
      new GenerateBatchSummaryCommand('INBOX', await this.createMailAuthContext(request), 10)
    );
  }

  @ApiOperation({ summary: 'Generate the default weekly summary' })
  @ApiOkResponse({ type: SummaryResultResponseDto })
  @Post('week')
  async summarizeWeek(@Req() request: SummaryRequest): Promise<SummaryResultDto> {
    return this.commandBus.execute(
      new GenerateBatchSummaryCommand('INBOX', await this.createMailAuthContext(request), 25)
    );
  }

  @ApiOperation({
    summary: 'Stream digest events as they become ready (SSE)',
    description:
      'Digest content is always "all unread" (no time bound). The stats blocks (top contacts, sent/received chart) use a fixed N-day window configured server-side via DIGEST_STATS_WINDOW_DAYS.'
  })
  @ApiQuery({ name: 'folder', required: false, example: 'INBOX' })
  @Sse('digest/stream')
  streamDigest(@Req() request: SummaryRequest, @Query('folder') folder = 'INBOX'): Observable<MessageEvent> {
    const userId = request.user.id;

    // Subscribe BEFORE dispatching the command so we don't miss the first
    // events (the command publishes synchronously inside its handler).
    const events$ = this.eventBus.pipe(
      filter((event) => isDigestEventForUser(event, userId)),
      map((event) => toMessageEvent(event)),
      takeWhile((message) => message.type !== 'done' && message.type !== 'error', true)
    );

    const dispatch$ = defer(async () => {
      const auth = await this.createMailAuthContext(request);

      await this.commandBus.execute(new GenerateDigestCommand(userId, auth, folder));
    });

    // Hard cap so a hung run cannot keep the SSE socket open forever.
    const timeout$ = timer(DIGEST_STREAM_TIMEOUT_MS).pipe(
      map((): MessageEvent => ({
        type: 'error',
        data: { message: 'Digest generation timed out' }
      }))
    );

    return merge(
      events$,
      timeout$.pipe(takeUntil(events$.pipe(filter((m) => m.type === 'done'))))
    ).pipe(
      // Kick off the dispatch lazily on first subscriber connect.
      (source) =>
        new Observable<MessageEvent>((subscriber) => {
          const sub = source.subscribe(subscriber);
          dispatch$.subscribe({
            error: (error) => {
              subscriber.next({
                type: 'error',
                data: { message: error instanceof Error ? error.message : 'Digest dispatch failed' }
              });
              subscriber.complete();
            }
          });
          return () => sub.unsubscribe();
        })
    );
  }

  // ── L1 Enrichment ────────────────────────────────────────────────

  @ApiOperation({
    summary: 'Enrich messages via SSE (L1 per-message analysis)',
    description:
      'Fetches message bodies and runs LLM enrichment for each. Streams progress events. ' +
      'Call this before briefing/digest so they read from warm L1 cache.'
  })
  @ApiQuery({ name: 'kind', required: true, enum: ['unread', 'today', 'yesterday', 'week', 'month', 'custom'] })
  @ApiQuery({ name: 'folder', required: false, example: 'INBOX' })
  @ApiQuery({ name: 'unreadOnly', required: false })
  @ApiQuery({ name: 'force', required: false })
  @ApiQuery({ name: 'dateFrom', required: false })
  @ApiQuery({ name: 'dateTo', required: false })
  @Sse('enrich/stream')
  streamEnrichment(
    @Req() request: SummaryRequest,
    @Query('kind') kind: SummaryPeriodDto['kind'],
    @Query('folder') folder = 'INBOX',
    @Query('unreadOnly') unreadOnlyRaw?: string,
    @Query('force') forceRaw?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string
  ): Observable<MessageEvent> {
    const userId = request.user.id;
    const period = normalizePeriod(kind, dateFrom, dateTo);
    const unreadOnly = unreadOnlyRaw === 'true' || unreadOnlyRaw === '1';
    const force = forceRaw === 'true' || forceRaw === '1';

    return new Observable<MessageEvent>((subscriber) => {
      void (async () => {
        try {
          const auth = await this.createMailAuthContext(request);
          const resolved = resolvePeriod(period, unreadOnly);
          const envelopes = await this.mailReadService.listMessages(auth, folder, {
            limit: this.env.briefingMaxMessages,
            offset: 0,
            since: resolved.since,
            before: resolved.before,
            unreadOnly: resolved.unreadOnly
          });

          const resolvedLlm = this.llmProviderRegistry.resolveRequestOptions(undefined);
          const { model: llmModel, provider: llmProvider } = resolvedLlm;

          // Bulk-load cached L1 summaries
          const cachedMap = force ? new Map<string, StoredMessageSummary>() : await this.queryBus.execute<
            GetMessageSummariesByUidsQuery,
            Map<string, StoredMessageSummary>
          >(
            new GetMessageSummariesByUidsQuery(userId, folder, envelopes.map((e) => e.uid), SUMMARY_PROMPT_VERSION, llmModel, llmProvider)
          );

          const freshEnvelopes = envelopes.filter((e) => !cachedMap.has(e.uid));

          if (freshEnvelopes.length === 0) {
            subscriber.next({ type: 'done', data: { total: envelopes.length, enriched: 0 } });
            subscriber.complete();
            return;
          }

          // Pipeline: IMAP fetch → EventBus → async LLM enrichment
          const correlationId = randomUUID();
          const envelopeByUid = new Map(freshEnvelopes.map((e) => [e.uid, e]));
          let enrichedCount = 0;

          const enrichmentDone = new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => {
              sub.unsubscribe();
              reject(new Error(`Enrichment timed out after ${enrichedCount}/${freshEnvelopes.length}`));
            }, BRIEFING_STREAM_TIMEOUT_MS);

            const sub = this.eventBus.pipe(
              filter((event: unknown): event is MessageEnrichedEvent =>
                event instanceof MessageEnrichedEvent && event.correlationId === correlationId
              ),
            ).subscribe((event) => {
              enrichedCount++;

              if (event.error) {
                subscriber.next({ type: 'enrichment-error', data: { current: enrichedCount, total: freshEnvelopes.length, message: event.error } });
              } else {
                subscriber.next({ type: 'enrichment', data: { current: enrichedCount, total: freshEnvelopes.length } });
              }

              if (enrichedCount >= freshEnvelopes.length) {
                clearTimeout(timeout);
                sub.unsubscribe();
                resolve();
              }
            });
          });

          // IMAP fetch — single session, publish events
          const sessionOwner = await this.authService.getSessionOwnerFromCookie(request.headers.cookie);
          const refreshAuth = () => this.authService.refreshMailAuthContext(sessionOwner, sessionOwner.email);

          await this.mailReadService.fetchMessagesWithCallback(
            refreshAuth, folder, freshEnvelopes.map((e) => e.uid),
            (uid, message) => {
              const envelope = envelopeByUid.get(uid);
              if (envelope) {
                this.eventBus.publish(
                  new MessageBodyFetchedEvent(userId, correlationId, envelope, message, llmModel, llmProvider)
                );
              }
            }
          );

          await enrichmentDone;

          subscriber.next({ type: 'done', data: { total: envelopes.length, enriched: freshEnvelopes.length } });
          subscriber.complete();
        } catch (error) {
          const msg = error instanceof Error ? error.message : 'Enrichment stream failed';

          this.logger.error(`Enrichment stream failed: ${msg}`);
          subscriber.next({ type: 'error', data: { message: msg } });
          await new Promise((r) => setImmediate(r));
          subscriber.complete();
        }
      })();

      return () => {};
    });
  }

  // ── Briefing: Period Summary ──────────────────────────────────────

  @ApiOperation({ summary: 'Generate a free-form period summary of emails' })
  @ApiBody({ type: PeriodSummaryRequestDto })
  @Post('briefing/period-summary')
  async periodSummary(
    @Req() request: SummaryRequest,
    @Body() body: PeriodSummaryRequestDto
  ): Promise<PeriodSummaryResultDto> {
    const period = normalizePeriod(body.kind, body.dateFrom, body.dateTo);

    return this.commandBus.execute(
      new GeneratePeriodSummaryCommand(
        request.user.id,
        await this.createMailAuthContext(request),
        body.folder ?? 'INBOX',
        period,
        body.unreadOnly,
        body.llm,
        body.force
      )
    );
  }

  @ApiOperation({
    summary: 'Stream a period summary via SSE',
    description: 'Streams LLM tokens as "chunk" events, then emits a "result" event with the full summary.'
  })
  @ApiQuery({ name: 'kind', required: true, enum: ['unread', 'today', 'yesterday', 'week', 'month', 'custom'] })
  @ApiQuery({ name: 'folder', required: false, example: 'INBOX' })
  @ApiQuery({ name: 'unreadOnly', required: false, example: 'false' })
  @ApiQuery({ name: 'force', required: false, example: 'false' })
  @ApiQuery({ name: 'dateFrom', required: false })
  @ApiQuery({ name: 'dateTo', required: false })
  @Sse('briefing/period-summary/stream')
  streamPeriodSummary(
    @Req() request: SummaryRequest,
    @Query('kind') kind: SummaryPeriodDto['kind'],
    @Query('folder') folder = 'INBOX',
    @Query('unreadOnly') unreadOnlyRaw?: string,
    @Query('force') forceRaw?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string
  ): Observable<MessageEvent> {
    const userId = request.user.id;
    const period = normalizePeriod(kind, dateFrom, dateTo);
    const unreadOnly = unreadOnlyRaw === 'true' || unreadOnlyRaw === '1';
    const force = forceRaw === 'true' || forceRaw === '1';

    const events$ = this.eventBus.pipe(
      filter(
        (event): event is PeriodSummaryReadyEvent | PeriodSummaryFailedEvent =>
          (event instanceof PeriodSummaryReadyEvent || event instanceof PeriodSummaryFailedEvent) &&
          event.userId === userId
      ),
      map((event): MessageEvent =>
        event instanceof PeriodSummaryReadyEvent
          ? { type: 'done', data: event.result }
          : { type: 'error', data: { message: event.message } }
      ),
      takeWhile((msg) => msg.type !== 'done' && msg.type !== 'error', true)
    );

    return new Observable<MessageEvent>((subscriber) => {
      void (async () => {
        try {
          const auth = await this.createMailAuthContext(request);
          const resolved = resolvePeriod(period, unreadOnly);
          const envelopes = await this.mailReadService.listMessages(auth, folder, {
            limit: this.env.briefingMaxMessages,
            offset: 0,
            since: resolved.since,
            before: resolved.before,
            unreadOnly: resolved.unreadOnly
          });

          const sourceMessageUids = envelopes.map((e) => e.uid);
          const uidsHash = computeUidsHash(sourceMessageUids);
          const resolvedLlm = this.llmProviderRegistry.resolveRequestOptions(undefined);
          const { model: llmModel, provider: llmProvider } = resolvedLlm;
          const llmParamsHash = computeLlmParamsHash(SUMMARY_PROMPT_VERSION, llmModel, llmProvider, resolvedLlm.parameters);
          const df = period.dateFrom ?? '_';
          const dt = period.dateTo ?? '_';

          // Check L3 cache (unless force refresh)
          if (!force) {
            const cached = await this.queryBus.execute<GetBriefingQuery, PeriodSummaryResultDto | null>(
              new GetBriefingQuery(userId, folder, period.kind, df, dt, 'summary', envelopes.length, uidsHash, llmParamsHash)
            );

            if (cached) {
              await streamCachedText(cached.summary, subscriber);
              subscriber.next({ type: 'result', data: cached });
              subscriber.next({ type: 'done', data: {} });
              subscriber.complete();
              return;
            }
          }

          // L1: Read from cache (enrichment endpoint should have been called first)
          const cachedMap = await this.queryBus.execute<
            GetMessageSummariesByUidsQuery,
            Map<string, StoredMessageSummary>
          >(
            new GetMessageSummariesByUidsQuery(userId, folder, sourceMessageUids, SUMMARY_PROMPT_VERSION, llmModel, llmProvider)
          );

          const classified: ClassifiedMessage[] = [];
          for (const envelope of envelopes) {
            const stored = cachedMap.get(envelope.uid);
            if (stored) {
              classified.push({ envelope, summary: stored.payload });
            }
          }

          // L2: Deterministic aggregation
          const briefingInput = this.aggregator.buildBriefingInput(classified, envelopes);

          // L3: Stream narrative from LLM
          let accumulated = '';

          for await (const chunk of this.briefingService.streamPeriodSummary(briefingInput, kind)) {
            accumulated += chunk.content;
            subscriber.next({ type: 'chunk', data: { content: chunk.content, accumulated } });

            if (chunk.done) {
              break;
            }
          }

          const result: PeriodSummaryResultDto = {
            summary: accumulated.trim(),
            totalMessages: envelopes.length,
            sourceMessageUids,
            period,
            generatedAt: new Date().toISOString()
          };

          // Store L3 in cache
          await this.commandBus.execute(
            new StoreBriefingCommand(userId, folder, period.kind, df, dt, 'summary', envelopes.length, uidsHash, llmParamsHash, llmModel, llmProvider, result)
          );

          subscriber.next({ type: 'result', data: result });
          subscriber.next({ type: 'done', data: {} });
          subscriber.complete();
        } catch (error) {
          const msg = error instanceof Error ? error.message : 'Period summary stream failed';

          this.logger.error(`Period summary stream failed: ${msg}`);
          subscriber.next({ type: 'error', data: { message: msg } });
          subscriber.complete();
        }
      })();

      return () => {};
    });
  }

  // ── Briefing: Agenda ────────────────────────────────────────────

  @ApiOperation({ summary: 'Generate an agenda with detected action items from emails' })
  @ApiBody({ type: AgendaRequestDto })
  @Post('briefing/agenda')
  async agenda(
    @Req() request: SummaryRequest,
    @Body() body: AgendaRequestDto
  ): Promise<AgendaResultDto> {
    const period = normalizePeriod(body.kind, body.dateFrom, body.dateTo);

    return this.commandBus.execute(
      new GenerateAgendaCommand(
        request.user.id,
        await this.createMailAuthContext(request),
        body.folder ?? 'INBOX',
        period,
        body.unreadOnly,
        body.llm,
        body.force
      )
    );
  }

  @ApiOperation({
    summary: 'Stream agenda generation via SSE',
    description: 'Streams LLM tokens as "chunk" events, then emits a "result" event with parsed agenda items.'
  })
  @ApiQuery({ name: 'kind', required: true, enum: ['unread', 'today', 'yesterday', 'week', 'month', 'custom'] })
  @ApiQuery({ name: 'folder', required: false, example: 'INBOX' })
  @ApiQuery({ name: 'unreadOnly', required: false, example: 'false' })
  @ApiQuery({ name: 'force', required: false, example: 'false' })
  @ApiQuery({ name: 'dateFrom', required: false })
  @ApiQuery({ name: 'dateTo', required: false })
  @Sse('briefing/agenda/stream')
  streamAgenda(
    @Req() request: SummaryRequest,
    @Query('kind') kind: SummaryPeriodDto['kind'],
    @Query('folder') folder = 'INBOX',
    @Query('unreadOnly') unreadOnlyRaw?: string,
    @Query('force') forceRaw?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string
  ): Observable<MessageEvent> {
    const userId = request.user.id;
    const period = normalizePeriod(kind, dateFrom, dateTo);
    const force = forceRaw === 'true' || forceRaw === '1';
    const unreadOnly = unreadOnlyRaw === 'true' || unreadOnlyRaw === '1';

    return new Observable<MessageEvent>((subscriber) => {
      void (async () => {
        try {
          const auth = await this.createMailAuthContext(request);
          const resolved = resolvePeriod(period, unreadOnly);
          const envelopes = await this.mailReadService.listMessages(auth, folder, {
            limit: this.env.briefingMaxMessages,
            offset: 0,
            since: resolved.since,
            before: resolved.before,
            unreadOnly: resolved.unreadOnly
          });

          const sourceMessageUids = envelopes.map((e) => e.uid);
          const uidsHash = computeUidsHash(sourceMessageUids);
          const resolvedLlm = this.llmProviderRegistry.resolveRequestOptions(undefined);
          const { model: llmModel, provider: llmProvider } = resolvedLlm;
          const llmParamsHash = computeLlmParamsHash(SUMMARY_PROMPT_VERSION, llmModel, llmProvider, resolvedLlm.parameters);
          const df = period.dateFrom ?? '_';
          const dt = period.dateTo ?? '_';

          // Check cache (unless force refresh)
          if (!force) {
            const cached = await this.queryBus.execute<GetBriefingQuery, AgendaResultDto | null>(
              new GetBriefingQuery(userId, folder, period.kind, df, dt, 'agenda', envelopes.length, uidsHash, llmParamsHash)
            );

            if (cached) {
              subscriber.next({ type: 'result', data: cached });
              subscriber.next({ type: 'done', data: {} });
              subscriber.complete();
              return;
            }
          }

          // L1: Read from cache (enrichment endpoint should have been called first)
          const cachedMap = await this.queryBus.execute<
            GetMessageSummariesByUidsQuery,
            Map<string, StoredMessageSummary>
          >(
            new GetMessageSummariesByUidsQuery(userId, folder, sourceMessageUids, SUMMARY_PROMPT_VERSION, llmModel, llmProvider)
          );

          const classified: ClassifiedMessage[] = [];
          for (const envelope of envelopes) {
            const stored = cachedMap.get(envelope.uid);
            if (stored) {
              classified.push({ envelope, summary: stored.payload });
            }
          }

          // L2: Build agenda deterministically from L1 data (no LLM)
          const items = this.aggregator.buildAgendaFromL1(classified);

          const result: AgendaResultDto = {
            items,
            totalMessages: envelopes.length,
            sourceMessageUids,
            period,
            generatedAt: new Date().toISOString()
          };

          // Store in cache
          await this.commandBus.execute(
            new StoreBriefingCommand(userId, folder, period.kind, df, dt, 'agenda', envelopes.length, uidsHash, llmParamsHash, llmModel, llmProvider, result)
          );

          subscriber.next({ type: 'result', data: result });
          subscriber.next({ type: 'done', data: {} });
          subscriber.complete();
        } catch (error) {
          const msg = error instanceof Error ? error.message : 'Agenda stream failed';

          this.logger.error(`Agenda stream failed: ${msg}`);
          subscriber.next({ type: 'error', data: { message: msg } });
          subscriber.complete();
        }
      })();

      return () => {};
    });
  }

  private async createMailAuthContext(request: SummaryRequest): Promise<MailAuthContext> {
    return this.authService.getMailAuthContextFromCookie(request.headers.cookie);
  }
}

type DigestEvent =
  | DigestStatsReadyEvent
  | DigestBlockReadyEvent
  | DigestContactsReadyEvent
  | DigestChartReadyEvent
  | DigestCompletedEvent
  | DigestFailedEvent;

// Streams cached text as word-sized chunks with small delays so the
// frontend sees the same chunk→result→done sequence as a live LLM stream.
async function streamCachedText(
  text: string,
  subscriber: { next: (msg: MessageEvent) => void },
  chunkSize = 12
): Promise<void> {
  let accumulated = '';

  for (let i = 0; i < text.length; i += chunkSize) {
    const content = text.slice(i, i + chunkSize);
    accumulated += content;
    subscriber.next({ type: 'chunk', data: { content, accumulated } });

    // Yield to event loop every few chunks so SSE flushes
    if (i % (chunkSize * 4) === 0) {
      await new Promise((resolve) => setImmediate(resolve));
    }
  }
}

function computeUidsHash(uids: string[]): string {
  return createHash('sha256').update([...uids].sort().join(','), 'utf8').digest('hex');
}

function isDigestEventForUser(event: unknown, userId: string): event is DigestEvent {
  return (
    (event instanceof DigestStatsReadyEvent ||
      event instanceof DigestBlockReadyEvent ||
      event instanceof DigestContactsReadyEvent ||
      event instanceof DigestChartReadyEvent ||
      event instanceof DigestCompletedEvent ||
      event instanceof DigestFailedEvent) &&
    event.userId === userId
  );
}

function toMessageEvent(event: DigestEvent): MessageEvent {
  if (event instanceof DigestStatsReadyEvent) {
    return {
      type: 'stats',
      data: { totalProcessed: event.totalProcessed, generatedAt: event.generatedAt }
    };
  }

  if (event instanceof DigestBlockReadyEvent) {
    return {
      type: `block:${event.blockId}`,
      data: { blockId: event.blockId, block: event.block }
    };
  }

  if (event instanceof DigestContactsReadyEvent) {
    return {
      type: 'contacts',
      data: { contacts: event.contacts }
    };
  }

  if (event instanceof DigestChartReadyEvent) {
    return {
      type: 'chart',
      data: { series: event.series }
    };
  }

  if (event instanceof DigestCompletedEvent) {
    return { type: 'done', data: {} };
  }

  return { type: 'error', data: { message: event.message } };
}
