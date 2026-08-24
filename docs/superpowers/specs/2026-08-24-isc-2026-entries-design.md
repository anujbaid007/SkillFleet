# ISC 2026 Student Entries — Design

**Status:** approved design, not yet planned or built
**Date:** 2026-08-24
**Scope:** the authenticated student ISC section — an ISC 2026 page, the four track
screens, and real entry submission for the three enterable tracks — plus a read-only
admin list of entries.

---

## Goal

A signed-in student opens ISC 2026, sees the four championship tracks, and submits a
real entry for any track they are eligible for: assembling a team of up to three by
email, filling in that track's fields, giving parental consent, and submitting before
the screening deadline.

## What this is not

This is deliberately **not** a marketing or public-facing build. Skill Fleet is handling
the ISC launch collateral separately. Nothing here lives outside the authenticated
platform, and no page is reachable without signing in.

## Source of truth

`ISC.pdf` (Comprehensive Planning Document). The rules this design depends on:

- All tracks are open to **Classes 5–12**.
- **AI for Impact**, **Young Entrepreneurship** and **Content Creator** allow teams of
  up to three. **Puzzle Master is individual-only** and is sponsored by Brainweave.
- **School screening** is free, online, centrally evaluated; schools may submit
  unlimited valid entries, and the **top three per track per school** qualify.
- Students may enter **multiple tracks** through separate valid entries.
- **Under-18 participation requires parental consent.** Students keep ownership of
  their submissions while licensing showcase use to Skill Fleet.
- Videos are capped at **one minute**; entries may be in English or Hindi.

## Decisions taken during brainstorming

| Decision | Choice | Why |
|---|---|---|
| Audience | Signed-in students only | Stated requirement; marketing is handled elsewhere |
| Stage | **School screening only** | It is the free entry point; the state round needs ₹399/₹899 payments, deferred |
| Puzzle Master | Shown, not enterable | Brainweave is expected to design and host the game |
| How work is handed in | **Links only** | No storage layer, no upload failures on weak school networks; matches how these competitions already collect video |
| Teammates | **By email**, verified against real accounts | Makes the coordinator's per-student status truthful for every teammate, not just the submitter |
| Missing teammates | **Shareable invite link** (copy / WhatsApp) | The project has no email-sending capability at all — no provider, no SMTP, no send code — so an automated email invite would mean adding a provider, an API key and a verified domain |
| Lifecycle | Draft → Submitted, editable until deadline | Forgiving for students working over weeks; the deadline still gives judges a stable set |
| Team scope | Same school only | "Top three per school qualify" is meaningless if a team spans schools |
| Entries per student | At most one per track | A student must not compete against themselves |
| Admin | Read-only entry list | Otherwise nobody at Skill Fleet can see submissions in the product |

## Non-goals

Explicitly out of scope, and the build is shaped so none of it is needed to ship:

- The **state round** and its ₹399 direct / ₹899 wildcard payments.
- **Judging, scoring and qualification.** The coordinator's Qualify Status therefore
  stays a placeholder.
- **Certificates** for participants or winners.
- **Puzzle Master's game itself.**
- Editing entries after the deadline, by anyone including admins.

---

## Data model

### Approach

Three options were weighed:

| | **A. One table + JSONB** (chosen) | B. A table per track | C. Shared table + typed detail tables |
|---|---|---|---|
| Track fields | JSONB, validated in TypeScript | Typed columns | Typed columns |
| Tables | 3 | 5+ | 6+ |
| RLS surfaces | one | one per track | one per table |
| Coordinator roster query | one join | `UNION` across tracks | join plus optional joins |
| Adding Puzzle Master later | add a validator | new table, RLS, queries | new table, RLS |
| DB-enforced field rules | TypeScript only | yes | yes |

**A is chosen.** Almost all the logic here is shared — lifecycle, deadline, team,
consent, school, the coordinator roster, and later judging. The track-specific part is
a handful of text and URL fields that are only ever read together when viewing one
entry. B and C triple the RLS and query surface in order to type six text fields, and
turn Puzzle Master into a schema change rather than a validator. JSONB is also already
how this codebase stores variable-shape data (`assessment_results.scores`,
`orders.items`, the questionnaire answer payloads).

### Tables

```sql
isc_entries (
  id                uuid primary key default gen_random_uuid(),
  track             text not null check (track in ('ai_for_impact','entrepreneurship','content_creator')),
  school_id         uuid not null references public.schools(id),
  created_by        uuid not null references auth.users(id) on delete cascade,
  status            text not null default 'draft' check (status in ('draft','submitted')),
  submission        jsonb not null default '{}'::jsonb,
  consent_given_at  timestamptz,
  submitted_at      timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
)

isc_entry_members (
  id             uuid primary key default gen_random_uuid(),
  entry_id       uuid not null references public.isc_entries(id) on delete cascade,
  track          text not null,          -- denormalised from the entry, see below
  user_id        uuid references auth.users(id) on delete cascade,   -- null while an invite is pending
  invited_email  text,                   -- set when added by email before an account exists
  invite_token   text,                   -- the token in the shareable signup link
  is_leader      boolean not null default false,
  created_at     timestamptz not null default now(),
  check (user_id is not null or invited_email is not null)
)

isc_config (
  track               text primary key,
  screening_deadline  timestamptz not null
)
```

`track` is denormalised onto `isc_entry_members` for one reason: it is the only way to
enforce "one entry per student per track" as a real database constraint rather than
application politeness.

### Constraints

```sql
-- A person appears at most once per entry.
unique (entry_id, user_id)

-- A student belongs to at most one entry per track, as leader or member.
unique (track, user_id) where user_id is not null

-- An email is pending-invited to at most one entry per track.
unique (track, lower(invited_email)) where user_id is null and invited_email is not null
```

The team cap of three and the same-school rule are enforced inside the RPCs, not by
constraints — both need a count or a join that a unique index cannot express.

### "Locked" is derived, never stored

`status` holds only `draft` or `submitted`. Locked is **computed** as
`now() > isc_config.screening_deadline` wherever it matters. There is no third status
and no scheduled job: an entry locks itself the moment the deadline passes, and every
mutating RPC re-checks the deadline before writing.

### Server surface

Every mutation goes through a `SECURITY DEFINER` RPC, matching how `apply_as_coordinator`
and `admin_review_school` already work in this project. Each one re-checks the caller,
the deadline, and the rules that constraints cannot express.

| RPC | Purpose |
|---|---|
| `isc_start_entry(track)` | Creates the draft and the leader's member row |
| `isc_save_entry(entry_id, submission)` | Saves draft fields; leader only |
| `isc_add_member(entry_id, email)` | The four-outcome email resolution above |
| `isc_remove_member(entry_id, member_id)` | Leader removes a member or pending invite |
| `isc_submit_entry(entry_id)` | Validates, re-checks schools, marks submitted |
| `isc_get_my_entries()` | Drives `/isc` — the student's state per track |
| `isc_get_entry(entry_id)` | Drives `/isc/[track]` for members |
| `isc_claim_invites()` | Called at the end of student onboarding |

Reads are additionally guarded by RLS so a stray query cannot leak an entry: a row is
visible to its members, to an admin, and to the approved coordinator of its school.

---

## Screens

```
/isc              ISC 2026 — the four track cards and your entries
/isc/[track]      the track brief and its entry form
```

Both live under `(platform)`, so the existing auth and role redirects apply unchanged.
`/isc` is added to `src/components/platform/platform-nav.tsx`.

**`/isc`** shows all four tracks. Each card carries the track name, the one-line brief,
team rules, and the student's own state for that track — *Not started*, *Draft*, or
*Submitted*. **Puzzle Master renders as a fourth card marked "Coming soon"** with no
link, per the decision to leave it to Brainweave.

**Eligibility.** ISC is Classes 5–12. A student in Kindergarten–Class 4 sees `/isc` but
is told they are not eligible this cycle, with no entry routes. This is not
hypothetical: the seeded roster contains a Kindergarten student.

**`/isc/[track]`** carries the track brief, then the entry form: team, the track's own
fields, the consent tick, and Save draft / Submit. Once the deadline has passed the
whole form renders read-only with the reason shown.

Track slugs are `ai-for-impact`, `entrepreneurship`, `content-creator`.

---

## Building a team by email

The leader types a classmate's email. The server resolves it to exactly one of four
outcomes:

| Outcome | What the leader sees |
|---|---|
| Account exists, same school | Verified tick and their name; linked immediately |
| Account exists, different school | Refused, naming the reason |
| Account exists, already in an entry for this track | Refused, naming the reason |
| No account | A pending invite row with **Copy link** and **WhatsApp** buttons |

The invite link is `/signup?invite=<token>`. It grants nothing: it is an ordinary
signup link that remembers which pending row to attach.

### Team size, solo entries, and who may edit

- The **leader is always a member** and occupies one of the three slots. A team is
  therefore the leader plus at most two others.
- **Solo entries are valid** — the doc allows entering individually — so an entry with
  only the leader can be submitted.
- **Only the leader may edit or submit.** Other members have read access to the entry
  and see it on their own `/isc`. This avoids concurrent edits to one submission and
  keeps a single obvious owner.
- **A pending invite never blocks submission.** An invited classmate who has not signed
  up is not a participant; the entry submits without them, and if they register before
  the deadline they are linked and become one. Team composition is allowed to change up
  to the deadline, which follows from entries staying editable that long.
- The leader may remove a member or a pending invite at any time before the deadline.

### Auto-linking is deferred to onboarding, not signup

A pending invite is claimed when the new student's **school becomes known**, not when
their account is created. At `signUp()` time a student has no `school_id` yet — it is
collected afterwards on `/onboarding/details` — so the same-school rule cannot be
checked at signup. Linking therefore runs at the end of student onboarding, once
`school_id` is set, and silently skips any invite whose school does not match.

`isc_submit_entry` re-validates every member's school defensively, so an entry can
never be submitted with a teammate who drifted out of the school.

---

## Lifecycle

```
draft ──save──> draft ──submit──> submitted ──edit──> submitted
                                        │
                              (deadline passes)
                                        ▼
                                  read-only
```

- **Save draft** — validates nothing beyond field shapes; nobody else sees it.
- **Submit** — requires every field for that track and the parental-consent tick. No
  minimum team size beyond the leader, since solo entries are valid. Sets
  `status='submitted'`, `submitted_at` and `consent_given_at`.
- **After submitting** — still fully editable until the deadline; this is what the
  brainstorm chose over a one-shot submit.
- **After the deadline** — every mutating RPC refuses, and the UI renders read-only.

---

## Per-track submission fields

Stored in `submission` JSONB, validated per track in TypeScript.

**AI for Impact**

| Field | Rule |
|---|---|
| `app_url` | required, valid http(s) URL |
| `demo_video_url` | required, valid http(s) URL |
| `explanation` | required, 100–1500 characters |

**Young Entrepreneurship**

| Field | Rule |
|---|---|
| `problem` | required, 50–1000 characters |
| `solution` | required, 50–1000 characters |
| `target_audience` | required, 20–500 characters |
| `impact` | required, 50–1000 characters |
| `feasibility` | required, 50–1000 characters |
| `business_model` | required, 50–1000 characters |
| `pitch_video_url` | required, valid http(s) URL |

**Content Creator**

| Field | Rule |
|---|---|
| `video_url` | required, valid http(s) URL |
| `title` | required, up to 120 characters |
| `theme_note` | required, 50–800 characters |

Both video tracks state the **one-minute cap** in the UI. URLs are validated for shape
and scheme; the UI notes that the link must be publicly viewable, since link rot and
private Drive links are the known weakness of a links-only approach.

---

## Admin: read-only entry list

`/admin/isc`, added to the admin nav beside Schools.

- A filterable list — by track, and by status — showing track, school, leader, team
  size, status and submission date.
- One row expands to the full submission read-only, with every URL clickable.
- Strictly read-only. No editing, no scoring, no status changes: judging is a
  non-goal, and an admin edit button would be a way to corrupt a submission with no
  audit trail.

Admin access uses the existing `is_admin()`, matching every other admin surface.

---

## What this fills in the coordinator dashboard

`get_school_roster()` gains a per-track attempt status for every student, so the
coordinator's **Attempt Status** column becomes real. Because teammates are linked to
real accounts, all three members of a team read as having entered — not just whoever
pressed Submit, which is precisely why the email-verified model was chosen.

The Attempt Status cell renders one small chip per enterable track (AI, YE, CC),
coloured by state, rather than a single ambiguous value.

**Qualify Status stays a placeholder** and keeps its current text. It cannot be honest
until judging exists, and judging is a non-goal here.

---

## Testing

**Unit** — URL validation; per-track field validation, including boundary lengths;
the eligibility rule for Classes 5–12; the derived locked state either side of a
deadline.

**Integration, against the live database in a rolled-back transaction** — the
established pattern in this project:

- A student can create and read their own entry; an unrelated student cannot see it.
- A teammate sees an entry they were added to.
- The approved coordinator of that school sees entries for their school; a coordinator
  of a different school does not.
- The one-entry-per-track constraint refuses a second entry, whether as leader or member.
- A teammate from another school is refused.
- The team cap of three is enforced.
- Submitting without consent is refused.
- A solo entry — leader only, no teammates — submits successfully.
- An entry with an unclaimed pending invite still submits.
- A member who is not the leader cannot edit or submit, but can read.
- Every mutating RPC refuses once the deadline has passed.
- A pending invite is claimed at the end of onboarding, and silently skipped when the
  new student's school does not match.
- A non-admin calling the admin list gets nothing.

**Manual, in the browser** — the whole path: open `/isc` as an eligible student, start
a track, add one real classmate and one unregistered email, copy the invite link,
save a draft, submit with consent, and confirm the entry appears in `/admin/isc` and
that the coordinator roster shows all teammates as submitted.

---

## Size

This is one coherent feature and should stay one implementation plan, but it is a large
one — roughly eight tasks: schema, the entry RPCs, per-track validation, the two student
screens, the team-by-email flow, invite claiming at onboarding, the admin list, and the
coordinator roster change. The sequence is ordered so each task ends somewhere testable,
and so the student can create and submit a solo entry before the invite machinery
exists.

## Open items

- **Screening deadlines are unknown.** `isc_config` ships seeded with a placeholder
  deadline per track; the real dates replace it by `UPDATE` once Skill Fleet confirms
  them. No code change is needed.
- **The annual Content Creator theme is unknown.** The brief shows a placeholder line
  that is a config value, not hard-coded copy.
