#!/usr/bin/env node
/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */


const fs = require('fs')
const path = require('path')
const dotenv = require('dotenv')
const { Client } = require('pg')

function loadResolvedEnv() {
  const cwd = process.cwd()
  const nodeEnv = process.env['NODE_ENV'] || 'development'
  const candidatePaths = [`.env.${nodeEnv}`, '.env']

  const merged = {}
  for (const relativePath of candidatePaths) {
    const absolutePath = path.resolve(cwd, relativePath)
    if (!fs.existsSync(absolutePath)) continue
    Object.assign(merged, dotenv.parse(fs.readFileSync(absolutePath)))
  }

  return {
    get(key, fallback) {
      if (process.env[key] !== undefined) {
        return process.env[key]
      }
      if (merged[key] !== undefined) {
        return merged[key]
      }
      return fallback
    },
  }
}

function quoteIdentifier(value) {
  return `"${String(value).replace(/"/g, '""')}"`
}

function quoteLiteral(value) {
  return `'${String(value).replace(/'/g, "''")}'`
}

async function main() {
  const env = loadResolvedEnv()

  const dbHost = env.get('DB_HOST', 'localhost')
  const dbPort = Number(env.get('DB_PORT', '5432'))
  const dbSuperuser = env.get('DB_SUPERUSER')
  const dbSuperpass = env.get('DB_SUPERPASS')
  const dbUser = env.get('DB_USER')
  const dbPassword = env.get('DB_PASSWORD')
  const dbName = env.get('DB_NAME')

  if (!dbSuperuser || !dbUser || !dbPassword || !dbName) {
    throw new Error('Missing required env vars: DB_SUPERUSER, DB_USER, DB_PASSWORD, DB_NAME (DB_SUPERPASS optional)')
  }

  const client = new Client({
    host: dbHost,
    port: dbPort,
    user: dbSuperuser,
    password: dbSuperpass || undefined,
    database: 'postgres',
  })

  await client.connect()

  try {
    const canCreateDb = await client.query(
      `
        SELECT CASE
          WHEN rolsuper OR rolcreatedb THEN '1'
          ELSE '0'
        END AS can_create
        FROM pg_roles
        WHERE rolname = $1
      `,
      [dbSuperuser],
    )

    if (canCreateDb.rows[0]?.can_create !== '1') {
      throw new Error(
        `User ${dbSuperuser} does not have CREATEDB or SUPERUSER privilege. Grant CREATEDB or use a real superuser.`,
      )
    }

    const roleExists = await client.query('SELECT 1 FROM pg_roles WHERE rolname = $1', [dbUser])
    if (roleExists.rowCount === 0) {
      await client.query(`CREATE ROLE ${quoteIdentifier(dbUser)} LOGIN PASSWORD ${quoteLiteral(dbPassword)}`)
      console.log(`Role ${dbUser} created.`)
    } else {
      console.log(`Role ${dbUser} already exists.`)
    }

    const dbExists = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName])
    if (dbExists.rowCount === 0) {
      await client.query(`CREATE DATABASE ${quoteIdentifier(dbName)} OWNER ${quoteIdentifier(dbUser)}`)
      console.log(`Database ${dbName} created.`)
    } else {
      console.log(`Database ${dbName} already exists.`)
    }

    await client.query(`GRANT ALL PRIVILEGES ON DATABASE ${quoteIdentifier(dbName)} TO ${quoteIdentifier(dbUser)}`)
    console.log(`Privileges granted on ${dbName} to ${dbUser}.`)
  } finally {
    await client.end()
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error)
  console.error(message)
  process.exit(1)
})
