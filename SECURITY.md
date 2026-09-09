# Security policy

## Reporting a vulnerability

Please report security issues privately to **security@rightandabove.com** rather
than opening a public issue. Include a description, affected version or commit,
and reproduction steps. We aim to acknowledge within five working days.

## Threat model this project assumes

Email Assistant reads corporate mailboxes and sends their contents to a language
model. The design starts from three assumptions:

1. **Message content is confidential.** It is fetched, analysed and discarded
   within the request. Only derived summaries are stored, encrypted with
   AES-256-GCM under a per-user key derived from `ENCRYPTION_MASTER_SECRET`
   via HKDF-SHA256.
2. **Email is attacker-controlled input.** Subjects, sender names and bodies are
   wrapped in explicit untrusted-content markers before they reach the model, and
   any marker forged inside the mail is escaped. A standing system directive
   forbids obeying instructions found inside those blocks. See
   `apps/backend/src/summary/sanitization/llm-sanitization.service.ts`.

   This raises the cost of prompt injection. It is **not** a complete defence —
   a determined attacker can still phrase instructions in natural language.
   Treat model output as untrusted, and do not wire it to side effects.
3. **The model provider is part of the trust boundary.** The project is built for
   a self-hosted LLM inside your own network. Pointing it at a third-party API
   means sending mail content to that third party.

## Operational requirements

- Never commit a real `.env`. Only `.env.example` belongs in the repository.
- Generate your own `JWT_SECRET` and `ENCRYPTION_MASTER_SECRET`
  (`openssl rand -hex 32`). Rotating the encryption master secret invalidates
  every stored summary.
- Authentication is delegated to your OIDC provider. There is no local password
  store and no anonymous path into the API.
- IMAP is reached with XOAUTH2 using the signed-in user's access token, so no
  mailbox password is stored.

## Supported versions

This is a phase-1 internal tool released as source. Fixes land on `main`; there
are no long-term support branches.
