# Module: Dashboard, Calendar, Call History & Reports

> The analytics/reporting side of the backend: the one-shot dashboard payload,
> the follow-up calendar, ingestion of call records from the mobile app, and the
> report endpoints. Code in `server/api/dashboard/` and `server/api/callHistory/`.

**Template:** Purpose → Endpoints → Data model → Key logic → Dependencies/gotchas.

---

## 1. Dashboard & Calendar (`server/api/dashboard/`)

| Method | Path | Controller | Purpose |
|--------|------|------------|---------|
| GET | `/api/v1/dashboard/metrics` | `getDashboardMetrics` | Returns the **entire** dashboard in one payload |
| GET | `/api/v1/calendar` | `getCalendarData` | Follow-up events for the calendar view |

### `dashboard/metrics` payload (consumed by the React `Overview` page)
A single aggregated object (all company+role scoped):
- `topMetrics[]` — KPI tiles (All / Follow-up / Imported / Outsourced / Idle /
  Unassigned / New lead counts, each with `change`, `webroute`, `deeplink`).
- `activityMetrics[]` — today/tomorrow counts per follow-up status (Call Back,
  Meeting, Visit, Re-Visit).
- `performanceMetrics` — `yearlySales`, `monthlySales`, `missOpportunity`
  (amount/count/percentage/currency).
- `paymentOverview` — monthly received vs lost (counts + amounts) for the charts.
- `leadSourceMetricss` — lead distribution by source (note the **double `s`**;
  the frontend expects that exact key).
- `employeePerformance[]` — per-agent assigned/won/open/idle/failed, revenue,
  conversion %, online status.

> Because the whole dashboard is one query, this endpoint does heavy
> aggregation. It's the first place to look when a dashboard tile is wrong/empty.

### `calendar`
Returns lead follow-ups as calendar events (driven by `lead.followUpDate` +
`addCalender`). The React calendar widget and the standalone `/calendar` page
both read this.

---

## 2. Call History & Reports (`server/api/callHistory/`)

Call recording/telephony happens on the **companion mobile app**; this module
**ingests and reports** on that data (the web app has no dialer).

| Method | Path | Controller | Purpose |
|--------|------|------------|---------|
| POST | `/api/v1/call-history` | — | Mobile app pushes call records (number, duration, type, timestamps, recording ref) |
| POST | `/api/v1/call-report` | — | Employee/call-activity summary report |
| POST | `/api/v1/product-sale-report` | — | Product-sale report (revenue by product/service + summary ratio) |
| POST | `/api/v1/getCallList` | — | Detailed, filterable call list |

(These are `POST` because they take a criteria/date-range body.)

### Data & retention
- **`callHistory`** model stores per-call records, company-scoped, typically
  linked to an agent (and often a lead/contact number).
- **Retention cron:** `purgeOldCallHistory.js` runs daily (started at boot in
  `app.js`) and deletes call history **older than 60 days**. Be aware this is
  destructive and automatic.

---

## 3. Frontend correspondence

| Backend endpoint | React consumer |
|------------------|----------------|
| `dashboard/metrics` | `components/Dashboard/Overview.tsx` |
| `calendar` | `components/CalenderBox/CalenderBox.tsx` |
| `call-report` | `Pages/CallManage/EmployeeReport.tsx`, `EmployeeList.tsx` |
| `getCallList` | `Pages/Reports/CallReport.tsx`, `CallManage/EmployeeReport.tsx` |
| `product-sale-report` | `Pages/Reports/ManageReports.tsx` |
| `reports/engagement-per-day` | `Pages/Reports/EngagementReport.tsx` (see [`module-leads.md`](module-leads.md)) |

---

## 4. Dependencies & gotchas

- **Company + role scoping** applies to every report (an Employee's dashboard /
  reports should only reflect their own leads/calls).
- **Exact response keys matter** — the frontend reads `leadSourceMetricss`
  (double `s`) and the nested `performanceMetrics.*` / `paymentOverview.*`
  shapes verbatim; changing a key silently breaks a chart.
- **Call data depends on the mobile app** posting to `call-history`; without it
  the call reports are empty.
- The **60-day purge is automatic** — long-range call analytics must account for
  it (or change the cron).
- Reports are `POST` with a criteria body, not `GET` — match that when calling.
