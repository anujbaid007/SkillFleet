# Admin at scale: 200,000 students, 1,000+ schools, 8 lakh ISC entries

Date: 2026-09-04. Status: approved by the founder in conversation; implementation via agents.

## Goal

The admin area must let a handful of administrators do three jobs equally well at the target scale:

- **A. Monitor** the championship by state, district and school, and see where it stalls.
- **B. Process queues**: school claims, coordinator claims, certificates, support.
- **C. Look up** one student, school or coordinator fast and see everything about them.

Today every admin page reads rows and computes in JavaScript. The users page fetches every user; the ISC pages load up to 10,000 profiles and every entry in scope into memory. Neither survives the target. The design moves every aggregate and every list into Postgres and makes the pages thin.

## Non-goals

- No change to what students or coordinators see.
- No materialised views or schedulers (kept in reserve; drop-in later by swapping function bodies).
- No second analytics store.
- No national CSV export of all entries in this phase; exports are scoped to a state or below.
- No new admin roles or permissions.

## 1. Database layer

Everything lives in one migration, `docs/admin-scale-migration.sql`, written to be pasted into the Supabase SQL editor and to be safe to re-run (`create or replace`, `if not exists`). The app is on Supabase Free; nothing here needs extensions beyond what Supabase ships.

### 1.1 Indexes

- `isc_entries (school_id)`, `(status)`, `(track)`, `(created_at)`, `(submitted_at)`, `(division)`, and an expression index on `((submission->>'language'))`.
- `isc_entry_members (entry_id)`, `(user_id)`.
- `user_profiles (role)`, `(school_state, school_district)`, `(school_id)`, `(school_class)`, `(created_at)`, and a trigram index on `lower(full_name)` if `pg_trgm` is available, else a btree on `lower(full_name)`.
- `schools (state, district)`, `(review_status)`, `(coordinator_status)`, and `lower(name)`.
- `certificate_uploads (status, created_at)`.

### 1.2 One new column

`isc_entries.division text` with values `group1` or `group2`, derived from the leader's `school_class` via the same class lists as `ISC_GROUPS` in `src/lib/isc/groups.ts`. A trigger on insert sets it from `created_by`'s profile. A one-off backfill fills existing rows. Aggregation by division then never joins profiles.

### 1.3 Scope

Every ISC function takes `p_state text default null, p_district text default null, p_school_id uuid default null`. Null means "everything". A district requires its state; a school ignores the other two. Geography comes from `schools` for entries (join on `school_id`) and from the denormalised `school_state`/`school_district` on `user_profiles` for eligible students, matching how the current loader scopes.

### 1.4 Functions

All are `security definer`, `set search_path = public`, and begin with `if not is_admin() then raise exception 'admin only'`. All return JSON or `setof` records with an explicit type. Names and contracts:

| Function | Args | Returns |
|---|---|---|
| `admin_isc_summary` | scope | one JSON: `eligible`, `started`, `submitted`, `schools_with_entries`, `by_track[]`, `by_division[]`, `by_status[]`, `by_language[]` |
| `admin_isc_breakdown` | scope | rows of the next level: `key`, `label`, `eligible`, `started`, `submitted`, `schools` |
| `admin_isc_roster` | scope, `p_track`, `p_status`, `p_division`, `p_language`, `p_q`, `p_page`, `p_size` | rows: entry id, track, status, division, language, school name, leader name, member count, created_at, submitted_at, plus `total` (window count) |
| `admin_isc_timeline` | scope, `p_days` | rows: `day`, `started`, `submitted` |
| `admin_isc_cold_schools` | scope, `p_page`, `p_size` | rows: school id, name, district, eligible students, coordinator status, plus `total` |
| `admin_isc_export_chunk` | scope + roster filters, `p_after uuid`, `p_size` | keyset page of roster rows for CSV streaming |
| `admin_users_page` | `p_q`, `p_role`, `p_onboarded`, `p_sort`, `p_page`, `p_size` | rows of users with email (from `auth.users`), plus `total` |
| `admin_search` | `p_q`, `p_limit` | rows: `kind` (student/school/coordinator), id, title, subtitle |
| `admin_dashboard` | none | one JSON with queue counts (pending schools, pending coordinators, pending certificates, open support), student totals, and the national ISC summary |
| `admin_similar_schools_batch` | `p_school_ids uuid[]` | rows: `school_id`, `similar_id`, `similar_name`, `reason` |

Eligible = profiles with `role = 'student'` and `school_class` in Classes 5–12, in scope. Started = distinct students who are an accepted member of at least one entry in scope. Submitted = distinct students on at least one submitted entry in scope. Counts by track are distinct students per track.

Page size is capped at 200 in the function. `p_page` is 1-based. Totals use `count(*) over ()`.

### 1.5 Verification

The migration is verified on a local Postgres seeded with synthetic data at target scale (200k students, 1,000 schools, 800k entries, 1.2M members) before it is handed over: every function returns the same numbers as a straightforward reference query, every roster and users query uses an index (`EXPLAIN` shows index scans, no sequential scan of entries or profiles), and every function returns under one second at that scale. The `EXPLAIN` statements are included at the end of the migration file, commented, so the founder can run them on the live project.

## 2. Application data layer

`src/lib/admin/` gains one module per concern, each a thin typed wrapper around one function:

- `isc.ts`: `getIscSummary(scope)`, `getIscBreakdown(scope)`, `getIscRoster(scope, filters, page)`, `getIscTimeline(scope)`, `getColdSchools(scope, page)`.
- `users.ts`: `getUsersPage(params)`, `search(q)`.
- `dashboard.ts`: `getDashboard()`.
- `queues.ts`: paginated readers for schools, coordinators, certificates and the batched similar-schools lookup.
- `scope.ts`: parse and serialise scope and filters to and from URL search params (pure, unit tested).
- `cache.ts`: wrap each reader in Next's cache with a 60-second lifetime keyed by function name and arguments.

Each wrapper maps a PostgREST "function not found" error (code `PGRST202`) to a typed `MigrationMissing` result. Pages render a single panel, "Run docs/admin-scale-migration.sql in the Supabase SQL editor", in place of their content when they receive it. Any other error renders a panel naming the section that failed; the rest of the page still renders.

The old in-memory loader `src/lib/isc/admin-data.ts` and the pure aggregation helpers in `analytics.ts`, `funnel.ts`, `admin-filters.ts` and `outreach.ts` are deleted once no page imports them; their tests go with them.

## 3. ISC pages

Routes are unchanged: `/admin/isc`, `/admin/isc/state/[state]`, `.../district/[district]`, `.../school/[schoolId]`. Each page:

1. Parses scope from the route and filters from search params.
2. Calls summary, breakdown and timeline in parallel.
3. Renders the existing funnel strip, comparison chart and insight panels from those results. The components keep their look; their props change from row arrays to the function outputs.
4. Renders the roster as a paginated table (50 per page), filters and page number held in the URL, with a search box. On the national page the roster is hidden behind a filter or search so nobody lands on page 1 of 16,000.
5. Renders the cold-schools panel paginated (20 per page).
6. Offers export of the current scope and filters at `/admin/isc/export`, a route handler that streams CSV using `admin_isc_export_chunk` in keyset pages of 1,000. National scope without a state is refused with a 400 and a message; the UI does not offer it.

## 4. Users and global search

- `/admin/users`: table, 50 per page, columns name, email, role, school, state, onboarded, joined. Search box (name, email, phone, school name), role filter, onboarding filter, sortable by name and joined date. All state in the URL.
- `/admin/users/[id]`: keeps the profile and growth sections; adds for students their ISC entries (track, status, division, teammates), family, school and coordinator, and certificates, each section reading only that student's rows.
- Global search box in the admin header on every page, calling `admin_search`, results grouped by kind, each linking to the right detail page. Debounced, minimum two characters, ten results per kind.

## 5. Review queues

Schools, coordinators and certificates share one queue component: status filter (defaults to pending), pagination, checkbox selection, bulk approve / reject with a required note on reject, each action calling the existing review functions once per selected row inside one server action. The schools queue calls `admin_similar_schools_batch` once per page.

## 6. Dashboard

`/admin` calls `admin_dashboard` once and renders: the global search; a row of queue tiles (pending schools, pending coordinators, pending certificates, open support) each linking to the filtered queue; the ISC funnel headline; the five states with the highest completion rate and the five with the lowest; the seven-day timeline. Every tile links somewhere.

## 7. Error handling, caching, security

- 60-second cache per function and argument set; admin actions that change data call `revalidatePath` for the affected admin routes.
- Every function checks `is_admin()`; the app-side admin layout check stays as the second gate.
- No PII in URLs beyond ids. Search terms are in the query string by design (bookmarkable) and contain whatever the admin typed.
- Statement timeouts: functions are written to finish under the default API statement timeout at target scale; if a function times out the page shows the failed-section panel.

## 8. Testing

- Unit tests (vitest) for scope and filter parsing/serialising, CSV chunk formatting, and the error mapping.
- Migration correctness and performance verified on local Postgres at target scale as in 1.5.
- Live verification on the real project after the founder runs the migration: every admin page renders with real data, exports download, bulk actions work, probes cleaned up.

## 9. Order and shipping

Four independently shippable pieces, in order: (1) migration, ISC data layer and pages; (2) users and global search; (3) queues; (4) dashboard. Each is committed on `main` with its own verification and deploys through the existing pipeline. Because the functions do not exist until the migration is run, pages ship with the "run the migration" panel so nothing is broken in between.
