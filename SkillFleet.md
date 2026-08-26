# SkillFleet — Complete Platform Guide

**What this document is:** a full walkthrough of everything SkillFleet does, what each type of user can do, and how to test the whole platform end to end.

**Status:** All four phases of the Growth Platform requirements are built, plus the vendor marketplace.
**Environment:** runs locally at `http://localhost:3000` (start with `npm run dev`).
**Important:** payments are a **mock/test gateway** — no real money moves. See [Setup notes](#setup-notes--things-to-know) before testing.

---

## 1. What SkillFleet is

SkillFleet is a **growth-tracking platform for school students**. Instead of just selling activities, it measures how a child is developing across **10 growth areas**, and then recommends activities that fill the gaps.

The core idea:

```
Student takes a baseline  →  gets a Growth Profile (10 scores)
        ↓
Books activities (à la carte or from a package)
        ↓
Admin marks the activity complete  →  points are added to the profile
        ↓
Profile updates  →  AI recommends what to do next
```

---

## 2. Core concepts

### The 10 Growth Parameters
Every student is scored on these. They are **admin-configurable** (can be renamed, added, retired, reweighted — nothing is hardcoded):

| # | Parameter | # | Parameter |
|---|-----------|---|-----------|
| 1 | IQ / Cognitive | 6 | Mindfulness / Mental Wellness |
| 2 | EQ / Emotional Intelligence | 7 | Creativity |
| 3 | Fitness / Physical | 8 | Leadership |
| 4 | Social Skills | 9 | Digital Literacy |
| 5 | Communication | 10 | Financial Literacy |

### Scoring
- **Stored internally as 0–1000**, **shown as 0–100** in the UI (so small activity gains still feel visible).
- Every score has two parts: a **baseline** (from onboarding) and an **accrued** part (from completed activities).
- Every point ever awarded is **logged with its source** — fully auditable, and never double-counted.

### Age bands & targets
A score is judged against the child's **age band**, not one universal benchmark:

| Age band | Ages |
|---|---|
| Junior | 6–9 |
| Explorer | 10–12 |
| Builder | 13–15 |
| Achiever | 16–18 |

Each parameter has a **target range per age band** (admin-set). Example: Explorer target is 25–50, Builder is 40–65. A score below the target minimum = a **gap**.

### Score levels
Scores map to friendly named levels: **Seed → Sprout → Growing → Thriving → Flourishing**.

### Baseline (how the first scores are created)
Three inputs, combined with a weighting the admin controls:
- **Diagnostic assessment** — 45%
- **Certificate uploads** — 30% (counted at **50% value while pending admin review**, topped up to full once approved)
- **Profile questionnaire** — 25%

Onboarding is **optional/skippable** — a student can explore first and complete it later.

### Catalog structure
```
Category  →  Topic  →  Offering  →  tagged with points per Growth Parameter
```
- **Offering types:** Workshop, Trip, Event, Competition, Internship
- **Delivery mode:** Online / Offline / Hybrid (Internships: WFH / On-site / Hybrid)
- **Status lifecycle:** `planned` → `live` → `completed` / `retired`
- **Source:** SkillFleet's own, or a **vendor's** (vendor listings require admin approval)

---

## 3. The four roles at a glance

| Capability | Student | Parent | Admin | Vendor |
|---|:---:|:---:|:---:|:---:|
| Own a Growth Profile | ✅ | — | — | — |
| Browse the catalogue | ✅ | ✅ | ✅ | — |
| **Make a payment / book** | ❌ **never** | ✅ | — | — |
| Shortlist recommendations | ✅ | — | — | — |
| Buy / upgrade packages | ❌ | ✅ | — | — |
| Upload certificates | ✅ | ✅ (for child) | reviews them | — |
| Request a new offering / join a waitlist | ✅ | ✅ | triages them | — |
| Create offerings | — | — | ✅ | ✅ (needs approval) |
| Approve vendor listings | — | — | ✅ | ❌ |
| Award points (mark complete) | — | — | ✅ | — |

> **Hard rule:** **students can never pay for anything.** All money actions are parent-only. This is enforced in the database, not just hidden in the UI.

---

## 4. What each role can do

### 👦 STUDENT

**How they get in:** signs up themselves at **Sign up → Student** (name, date of birth, email, password). Minimum age **5**.

**First-time flow**
1. **Required details** — class (Kindergarten → 12th; if 11th/12th, also the branch: Science / Commerce / Arts), school, city, parent's mobile.
2. **Optional 3-step onboarding** (can be skipped and done later):
   - Profile questionnaire
   - Certificate uploads
   - Diagnostic assessment
   → produces their starting Growth Profile.

**What they can do once in**

| Section | What they can do |
|---|---|
| **Dashboard** | Overview of their progress |
| **Growth Profile** | See all 10 parameter scores, their level (Seed→Flourishing), an overall progress ring, and a link into Recommendations |
| **Recommendations** | Generate AI suggestions targeting their weakest areas; **Shortlist** ones they like (a parent then books them) |
| **Explore** | Browse/filter the full catalogue and open any offering. **Cannot book** — sees "ask a parent to book this" |
| **Requests** | Join the waitlist ("Notify me") for *planned* activities; submit a request for something that doesn't exist; **+1** other families' requests |
| **My Packages** | Read-only view of packages a parent bought for them, and what's been booked from them |
| **My Bookings** | All their bookings + detail. For a **confirmed & paid online workshop**, the **Join meeting** link appears here |
| **Certificates** | Upload unlimited certificates, see status (pending/approved/rejected), resubmit after a rejection |
| **My Account** | Their profile |

---

### 👨‍👩‍👧 PARENT

**How they get in:** signs up at **Sign up → Parent**, then links their child by entering the **child's email + password** (the child must have signed up first).

**What they can do**

| Section | What they can do |
|---|---|
| **Dashboard** | Overview |
| **My Children** | Link / unlink children; open a child to see their **full growth profile and progress** |
| **Recommendations** | Pick a child → **Generate suggestions** → see AI-written reasons → **Book**. Also shows what the child **shortlisted**. Includes **"Plan my year"** (see below) |
| **Explore** | Browse the catalogue and **book for a child** — either **pay separately** (mock gateway) or **redeem a package slot** |
| **Packages** | Buy a package tier for a child, pay, **upgrade** (pay only the difference), view package detail, and **bulk-book** (redeem several slots at once) |
| **Requests** | Waitlist, submit requests, +1 others |
| **My Bookings** | All bookings, complete/retry payment, booking detail + **Join meeting** link (confirmed+paid online workshops) |
| **My Account** | Profile |

**Plan my year (curriculum builder)**
Parent picks a size (**6 / 12 / 15 / 18** — matching package tiers, defaults to the child's remaining slots) → the system builds a **balanced** plan that spreads across the child's *weakest* areas (rather than stacking one), with a total price and a "balance" summary (e.g. *EQ ×2 · Fitness ×1 · Communication ×1*). If the child has an active package → **"Redeem N with package"** books them all in one click.

---

### 🛠️ ADMIN

**How they get in:** an existing admin account (admins aren't self-signup). Lands on `/admin`.

| Section | What they can do |
|---|---|
| **Overview** | Admin dashboard |
| **Parameters** | Add / rename / retire / reweight the growth parameters — no code change needed |
| **Taxonomy** | Manage Categories and Topics |
| **Offerings** | Create/edit offerings: **cover image**, type, mode, description, category/topic, price, age range, schedule, location, **skills contribution** (points per parameter), and a **meeting link** for online workshops. Plus: archive, see **waitlist interest** on planned items with a **"Go live"** button, and the **vendor review queue** (approve / reject with a note) |
| **Vendors** | Add a vendor (by email — see below) and see each vendor's listing/pending counts |
| **Requests** | Triage demand requests ranked by support; set status (gathering interest → planned → fulfilled → declined); **"Create offering"** prefills a new *planned* offering from the request |
| **Packages** | Create/edit package tiers (name, slot count, price, validity) |
| **Questionnaire** | Build the onboarding questionnaire (questions, options, points per parameter) |
| **Assessments** | Build diagnostic tests (questions, correct answers, points per parameter) |
| **Users** | List and inspect users |
| **Certificates** | Review uploads → approve (tops score to full value) or reject (removes the provisional points) — with automatic **score reconciliation** |
| **Completions** | Mark a booking **complete** → **this is what awards the points** into the student's Growth Profile |

> **To make a student's score move, an admin must mark their booking complete under Completions.**

---

### 🏪 VENDOR

**How they get in (important):**
Vendors do **not** have a public signup. The flow is:
1. The partner **signs up normally** (any signup page) with their email + password.
2. **Admin → Vendors** → enter that **email + organisation name** → they become a vendor.
3. They log in with their own password and land on the **vendor console** (`/vendor`).

*(Why: creating an account directly from the admin panel needs the Supabase service-role key, which isn't configured yet. See [Setup notes](#setup-notes--things-to-know).)*

| Section | What they can do |
|---|---|
| **Dashboard** | Counts of their listings: **Pending review / Approved & live / Needs changes** |
| **My Offerings** | All their listings with review status; **rejected ones show the reviewer's note** |
| **New / Edit offering** | Same rich form as admin, minus admin-only controls (no status, no meeting link). **Must tag at least one skill** — required for vendor listings |

**Vendor rules (enforced in the database, not just the UI):**
- A vendor listing is **hidden from families and unbookable until an admin approves it**.
- A vendor **cannot approve their own listing** — the database blocks it.
- **Editing an approved listing sends it back into review.**
- A vendor can only see/edit **their own** listings, and cannot access admin/parent/student areas.
- Approved vendor offerings show **"By {organisation}"** on the offering page.

---

## 5. Feature reference

### Growth Profile & scoring
- 10 admin-configurable parameters; per-age-band targets; 5 named levels.
- Baseline from questionnaire + certificates + assessment (weighted 25/30/45).
- Points awarded on **verified completion**; idempotent (no double-counting) and fully audited.
- Certificates: unlimited uploads, provisional 50% while pending, resubmit after rejection, admin re-review recalculates the score correctly.

### Booking & payments
- **À la carte:** browse → book → pay (mock gateway) → admin marks complete → points.
- **Package:** buy a tier → redeem a slot per booking (one, or several at once).
- Abandoned unpaid bookings are **reused** rather than duplicated.
- All payments are **parent-only**, mock/test mode.

### Packages
- Admin-defined tiers (slots, price, validity).
- One live package per child; **upgrade** pays only the difference and **extends validity**.
- Slots tracked (used / remaining / expiry); bulk redemption; students get a read-only view.

### AI Curriculum Recommender
- **Rules engine** finds gaps (score vs age-band target), ranks offerings by how much they close those gaps, filters by age and what's already booked.
- **Gemini 2.5 Flash** writes the plain-English "why this fits" for each suggestion.
- **Suggest-only — never auto-books.** Students shortlist; parents book.
- **"Plan my year"** builds a balanced multi-activity plan sized to a package.
- If the AI is unavailable it **falls back to clear template text** — it never breaks.

### Supply & demand
- **Planned offerings** collect interest ("Notify me") with a progress bar toward a threshold; admin sees the count and can **Go live**; waitlisted users then see **"Now live — ready to book!"**.
- **Demand board:** families request activities that don't exist and **+1** each other's; admin triages by support and can convert a request into a planned offering.
- Notifications are **in-app** (no emails).

### Vendor marketplace
- Admin-onboarded vendors, admin-approved listings, required skill tagging, "By {org}" attribution. (See the Vendor section above.)

### Offering media & meeting links
- **Cover image** on every offering type — drives the Explore cards and the offering page banner.
- **Meeting link** for online workshops is **only visible to someone with a confirmed & paid booking** — enforced at the database level.

---

## 6. How to test the whole platform

> Suggested order — each scenario builds on the last.

### Scenario A — Student sets up a Growth Profile
1. **Sign up → Student** (use a real email if verification is enabled).
2. Fill the required details (class/branch/school/city/parent mobile).
3. Complete (or skip) the questionnaire → certificates → assessment.
4. Open **Growth Profile** → you should see 10 parameters with scores and levels.

### Scenario B — Parent links the child and books
1. **Sign up → Parent**, then link the child using the **child's email + password**.
2. **My Children** → open the child → see their growth profile.
3. **Explore** → open a live offering → **Book for** the child → **pay** (mock gateway).
4. **My Bookings** → the booking shows *Paid / Confirmed*.

### Scenario C — Points actually move
1. Log in as **Admin → Completions** → mark that booking **complete**.
2. Log back in as the **student → Growth Profile** → the relevant parameter scores have **increased**.

### Scenario D — AI recommendations
1. As **Parent → Recommendations** → pick the child → **Generate suggestions**.
2. You get a summary + ranked activities, each with a reason and the skills it grows.
3. As the **student**, open Recommendations → **Shortlist** one.
4. Back as the **parent** → that item shows **"★ {child} shortlisted this"**.

### Scenario E — Packages + Plan my year
1. As **Parent → Packages** → buy a tier for the child → pay (mock).
2. **Recommendations → "Plan {child}'s whole year"** → pick a size → **Plan**.
3. Review the balanced plan → **"Redeem N with package"**.
4. Check **My Bookings** (N new confirmed bookings) and the **package detail** (slots used went up by N).

### Scenario F — Waitlist (planned offerings)
1. As **Admin → Offerings** → set an offering's status to **Planned** (or use a seeded one: *Weekend Robotics Club*, *Junior Chess League*, *Nature Photography Trip*).
2. As **Parent/Student** → open it → **Notify me when live** → the count/progress moves.
3. As **Admin → Offerings** → that planned item shows interest → click **Go live**.
4. Back as the family → **Requests → your watchlist** → it now says **"Now live — ready to book!"**.

### Scenario G — Demand requests
1. As **Parent/Student → Requests** → submit a request; **+1** an existing one.
2. As **Admin → Requests** → see it ranked by support → change status, or **Create offering** (prefills a planned offering from it).

### Scenario H — Vendor marketplace
1. **Sign up** a new throwaway account (this will become the vendor).
2. As **Admin → Vendors** → enter that email + an organisation name → **Add vendor**.
3. Log in as that account → you land on the **vendor console**.
4. **New offering** → fill it in, **tag at least one skill** → submit.
5. Check **Explore** as a parent → **it is NOT there** (correct — pending review).
6. As **Admin → Offerings** → **"Pending vendor review"** → **Approve**.
7. As a parent → **Explore** → it now appears with **"By {organisation}"** and is bookable.
8. Try **Reject with a note** on another listing → the vendor sees the note in their console.

### Scenario I — Gated meeting link
1. As **Admin** → create/edit a **Workshop** with **Mode = Online** → a **Meeting link** field appears → paste a URL.
2. As a **Parent** → book it and **pay**.
3. Open the **booking detail** → **Join meeting** appears.
4. Before paying (or on a different account), the link is **not** shown — it isn't even sent to the browser.

---

## 7. Setup notes & things to know

| Topic | Status |
|---|---|
| **Payments** | **Mock/test gateway only** — no real money, no real card. Designed so a real gateway can be swapped in later without changing the booking logic. |
| **AI recommendations** | Uses **Gemini 2.5 Flash** via OpenRouter. The API key lives in `.env.local` (server-side only). If the key is missing, recommendations still work with clear template text. **Restart the dev server** after changing `.env.local`. |
| **Email verification** | The app code is ready. To turn it on: Supabase Dashboard → **Authentication → Providers → Email → "Confirm email"**, and set **Site URL** + allowed **Redirect URLs** (`http://localhost:3000/**`). It only affects **new** signups — existing test accounts keep working. Supabase's built-in email sender is rate-limited; add custom SMTP for real use. |
| **Vendor account creation** | Admin promotes an **existing** account by email (the partner signs up first). Creating accounts directly from the admin panel needs the Supabase **service-role key**, which is currently a placeholder in `.env.local`. |
| **Notifications** | **In-app only** — no emails/SMS are sent for waitlists or requests. |
| **Mobile** | The whole platform is responsive (sidebar becomes a drawer). |

### Test accounts
| Role | Login | Notes |
|---|---|---|
| Parent | `parent@gmail.com` / `12345678` | Has children linked; watchlist and a request already populated |
| Students | Maya, Arun, Student | Existing dummy accounts (Maya is 11 = Explorer band; Arun is 15 = Builder) |
| Admin | your admin account | Used for approvals, completions, catalogue |
| Vendor | none yet | Create one via **Scenario H** |

### Seeded content (so pages aren't empty)
- **~18 live offerings** across all 5 types, ages 6–18, ₹0–8,000 — covering **every one of the 10 parameters** (3–7 offerings each), so recommendations always have real options.
- **3 planned offerings** with waitlist interest: Weekend Robotics Club, Junior Chess League, Nature Photography Trip.
- **4 demand requests** with support counts: Beginner coding for 8-year-olds, Public speaking bootcamp for teens, Weekend swimming lessons, Art & craft summer camp.

---

## 8. Not built yet (deliberately)

| Item | Note |
|---|---|
| Real payment gateway | Mock gateway in place; swap-in point already isolated |
| Email / SMS notifications | Waitlist + request updates are in-app only |
| Periodic re-assessment | Assessments exist; scheduled re-tests deferred |
| Class/age-branched questionnaire | Questionnaire is one set for all ages |
| Vendor account creation from admin | Needs the service-role key (see above) |
| Vendor meeting links | Meeting links are admin-managed only |

---

## 9. Requirements coverage

| Phase | Scope | Status |
|---|---|---|
| **Phase 1** | Growth Profile, parameter taxonomy, baseline onboarding, à la carte booking + scoring on completion | ✅ Complete |
| **Phase 2** | Annual packages (tiers, slots, redemption, upgrade) | ✅ Complete |
| **Phase 3** | AI Curriculum Recommender (gap detection → suggestions → curriculum builder) | ✅ Complete |
| **Phase 4** | Supply & demand — planned listings, demand intake & aggregation, vendor parameter-tagging | ✅ Complete |
| **Extra** | Vendor marketplace (admin-onboarded vendors, admin-approved listings) | ✅ Complete |
