/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

import { Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsIn, IsOptional, IsString, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { SummaryPeriodKind } from '@raa/assistant/common';
import { LlmRequestOptionsDto } from '../../dto/llm-request-options.dto.js';

const PERIOD_KINDS: SummaryPeriodKind[] = ['unread', 'today', 'yesterday', 'week', 'month', 'custom'];

export class AgendaRequestDto {
  @ApiProperty({ enum: PERIOD_KINDS, example: 'custom' })
  @IsIn(PERIOD_KINDS)
  kind!: SummaryPeriodKind;

  @ApiPropertyOptional({ default: 'INBOX' })
  @IsOptional()
  @IsString()
  folder?: string;

  @ApiPropertyOptional({ description: 'Only include unread messages', default: false })
  @IsOptional()
  @IsBoolean()
  unreadOnly?: boolean;

  @ApiPropertyOptional({ description: 'Required when kind=custom', example: '2026-04-01' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'Required when kind=custom', example: '2026-04-20' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({ type: () => LlmRequestOptionsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => LlmRequestOptionsDto)
  llm?: LlmRequestOptionsDto;

  @ApiPropertyOptional({ description: 'Force regeneration, skip cache', default: false })
  @IsOptional()
  @IsBoolean()
  force?: boolean;
}
