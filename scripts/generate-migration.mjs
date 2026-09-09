/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

import { spawnSync } from 'node:child_process';

const args = process.argv.slice(2);
const name = readName(args);

if (!name) {
  console.error('Migration name is required. Use: npm run db:migration:generate -- --name=CreateUserTable');
  process.exit(1);
}

const result = spawnSync(
  'npm',
  ['run', 'typeorm', '--', 'migration:generate', `apps/backend/src/database/migrations/${name}`],
  {
    stdio: 'inherit'
  }
);

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);

function readName(values) {
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];

    if (value === '--name') {
      return values[index + 1];
    }

    if (value.startsWith('--name=')) {
      return value.slice('--name='.length);
    }
  }

  return undefined;
}
