/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

import { BadGatewayException, Injectable, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ImapFlow, type FetchMessageObject, type MessageStructureObject } from 'imapflow';
import sanitizeHtml from 'sanitize-html';
import type { AttachmentMetadataDto, MailFolderDto, MailMessageDetailDto, MailMessageDto } from '@raa/assistant/common';
import type { AppEnv } from '../config/env.js';
import { getAppEnv } from '../config/env.js';
import type { MailAuthContext } from './mail.types.js';

export interface ListMessagesOptions {
  limit: number;
  offset: number;
  search?: string;
  since?: Date;
  before?: Date;
  unreadOnly?: boolean;
}

const FETCH_FIELDS = {
  uid: true,
  envelope: true,
  internalDate: true,
  flags: true,
  source: {
    maxLength: 4096
  }
} as const;

@Injectable()
export class MailReadService {
  private readonly logger = new Logger(MailReadService.name);
  private readonly env: AppEnv;

  constructor(configService: ConfigService<AppEnv>) {
    this.env = getAppEnv(configService);
  }

  async listFolders(auth: MailAuthContext): Promise<MailFolderDto[]> {
    return this.withClient(auth, async (client) => {
      const mailboxes = await client.list({
        statusQuery: {
          messages: true,
          unseen: true
        }
      });

      return mailboxes
        .filter((mailbox) => !mailbox.flags.has('\\Noselect'))
        .map((mailbox) => ({
          name: mailbox.name,
          path: mailbox.path,
          totalCount: mailbox.status?.messages ?? 0,
          unreadCount: mailbox.status?.unseen ?? 0
        }));
    });
  }

  async listMessages(auth: MailAuthContext, folder: string, options: ListMessagesOptions): Promise<MailMessageDto[]> {
    return this.withClient(auth, async (client) =>
      this.withMailboxLock(client, folder, async () => {
        // When date criteria are present, use IMAP SEARCH instead of the
        // sequence-based recent-200 window. IMAP SEARCH SINCE/BEFORE compare
        // dates (not datetimes), so we still apply filterByDateRange for
        // precise datetime filtering as a second pass.
        let messages: MailMessageDto[];

        if (options.since || options.before) {
          messages = await this.fetchBySearchCriteria(client, folder, options);
        } else if (options.unreadOnly) {
          messages = await this.fetchUnreadEnvelopes(client, folder);
        } else {
          messages = await this.fetchRecentEnvelopes(client, folder);
        }

        const afterDateFilter = filterByDateRange(messages, options.since, options.before);
        const filtered = filterMessages(afterDateFilter, options.search);
        const result = paginateMessages(filtered, options.offset, options.limit);

        this.logger.debug(`listMessages folder=${folder} fetched=${result.length}`);

        return result;
      })
    );
  }

  private async fetchRecentEnvelopes(client: ImapFlow, folder: string): Promise<MailMessageDto[]> {
    const messageCount = client.mailbox ? client.mailbox.exists : 0;
    const start = Math.max(1, messageCount - 200);
    const messages: MailMessageDto[] = [];

    for await (const message of client.fetch(`${start}:*`, FETCH_FIELDS, { uid: false })) {
      messages.push(toEnvelopeDto(message, folder));
    }

    return messages.reverse();
  }

  private async fetchUnreadEnvelopes(client: ImapFlow, folder: string): Promise<MailMessageDto[]> {
    // IMAP SEARCH UNSEEN — returns the full set of unread UIDs regardless of
    // sequence position. This lets us bypass the recent-200 cap that the
    // sequence-based fetch hits, so e.g. "post-vacation" inboxes with
    // hundreds of unread messages older than the recent window still surface.
    const unreadUids = await client.search({ seen: false }, { uid: true });

    if (!unreadUids || unreadUids.length === 0) {
      return [];
    }

    const messages: MailMessageDto[] = [];

    for await (const message of client.fetch(unreadUids as number[], FETCH_FIELDS, { uid: true })) {
      messages.push(toEnvelopeDto(message, folder));
    }

    // Newest first — same ordering convention as fetchRecentEnvelopes.
    return messages.sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime());
  }

  // Uses IMAP SEARCH with date criteria to find messages in a date range.
  // This is more accurate than the sequence-based fetchRecentEnvelopes
  // because it queries the server for the exact date range instead of
  // fetching the last N messages and filtering in memory.
  //
  // Note: IMAP SINCE/BEFORE compare dates only (not datetimes), so callers
  // should still apply filterByDateRange() for precise datetime filtering.
  private async fetchBySearchCriteria(
    client: ImapFlow,
    folder: string,
    options: ListMessagesOptions
  ): Promise<MailMessageDto[]> {
    const searchQuery: Record<string, unknown> = {};

    if (options.since) {
      searchQuery.since = options.since;
    }

    if (options.before) {
      searchQuery.before = options.before;
    }

    if (options.unreadOnly) {
      searchQuery.seen = false;
    }

    const uids = await client.search(searchQuery, { uid: true });
    const uidList = Array.isArray(uids) ? uids : [];

    if (uidList.length === 0) {
      return [];
    }

    const messages: MailMessageDto[] = [];

    for await (const message of client.fetch(uidList, FETCH_FIELDS, { uid: true })) {
      messages.push(toEnvelopeDto(message, folder));
    }

    return messages.sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime());
  }

  async getMessage(auth: MailAuthContext, folder: string, uid: string): Promise<MailMessageDetailDto> {
    return this.withClient(auth, async (client) =>
      this.withMailboxLock(client, folder, async () => {
        const message = await client.fetchOne(
          uid,
          {
            uid: true,
            envelope: true,
            internalDate: true,
            flags: true,
            bodyStructure: true,
            source: {
              maxLength: 32 * 1024
            }
          },
          { uid: true }
        );

        if (!message) {
          throw new NotFoundException(`Message ${uid} not found in folder ${folder}`);
        }

        const { bodyText, bodyHtml } = await this.extractBody(client, message);
        const preview = bodyText.length > 0 ? summarizeText(bodyText, 160) : extractPreview(message);
        const attachments = collectAttachments(message.bodyStructure);

        return {
          uid: String(message.uid),
          folder,
          subject: message.envelope?.subject ?? '(No subject)',
          from: formatAddress(message.envelope?.from),
          receivedAt: toIsoString(message.internalDate ?? message.envelope?.date),
          preview,
          bodyText,
          isUnread: !hasSeenFlag(message.flags),
          ...(bodyHtml ? { bodyHtml } : {}),
          ...(attachments.length > 0 ? { attachments } : {})
        };
      })
    );
  }

  async fetchMessagesWithCallback(
    refreshAuth: () => Promise<MailAuthContext>,
    folder: string,
    uids: string[],
    onMessage: (uid: string, message: MailMessageDetailDto) => void
  ): Promise<void> {
    if (uids.length === 0) return;

    const auth = await refreshAuth();
    let processed = 0;

    try {
      await this.withClient(auth, async (client) => {
        await this.withMailboxLock(client, folder, async () => {
          for (let i = processed; i < uids.length; i++) {
            const uid = uids[i];

            try {
              const message = await this.fetchOneBody(client, folder, uid);
              if (message) {
                onMessage(uid, message);
              }
            } catch (error) {
              this.logger.warn(`fetchMessagesWithCallback: skipping uid=${uid}: ${error instanceof Error ? error.message : error}`);
            }

            processed++;
          }
        });
      });
    } catch (error) {
      if (error instanceof UnauthorizedException && processed < uids.length) {
        this.logger.warn(`IMAP auth failed at message ${processed + 1}/${uids.length}, refreshing token`);
        return this.fetchMessagesWithCallback(refreshAuth, folder, uids.slice(processed), onMessage);
      }

      throw error;
    }
  }

  private async fetchOneBody(client: ImapFlow, folder: string, uid: string): Promise<MailMessageDetailDto | null> {
    const message = await client.fetchOne(
      uid,
      {
        uid: true,
        envelope: true,
        internalDate: true,
        flags: true,
        bodyStructure: true,
        source: { maxLength: 32 * 1024 }
      },
      { uid: true }
    );

    if (!message) return null;

    const { bodyText, bodyHtml } = await this.extractBody(client, message);
    const preview = bodyText.length > 0 ? summarizeText(bodyText, 160) : extractPreview(message);
    const attachments = collectAttachments(message.bodyStructure);

    return {
      uid: String(message.uid),
      folder,
      subject: message.envelope?.subject ?? '(No subject)',
      from: formatAddress(message.envelope?.from),
      receivedAt: toIsoString(message.internalDate ?? message.envelope?.date),
      preview,
      bodyText,
      isUnread: !hasSeenFlag(message.flags),
      ...(bodyHtml ? { bodyHtml } : {}),
      ...(attachments.length > 0 ? { attachments } : {})
    };
  }

  protected createClient(auth: MailAuthContext): ImapFlow {
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

  private async withMailboxLock<T>(client: ImapFlow, folder: string, operation: () => Promise<T>): Promise<T> {
    const lock = await client.getMailboxLock(folder, { readOnly: true });

    try {
      return await operation();
    } finally {
      lock.release();
    }
  }

  private async extractBody(client: ImapFlow, message: FetchMessageObject): Promise<{ bodyText: string; bodyHtml?: string }> {
    const plainPart = findBodyPart(message.bodyStructure, 'text/plain');
    const htmlPart = findBodyPart(message.bodyStructure, 'text/html');

    let bodyText = '';
    let bodyHtml: string | undefined;

    // Fetch HTML part for rich display — sanitize to remove XSS vectors
    // while keeping formatting, links, images, tables, and inline styles.
    if (htmlPart) {
      const download = await client.download(message.uid, htmlPart.part, { uid: true });
      const rawHtml = await streamToString(download.content);

      bodyHtml = sanitizeEmailHtml(rawHtml);
      bodyText = htmlToText(rawHtml);
    }

    // Prefer plain text for bodyText (cleaner for LLM prompts / preview)
    if (plainPart) {
      const download = await client.download(message.uid, plainPart.part, { uid: true });

      bodyText = normalizeWhitespace(await streamToString(download.content));
    }

    // Fallback to source header extraction
    if (!bodyText) {
      bodyText = extractBodyFromSource(message.source);
    }

    return { bodyText, bodyHtml };
  }
}

function findBodyPart(
  structure: MessageStructureObject | undefined,
  contentType: 'text/html' | 'text/plain'
): MessageStructureObject | undefined {
  if (!structure) {
    return undefined;
  }

  const type = structure.type.toLowerCase();

  if (type === contentType && structure.part) {
    return structure;
  }

  for (const childNode of structure.childNodes ?? []) {
    const match = findBodyPart(childNode, contentType);

    if (match) {
      return match;
    }
  }

  return undefined;
}

function toEnvelopeDto(message: FetchMessageObject, folder: string): MailMessageDto {
  return {
    uid: String(message.uid),
    folder,
    subject: message.envelope?.subject ?? '(No subject)',
    from: formatAddress(message.envelope?.from),
    receivedAt: toIsoString(message.internalDate ?? message.envelope?.date),
    preview: extractPreview(message),
    isUnread: !hasSeenFlag(message.flags)
  };
}

function hasSeenFlag(flags: Set<string> | string[] | undefined): boolean {
  if (!flags) {
    return false;
  }

  if (flags instanceof Set) {
    return flags.has('\\Seen');
  }

  return flags.includes('\\Seen');
}

// Walks the IMAP bodyStructure and surfaces metadata for any part with
// disposition=attachment OR a filename hint (some clients omit disposition).
// Content is NOT downloaded here — that requires a separate part fetch and a
// scan verdict from AttachmentScannerService (currently NotImplemented).
function collectAttachments(structure: MessageStructureObject | undefined): AttachmentMetadataDto[] {
  if (!structure) {
    return [];
  }

  const collected: AttachmentMetadataDto[] = [];

  walkAttachmentParts(structure, collected);

  return collected;
}

function walkAttachmentParts(structure: MessageStructureObject, sink: AttachmentMetadataDto[]): void {
  const filename = readAttachmentFilename(structure);
  const disposition = structure.disposition?.toLowerCase();

  if (structure.part && (disposition === 'attachment' || filename)) {
    sink.push({
      partId: structure.part,
      filename: filename ?? '(unnamed attachment)',
      contentType: structure.type,
      sizeBytes: structure.size ?? 0,
      scanVerdict: 'unknown'
    });
  }

  for (const childNode of structure.childNodes ?? []) {
    walkAttachmentParts(childNode, sink);
  }
}

function readAttachmentFilename(structure: MessageStructureObject): string | undefined {
  return (
    structure.dispositionParameters?.filename ??
    structure.dispositionParameters?.['filename*'] ??
    structure.parameters?.name ??
    structure.parameters?.['name*']
  );
}

function formatAddress(addresses: Array<{ address?: string; name?: string }> | undefined): string {
  const primary = addresses?.[0];

  if (!primary) {
    return 'Unknown sender';
  }

  return primary.name ? `${primary.name} <${primary.address ?? ''}>` : (primary.address ?? 'Unknown sender');
}

function toIsoString(value: Date | string | undefined): string {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === 'string' && value.length > 0) {
    return new Date(value).toISOString();
  }

  return new Date(0).toISOString();
}

function extractPreview(message: FetchMessageObject): string {
  const bodyPreview = extractBodyFromSource(message.source);

  if (bodyPreview.length > 0) {
    return summarizeText(bodyPreview, 160);
  }

  return message.envelope?.subject ?? '(No preview available)';
}

function extractBodyFromSource(source: Buffer | undefined): string {
  if (!source || source.length === 0) {
    return '';
  }

  const raw = source.toString('utf8');
  const separatorIndex = raw.search(/\r?\n\r?\n/);
  const body = separatorIndex >= 0 ? raw.slice(separatorIndex).trim() : raw.trim();

  return normalizeWhitespace(htmlToText(body));
}

function htmlToText(value: string): string {
  return value
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function summarizeText(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

function filterByDateRange(messages: MailMessageDto[], since?: Date, before?: Date): MailMessageDto[] {
  if (!since && !before) {
    return messages;
  }

  return messages.filter((message) => {
    const ts = new Date(message.receivedAt).getTime();

    if (since && ts < since.getTime()) {
      return false;
    }

    if (before && ts >= before.getTime()) {
      return false;
    }

    return true;
  });
}

function filterMessages(messages: MailMessageDto[], search: string | undefined): MailMessageDto[] {
  const normalizedSearch = search?.trim().toLowerCase();

  if (!normalizedSearch) {
    return messages;
  }

  return messages.filter((message) =>
    [message.subject, message.from, message.preview].some((value) => value.toLowerCase().includes(normalizedSearch))
  );
}

function paginateMessages(messages: MailMessageDto[], offset: number, limit: number): MailMessageDto[] {
  return messages.slice(offset, offset + limit);
}

async function streamToString(stream: NodeJS.ReadableStream): Promise<string> {
  const chunks: Buffer[] = [];

  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
  }

  return Buffer.concat(chunks).toString('utf8');
}

function mapMailError(error: unknown): Error {
  if (isAuthenticationFailure(error)) {
    return new UnauthorizedException('IMAP access token was rejected');
  }

  if (error instanceof NotFoundException || error instanceof UnauthorizedException) {
    return error;
  }

  return new BadGatewayException(error instanceof Error ? error.message : 'IMAP request failed');
}

function isAuthenticationFailure(error: unknown): error is { authenticationFailed: true } {
  return typeof error === 'object' && error !== null && 'authenticationFailed' in error;
}

// Strips scripts, event handlers, forms, iframes while keeping formatting,
// links, images, tables, and inline styles that email clients typically use.
function sanitizeEmailHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [
      ...sanitizeHtml.defaults.allowedTags,
      'img', 'span', 'div', 'table', 'thead', 'tbody', 'tfoot',
      'tr', 'th', 'td', 'caption', 'colgroup', 'col', 'center', 'font',
      'hr', 'br', 'u', 's', 'mark', 'small', 'big', 'sub', 'sup'
    ],
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      '*': ['class', 'id', 'dir', 'align', 'valign', 'width', 'height'],
      a: ['href', 'target', 'rel', 'title'],
      img: ['src', 'alt', 'width', 'height']
    },
    allowedSchemes: ['http', 'https', 'mailto', 'cid'],
    transformTags: {
      a: (tagName, attribs) => ({
        tagName,
        attribs: {
          ...attribs,
          target: '_blank',
          rel: 'noopener noreferrer'
        }
      })
    }
  });
}
