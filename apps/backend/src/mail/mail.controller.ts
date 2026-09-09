/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiBody, ApiCookieAuth, ApiOkResponse, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import type { MailFolderDto, MailMessageDetailDto, MailMessageDto } from '@raa/assistant/common';
import { AuthService } from '../auth/auth.service.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { MarkMessagesReadCommand } from './commands/mark-messages-read.command.js';
import { MarkReadRequestDto } from './dto/mark-read-request.dto.js';
import { MailFolderResponseDto, MailMessageDetailResponseDto, MailMessageResponseDto } from './dto/mail-response.dto.js';
import type { MailAuthContext } from './mail.types.js';
import { GetMessageQuery } from './queries/get-message.query.js';
import { ListFoldersQuery } from './queries/list-folders.query.js';
import { ListMessagesQuery } from './queries/list-messages.query.js';

interface MailRequest {
  headers: {
    cookie?: string;
  };
  user: AuthenticatedUser;
}

@ApiTags('mail')
@ApiCookieAuth()
@Controller('mail')
export class MailController {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly commandBus: CommandBus,
    private readonly authService: AuthService
  ) {}

  @ApiOperation({ summary: 'List mail folders' })
  @ApiOkResponse({ type: MailFolderResponseDto, isArray: true })
  @Get('folders')
  async listFolders(@Req() request: MailRequest): Promise<MailFolderDto[]> {
    return this.queryBus.execute(new ListFoldersQuery(await this.createMailAuthContext(request)));
  }

  @ApiOperation({ summary: 'List messages from a folder' })
  @ApiQuery({ name: 'folder', required: false, example: 'INBOX' })
  @ApiQuery({ name: 'limit', required: false, example: 25 })
  @ApiQuery({ name: 'offset', required: false, example: 0 })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'since', required: false, description: 'ISO date — only messages received on or after this date' })
  @ApiQuery({ name: 'before', required: false, description: 'ISO date — only messages received before this date' })
  @ApiQuery({ name: 'unreadOnly', required: false, example: false })
  @ApiOkResponse({ type: MailMessageResponseDto, isArray: true })
  @Get('messages')
  async listMessages(
    @Req() request: MailRequest,
    @Query('folder') folder = 'INBOX',
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('search') search?: string,
    @Query('since') since?: string,
    @Query('before') before?: string,
    @Query('unreadOnly') unreadOnly?: string
  ): Promise<MailMessageDto[]> {
    return this.queryBus.execute(
      new ListMessagesQuery(
        folder,
        await this.createMailAuthContext(request),
        normalizeLimit(limit),
        normalizeOffset(offset),
        search?.trim() ? search.trim() : undefined,
        parseOptionalDate(since),
        parseOptionalDate(before),
        parseBool(unreadOnly)
      )
    );
  }

  @ApiOperation({ summary: 'Get a message by UID' })
  @ApiParam({ name: 'uid', example: '1002' })
  @ApiQuery({ name: 'folder', required: false, example: 'INBOX' })
  @ApiOkResponse({ type: MailMessageDetailResponseDto })
  @Get('messages/:uid')
  async getMessage(
    @Req() request: MailRequest,
    @Param('uid') uid: string,
    @Query('folder') folder = 'INBOX'
  ): Promise<MailMessageDetailDto> {
    return this.queryBus.execute(new GetMessageQuery(uid, folder, await this.createMailAuthContext(request)));
  }

  @ApiOperation({ summary: 'Mark messages as read' })
  @ApiBody({ type: MarkReadRequestDto })
  @ApiOkResponse({ schema: { type: 'object', properties: { markedCount: { type: 'number' } } } })
  @Post('messages/mark-read')
  async markRead(
    @Req() request: MailRequest,
    @Body() body: MarkReadRequestDto
  ): Promise<{ markedCount: number }> {
    const folder = body.folder ?? 'INBOX';
    const target = body.allUnread
      ? { allUnread: true as const }
      : { uids: body.uids ?? [] };

    const markedCount = await this.commandBus.execute(
      new MarkMessagesReadCommand(await this.createMailAuthContext(request), folder, target)
    );

    return { markedCount };
  }

  private async createMailAuthContext(request: MailRequest): Promise<MailAuthContext> {
    return this.authService.getMailAuthContextFromCookie(request.headers.cookie);
  }
}

function normalizeLimit(value: string | undefined): number {
  const parsed = value === undefined ? 25 : Number(value);

  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 100) {
    return 25;
  }

  return parsed;
}

function normalizeOffset(value: string | undefined): number {
  const parsed = value === undefined ? 0 : Number(value);

  if (!Number.isInteger(parsed) || parsed < 0) {
    return 0;
  }

  return parsed;
}

function parseOptionalDate(value: string | undefined): Date | undefined {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);

  return Number.isFinite(date.getTime()) ? date : undefined;
}

function parseBool(value: string | undefined): boolean | undefined {
  if (value === 'true' || value === '1') {
    return true;
  }

  return undefined;
}
