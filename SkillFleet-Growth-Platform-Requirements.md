# SkillFleet — Growth Platform Requirements

**Status:** Draft v1 (for tech team review)
**Scope:** New/expanded platform features layered on top of the existing SkillFleet PRD
**Audience:** Engineering, Product

---

## 1. Purpose & What's New

This document specifies a major evolution of the SkillFleet platform. The existing PRD already covers accounts, discovery, booking, payments, reviews, the vendor marketplace, the competitions engine, notifications, and the admin console. **This document does not replace that work** — it adds the following new capabilities and should be read alongside the existing PRD:

1. A **Student Growth Profile** built on ~10 growth parameters, with scores per parameter.
2. A **baseline scoring (onboarding) flow** that assigns each student their first-level scores.
3. A **scoring engine** that increments parameter scores as students complete offerings (workshops, trips, events, competitions).
4. Two **engagement models** — pay-per-offering and annual packages — sitting on top of the same catalog.
5. An **AI Curriculum Recommender** that detects gaps in a student's profile and suggests offerings / builds a year-long curriculum.
6. A **supply & demand pipeline** that lets SkillFleet list confirmed, vendor-supplied, and "planned" offerings, and lets parents/students request offerings that don't yet exist.

### Framing note (important)
SkillFleet is a platform for **school students**. The growth profile, scores, curriculum, and recommendations all belong to the **student**. A **parent/guardian** is an account role that can enroll, pay, view, and act on behalf of a student. Wherever this document says "parent," it means the guardian account role managing a minor student — not a repositioning of the product around families.

---

## 2. User Roles (relevant to these features)

| Role | Can do |
|------|--------|
| **Student** | Owns a Growth Profile; can self-enroll; takes baseline assessments; browses & books offerings; views scores, recommendations, and curriculum. |
| **Parent/Guardian** | Linked to one or more student accounts; can enroll a student; pay; view the student's profile, scores, and recommendations; act on AI suggestions; submit offering requests. |
| **Vendor** | (existing) Lists third-party offerings, which must be tagged against growth parameters to participate in scoring & recommendations. |
| **Admin** | (existing) Manages the parameter taxonomy, scoring rules, "planned" listings, and demand-request triage. |

> A student account and a parent account may both exist and be linked; either entry point lands on the **same** student Growth Profile.

---

## 3. Student Growth Profile

The core object of the platform. Each student has a profile composed of **~10 growth parameters** (final count being decided — likely 10–12).

### 3.1 Parameters
Each parameter has: a score (numeric, see §5), a history of contributing activities, and a target/benchmark used by the recommender.

**Illustrative parameter set (NOT final — see Open Questions):**
- IQ / cognitive
- EQ / emotional intelligence
- Fitness / physical
- Social skills
- Communication
- *(+ ~5 more TBD; "m three" from the brief needs clarification — see §11)*

> **Requirement:** The parameter set must be **admin-configurable** (add/rename/retire/reweight) without a code change, because the list is still being finalized and may evolve. Do not hardcode 10.

---

## 4. Onboarding & Baseline Scoring

When a new student (or a parent on their behalf) joins, the platform establishes a **first-level score for each parameter** before they explore the catalog.

Baseline inputs:
1. **Self-information / profile questionnaire** — about the student (interests, current activities, etc.).
2. **Certificate / achievement uploads** — files the student can upload as evidence of existing skills/accomplishments.
3. **Analytical / diagnostic tests** — short in-platform assessments that map to one or more parameters.

The system combines these inputs into an initial score per parameter. After onboarding, the student has a complete (if early) Growth Profile and can begin exploring.

**Requirements:**
- Support file upload + storage for certificates (with admin/auto review hooks).
- Pluggable assessment module: each test maps to one or more parameters with a defined contribution.
- Deterministic, explainable baseline calculation (we should be able to show *why* a score is what it is).

---

## 5. Scoring Engine

Scores are **dynamic** — they grow as the student participates.

- Every **offering** (workshop, trip, event, competition) is tagged with the parameter(s) it contributes to and the **points it awards** per parameter on completion.
- On a verified **completion event**, the engine adds those points to the student's relevant parameter scores and logs the contribution.
- The profile reflects updated scores and an activity history.

**Requirements:**
- Define a `completion` event for each offering type (trip attended, workshop finished, event participated, competition result).
- Score updates must be **idempotent** (no double-counting) and **auditable** (every score change traces to a source activity).
- Support partial credit / weighted contributions (one offering may give different points to different parameters).
- Baseline scores (§4) and accrued scores should be distinguishable in the data, even if shown as one combined score in the UI.

---

## 6. Engagement Models

Two ways a student/parent engages with the same catalog.

### Model A — Pay-per-offering (à la carte)
- Browse and pay for a single workshop / trip / event / competition.
- Complete it → points added to the relevant parameters.
- Simplest entry point; lowest commitment.

### Model B — Annual packages (bundles)
- Student/parent picks **multiple sessions in advance** for the year as a package.
- Package tiers are **configurable** — e.g., 6, 12, 15, or 18 offerings per year (illustrative).
- Benefits: better price per offering, planned-out year, easier management.
- The student then fills the package by selecting offerings across categories/topics over the year (selections can be made up front or progressively — see Open Questions).

**Business intent to design for:** move students up the commitment ladder over time — **1 → 6 → 12 → 18** — making frequent participation a habit. The recommender (§7) and packaging UX should actively support this progression.

**Requirements:**
- Package as a first-class entity: tier, included slot count, validity window, price, redemption tracking.
- A booking can be paid à la carte **or** redeemed against a package slot.
- Clear tracking of slots used / remaining / expiring.
- Upgrade path (e.g., 6 → 12) without losing already-redeemed slots.

---

## 7. Taxonomy: Parameters ↔ Categories ↔ Topics ↔ Offerings

To power both discovery and the recommender, we need a clean mapping:

- **Parameters** (the ~10 growth dimensions)
- **Categories** group topics; each category maps to one or more parameters.
- **Topics** sit under categories; each topic maps to parameters.
- **Offerings** (workshops/trips/events/competitions) belong to topics and carry the actual point contributions per parameter.

> A single topic/offering can contribute to **multiple** parameters. The mapping must be many-to-many and admin-editable.

**Requirement:** This taxonomy is the backbone of recommendations — keep it normalized and queryable (e.g., "give me offerings that boost Fitness").

---

## 8. AI Curriculum Recommender

An AI layer that turns the Growth Profile into guidance.

### 8.1 What it does
- **Gap detection:** identifies parameters that are low relative to the student's other parameters / a target benchmark.
- **Balanced suggestions:** if a parent is over-indexing on one area (e.g., all IQ workshops) while another lags (e.g., Fitness), it flags the gap and recommends offerings that contribute to the lagging parameter.
- **Curriculum builder:** helps assemble a set of offerings for the year (especially within a package) that develops the student in a balanced, intentional way.
- **Habit / frequency nudges:** encourages moving from à la carte to packages and from smaller to larger packages over time.

### 8.2 Example behavior
> Fitness is low and the parent has only been picking IQ-based workshops. → "Fitness looks underdeveloped. Here are 3 workshops that strengthen it." → student/parent adds them to the year's plan.

### 8.3 Requirements
- Recommender reads: current parameter scores, targets, history, and the parameter↔offering taxonomy.
- Recommendations must be **explainable** ("recommended because Fitness is below target").
- Respect availability, age-appropriateness, schedule, budget/package slots.
- Output should slot directly into the curriculum/package builder (one click to add).
- Recommendations update as scores change after each completion.

---

## 9. Supply & Demand Pipeline

The catalog is fed from multiple sources, and demand can shape supply.

### 9.1 Supply sources
1. **SkillFleet's own offerings.**
2. **Vendor-listed offerings** (existing marketplace) — must be tagged to parameters/topics to participate in scoring & recommendations.
3. **"Planned / not yet built" listings** — offerings we advertise to gauge interest before committing to run them. Based on demand signals (interest/sign-ups), we decide whether to actually build/run them.

### 9.2 Demand capture
- A section where **parents/students can request offerings** they want ("this is what we're looking for").
- Requests are **aggregated**; when demand for a topic crosses a threshold, admin can convert it into a real (or "planned") offering.

### 9.3 Requirements
- Offering status lifecycle: `planned` → `open/live` → `completed`/`retired` (plus `vendor` source flag).
- "Planned" offerings collect interest without taking full payment (waitlist / expression of interest).
- Demand-request intake with aggregation + admin triage view.
- Vendor offerings flow through the same parameter-tagging requirements as our own.

---

## 10. Data Model Additions (high level)

New or extended entities to support the above:

- `Student` — extended with link to a Growth Profile.
- `ParentGuardian` — linked to one or more students.
- `GrowthParameter` — id, name, description, weight, target/benchmark, active flag.
- `StudentParameterScore` — student, parameter, baseline component, accrued component, current total.
- `ScoreContribution` — student, parameter, source activity, points, timestamp (audit trail).
- `Assessment` / `AssessmentResult` — diagnostic tests and their parameter mappings.
- `CertificateUpload` — file, student, review status, parameter mapping.
- `Category`, `Topic` — taxonomy nodes with parameter mappings.
- `Offering` — extended with: type, topic, source (own/vendor), status (planned/live/etc.), and `parameterContributions[]`.
- `Package` — tier, slot count, validity, price.
- `PackageRedemption` — package, offering booking, slot tracking.
- `Recommendation` — student, recommended offering, reason, score-at-time.
- `OfferingRequest` — requester, topic/description, aggregated demand count, status.

> Treat the parameter taxonomy and scoring rules as **configuration/data**, not hardcoded logic.

---

## 11. Open Questions / Decisions Needed

1. **Final parameter set & count** — confirm the ~10 (10/11/12?) and their exact names. The brief listed EQ, IQ, fitness, social skills, communication, and **"m three"** — please clarify what "m three" should be (e.g., Maths? M3?).
2. **Parameter weighting & targets** — equal weight, or weighted? What defines a "good" score / target per parameter (age-based benchmarks?).
3. **Baseline math** — how are certificates, questionnaire, and tests combined into the first scores? Relative weights?
4. **Score scale** — points-based, 0–100, levels? Same scale across all parameters?
5. **Package fill timing** — must all slots be chosen up front, or can students pick offerings progressively during the year?
6. **Package economics** — pricing/discount per tier; refund/expiry rules for unused slots.
7. **Recommender ownership** — build in-house vs. use an LLM/API; how much should it auto-plan vs. only suggest?
8. **Certificate verification** — manual admin review, automated, or trust-based?
9. **"Planned" offerings** — interest threshold to convert; how interest is collected (waitlist vs. pre-pay vs. soft sign-up).
10. **Student vs. parent permissions** — what can a student do alone vs. requiring guardian approval (especially payments)?

---

## 12. Suggested Phasing

- **Phase 1:** Growth Profile + parameter taxonomy + baseline onboarding (questionnaire + certificate upload + 1 assessment) + à la carte booking with scoring on completion.
- **Phase 2:** Annual packages (tiers, slot tracking, redemption) + category/topic browse driven by parameters.
- **Phase 3:** AI Curriculum Recommender (gap detection → suggestions → curriculum/package builder).
- **Phase 4:** Supply & demand pipeline — "planned" listings, demand-request intake & aggregation, vendor parameter-tagging enforcement.

---

*This is a v1 draft intended to give the tech team a shared understanding. Once the open questions in §11 are answered, this can be hardened into build-ready specs.*
