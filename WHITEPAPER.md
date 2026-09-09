# Email Assistant
## Technical White Paper

**The cost of mail is not delivery. It is triage.**

**Organization:** Right&Above  
**Version:** 1.0  
**Publication date:** September 2026  
**Document status:** Public technical white paper  
**Source:** MIT-licensed reference implementation

A reasoned approach to self-hosted email briefing for organisations that cannot send corporate mail to a public model.

Email Assistant is a self-hosted web application that connects to the corporate mailbox over IMAP, analyses each message with a language model you host yourself, and turns unread mail into three things you can act on: a **briefing** of what happened, an **agenda** of what to do, and a **summary** on every message. This paper argues that the failure mode in “AI for email” is not missing chat — it is the absence of a split between what the model may write and what code must count, inside a perimeter the mail is not allowed to leave.

---

## Contents

1. Abstract
2. The problem in industry context
3. What would have to be true for a briefing to be trustworthy
4. Approach
5. Who does what
6. Architecture, as a consequence of the approach
7. Evidence from the implementation
8. Scope, applicability, and limits
9. Conclusion
10. Notes and sources

## Executive Summary

Email administration is often treated as a reading problem. In practice the difficult part is producing a correct, explainable briefing under three constraints that do not appear in consumer AI products: the mail cannot leave the network, the model must not be trusted with counting or ranking, and every message body is hostile input.

This paper presents a narrower alternative to “paste the inbox into a chatbot” and to hosted AI-mail suites: a self-hosted assistant for organisations that already operate a corporate identity directory and a self-hosted LLM. Its central design principle is that **the model writes only where writing is what you want**. One LLM call enriches each message once. Deterministic code aggregates, counts and ranks. A second, small LLM call writes the briefing from the aggregate — not from raw mail.

The system signs in with company SSO. IMAP is reached with XOAUTH2 using the user’s own token, so there is no mail password to store. Message bodies are processed in memory and never written to disk. What persists is the derived summary, encrypted. Roles come from the identity token.

The paper is intentionally not a claim of customer ROI or production performance. Its evidence is the implementation model, the pipeline’s separation of concerns, the security boundary, and the public source.

## Abstract

Most knowledge workers still triage mail by hand. Delivery works. Downstream fails: deciding which of ninety unread threads needs you, reconstructing a decision from a chain of forwards, spotting the deadline in paragraph four. McKinsey’s research on interaction work put time spent on email at about **28% of the workweek**.[1] Volume is not falling: industry mail surveys continue to measure hundreds of billions of messages sent per day.[2]

The obvious fix — paste the thread into a public chatbot — is exactly the thing corporate mail policy exists to prevent. Hosted “AI inbox” products solve a different job: they take the mail off-site and treat the model as the system of record for both prose and numbers.

This paper analyses that gap and describes a narrower design. Enrichment is one LLM call per message, once. Aggregation is code. Narrative is one LLM call per briefing, over a compact aggregate. The body is wrapped as untrusted input before it reaches the model. Nothing of the body is persisted. The system is not a mail client and not a public assistant. It does one job: turn a mailbox into a briefing you can act on, inside the perimeter.

---

## 1. The problem in industry context

### 1.1 Mail arrives. Reading does not.

A mailbox is not a to-do list. It is a running stream with four jobs that humans currently do in their heads:

1. **Triage** — which of the unread threads actually needs this person.
2. **Reconstruction** — what was decided in message seven of nine, under two signatures and a legal footer.
3. **Extraction** — “can you confirm by Friday” is an action, a deadline and a question at once, stored as a sentence.
4. **Narrative** — what happened today, in a form a person can start from.

If any of those four is done in a different place, or by a different tool, the organisation no longer has one morning brief. It has several plausible stories. That is the operational failure. The institutional failure is worse: the only scalable “AI” fix on offer sends the correspondence to a third party.

This is why “we have search” does not solve mail. Search finds messages. It does not apply judgment, and it does not write the paragraph a human will read first.

### 1.2 The volume is large enough that informal methods do not scale

Email is not a rare exception that a diligent reader can babysit. McKinsey’s work on interaction workers estimated that email consumed about **28% of the workweek** — more than any other single communication activity in that study.[1] Independent industry trackers still measure global traffic in the **hundreds of billions of messages per day**, the large majority of it business mail.[2] A professional returning from two weeks off does not face a reading list. They face a wall, ordered by arrival, not by importance.

Coming back is the worst part. Threads hide their own conclusion. Commitments live only in prose. Informal methods fail at that frequency long before they fail at “does anyone remember what we agreed.”

### 1.3 Public models are a known-bad substrate for corporate mail

The argument against pasting mail into a public model is not aesthetic. It is policy, and it is technical.

Corporate correspondence includes invoices, contracts, personnel matters and credentials. Sending that text to a hosted inference API is a data-export decision, whether or not the vendor’s terms say the prompt is “not used for training.” For many firms the decision is already made: it is forbidden.

Even inside the perimeter, a language model is a bad ledger. Counting with a model is how you get a dashboard that disagrees with itself. Ranking with a model is how yesterday’s briefing and today’s briefing disagree about the same inbox. Prompt-injection research is unambiguous that **untrusted content in the prompt can override instructions**; email is the canonical untrusted content.[3] A product that throws the whole mailbox at a model and hopes is not a security design. It is an absence of one.

### 1.4 Hosted AI-mail suites solve a broader job, and miss this one

The obvious alternative to the public chatbot is a commercial AI inbox. For organisations that want mail, calendar, tasks and a vendor-hosted model in one SaaS tenant, that is the right purchase. For organisations that already run identity (Keycloak), IMAP with XOAUTH2, and a self-hosted LLM, it is often the wrong one, for three structural reasons.

**The mail leaves.** The suite’s centre of gravity is a hosted model. The inbox is copied or streamed off-site. That is the feature. It is also the blocker.

**The model is the system of record.** Numbers, ranking and prose come from the same call. When they disagree, there is no second, deterministic column to trust.

**Identity is duplicated.** The suite has its own user table and its own mail credentials, or a federated login that still leaves authorisation inside the vendor. The assistant becomes a second source of “who may read whose mailbox.”

None of this is an argument that hosted suites are poorly built. It is an argument that **briefing, done correctly, is a pipeline with a security boundary**, not a chat window on someone else’s GPU.

### 1.5 Why not “just self-host a chatbot on IMAP”?

The alternatives are not equivalent because they optimise for different jobs. A chatbot on a mailbox is flexible but weak as an auditable computational system: it will invent counts, obey a forged instruction inside a message, and persist whatever the last prompt happened to say. A hosted suite can summarise mail, but organisations with an existing identity directory and a residency constraint still have to copy the correspondence into the vendor.

The proposed system deliberately narrows the problem:

| Requirement | Public chatbot | Hosted AI inbox | Email Assistant |
| --- | --- | --- | --- |
| Mail stays inside the perimeter | No | Usually no | Yes |
| Self-hosted LLM | Possible | Product-dependent | Yes |
| Existing identity provider as login | No | Often partial | Yes |
| No stored mail password (XOAUTH2) | No | Product-dependent | Yes |
| Model does not count or rank | No | Usually no | Yes |
| Bodies not persisted | No | Usually no | Yes |
| Untrusted-content wrapping | No | Product-dependent | Yes |

This is positioning, not a claim that every suite lacks these capabilities. The distinction is that Email Assistant makes them the centre of the design rather than features surrounding a broader mail platform.

## 2. What would have to be true for a briefing to be trustworthy

A briefing is trustworthy when a competent outsider can answer four questions from the system of record, without asking a person:

| Question | What “good” looks like |
| --- | --- |
| What happened in this period? | A narrative written from an aggregate, not from a raw dump of mail. |
| What should I do next? | An agenda built from per-message action items, ordered by code, not by the model. |
| Why is this message “important”? | A stored enrichment (score, flags, categories) computed once and reused. |
| Did any of the mail leave? | No: bodies in memory, model on-network, no third-party inference. |

Those questions imply design constraints. They are worth stating before the product, because they are the reasons the product is shaped the way it is.

1. **The model must not count.** Counters, charts and ranking are deterministic functions of enriched messages. If the model writes the number, the dashboard will eventually disagree with the list.
2. **Enrichment happens once.** One structured analysis per message, cached by message, model and prompt version. A second briefing over the same mail must not re-read the bodies.
3. **The briefing is written from the aggregate.** The narrative call sees a compact structure, not the mailbox. Small context, small model, nothing raw in the prompt at L3.
4. **Every body is hostile input.** Subjects, senders and bodies are wrapped in untrusted-content markers. Markers forged inside the mail are broken. A standing system directive forbids obeying anything found inside those blocks.
5. **Bodies are not a row in the database.** Fetch, analyse, discard. What persists is the derived summary, encrypted per user.
6. **Identity is not a local table.** Who is signed in, and whether they may use the app, are directory facts. IMAP uses that person’s token. There is no mail password and no anonymous path.

If a design violates any of these, it will recreate the chatbot’s failure modes with a nicer UI.

## 3. Approach

Email Assistant is an internal web application for organisations that already run SSO (OpenID Connect / Keycloak), an IMAP server that accepts XOAUTH2, and a self-hosted LLM (Ollama or any OpenAI-compatible gateway). It is not a mail client. It does not send mail. Employees see their own mailbox through the existing account; there is no shared inbox credential.

The rest of this section is the reasoning, not the feature list.

### 3.1 Three layers. The model only writes where writing is wanted.

**L1 — Enrichment.** One LLM call per message, once. The body is fetched over IMAP, wrapped as untrusted input and analysed into a fixed shape: title, abstract, action items, questions, deadlines, categories, a 0–100 priority score, urgency, and junk / automated / action-required flags. Cached per message, model and prompt version.

**L2 — Aggregation.** No LLM. Enriched messages are bucketed — critical, suspicious, invoices, meetings, junk, new, important, requires-attention — counted, ranked by priority, and turned into the agenda and the statistics. The same input always yields the same numbers.

**L3 — Narrative.** One LLM call per briefing. The compact aggregate — not the mail — is handed back to the model, which writes the paragraph a person actually reads. Streamed to the browser over SSE and cached by parameter hash.

The order matters. Mail-in-the-prompt-for-everything makes every briefing expensive, inconsistent and leaky. Split-then-write makes L1 the only expensive stage, and it runs once per message, ever.

### 3.2 The agenda is not a story the model invented

Every message that needs an action becomes one agenda line, built from the L1 action items. The model never decides the ordering. That is the difference between “we have an AI to-do list” and “we have a deterministic projection of extracted actions.” If the ranking is wrong, the bug is in code or in the enrichment schema, not in a sampling temperature.

### 3.3 Identity comes from the token; IMAP uses the same token

Sign-in is delegated to corporate Keycloak. The session lives in an httpOnly cookie. IMAP is reached with XOAUTH2 using the user’s access token. There is no mail credential to store, rotate or leak. Users are provisioned on first successful OIDC login and refreshed on each subsequent one. Signing in without an application role is refused.

### 3.4 Persistence is the derivative, not the letter

Message content is fetched, analysed and discarded within the request. The derived summary is encrypted with AES-256-GCM under a key derived per user via HKDF-SHA256. Cache keys include the prompt version, so a prompt change invalidates cleanly. A modifier-click forces a hard refresh. The design starts from “this mail cannot be on disk,” not from a store-and-encrypt-later retrofit.

### 3.5 Two providers, one interface

Ollama and any OpenAI-compatible gateway are configured side by side. A request can override provider, model, temperature, top-p, max tokens and seed; defaults come from environment configuration. Because L3 never sees raw mail, its context stays small. The default development model is a 3B. This does not need a datacentre.

## 4. Who does what

The product surface follows the constraints in section 2. It is included here so the approach can be evaluated against the actual jobs, not against an abstract architecture.

| Who | What they do |
| --- | --- |
| The signed-in employee | Opens a briefing for a period (today, yesterday, this week, this month, or a custom range); follows the agenda; reads the inbox with the analysis already on each row; opens a message and sees the body plus a streaming AI summary. |
| The identity provider | Authenticates the person and supplies roles. The app does not keep a password file. |
| The IMAP server | Serves the mailbox over XOAUTH2 with the user’s token. The app does not store a mail password. |
| The self-hosted LLM | Performs L1 enrichment and L3 narrative. It does not compute counters or agenda order. |
| An administrator of the deployment | Supplies OIDC, IMAP, LLM and encryption configuration in environment variables. There is no in-app “tenant admin” for other people’s mail. |

Phase 1 implements dashboard, inbox, per-message summaries, briefings and agenda. Calendar integration is not implemented; the schedule card is a placeholder.

## 5. Architecture, as a consequence of the approach

The stack is a TypeScript Nx monorepo. Secrets stay in environment variables; this paper does not describe any specific deployment.

| Layer | Choice | Why it is in this paper |
| --- | --- | --- |
| Frontend | Next.js 16, React 19, MUI, Redux | `/digest`, `/inbox`, `/inbox/[uid]`. The browser displays what the API derived. |
| API | NestJS 11, CQRS | Commands orchestrate; queries read; handlers do not cross the line. |
| Transport | HTTP + SSE | Enrichment, digest blocks, briefing, agenda and per-message summaries fill in as they finish. |
| Data | PostgreSQL, Redis, TypeORM | Encrypted derived rows and cache. `synchronize` is not how schema changes are made. |
| Identity | OIDC (Keycloak); roles from the token | Constraint 6: no local role table. |
| Mail | IMAP + XOAUTH2 | No stored mail password. |
| Model | Ollama and/or OpenAI-compatible gateway | Self-hosted only. No public LLM API. |
| Contracts | `libs/common` DTOs | Shared by both sides; no business logic in the shared library. |

Two properties are load-bearing.

**The browser does not invent the briefing.** It streams what the backend produced from L1+L2+L3. A crafted client cannot grant itself a different mailbox than the token allows.

**The prompt-injection boundary is explicit, and it is one layer.** Markers found inside the mail are broken with a zero-width character so an attacker cannot close the block early. The source calls this what it is: defence-in-depth, not a complete solution.[3]

## 6. Evidence from the implementation

A design paper that never touches the artefact it describes is a prospectus. Two kinds of evidence are available here: that the pipeline exists as separated stages, and that the security constraints are implemented as code rather than as a slide.

### 6.1 The pipeline as tests and interfaces

L1 writes a fixed enrichment shape. L2 consumes that shape and does not call the model. L3 consumes the L2 aggregate and does not see raw bodies. Cache keys include model and prompt version. Those claims are pinned by the module boundaries (enrichment, aggregation, briefing, storage) and by the DTO contracts in `libs/common`. If a change lets a command handler return a read model, or lets L3 see a message body, the design has been violated in a place a reviewer can find.

### 6.2 Representative verification cases

The following cases illustrate the kinds of invariants the implementation is built to pin down. They are a verification structure, not independently reported customer measurements.

| Case | Input condition | Expected invariant |
| --- | --- | --- |
| Second briefing, same mail | Cache warm, same model and prompt version | No new L1 calls; L3 is a cache hit or one short call |
| Prompt change | Enrichment prompt version increments | Previous summaries are not reused |
| Forged untrusted markers in a body | Mail contains the wrapper strings | Markers are escaped; the model is not given a closed block |
| No application role | OIDC login succeeds with only system roles | Sign-in is refused |
| Body persistence | Enrichment request completes | No message body row; only an encrypted derived summary |
| Agenda order | Two messages with different priority scores | Ordering comes from L2, not from L3 prose |

### 6.3 What this paper does not treat as evidence

There is no public hosted demo: the app needs OIDC, IMAP with XOAUTH2, and a self-hosted LLM. There is no field study of hours saved after go-live. Organisations evaluating the system should treat the public source, the security note, and a local run against their own IdP and mailbox as the primary artefacts. This paper is the argument for why those artefacts are shaped that way.

## 7. Scope, applicability, and limits

**Who should use it.** Engineering and professional-services firms that want mail briefing in-house, already operate Keycloak (or another OIDC provider), can reach IMAP with XOAUTH2 using that provider’s tokens, and already run or will run a self-hosted LLM — and who will not send corporate mail to a public API.

**Who should not.** Organisations that want a hosted inbox with a vendor model. Organisations with no identity provider and no IMAP+XOAUTH2 path. Organisations that need the assistant to send mail, file tickets, or act on the mailbox. Organisations whose real rule is “paste it into the chatbot we already pay for.”

**What this paper does not claim.** It does not claim a measured reduction in time-to-inbox-zero at a named customer. It does not claim that prompt-injection wrapping is a complete defence. It does not describe a specific production host or secret. Calendar integration is out of scope for phase 1. The MIT-licensed source is the public artefact; this paper is the argument.

## 8. Conclusion

Mail goes wrong when triage, counting and narrative live in the same undifferentiated call — or when they live in a tool the correspondence is not allowed to enter. Public chatbots keep a model and export the mail. Hosted suites keep a platform whose centre of gravity is off-site inference. Hand reading keeps the perimeter and loses the morning.

The approach argued here is narrower. Enrich once. Count in code. Write the briefing from the aggregate. Treat every body as hostile. Persist the derivative, not the letter. Take identity from the directory and IMAP from the same token. The product that follows from those constraints is a self-hosted email assistant, not a brief for a larger AI-mail suite.

A white paper should be judged by whether a reader can disagree with the argument. The disagreement worth having is this: either a briefing is a chat, in which case any model will do and the mail will leave, or a briefing is a pipeline, in which case the model only writes, and nothing of the letter is stored.

---

## Notes

## References and Public Artefacts

MIT-licensed source: https://github.com/raa-org/email-assistant

1. McKinsey Global Institute, *The social economy: Unlocking value and productivity through social technologies* (2012), and subsequent McKinsey commentary on interaction work: interaction workers were estimated to spend about 28% of the workweek on email. https://www.mckinsey.com/
2. The Radicati Group, *Email Statistics Report* (ongoing series): global daily email traffic in the hundreds of billions, predominantly business mail. https://www.radicati.com/
3. OWASP, *LLM01: Prompt Injection* (OWASP Top 10 for LLM Applications): untrusted content in the model context can override system instructions. Email is a standard untrusted channel. The implementation’s wrapper is one layer of defence-in-depth; see also `SECURITY.md` in the source repository. https://owasp.org/
