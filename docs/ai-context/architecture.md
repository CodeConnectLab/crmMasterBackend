# Architecture — how crmMasterBackend is wired

> Cross-cutting mechanics shared by every module: boot sequence, request
> lifecycle, the layered folder pattern, authentication, multi-tenancy,
> subscription gating, validation, responses, config/env, storage, and
> scheduled jobs. Read this before diving into a module.

---

## 1. Boot sequence (`server/app.js`)

On startup, in order:
1. Load env from `server/config/.env` (`dotenv`).
2. **Start cron schedulers immediately:**
   - `initializeNotificationScheduler()` (`api/notificationSetting/sendPushNotification.js`) — schedules follow-up / reminder push notifications.
   - `initCallHistoryPurgeCron()` (`api/callHistory/purgeOldCallHistory.js`) — daily purge of call history older than 60 days.
3. Resolve config (`config/environment`) and **connect to MongoDB**
   (`config/dataSource.js`).
4. Register `global.responseHandler` (the uniform response helper).
5. Apply Express config (`config/express.js`) and mount routes (`routes.js`).
6. `server.listen(config.port, config.ip)` — default **port 7000**, IP `0.0.0.0`.

> Because cron starts at boot, running this app anywhere (including a throwaway
> environment) will begin firing notifications/purges. Guard accordingly.

---

## 2. Express configuration (`server/config/express.js`)

- **Bot/scanner filter** runs first: silently 404s requests for `*.php`,
  `wp-admin`, `.env`, `.git`, etc. (reduces log noise).
- **CORS allow-list is hardcoded** (not env-driven): includes
  `https://crm.codeconnect.in`, EC2 IPs, and local dev origins
  (`localhost:3000`, `localhost:5173`). **Add new frontends here.**
- Static file serving: `/api/static` → `server/uploads`, `/api/temp` →
  `server/temp`.
- `compression`, `body-parser` (JSON limit **10mb**, raw body captured for
  webhook signature checks), `method-override`, `cookie-parser`.

---

## 3. Routing (`server/routes.js`)

- A single function mounts each resource router under **`/api`**:
  `app.use('/api', require('./api/<resource>/<resource>.route'))`.
- Inside each router the paths add a version prefix — almost always **`/v1`**
  (a few auth paths use `/auth`). So the effective path is
  `/api` + `/v1` + resource path, e.g. `POST /api/v1/lead`.
- Several routers are **commented out** in `routes.js` (userActivity, feature,
  tags, tagSettings, support, paymentDetail, staticsDataForApp) — those features
  exist as folders but are **not currently mounted**.

---

## 4. The layered request lifecycle

For a typical authenticated endpoint the middleware chain is:

```
route  →  auth.isAuthenticated(opts)  →  checkSubscription (where applied)  →  joiValidate(schema)  →  controller  →  service  →  model
```

- **`*.route.js`** wires the chain and the controller handler.
- **`*.controller.js`** is thin: pulls values off `req` (`req.user`, `req.body`,
  `req.params`, `req.query`), calls the service, and replies through
  `responseHandler`.
- **`*.service.js`** holds the business logic and **all Mongoose queries** — this
  is where `companyId` scoping, pagination, and population live.
- **`*.model.js`** is the Mongoose schema. **`*.validation.js`** holds Joi schemas.

To add an endpoint: add the Joi schema → service method → controller handler →
route line. Keep the layers separated.

---

## 5. Authentication (`server/api/auth/`, `server/helpers/jwt.helper.js`)

### Login (`auth.service.logIn`)
- Accepts **email or phone** + **password or OTP**. Password check uses a salted
  hash (`getHashedPassword(password, hashSalt)`); OTP check compares a hashed OTP
  with expiry.
- Requires `isActive` user and an existing `companyId`.
- **Single active session:** on login, any existing tokens for the user are
  revoked (`verificationTokens` service), then a new `{ token, refreshToken }` is
  issued.
- JWT payload = **`{ _id, role, companyId }`**. Response includes the user
  object (with populated `company`), tokens, and app version/download metadata.

### The guard (`auth.service.isAuthenticated(opts)`)
- `opts` can include `adminOnly`, `adminandsupport`, `skipAuth`, `logout`.
- Verifies the JWT with **`process.env.SESSION_SECRET`** via
  `jwtHelper.verify`, loads the user, and sets **`req.user`** (`_id`, `role`,
  `companyId`). Role-restricted routes pass the admin flags.
- **Token blacklist** for logout is an **in-memory `Set`** in `jwt.helper.js` —
  it is **not shared across processes and resets on restart** (relevant under
  PM2 cluster mode / multiple instances).

### Password reset
OTP flow: `requestOTP` → `verifyOtp` → `resetPassword` (routes under
`/api/v1/forget-password/*`).

> ⚠️ **Secret name mismatch to know:** the code signs/verifies with
> `SESSION_SECRET`, while `.env.example` documents `JWT_SECRET`. Set
> `SESSION_SECRET` for auth to actually work.

---

## 6. Multi-tenancy (the core invariant)

- Every tenant is a **`company`**; every `user` and `lead` carries `companyId`.
- The JWT carries `companyId`, surfaced as `req.user.companyId`.
- **Services must filter every query by `companyId`.** This is the primary data
  isolation boundary — a missing filter leaks one company's data to another.
- Role (`Super Admin` / `Team Leader` / `Employee`) further narrows what a user
  can see/do within their company (e.g. an Employee may see only their assigned
  leads); enforce in the service layer, not just the UI.

---

## 7. Subscription gating (`server/api/subscription/`)

- `checkSubscription.middleware.js` → `verifyActiveForRequest(companyId)`.
- If the company's subscription is expired it responds **HTTP 403** with
  `{ error: "SUBSCRIPTION_EXPIRED", message }`. The React client intercepts this
  code and redirects to `/subscription-expired`.
- **Whitelist:** `GET /api/v1/users/profile` is exempt (so the client can always
  load profile/subscription state to render the expired screen).
- `subscription.constants.js` holds the error codes (`SUBSCRIPTION_EXPIRED`,
  user-limit codes) and messages. Seat limits (`company.subscription.userLimit`,
  default 3) are enforced when creating users; overage triggers email
  notifications (see `server/mailer/userLimit*.notify.js`).

---

## 8. Validation (`server/helpers/apiValidation.helper.js`)

- `joiValidate(schema, options)` validates `schema.body` and/or `schema.query`;
  on failure returns **HTTP 400** `{ error:true, message:<first Joi message> }`.
- Default options: `abortEarly:true` (first error only), `stripUnknown:false`.
- Each resource's `*.validation.js` exports the schemas (uses `joi-objectid` for
  Mongo ObjectId fields).

---

## 9. Response format (`server/config/responseHandler.js`)

Uniform envelope via `global.responseHandler`:
- `responseHandler.success(res, data, message, status)` → `{ error:false, message, data }`
- `responseHandler.error(res, data, message, status)` → `{ error:true, message, data }`
- `success1(...)` additionally returns `options` (used for pagination:
  `options.pagination.total`).

The React client reads exactly `{ data, message, error, options }`.

---

## 10. Data layer (MongoDB / Mongoose 8)

- Connection in `config/dataSource.js` from `config.mongo.uri` (`MONGO_URI`).
  `SEED=true` drops + reseeds the DB (`config/seed.js`) — **destructive**.
- Plugins in use: `mongoose-paginate-v2` & `mongoose-aggregate-paginate-v2`
  (list/report pagination), `mongoose-delete` (**soft delete** — "deleted"
  documents may persist; use the plugin's query helpers), timestamps.
- The `lead` collection is heavily indexed (`companyId`, `contactNumber`,
  compound `companyId+contactNumber+createdAt`, plus the ref fields) for
  list/report performance.

---

## 11. File storage & uploads

- **AWS S3** via `server/helpers/aws-s3.helper.js` (`aws-sdk`) for uploaded
  files: geo-location images, profile pictures, lead attachments. Config from
  `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` / `AWS_REGION` / `AWS_S3_BUCKET`.
- Upload parsing via `multer` (`config/multer.config.js`), `formidable`,
  `multiparty`. CSV/Excel imports parsed with `csvtojson` / `xlsx`.
- Locally served uploads also exposed under `/api/static` and `/api/temp`.

---

## 12. Scheduled jobs (`node-cron`)

| Job | File | What it does |
|-----|------|--------------|
| Notification scheduler | `api/notificationSetting/sendPushNotification.js` | Fires follow-up / reminder push notifications; `refreshSchedules()` reloads config |
| Call-history purge | `api/callHistory/purgeOldCallHistory.js` | Daily — deletes call history older than 60 days |

> `bullmq` + `ioredis` are installed but **not wired** — there is no live
> Redis-backed queue today; scheduling is cron-only. Don't assume a worker/queue
> exists.

---

## 13. Notifications & email

- **Push:** `firebase-admin` (FCM) via `server/utility/pushNotification.service.js`;
  tokens come from `user.fcmWebToken` / `user.fcmMobileToken` (saved via
  `PUT /api/v1/update-token`).
- **Email:** `nodemailer` + `email-templates` with EJS templates in
  `server/mailer/templates/` (login OTP, user-limit seat/reactivation notices).

---

## 14. Config & environment variables

- Loader: `config/environment/{index,development,production}.js`. Only **Mongo**
  is strictly required; most features read `process.env.*` directly.
- Env file location: **`server/config/.env`** (README). Root **`.env.example`**
  documents the superset.

| Variable | Used for |
|----------|----------|
| `MONGO_URI` | **Required.** MongoDB connection |
| `PORT` / `IP` | Server bind (default 7000 / 0.0.0.0) |
| `NODE_ENV` | Selects development/production config |
| `SESSION_SECRET` | **JWT signing/verification** (note: not `JWT_SECRET`) |
| `SEED` | If true, drops + reseeds DB on boot (destructive) |
| `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY`/`AWS_REGION`/`AWS_S3_BUCKET` | S3 uploads |
| `FACEBOOK_APP_ID`/`FACEBOOK_APP_SECRET`/`WEBHOOK_VERIFY_TOKEN`/`APP_URL` | Facebook Lead Ads + webhook |
| `FIREBASE_PROJECT_ID`/`FIREBASE_PRIVATE_KEY`/`FIREBASE_CLIENT_EMAIL`/`FCM_SERVER_KEY` | FCM push |
| `SMTP_HOST`/`SMTP_PORT`/`SMTP_USER`/`SMTP_PASSWORD`/`SMTP_FROM` | Email |
| `USER_LIMIT_OVERAGE_NOTIFY_EMAILS` | Billing/ops alerts on seat overage |
| `BASE_URL` | Base used when generating the public lead-intake cURL |
| `REDIS_URL`, `TWILIO_*`, `RATE_LIMIT_*` | **Documented but not yet consumed** in code |

---

## 15. Deployment

- Run under **PM2** (`ecosystem.config.js`). `npm run dist` =
  `NODE_ENV=production nodemon server/app.js`.
- A `.github/` workflow directory exists (CI/deploy). `nohup.out` in the repo is
  a stray server log artifact.

---

## 16. Cross-cutting gotchas

- **`companyId` scoping is mandatory** in every query (tenant isolation).
- **`SESSION_SECRET`**, not `JWT_SECRET`, is the real auth secret.
- **In-memory token blacklist** doesn't survive restarts / multiple instances.
- **Soft deletes** (`mongoose-delete`) — deleted rows can still be in the DB.
- **Cron starts at boot**; **`SEED=true` and `server/migrations/*` are
  destructive**.
- Load-bearing endpoint spellings (`bulkUplodeLead`, `Delete-User`,
  `profile-img-uplode`, `getCurlApi`, `seenUpdate`) are matched by the frontend.
