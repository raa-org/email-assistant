/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

import { ApiProperty } from '@nestjs/swagger';

export class MailFolderResponseDto {
  @ApiProperty({ example: 'Inbox' })
  name!: string;

  @ApiProperty({ example: 'INBOX' })
  path!: string;

  @ApiProperty({ example: 3 })
  unreadCount!: number;
}

export class MailMessageResponseDto {
  @ApiProperty({ example: '1002' })
  uid!: string;

  @ApiProperty({ example: 'INBOX' })
  folder!: string;

  @ApiProperty({ example: 'Platform migration checkpoint' })
  subject!: string;

  @ApiProperty({ example: 'Platform <platform@corp.example.com>' })
  from!: string;

  @ApiProperty({ example: '2026-04-07T09:15:00.000Z' })
  receivedAt!: string;

  @ApiProperty({ example: 'Checkpoint moved to Friday.' })
  preview!: string;
}

export class MailMessageDetailResponseDto extends MailMessageResponseDto {
  @ApiProperty({ example: 'Checkpoint moved to Friday due to environment validation.' })
  bodyText!: string;
}
