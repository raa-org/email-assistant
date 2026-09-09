#!/usr/bin/env node
/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */


const path = require('path')
const fs = require('fs')
const dotenv = require('dotenv')
const { spawn } = require('child_process')

const mode = process.argv[2]

if (!['build', 'dev', 'start'].includes(mode)) {
  console.error('Usage: node scripts/run-frontend.js <build|dev|start>')
  process.exit(1)
}

const rootDir = process.cwd()
const frontendDir = path.resolve(rootDir, 'apps/frontend')
const envPath = path.resolve(rootDir, '.env')

dotenv.config({ path: envPath })

process.env['NODE_ENV'] = mode === 'dev' ? 'development' : 'production'
process.env['HOSTNAME'] = process.env['FRONTEND_HOST'] || process.env['HOSTNAME'] || '0.0.0.0'
process.env['PORT'] = process.env['FRONTEND_PORT'] || process.env['PORT'] || '3000'

const { command, args, cwd } = resolveCommand(mode, frontendDir)

const child = spawn(command, args, {
  cwd,
  stdio: 'inherit',
  env: process.env,
})

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal)
    return
  }

  process.exit(code ?? 0)
})

function resolveCommand(mode, frontendDir) {
  if (mode === 'start') {
    const standaloneDir = path.resolve(frontendDir, '.next/standalone')
    prepareStandaloneAssets(frontendDir, standaloneDir)

    return {
      command: process.execPath,
      args: [path.resolve(standaloneDir, 'apps/frontend/server.js')],
      cwd: standaloneDir,
    }
  }

  const nextBin = require.resolve('next/dist/bin/next')
  const args = [nextBin, mode]

  if (mode === 'dev') {
    args.push('--hostname', process.env['HOSTNAME'], '--port', process.env['PORT'])
  }

  if (mode === 'build') {
    args.push('--webpack')
  }

  return {
    command: process.execPath,
    args,
    cwd: frontendDir,
  }
}

function prepareStandaloneAssets(frontendDir, standaloneDir) {
  const standaloneAppDir = path.resolve(standaloneDir, 'apps/frontend')
  const standaloneNextDir = path.resolve(standaloneAppDir, '.next')

  ensureSymlink(path.resolve(frontendDir, '.next/static'), path.resolve(standaloneNextDir, 'static'))
  ensureSymlink(path.resolve(frontendDir, 'public'), path.resolve(standaloneAppDir, 'public'))
}

function ensureSymlink(sourcePath, targetPath) {
  if (!fs.existsSync(sourcePath)) {
    return
  }

  fs.mkdirSync(path.dirname(targetPath), { recursive: true })

  try {
    const current = fs.lstatSync(targetPath)

    if (current.isSymbolicLink() && fs.readlinkSync(targetPath) === sourcePath) {
      return
    }

    fs.rmSync(targetPath, { recursive: true, force: true })
  } catch {
    // Target does not exist yet.
  }

  const symlinkType = fs.lstatSync(sourcePath).isDirectory() ? 'dir' : 'file'
  fs.symlinkSync(sourcePath, targetPath, symlinkType)
}
