# Module: Leads (core)

> The lead lifecycle is the backend's reason to exist: ingest from many channels,
> store/query per company and per role, let agents work leads, and measure
> engagement. Code in `server/api/lead/` and `server/api/leadTouch/`.

**Template:** Purpose → Endpoints → Data model → Key logic/flows → Dependencies/gotchas.

---

## 1. Purpose

Own the full lead record and its history: creation (manual / import / third-party
/ Facebook / WhatsApp), listing with filters & "buckets", per-lead detail with
audit history and geo-attachments, bulk operations, import/export, and the
engagement-touch system that feeds the engagement report.

---

## 2. Endpoints (`server/api/lead/lead.route.js`, `leadTouch.route.js`)

All under `/api/v1`, all JWT-authenticated.

| Method | Path | Controller | Purpose |
|--------|------|------------|---------|
| POST | `/lead` | `createLead` | Create a single lead (validated) |
| GET | `/lead` | `getAllByCompany` | Paginated list, company+role scoped, filters & search |
| GET | `/lead/follow-up` | `getAllFollowupLeadsByCompany` | Leads in follow-up statuses within a date window |
| GET | `/lead/imported` | `getAllImportedLeadsByCompany` | `leadAddType = Import` |
| GET | `/lead/outsourced` | `getAllOutsourcedLeadsByCompany` | `leadAddType = ThirdParty` |
| GET | `/lead/idle` | `getAllIdleLeadsByCompany` | No recent engagement |
| GET | `/lead/unassigned` | `getAllUnassignedLeadsByCompany` | `assignedAgent = null` (Super Admin scope) |
| GET | `/lead/new` | `getAllNewLeadsByCompany` | Recently created |
| GET | `/lead/:id` | `getLeadDetails` | Detail + `leadHistory` + `geoLocation` |
| PUT | `/lead/:id` | `getLeadUpdate` | Update (status/comment/follow-up/agent/won amount…) + write history |
| POST | `/bulkUplodeLead` | `bulkUplodeLead` | CSV/Excel import (multipart `file`) |
| PUT | `/bulkUpdate` | `bulkUpdateLeads` | Bulk assign agent / change status |
| DELETE | `/bulkDelete` | `bulkDeleteLeads` | Bulk (soft) delete |
| GET | `/export-excel` | `exportExcel` | Export to Excel (base64 payload) |
| GET | `/export-pdf` | `exportPdf` | Export to PDF (base64 payload) |
| POST | `/lead/:id/touch` | `recordTouch` | Record an engagement touch (idempotent) |
| GET | `/reports/engagement-per-day` | — | Engagement report per user/day |

---

## 3. Data model (`lead.model.js`, `leadHistory.model.js`, `leadTouch.model.js`)

**`lead`** — company-scoped. Groups of fields:
- **Identity/contact:** `firstName`, `lastName`, `email`, `contactNumber`,
  `alternatePhone`, address (`fullAddress`, `city`, `state`, `country`,
  `pinCode`), `companyName`, `website`.
- **Refs:** `companyId`→company, `createdBy`→user, `leadSource`→LeadSource,
  `leadStatus`→LeadStatus, `productService`→ProductService,
  `assignedAgent`→User, `leadLostReasonId`→LostReason.
- **Sales/workflow:** `followUpDate`, `comment`, `description`, `leadCost`,
  `leadWonAmount`, `addCalender`, `calanderMassage`, `leadUpdated`.
- **`leadAddType`** (enum `Insert` | `Import` | `ThirdParty`) — the channel the
  lead came from; drives the imported/outsourced buckets.
- **Facebook Lead Ads:** `fbLeadGenId` (indexed), `fbLeadGenFormId`,
  `fbLeadGenAdId`, `fbCompainName`, `campaignName`, `adName`.
- **WhatsApp (Click-to-WhatsApp Ads):** `waId` (indexed), `waChatId`,
  `waCtwaClid`, `waSourceId/Type/Url`, `waAdHeadline`, `waAdBody`,
  `waFirstMessage`.
- **Engagement:** `lastTouchAt`, `lastEngagedAt`, `engagementCountByDay` (Map of
  day→count).
- Soft-deletable (`mongoose-delete`); timestamps + virtuals enabled; heavily
  indexed (see [`architecture.md`](architecture.md) §10).

**`leadHistory`** — append-only audit trail per lead: who commented, date,
status, follow-up date, comment. Surfaced in the detail view's History tab.

**`leadTouch`** — one row per Call/WhatsApp/Email/SMS "touch": `channel`,
`source` (WEB/mobile), `intentAt`, `serverTs`, `clientNonce` (unique per
user+nonce for idempotency), engagement status.

---

## 4. Key logic & flows

### Role-scoped listing (`applyAssignableAgentFilter` in `lead.service.js`)
Listing respects both company and **role**:
- **Employee** → only their own `assignedAgent = userId`.
- **Team Leader** → their own + their team's leads.
- **Super Admin** → the whole company; only Super Admin may view **unassigned**
  leads company-wide. The `assignedAgent` filter is clamped so lower roles can
  never widen their scope.
Lists are paginated (`mongoose-paginate-v2`), populate the ref names
(`assignedAgent.name`, `leadStatus.name`, …), support search and advanced
filters, and return `options.pagination.total`.

### Buckets
Derived views over the same collection:
- **imported** = `leadAddType: Import`; **outsourced** = `leadAddType: ThirdParty`.
- **unassigned** = `assignedAgent: null` (Super Admin).
- **follow-up** = leads whose `leadStatus` is one of the follow-up statuses
  (looked up from `LeadStatus`) within a date window.
- **idle / new** = computed from engagement/recency timestamps.

### Create & update
- `createLead` validates (Joi) and sets `companyId`/`createdBy` from `req.user`.
- `getLeadUpdate` (PUT) updates fields **and writes a `leadHistory` entry**; if
  the update carries a `clientNonce` from a prior touch, it links that touch and
  grades the engagement (below).

### Import (`bulkLeadUpload`)
Multipart `file` parsed (CSV via `csvtojson` / Excel via `xlsx`); each row
becomes a lead tagged `leadAddType: Import` with the form-level `leadSource`,
`service`, `status`, `country`, `assignToAgent` applied. (Dedup/cleanup is
handled by the manual migrations in `server/migrations/`.)

### Export
`export-excel` / `export-pdf` build the file server-side and return it as
**base64** in `data.fileData` (+ `fileName`, `contentType`); the client converts
it to a Blob and downloads.

### Engagement touch system (`leadTouch.service.js`)
This backs the "Verified vs Low confidence" engagement grading used by the
dashboard/engagement report:
- `recordTouch` is **idempotent on `clientNonce`** (unique index; duplicate-key
  race returns the existing touch) so an offline mobile queue can safely retry.
  It denormalizes `lead.lastTouchAt`.
- When a lead comment/update later arrives, `findOpenTouchForEngagement` links it
  (by `clientNonce`, else most-recent open touch in the window) and
  `markTouchEngaged` attaches the resulting `leadHistory` — a tap **paired with**
  a follow-up comment = **"Verified"** engagement; a bare comment = **"Low
  confidence"**. Visibility mirrors the listing roles (employee→own, TL→team,
  Super Admin→any).

---

## 5. Frontend correspondence

This module is consumed by the React **Leads** module (see the frontend doc
`module-leads.md`). Notable pairings: `lead` ↔ `AllLeads`/`AddLeads`,
`lead/:id` ↔ `LeadAction`, buckets ↔ `LeadsBucket`, `bulkUplodeLead` ↔
`ImportLeads`, `lead/:id/touch` ↔ `src/api/leadTouch.ts`.

---

## 6. Dependencies & gotchas

- **Tenant + role scoping is in the service layer** — replicate
  `applyAssignableAgentFilter` logic for any new lead query, or you risk leaking
  leads across agents/companies.
- **Soft delete:** `bulkDelete` and deletes use `mongoose-delete`; "deleted"
  leads may still be queryable without the plugin's helpers (the migrations even
  recover them).
- **`leadAddType` is the channel source of truth** for buckets and reporting.
- **`clientNonce` is the idempotency + engagement-linking key** — preserve it
  end-to-end (mobile/web → touch → lead update).
- Load-bearing spelling: **`bulkUplodeLead`** (not "bulkUpload").
- Facebook/WhatsApp fields are populated by the integrations module (webhooks),
  not by manual create.
