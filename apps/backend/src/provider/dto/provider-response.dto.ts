/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

import { ApiProperty } from '@nestjs/swagger';

export class ProviderModelResponseDto {
  @ApiProperty({ example: 'llama3.1:8b' })
  id!: string;

  @ApiProperty({ example: 'llama3.1:8b' })
  label!: string;

  @ApiProperty({ example: 'ollama', enum: ['ollama', 'openai-compatible'] })
  provider!: 'ollama' | 'openai-compatible';

  @ApiProperty({ example: true })
  streaming!: boolean;
}
