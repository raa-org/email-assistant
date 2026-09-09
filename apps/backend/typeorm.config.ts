/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

import 'reflect-metadata';
import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';

const { buildTypeOrmDataSourceOptions } = require('./src/config/database.config');
const { loadValidatedProcessEnv } = require('./src/config/env');

dotenv.config();

const env = loadValidatedProcessEnv();

const dataSource = new DataSource(buildTypeOrmDataSourceOptions(env));

export default dataSource;
