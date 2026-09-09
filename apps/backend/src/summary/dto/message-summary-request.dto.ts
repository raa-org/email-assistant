/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

import { Type } from 'class-transformer';
import { IsOptional, IsString, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LlmRequestOptionsDto } from './llm-request-options.dto.js';

export class MessageSummaryRequestDto {
  @ApiProperty({ example: '1002' })
  @IsString()
  uid!: string;

  @ApiProperty({ default: 'INBOX' })
  @IsString()
  folder = 'INBOX';

  @ApiPropertyOptional({ type: () => LlmRequestOptionsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => LlmRequestOptionsDto)
  llm?: LlmRequestOptionsDto;
}
