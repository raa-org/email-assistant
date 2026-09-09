# Email Assistant

> Self-hosted AI assistant for corporate email.

Reads a mailbox over IMAP, analyses every message with a language model you host
yourself, and turns a morning of unread mail into three things you can act on:
a **briefing** of what happened, an **agenda** of what to do, and a **summary**
on each individual message.

Built to run entirely inside your own network. Message bodies are processed in
memory and never written to disk; nothing is sent to a third-party API.

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

> **Status:** phase 1. The dashboard, inbox, per-message summaries, briefings and
> agenda work. Calendar integration is not implemented yet — the schedule card
> renders a placeholder.

---

## Overview

`email-assistant` connects to the corporate mail system via IMAP and uses a self-hosted LLM to generate:

- summaries of individual email messages
- daily and weekly digests
- structured action-item extraction
- deadline and question extraction

Authentication is handled through the existing corporate Keycloak SSO. No separate login, no stored mail passwords, no external LLM APIs.

---

## Core Principles

- **Security first** - no plaintext at rest, no public LLM endpoints
- **Internal-only AI** - self-hosted LLM provider only
- **SSO only** - Keycloak OIDC, no local auth system
- **CQRS in backend** - clear separation of writes and reads in NestJS
- **TypeORM for persistence** - relational data access, entities, migrations
- **DTO validation** - `class-validator` and `class-transformer` on backend boundaries
- **Shared contracts** - DTOs and shared types live in `libs/common`
- **Deterministic orchestration** - AI is used for summarization, not as a decision authority

---

## Runtime & Package Baseline

Use the current stable/latest baseline for initial setup:

| Area | Version / Baseline |
|------|--------------------|
| Node.js | **24 LTS** |
| TypeScript | **6.0** |
| Nx | **22.6.x** |
| React | **19.2** |
| Next.js | **16.2.2** |
| NestJS | **11.1.x** |
| `@nestjs/cqrs` | **11.0.3** |
| `redux-observable` | **3.0.0-rc.3** |
| `typesafe-actions` | **5.1.0** |

### Important notes

- Pin **Node.js 24 LTS** for the workspace.
- Keep all `nx` and `@nx/*` packages on the **same exact version**.
- `redux-observable` is currently on an **RC** release line, so pin it exactly and validate compatibility before upgrades.
- `typesafe-actions` is stable but mature/older; keep it only if the team intentionally wants that action-creator pattern.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Runtime | Node.js 24 LTS |
| Language | TypeScript 6.0 (strict) |
| Monorepo | Nx 22.6.x |
| Frontend | Next.js 16.2.2, React 19.2, MUI, Redux, redux-observable, typesafe-actions |
| Backend | NestJS 11.1.x |
| Backend Pattern | CQRS via `@nestjs/cqrs` |
| ORM | TypeORM |
| Validation | `class-validator`, `class-transformer` |
| Auth | Keycloak (OIDC), next-auth |
| Mail | `imapflow` (XOAUTH2 -> Cyrus IMAPD) |
| AI | Self-hosted Ollama by default, OpenAI-compatible API supported |
| Database | PostgreSQL 16 |
| Cache | Redis 7 |
| Encryption | AES-256-GCM, per-user HKDF-SHA256 key derivation |

---

## Monorepo Structure

```text
email-assistant/
├── apps/
│   ├── frontend/          # Next.js app (port 3000)
│   └── backend/           # NestJS API (port 3001)
├── libs/
│   └── common/            # Shared DTOs, types, contracts (@raa/assistant/common)
├── docker-compose.yml
├── .env.example
├── .nvmrc
├── package.json
└── README.md
```

---

## Backend Architecture

The backend follows a modular NestJS architecture with **CQRS** for business operations.

### Why CQRS here

CQRS is useful because the system already has a natural split:

- **commands** mutate internal state or trigger summarization workflows
- **queries** fetch folders, messages, prompts, models, or settings
- **events** make side effects explicit and observable

This keeps mail access, summarization, prompt resolution, validation, encryption, and persistence easier to reason about.

### CQRS rules

- **Controllers stay thin**
- **Commands perform writes / workflow execution**
- **Queries perform reads**
- **Command handlers never return read models**
- **Query handlers never mutate state**
- **Events represent completed domain actions**
- **Long-running or chained async flows go through sagas when needed**

### Recommended NestJS modules

```text
apps/backend/src/
├── app.module.ts
├── auth/
├── encryption/
├── mail/
│   ├── commands/
│   │   └── handlers/
│   ├── queries/
│   │   └── handlers/
│   ├── events/
│   │   └── handlers/
│   └── mail.module.ts
├── prompt/
│   ├── commands/
│   │   └── handlers/
│   ├── queries/
│   │   └── handlers/
│   ├── events/
│   │   └── handlers/
│   └── prompt.module.ts
├── provider/
│   ├── commands/
│   │   └── handlers/
│   ├── queries/
│   │   └── handlers/
│   ├── events/
│   │   └── handlers/
│   └── provider.module.ts
├── summary/
│   ├── commands/
│   │   └── handlers/
│   ├── queries/
│   │   └── handlers/
│   ├── events/
│   │   └── handlers/
│   ├── sagas/
│   └── summary.module.ts
└── user-settings/
    ├── commands/
    │   └── handlers/
    ├── queries/
    │   └── handlers/
    ├── events/
    │   └── handlers/
    └── user-settings.module.ts
```

### CQRS file placement rules

- Commands live in `commands/*.command.ts`
- Command handlers live in `commands/handlers/*.handler.ts`
- Queries live in `queries/*.query.ts`
- Query handlers live in `queries/handlers/*.handler.ts`
- Events live in `events/*.event.ts`
- Event handlers live in `events/handlers/*.handler.ts`
- Do not use a shared top-level `handlers/` directory for command/query/event handlers
- Empty CQRS folders are allowed to preserve a stable module structure

### Example CQRS split

#### Commands
- `GenerateMessageSummaryCommand`
- `GenerateBatchSummaryCommand`
- `SaveUserSettingsCommand`
- `CreatePromptCommand`
- `UpdatePromptCommand`
- `DeletePromptCommand`

#### Queries
- `GetCurrentUserQuery`
- `ListMailFoldersQuery`
- `ListMessagesQuery`
- `GetMessageQuery`
- `ListPromptsQuery`
- `ListProviderModelsQuery`
- `GetUserSettingsQuery`

#### Events
- `MessageSummaryGeneratedEvent`
- `BatchSummaryGeneratedEvent`
- `PromptCreatedEvent`
- `PromptUpdatedEvent`
- `UserSettingsUpdatedEvent`

### NestJS setup

Install and register CQRS and backend data/validation packages:

```bash
npm install @nestjs/cqrs @nestjs/typeorm typeorm class-validator class-transformer
```

```ts
import { CqrsModule } from '@nestjs/cqrs';

@Module({
  imports: [CqrsModule],
})
export class SummaryModule {}
```

---

## Shared Contracts

All DTOs and shared types must live in `libs/common`.

Examples:

- `mail.dto.ts`
- `summary.dto.ts`
- `prompt.dto.ts`
- `provider.types.ts`
- `state.types.ts`

Validation decorators used by backend DTOs should rely on `class-validator` and `class-transformer`.

Rule: **No business logic in `libs/common`**. Contracts only.

---

## Prerequisites

- Node.js 24 LTS
- npm 10+
- Docker and Docker Compose (the bundled compose file brings up PostgreSQL 16 and Redis 7)
- An **OIDC provider**. Built and tested against Keycloak; any compliant provider
  should work. The client needs a redirect URI matching `OIDC_REDIRECT_URI`.
- An **IMAP server** the signed-in user can reach with **XOAUTH2**, using the
  access token from that same provider. Developed against Cyrus IMAP.
- A **self-hosted LLM**: [Ollama](https://ollama.com), or anything exposing an
  OpenAI-compatible API (vLLM, llama.cpp server, OpenWebUI). A small instruct
  model is enough — development runs on a 3B.

> The IMAP + XOAUTH2 requirement is the least portable piece: your mail server
> and your identity provider have to trust the same tokens. If they do not, the
> mail module is the part you will need to adapt.

---

## Getting Started

### 1. Clone and install

```bash
git clone <repo-url> email-assistant
cd email-assistant
nvm use
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

If you deploy with environment-specific files, copy the selected file to `.env` before build/start. Example: use `.env.staging` as `.env` inside the container image or entrypoint.

Example:

```env
# Public app URL and process bind addresses
APP_BASE_URL=http://localhost:3000
FRONTEND_HOST=0.0.0.0
FRONTEND_PORT=3000
BACKEND_HOST=0.0.0.0
BACKEND_PORT=3001

# Identity provider (OIDC) — any provider works; built against Keycloak
OIDC_ISSUER=https://auth.example.com/realms/your-realm
OIDC_CLIENT_ID=email-assistant
OIDC_CLIENT_SECRET=
OIDC_REDIRECT_URI=http://localhost:3000/api/auth/callback

# IMAP
IMAP_HOST=mail.example.com
IMAP_PORT=993
IMAP_TLS=true

# Encryption
ENCRYPTION_MASTER_SECRET=

# LLM — configure both providers in parallel. LLM_DEFAULT_PROVIDER picks the
# one used when a request does not specify llm.provider; llm.model and
# llm.parameters in a single request override the per-provider defaults.
LLM_DEFAULT_PROVIDER=ollama
LLM_REQUEST_TIMEOUT_MS=60000

# Ollama
LLM_OLLAMA_BASE_URL=http://localhost:11434
LLM_OLLAMA_API_KEY=
LLM_OLLAMA_DEFAULT_MODEL=llama3.1:8b
LLM_OLLAMA_DEFAULT_TEMPERATURE=
LLM_OLLAMA_DEFAULT_TOP_P=
LLM_OLLAMA_DEFAULT_MAX_TOKENS=
LLM_OLLAMA_DEFAULT_SEED=

# OpenAI-compatible (corp gateway, OpenWebUI, vLLM, llama.cpp server)
LLM_OPENAI_COMPATIBLE_BASE_URL=http://localhost:8080/v1
LLM_OPENAI_COMPATIBLE_API_KEY=
LLM_OPENAI_COMPATIBLE_DEFAULT_MODEL=llama3.1:8b
LLM_OPENAI_COMPATIBLE_DEFAULT_TEMPERATURE=
LLM_OPENAI_COMPATIBLE_DEFAULT_TOP_P=
LLM_OPENAI_COMPATIBLE_DEFAULT_MAX_TOKENS=
LLM_OPENAI_COMPATIBLE_DEFAULT_SEED=

# Database / cache
DB_HOST=localhost
DB_PORT=5432
DB_SUPERUSER=postgres
DB_SUPERPASS=
DB_USER=dev
DB_PASSWORD=dev
DB_NAME=email_assistant
REDIS_URL=redis://localhost:6379
```

`DATABASE_URL` is optional. If it is not set, the backend builds it from `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, and `DB_NAME`.

### 3. Start infrastructure

```bash
docker-compose up -d postgres redis
```

### 4. Create the database

Use the bootstrap script before the first build if the application database and role do not exist yet:

```bash
npm run db:create
```

The script reads `DB_HOST`, `DB_PORT`, `DB_SUPERUSER`, `DB_SUPERPASS`, `DB_USER`, `DB_PASSWORD`, and `DB_NAME` from `.env` / `.env.<NODE_ENV>`.

### 5. Build the project and run migrations

```bash
npm run build
```

`npm run build` compiles `common`, `backend`, and `frontend`, then runs `npm run db:migration:run`.

If you need the steps separately:

```bash
npm run build:common
npm run build:backend
npm run build:frontend
npm run db:migration:run
```

### 6. Run the apps

Development mode:

```bash
npm run serve:backend
npm run serve:frontend
```

Production mode after build:

```bash
npm run start:backend
npm run start:frontend
```

Frontend: `http://localhost:3000`
Backend: `http://localhost:3001`
Swagger: `http://localhost:3001/api/docs`

The app uses a single public origin via `APP_BASE_URL`. Process bind addresses are configured through `FRONTEND_HOST`, `FRONTEND_PORT`, `BACKEND_HOST`, and `BACKEND_PORT` in `.env`.
Backend `serve` runs in watch mode and rebuilds on changes in `apps/backend/src`, `libs/common/src`, and `.env`.
Frontend build/start reads the repository-root `.env` directly; no shell-specific `source` step is required.

---

## Nx Commands

```bash
# serve
npm run serve:frontend
npm run serve:backend

# start built apps
npm run start:frontend
npm run start:backend

# build
npm run build
npm run build:frontend
npm run build:backend
npm run build:common

# test
nx test frontend
nx test backend
nx affected:test

# lint
nx lint frontend
nx lint backend

# migrations
npm run db:create
npm run db:migration:show
npm run db:migration:run
npm run db:migration:revert
npm run db:migration:generate -- --name=CreateUserTable

# affected
nx affected:build
```

---

## Persistence and Validation

- **ORM**: TypeORM is the default ORM for backend persistence
- **Database**: PostgreSQL is the primary relational store
- **Entities**: prompts, user settings, and related persistence models are implemented as TypeORM entities
- **Migrations**: schema changes must go through explicit migrations
- **Migration generation**: create schema migrations with `npm run db:migration:generate -- --name=<MigrationName>`
- **Validation**: incoming DTOs are validated with `class-validator`
- **Transformation**: request payload transformation uses `class-transformer`
- **Fail-fast API boundaries**: invalid payloads must be rejected before business logic runs
- **Runtime config**: Nest loads DB config through `@nestjs/config`
- **CLI config**: TypeORM migrations use `apps/backend/typeorm.config.ts`

## Security

- **Authentication**: backend-managed OIDC login via Keycloak with httpOnly app session cookies
- **User provisioning**: users are created automatically on first successful OIDC login and updated on subsequent logins
- **Mail access**: XOAUTH2 with the user's access token
- **No password storage**: IMAP passwords are not stored
- **Encryption at rest**: prompts, settings, and cache values are encrypted
- **In-memory processing only**: email bodies are not persisted
- **Internal LLM only**: no public LLM endpoints allowed

---

## API Shape

All endpoints require:

```http
Authorization: Bearer <keycloak_access_token>
```

### Phase 1 endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/auth/me` | current user info |
| GET | `/mail/folders` | list IMAP folders |
| GET | `/mail/messages` | list messages |
| GET | `/mail/messages/:uid` | single message body |
| POST | `/summary/message` | single message summary |
| POST | `/summary/batch` | batch digest |
| POST | `/summary/batch/stream` | batch digest via SSE |
| POST | `/summary/today` | today preset |
| POST | `/summary/week` | this week preset |
| GET | `/prompts` | list prompts |
| GET | `/provider/models` | list available models |

---

## Frontend Routes

| Route | Description |
|-------|-------------|
| `/` | redirect to `/digest` or sign-in |
| `/auth/signin` | Keycloak login |
| `/inbox` | message list with filters |
| `/inbox/[uid]` | detail page + summary panel |
| `/digest` | preset and custom digest generation |

---

## Dependency Management Rules

### Node / TypeScript / Nx / NestJS backend

- `.nvmrc` should be set to `24`
- `package.json#engines.node` should require Node 24
- TypeScript strict mode must be enabled
- `nx` and all `@nx/*` packages must be version-aligned
- TypeORM is the default ORM across backend modules
- `class-validator` and `class-transformer` are required for DTO validation pipelines

### Frontend state

- Keep `redux-observable` for async orchestration if the team wants stream-based side effects
- Keep `typesafe-actions` only if the action pattern is already part of the codebase conventions
- Do not mix multiple state patterns without a good reason

### Upgrade policy

- Prefer exact pins for infra-critical tools
- Test `redux-observable` upgrades carefully because the current newest line is RC
- Review Next.js upgrade notes before major/minor jumps
- Keep NestJS core packages aligned within the same major/minor family

---

## Roadmap

### Phase 1
- [x] Architecture and requirements defined
- [x] IMAP XOAUTH2 confirmed
- [ ] Nx monorepo bootstrap
- [ ] Keycloak auth flow
- [ ] Encryption service
- [ ] Mail listing / fetch
- [ ] Single-message summary
- [ ] Batch digest with SSE
- [ ] Prompt library
- [ ] Provider adapter
- [ ] Frontend UI

### Phase 2
- [ ] This month / this year presets
- [ ] Incremental digest support
- [ ] Prompt editor
- [ ] User settings persistence
- [ ] Expanded CQRS read/write separation for all write-capable features

---

## Conventional Commits

Use Conventional Commits for repository history.

| Type | When to use |
|------|-------------|
| `feat` | new functionality |
| `fix` | bug fix |
| `chore` | routine work, configs, dependencies |
| `docs` | documentation only |
| `refactor` | refactoring with no behavior change |
| `test` | adding or changing tests |
| `perf` | performance improvement |
| `ci` | CI/CD pipeline changes |
| `build` | build system changes |
| `style` | formatting, whitespace, non-functional style changes |

---

## License

MIT — see [LICENSE](LICENSE).

White paper: [WHITEPAPER.md](WHITEPAPER.md). Security policy and threat model: [SECURITY.md](SECURITY.md).
