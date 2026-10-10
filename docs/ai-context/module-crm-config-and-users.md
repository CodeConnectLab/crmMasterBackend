# Module: Auth, Users/Company, CRM Config, Permissions & Subscription

> The "configuration & identity" side of the backend: who can log in, the
> company and its users, the customizable CRM master-data lists, location data,
> role permissions, and subscription enforcement. Code across
> `server/api/{auth,user,company,leadSources,leadStatus,lostReason,
> productService,locations,permission,subscription}/`.

**Template:** Purpose → Endpoints → Data model → Key logic → Dependencies/gotchas.

---

## 1. Auth (`server/api/auth/`)

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/v1/signin` | Login (email/phone + password **or** OTP) → JWT `{_id,role,companyId}` + refresh token |
| POST | `/api/auth/logout` | Blacklist the current token (in-memory) |
| POST | `/api/v1/refresh` | Issue a new access token from a refresh token |
| POST | `/api/v1/forget-password/request-otp` | Email an OTP |
| POST | `/api/v1/forget-password/verify-otp` | Verify the OTP |
| POST | `/api/v1/forget-password/reset-password` | Set a new password |

Mechanics (salted-hash passwords, single active session, `SESSION_SECRET`
signing, OTP) are in [`architecture.md`](architecture.md) §5. The login response
also returns app version info and the mobile download link.

---

## 2. Users & Company (`server/api/user/`, `server/api/company/`)

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/v1/register` | **Sign up a company** + its first (Super Admin) user |
| POST | `/api/v1/register/users-register` | Add a user to the current company (seat-limited) |
| GET | `/api/v1/users/profile` | Canonical profile incl. populated company + subscription + seat usage (**subscription-check whitelisted**) |
| PUT | `/api/v1/users/profile` | Update own profile |
| PUT | `/api/v1/users/profile-img-uplode` | Upload profile image to S3 |
| PUT | `/api/v1/updateDepartment/:id` | Update a user's team/department |
| PUT | `/api/v1/updateCompanyDetails` | Update company settings/details |
| GET | `/api/v1/users` | List company users |
| DELETE | `/api/v1/Delete-User` | Delete a user |
| PUT | `/api/v1` | Update a user (base path) |
| PUT | `/api/v1/update-token` | Save the caller's FCM web/mobile token |

### Data model
- **`company`** — `name`, `code` (unique), `status`, `settings` (dateFormat,
  timezone, currency, language, fiscalYear), **`subscription`** (`plan`:
  free/starter/professional/enterprise, `startDate`, `endDate`, `priceLabel`,
  `userLimit` default 3, `expiry` default +30 days, `status`:
  trial/active/expired), `createdBy`/`updatedBy`.
- **`user`** — `name`, `email` (unique), `phone` (unique), `hashedPassword` +
  `hashSalt`, `role` (`Super Admin`/`Team Leader`/`Employee`, default Employee),
  `companyId`, `assignedTL` (the user's Team Leader), `profilePic`, `otp`/
  `otpExpiry`, `fcmWebToken`/`fcmMobileToken`, `isActive`, `lastLogin`.

### Seat limits
Creating a user checks `company.subscription.userLimit`. Exceeding it triggers
`USER_LIMIT_EXCEEDED` handling and billing/ops emails (see
`server/mailer/userLimit*.notify.js`). The React client shows an upgrade prompt.

---

## 3. CRM master data (customizable lists)

Four near-identical CRUD resources, each **company-scoped** and following the
standard route/controller/service/model/validation pattern:

| Resource | Base path | Model notes |
|----------|-----------|-------------|
| Lead sources | `/api/v1/lead-sources[/:id]` | has `isApiRequired` → enables the public API/webhook for that source |
| Lead statuses | `/api/v1/lead-status[/:id]` | includes follow-up-type statuses used by the follow-up bucket; often has colour/label |
| Lost reasons | `/api/v1/lost-reason[/:id]` | reasons a lead is marked lost |
| Products/Services | `/api/v1/product-service[/:id]` | the catalog a lead can be tied to |

Each supports `POST` (create), `GET` (list), `PUT /:id` (update), `DELETE /:id`
(delete). These lists are what the frontend caches in `localStorage` (`crm_*`).

### Aggregated master data — `locations` (`server/api/locations/`)
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/v1/lead-types` | **One call returning all master data** (status + sources + agents + products/services + countries + lost reasons) — the frontend's `GENERAL_DATA`/`fetchGeneralData()` |
| GET | `/api/v1/locations/countries` | Country list (via `country-state-city`) |
| GET | `/api/v1/locations/states/:id` | States for a country |

---

## 4. Permissions (`server/api/permission/`)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/v1/features` | List available features |
| POST | `/api/v1/createPermissions` | Create/update the permission matrix for roles |

Feature/role configuration also lives in `server/config/constants/`
(`featureConfig.js`, `userRoles.js`). Enforcement of what each role can do is
expected in the service layer and the `isAuthenticated({ adminOnly, … })`
guards.

---

## 5. Subscription (`server/api/subscription/`)

- Not a REST resource — a **middleware + service** applied across the API.
- `checkSubscription.middleware.js` calls `subscription.service.
  verifyActiveForRequest(companyId)`; on expiry → **HTTP 403 `SUBSCRIPTION_EXPIRED`**.
- `GET /api/v1/users/profile` is whitelisted so the client can always render the
  "expired" screen.
- `subscription.constants.js` defines the error codes/messages. Subscription
  state is read from `company.subscription`.

---

## 6. Dependencies & gotchas

- **Company signup vs user creation** are different endpoints (`/register` vs
  `/register/users-register`) — don't conflate them.
- **`users/profile` is the single source** the frontend's `SubscriptionContext`
  polls; keep its shape stable (`company`, `subscriptionMeta.usersUsed/activeUsers`).
- **Seat limits** gate user creation — surfaced as `USER_LIMIT_EXCEEDED`.
- **Master-data lists are company-scoped**; a lead source's `isApiRequired` flag
  is the switch that exposes it on the public lead-intake webhook (integrations
  module).
- Load-bearing spellings: **`Delete-User`**, **`profile-img-uplode`**.
- Role names are exact strings (`Super Admin`, `Team Leader`, `Employee`) shared
  with the frontend sidebar gating.
