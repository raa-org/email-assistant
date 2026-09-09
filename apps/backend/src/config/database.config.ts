/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

import { join } from 'node:path';
import type { TypeOrmModuleOptions } from '@nestjs/typeorm';
import type { DataSourceOptions } from 'typeorm';
import type { AppEnv } from './env.js';

export function buildTypeOrmDataSourceOptions(
  env: AppEnv
): DataSourceOptions {
  return {
    type: 'postgres',
    url: env.databaseUrl,
    synchronize: false,
    entities: [
      join(__dirname, '..', '**', '*.entity.ts'),
      join(__dirname, '..', '**', '*.entity.js')
    ],
    migrations: [
      join(__dirname, '..', 'database', 'migrations', '*.ts'),
      join(__dirname, '..', 'database', 'migrations', '*.js')
    ]
  };
}

export function buildNestTypeOrmOptions(env: AppEnv): TypeOrmModuleOptions {
  return {
    ...buildTypeOrmDataSourceOptions(env),
    autoLoadEntities: true
  };
}
