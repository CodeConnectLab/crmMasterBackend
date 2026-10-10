# ConnectCRM Backend (crmMasterBackend) — Project Overview

> **Audience:** AI agents and developers who need to understand this repository
> quickly. This is the **high-level map**. Each module group has a deeper file
> linked below; open those only when you need detail.
>
> **Last verified against source:** `main` (Oct 2025). Living document — keep it
> in sync when routing, models, auth, or integrations change.

---

## 1. What is this?

`crmMasterBackend` is the **REST API server** for ConnectCRM, a **multi-tenant
SaaS CRM**. It is the single source of truth for all business data and serves two
clients:
- the **React web app** (`connectCRM-React`), and
- a **companion mobile app** (Android/iOS).

Responsibilities: authentication & sessions, company/user management, the full
**lead lifecycle**, lead ingestion from multiple channels (manual, CSV/Excel
import, public API webhook, **Facebook Lead Ads**, **WhatsApp Click-to-WhatsApp**),
dashboards & reports, call-history reporting, push/email notifications, and
**subscription enforcement**.

### Tenancy & roles
- **Multi-tenant by `companyId`.** Every user belongs to one `company`; the JWT
  carries `companyId` and virtually all queries are scoped to it.
- **Roles** (`server/config/constants/userRoles.js`): `Super Admin`,
  `Team Leader`, `Employee`.
- **Subscription** per company (`free` / `starter` / `professional` /
  `enterprise`, status `trial` / `active` / `expired`) — enforced on nearly
  every request.

---

## 2. Tech stack (verified from `package.json`)

| Area | Choice |
|------|--------|
| Runtime | **Node.js** (`engines.node >= 15.10`; README/`.github` target Node 16) |
| Framework | **Express 4** |
| Database | **MongoDB** via **Mongoose 8** (+ `mongoose-paginate-v2`, `mongoose-aggregate-paginate-v2`, `mongoose-delete` soft-delete) |
| Auth | **JWT** (`jsonwebtoken`), custom salted-hash passwords, OTP |
| Validation | **Joi** (`joi`, `joi-objectid`) via a `joiValidate` helper |
| File storage | **AWS S3** (`aws-sdk`) + **multer** / **formidable** / **multiparty** uploads |
| Imports | **csvtojson**, **xlsx** |
| Exports | **pdfkit** (PDF), **xlsx** (Excel) |
| Push notifications | **firebase-admin** (FCM) |
| Email | **nodemailer** + **email-templates** (EJS templates) |
| Scheduled jobs | **node-cron** |
| Logging | **winston** (+ daily-rotate), request logging |
| Dates | **moment** / **moment-timezone** |
| Geo data | **country-state-city** |
| Process manager | **PM2** (`ecosystem.config.js`) |

> **Present but NOT wired in the current `server/` code:** `bullmq` + `ioredis`
> (Redis-backed queues) and `graphql` appear in dependencies but have little or
> no live usage — background work today is done with **node-cron**, and the API
> is **REST**, not GraphQL. Don't assume a queue/GraphQL layer exists until you
> see it in code.

---

## 3. High-level architecture (one picture)

```
HTTP client (web app / mobile app / external webhook)
│
│  all paths begin with /api
▼
server/app.js                      ← boot: dotenv, cron schedulers, DB connect
  └─ config/express.js             ← CORS allow-list, body-parser, static /api/static, bot-filter
  └─ routes.js                     ← mounts every api/<resource>/*.route.js under /api
       └─ <resource>.route.js
            ├─ auth.isAuthenticated()         ← verify JWT → req.user {_id, role, companyId}
            ├─ checkSubscription middleware    ← 403 if company subscription expired
            ├─ joiValidate(schema)             ← request validation
            └─ <resource>.controller.js        ← thin: parse req, call service, send response
                 └─ <resource>.service.js      ← business logic + Mongoose queries (company-scoped)
                      └─ <resource>.model.js    ← Mongoose schema
       global.responseHandler → { error, message, data, options }
│
├─ MongoDB (Mongoose)              ← primary datastore
├─ AWS S3                          ← uploaded files (geo-location images, profile pics, attachments)
├─ Firebase Admin (FCM)            ← push notifications (web + mobile)
├─ node-cron                       ← notification scheduler, call-history purge
└─ Facebook Graph API              ← Lead Ads sync + webhook
```

---

## 4. The MVC-style folder pattern (`server/api/<resource>/`)

Every resource follows the same layered pattern — learn it once, it repeats:

| File | Role |
|------|------|
| `*.route.js` | Declares endpoints + middleware chain (auth, validation) |
| `*.controller.js` | Thin HTTP layer: read `req`, call service, format response |
| `*.service.js` | Business logic + all Mongoose queries (where `companyId` scoping lives) |
| `*.model.js` | Mongoose schema/model |
| `*.validation.js` | Joi schemas used by `joiValidate` |

See [`architecture.md`](architecture.md) for the request lifecycle in detail.

---

## 5. Module map & full endpoint inventory

All endpoints are prefixed with `/api`; most add `/v1`. Grouped by resource.
(`→ frontend` notes show which React `END_POINT` consumes it.)

### Auth — [details](module-crm-config-and-users.md)
| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/v1/signin` | Login (email/phone + password **or** OTP) → JWT (→ frontend `signin`) |
| POST | `/api/auth/logout` | Logout / revoke token |
| POST | `/api/v1/refresh` | Refresh access token |
| POST | `/api/v1/forget-password/request-otp` | Start password reset |
| POST | `/api/v1/forget-password/verify-otp` | Verify OTP |
| POST | `/api/v1/forget-password/reset-password` | Set new password |

### Users & Company — [details](module-crm-config-and-users.md)
| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/v1/register` | Company + first-admin signup (→ `register`) |
| POST | `/api/v1/register/users-register` | Create a user in the company (→ `register/users-register`) |
| GET | `/api/v1/users/profile` | Canonical profile incl. company+subscription (→ `users/profile`) |
| PUT | `/api/v1/users/profile` | Update own profile |
| PUT | `/api/v1/users/profile-img-uplode` | Upload profile image (S3) |
| PUT | `/api/v1/updateDepartment/:id` | Update a user/department |
| PUT | `/api/v1/updateCompanyDetails` | Update company details |
| GET | `/api/v1/users` | List company users (→ `users`) |
| DELETE | `/api/v1/Delete-User` | Delete a user (→ `delete-user`) |
| PUT | `/api/v1` | Update user (base path) |
| PUT | `/api/v1/update-token` | Save FCM web/mobile token (→ `update-token`) |

### Leads — [details](module-leads.md)
| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/v1/lead` | Create lead (→ `lead`) |
| GET | `/api/v1/lead` | List leads (paginated, company-scoped) |
| GET | `/api/v1/lead/follow-up` | Follow-up leads (→ `lead/follow-up`) |
| GET | `/api/v1/lead/imported` | Imported bucket |
| GET | `/api/v1/lead/outsourced` | Outsourced bucket |
| GET | `/api/v1/lead/idle` | Idle bucket |
| GET | `/api/v1/lead/unassigned` | Unassigned bucket |
| GET | `/api/v1/lead/new` | New bucket |
| GET | `/api/v1/lead/:id` | Lead detail + history + geo-location |
| PUT | `/api/v1/lead/:id` | Update lead (status/comment/follow-up/…) |
| POST | `/api/v1/bulkUplodeLead` | CSV/Excel import (multipart) (→ `bulkUplodeLead`) |
| PUT | `/api/v1/bulkUpdate` | Bulk update (assign/status) (→ `bulkUpdate`) |
| DELETE | `/api/v1/bulkDelete` | Bulk delete (→ `bulkDelete`) |
| GET | `/api/v1/export-excel` | Export leads to Excel (base64) |
| GET | `/api/v1/export-pdf` | Export leads to PDF (base64) |
| POST | `/api/v1/lead/:id/touch` | Record an engagement touch (→ `lead/:id/touch`) |
| GET | `/api/v1/reports/engagement-per-day` | Engagement report (→ `reports/engagement-per-day`) |

### CRM master data & locations — [details](module-crm-config-and-users.md)
| Method | Path (CRUD) | Purpose |
|--------|-------------|---------|
| POST/GET/PUT/DELETE | `/api/v1/lead-sources[/:id]` | Lead sources (→ `lead-sources`) |
| POST/GET/PUT/DELETE | `/api/v1/lead-status[/:id]` | Lead statuses (→ `lead-status`) |
| POST/GET/PUT/DELETE | `/api/v1/lost-reason[/:id]` | Lost reasons (→ `lost-reason`) |
| POST/GET/PUT/DELETE | `/api/v1/product-service[/:id]` | Products/services (→ `product-service`) |
| GET | `/api/v1/locations/countries` | Country list |
| GET | `/api/v1/locations/states/:id` | States for a country |
| GET | `/api/v1/lead-types` | **Aggregated master data** (status+sources+agents+products+countries+lost reasons) → the frontend `GENERAL_DATA` call |

### Permissions — [details](module-crm-config-and-users.md)
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/v1/features` | List features |
| POST | `/api/v1/createPermissions` | Create/update role permissions |

### Dashboard, Calendar, Calls & Reports — [details](module-dashboard-calls-reports.md)
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/v1/dashboard/metrics` | All dashboard KPIs/charts in one payload (→ `dashboard/metrics`) |
| GET | `/api/v1/calendar` | Follow-up calendar events (→ `calendar`) |
| POST | `/api/v1/call-history` | Ingest call records (from mobile app) |
| POST | `/api/v1/call-report` | Employee/call summary report (→ `call-report`) |
| POST | `/api/v1/product-sale-report` | Product-sale report (→ `product-sale-report`) |
| POST | `/api/v1/getCallList` | Detailed call list (→ `getCallList`) |

### Notifications — [details](module-integrations-and-notifications.md)
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/v1/getNotification` | Current user's notifications (→ `getNotification`) |
| PUT | `/api/v1/seenUpdate` | Mark notifications seen (→ `seenUpdate`) |
| GET | `/api/v1/getNotificationList` | Notification list (admin/config) |
| PUT | `/api/v1/updateNotification/:id` | Update a notification setting (→ `updateNotification`) |
| POST | `/api/v1/manuallySendNotification` | Manually send a push |
| GET | `/api/v1/getNotificationListOfUser` | Per-user notification prefs |
| POST | `/api/v1/saveNotificationListOfUser` | Save per-user prefs |

### Integrations — [details](module-integrations-and-notifications.md)
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/v1/getCurlApi` | Generate a cURL/webhook snippet for a lead source (→ `getCurlApi`) |
| POST | `/api/v1/outsource-lead?apikey=…` | **Public** lead-intake webhook (API-key auth, not JWT) |
| POST | `/api/v1/geo-location` | Upload a geo-tagged file for a lead (S3) |
| POST | `/api/v1/facebook/simple-account` | Begin Facebook account link (→ `facebook/simple-account`) |
| POST | `/api/v1/facebook/process-account/:id` | Finalize Facebook account (→ `facebook/process-account`) |
| GET | `/api/v1/facebook/simple-accounts` | Pending Facebook links (→ `facebook/simple-accounts`) |
| GET | `/api/v1/facebook/accounts` | Connected Facebook accounts (→ `facebook/accounts`) |
| PUT/DELETE | `/api/v1/facebook/accounts/:id` | Update / disconnect a Facebook account |
| GET | `/api/v1/facebook/test-token/:id` | Validate a page token |
| GET / POST | `/api/v1/facebook/webhook` | Facebook webhook verify (GET) / receive leads (POST) |

---

## 6. Data model (core collections)

| Collection | Key fields (abridged) |
|------------|-----------------------|
| **company** | `name`, `code` (unique), `status`, `settings{dateFormat,timezone,currency,language,fiscalYear}`, `subscription{plan,startDate,endDate,userLimit(def 3),expiry(+30d),status}`, `createdBy`, `updatedBy` |
| **user** | `name`, `email`(unique), `phone`(unique), `hashedPassword`+`hashSalt`, `role`(enum), `companyId`→company, `assignedTL`→user, `profilePic`, `otp`/`otpExpiry`, `fcmWebToken`/`fcmMobileToken`, `isActive`, `lastLogin` |
| **lead** | `companyId`, `createdBy`, name/contact/email/address fields, refs: `leadSource`,`leadStatus`,`productService`,`assignedAgent`,`leadLostReasonId`; `followUpDate`,`comment`,`description`,`leadCost`,`leadWonAmount`,`addCalender`; `leadAddType`(enum Insert/Import/ThirdParty); Facebook fields (`fbLeadGenId`,`fbLeadGenFormId`,`fbLeadGenAdId`,`campaignName`); WhatsApp fields (`waId`,`waChatId`,`waCtwaClid`,`waSource*`,`waAdHeadline`,`waAdBody`,`waFirstMessage`); engagement (`lastTouchAt`,`lastEngagedAt`,`engagementCountByDay`:Map) |
| **leadHistory** | Per-lead audit trail (commented-by, date, status, follow-up, comment) |
| **leadStatus / leadSource / lostReason / productService** | Company-scoped master-data lists |
| **callHistory** | Call records from the mobile app (purged after 60 days by cron) |
| **notification / notificationSetting** | Notification records + per-event config |
| **facebookAccount / facebookSimpleAccount** | Facebook Lead Ads linkage |
| **geoLocation** | File metadata (`s3Url`, `coordinates`) attached to a lead |
| **verificationTokens** | Active JWT/refresh tokens (single-session enforcement) |

---

## 7. Configuration & environment

- Runtime config: `server/config/environment/{index,development,production}.js`.
  Only **Mongo** is strictly required by the loader; most features read
  `process.env.*` directly.
- **Env file location:** `server/config/.env` (per the README). The root
  **`.env.example`** lists the full documented set (DB, JWT, SMTP, AWS S3,
  Facebook app + webhook token, Firebase, Redis, Twilio, logging, CORS, rate
  limiting). Some of those (Redis, Twilio, rate-limiting) are **documented but
  not yet consumed** in code.
- Default **port 7000** (`PORT` env overrides), bind IP `0.0.0.0`.
- CORS allow-list is **hardcoded** in `server/config/express.js` (includes
  `https://crm.codeconnect.in` and local dev origins) — add new frontends there.

See [`architecture.md`](architecture.md) §config for the detailed list.

---

## 8. Conventions & gotchas (read before coding)

- **Always scope by `companyId`** from `req.user`. This is the multi-tenant
  safety boundary.
- **Response shape is fixed:** `{ error:boolean, message, data, options }` via
  `global.responseHandler`. `options.pagination.total` carries list totals.
- **Soft deletes:** leads use `mongoose-delete` — "deleted" rows may still exist;
  use the plugin's query helpers, don't assume hard deletes.
- **Load-bearing spellings** (the frontend depends on them): `bulkUplodeLead`,
  `Delete-User`, `profile-img-uplode`, `getCurlApi`, `seenUpdate`. Don't "fix".
- **Two auth models:** JWT for app traffic; **API-key query param** for the
  public `outsource-lead` webhook.
- **Cron jobs start at boot** in `server/app.js` (notification scheduler +
  call-history purge). Be careful running the app in environments where those
  should not fire.
- **Migrations in `server/migrations/` are manual and destructive** (lead
  dedupe/recovery, Facebook index fixes) — never run them casually.
- `bullmq`/`ioredis`/`graphql` are in `package.json` but not meaningfully used.
