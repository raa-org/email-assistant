/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

import { ApiProperty } from '@nestjs/swagger';

export class SummaryResultResponseDto {
  @ApiProperty({ example: 'Digest for INBOX' })
  title!: string;

  @ApiProperty({ example: 'Two messages require attention today.' })
  summary!: string;

  @ApiProperty({ type: [String], example: ['Approve the migration plan'] })
  actionItems!: string[];

  @ApiProperty({ type: [String], example: ['Do we need additional context from finance?'] })
  questions!: string[];

  @ApiProperty({ type: [String], example: ['Friday'] })
  deadlines!: string[];
}
