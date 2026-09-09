/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsOptional, IsString, ValidateIf } from 'class-validator';

export class MarkReadRequestDto {
  @ApiPropertyOptional({ example: 'INBOX' })
  @IsOptional()
  @IsString()
  folder?: string;

  @ApiPropertyOptional({ type: [String], example: ['1001', '1002'] })
  @ValidateIf((o) => !o.allUnread)
  @IsArray()
  @IsString({ each: true })
  uids?: string[];

  @ApiPropertyOptional({ example: true })
  @ValidateIf((o) => !o.uids || o.uids.length === 0)
  @IsOptional()
  @IsBoolean()
  allUnread?: boolean;
}
