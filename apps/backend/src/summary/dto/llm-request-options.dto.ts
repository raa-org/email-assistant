/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

import { Type } from 'class-transformer';
import { IsIn, IsInt, IsNumber, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class LlmGenerationParametersDto {
  @ApiPropertyOptional({ example: 0.2, minimum: 0, maximum: 2 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(2)
  temperature?: number;

  @ApiPropertyOptional({ example: 0.9, minimum: 0, maximum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  topP?: number;

  @ApiPropertyOptional({ example: 512, minimum: 1, maximum: 8192 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(8192)
  maxTokens?: number;

  @ApiPropertyOptional({ example: 7 })
  @IsOptional()
  @IsInt()
  seed?: number;
}

export class LlmRequestOptionsDto {
  @ApiPropertyOptional({ enum: ['ollama', 'openai-compatible'] })
  @IsOptional()
  @IsIn(['ollama', 'openai-compatible'])
  provider?: 'ollama' | 'openai-compatible';

  @ApiPropertyOptional({ example: 'llama3.1:8b' })
  @IsOptional()
  @IsString()
  model?: string;

  @ApiPropertyOptional({ type: () => LlmGenerationParametersDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => LlmGenerationParametersDto)
  parameters?: LlmGenerationParametersDto;
}
