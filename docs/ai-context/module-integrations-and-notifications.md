# Module: Integrations & Notifications

> How leads enter from the outside world, how files are stored, and how users
> get notified. Code in `server/api/thirdParty/` (public webhook + Facebook),
> `server/api/geoLocation/`, `server/api/notificationSetting/`, and
> `server/mailer/`.

**Template:** Purpose → Endpoints → Key flows → Dependencies/gotchas.

---

## 1. Public lead-intake webhook (`server/api/thirdParty/`)

Lets external systems push leads into the CRM without a user session.

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/api/v1/getCurlApi` | JWT | Generate a ready-to-paste **cURL snippet** for a lead source |
| POST | `/api/v1/outsource-lead?apikey=…` | **API key (query param)** | Public lead intake — creates a lead tagged `leadAddType: ThirdParty` |

**Flow:**
1. A lead source is marked `isApiRequired` (CRM Fields in the UI).
2. An admin opens the frontend API Integration page → `getCurlApi` returns a
   snippet like `curl --location '<BASE_URL>/outsource-lead?apikey=<key>' …`
   (`BASE_URL` defaults to `https://api.codeconnect.in/api/v1`).
3. The external system POSTs lead payloads to `outsource-lead` with that
   `apikey`; the service resolves the company/source from the key and inserts the
   lead. These land in the **outsourced** bucket.

> This is the **only unauthenticated-by-JWT** write path — it is gated by the
> API key instead. Treat the key as a secret.

---

## 2. Facebook Lead Ads (`server/api/thirdParty/facebook.*`)

Syncs leads from Facebook Lead Ads and receives them in real time via webhook.

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/v1/facebook/simple-account` | Begin linking a Facebook account |
| POST | `/api/v1/facebook/process-account/:id` | Exchange tokens → create the full `facebookAccount` |
| GET | `/api/v1/facebook/simple-accounts` | Pending (not-yet-processed) links |
| GET | `/api/v1/facebook/accounts` | Connected accounts |
| PUT | `/api/v1/facebook/accounts/:id` | Update an account (e.g. page/form mapping) |
| DELETE | `/api/v1/facebook/accounts/:id` | Disconnect |
| GET | `/api/v1/facebook/test-token/:id` | Validate a page access token |
| GET | `/api/v1/facebook/webhook` | **Webhook verification** (Facebook challenge, uses `WEBHOOK_VERIFY_TOKEN`) |
| POST | `/api/v1/facebook/webhook` | **Receive leadgen events** → fetch lead from Graph API → create a lead |

**Data models:** `facebookSimpleAccount` (pending link) and `facebookAccount`
(active link with page/token/form data). Incoming leads populate the `lead`
model's Facebook fields (`fbLeadGenId` [indexed], `fbLeadGenFormId`,
`fbLeadGenAdId`, `campaignName`, `adName`).

**Config:** `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET`, `APP_URL`,
`WEBHOOK_VERIFY_TOKEN` (+ optional `FACEBOOK_DB_URI` to store FB data in a
separate database).

> 📖 **Deeper, feature-specific docs already exist** — see
> [`docs/FACEBOOK_INTEGRATION_BACKEND.md`](../FACEBOOK_INTEGRATION_BACKEND.md)
> and [`docs/FACEBOOK_INTEGRATION_FRONTEND.md`](../FACEBOOK_INTEGRATION_FRONTEND.md),
> plus the Kiro spec under `.kiro/specs/facebook-duplicate-key-fix/`. This file
> is the map; those are the detail.

### WhatsApp (Click-to-WhatsApp) note
The `lead` model carries a full set of **WhatsApp CTWA** fields (`waId`,
`waChatId`, `waCtwaClid`, `waSource*`, `waAdHeadline`, `waAdBody`,
`waFirstMessage`), implying lead ingestion from WhatsApp ad click-throughs. Trace
the exact writer in the thirdParty/facebook services before relying on it — it
shares the Facebook/Meta integration surface.

---

## 3. Geo-location attachments (`server/api/geoLocation/`)

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/v1/geo-location` | Upload a geo-tagged file (image) for a lead → stored on **S3**, metadata saved |

The `geoLocation` model stores `s3Url`, `coordinates`, `fileName`,
`originalName`, `createdAt`, linked to a lead. Shown in the React lead-detail
"Geo-Location Record" tab. Uses the S3 helper (`server/helpers/aws-s3.helper.js`).

---

## 4. Notifications (`server/api/notificationSetting/`)

Push (FCM) + in-app notifications and their per-user/per-event configuration.

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/v1/getNotification` | Current user's notifications (bell dropdown) |
| PUT | `/api/v1/seenUpdate` | Mark notifications as seen |
| GET | `/api/v1/getNotificationList` | Notification list (config/admin) |
| PUT | `/api/v1/updateNotification/:id` | Update a notification/setting |
| POST | `/api/v1/manuallySendNotification` | Manually trigger a push |
| GET | `/api/v1/getNotificationListOfUser` | Per-user notification preferences |
| POST | `/api/v1/saveNotificationListOfUser` | Save per-user preferences |

**Models:** `notification` (delivered items: `titleTemplate`, `bodyTemplate`,
`seenStatus`, `userId`, `companyId`, timestamps) and `notificationSetting`
(per-event config).

**Delivery:**
- **Push** via **Firebase Admin (FCM)** (`server/utility/pushNotification.service.js`),
  targeting `user.fcmWebToken` / `user.fcmMobileToken` (saved via
  `PUT /api/v1/update-token`).
- **Scheduler:** `sendPushNotification.js` registers **node-cron** jobs at boot
  (`initializeNotificationScheduler`) to fire follow-up/reminder notifications;
  `refreshSchedules()` reloads config when settings change.

---

## 5. Email (`server/mailer/`)

- `nodemailer` + `email-templates` with **EJS** templates under
  `server/mailer/templates/`:
  - `login-otp/` — the password-reset / login OTP email.
  - `user-limit-extra-seat/` and `user-limit-reactivation/` — billing/seat
    notices (sent to `USER_LIMIT_OVERAGE_NOTIFY_EMAILS`).
- Entry point: `server/mailer/index.js`; senders in
  `userLimitExtraSeat.notify.js` / `userLimitReactivation.notify.js`.
- SMTP config: `SMTP_HOST`/`SMTP_PORT`/`SMTP_USER`/`SMTP_PASSWORD`/`SMTP_FROM`.

---

## 6. Dependencies & gotchas

- **Two write-auth models:** JWT everywhere, but `outsource-lead` uses an
  **API-key query param** — keep that path's validation strict.
- **Webhook security:** Facebook webhook verify depends on `WEBHOOK_VERIFY_TOKEN`
  matching; the raw request body is captured in `express.js` for signature use.
- **Idempotency:** Facebook leadgen can deliver duplicates — `fbLeadGenId` is
  indexed and there's a dedicated Kiro spec/migration for duplicate-key handling.
  Don't remove those guards.
- **S3 required** for geo-location/profile uploads — missing AWS env vars break
  those endpoints.
- **FCM depends on valid tokens** (`update-token`) and Firebase Admin creds; a
  stale/absent token silently means no push.
- Load-bearing spellings: **`getCurlApi`**, **`seenUpdate`**, **`geo-location`**.
- Don't assume a Redis queue drives any of this — delivery is cron + direct FCM
  calls (see [`architecture.md`](architecture.md) §12).
