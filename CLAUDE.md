# ConnectCRM — Backend (crmMasterBackend)

> AI-agent entry point. This file is intentionally short. The full, structured
> project context lives in **[`docs/ai-context/`](docs/ai-context/README.md)** —
> read that first before making changes.

## What this repo is
`crmMasterBackend` is the **REST API server** behind ConnectCRM — a multi-tenant
SaaS CRM. It is a **Node.js + Express + MongoDB (Mongoose)** application that
serves both the React web client (`connectCRM-React`) and a companion mobile app.
It owns all business data, authentication, lead ingestion (manual / CSV import /
public webhook / Facebook Lead Ads / WhatsApp Click-to-WhatsApp), reporting,
notifications and subscription enforcement.

## Where to read next (progressive disclosure)
| If you need…                                       | Open |
|----------------------------------------------------|------|
| Big-picture overview + full endpoint map           | [`docs/ai-context/README.md`](docs/ai-context/README.md) |
| How the server is wired (request lifecycle, auth, multi-tenancy, config) | [`docs/ai-context/architecture.md`](docs/ai-context/architecture.md) |
| Leads: CRUD, buckets, import/export, history, engagement | [`docs/ai-context/module-leads.md`](docs/ai-context/module-leads.md) |
| CRM master-data, users/company, permissions, subscription | [`docs/ai-context/module-crm-config-and-users.md`](docs/ai-context/module-crm-config-and-users.md) |
| Dashboard, calendar, call history & reports        | [`docs/ai-context/module-dashboard-calls-reports.md`](docs/ai-context/module-dashboard-calls-reports.md) |
| Integrations (public webhook, Facebook) + notifications | [`docs/ai-context/module-integrations-and-notifications.md`](docs/ai-context/module-integrations-and-notifications.md) |

> There is also a pre-existing, feature-specific doc set under
> [`docs/`](docs/README.md) for the **Facebook integration** — the integrations
> module links to it rather than duplicating it.

## Commands
```bash
npm install                 # install dependencies (Node >= 15.10)
npm start                   # nodemon server/app.js (dev)
npm run dist                # NODE_ENV=production nodemon server/app.js
node server/app.js          # plain start (as the README documents)
# migrations / maintenance (run manually, with care):
npm run migrate:facebook-index
npm run verify:facebook-accounts
```
Production is run under **PM2** (`ecosystem.config.js`).

## Must-know before editing
- **Every route is mounted under `/api`** and almost all use the `/v1` prefix →
  real paths look like `POST /api/v1/lead`. Routes are registered in
  `server/routes.js`.
- **One folder per resource** in `server/api/<resource>/` with the pattern
  `*.route.js` → `*.controller.js` → `*.service.js` → `*.model.js` +
  `*.validation.js` (Joi). Follow this pattern for new resources.
- **Auth** = JWT via `auth.isAuthenticated()` middleware (`server/api/auth/
  auth.service.js`); the token carries `{ _id, role, companyId }`.
- **Multi-tenancy:** nearly all data is scoped by `companyId` from the token —
  never return or mutate another company's documents.
- **Subscription gating** is enforced globally (expired → HTTP 403
  `SUBSCRIPTION_EXPIRED`); see `server/api/subscription/`.
- **Responses** use `global.responseHandler` → `{ error, message, data, options }`.
- **Env file lives at `server/config/.env`** (see `.env.example` at the root for
  the full list). Do not commit real secrets.
- This is a **living document** — update `docs/ai-context/` when you change
  routing, the data model, auth, or integrations.
