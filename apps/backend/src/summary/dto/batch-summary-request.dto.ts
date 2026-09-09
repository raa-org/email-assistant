/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LlmRequestOptionsDto } from './llm-request-options.dto.js';

export class BatchSummaryRequestDto {
  @ApiProperty({ default: 'INBOX' })
  @IsString()
  folder = 'INBOX';

  @ApiPropertyOptional({ example: 10, minimum: 1, maximum: 50 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;

  @ApiPropertyOptional({ type: () => LlmRequestOptionsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => LlmRequestOptionsDto)
  llm?: LlmRequestOptionsDto;
}
