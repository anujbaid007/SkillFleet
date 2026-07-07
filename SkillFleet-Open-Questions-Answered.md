# SkillFleet Growth Platform — Open Questions: Recommended Answers

**Prepared by:** Tech Team  
**Date:** 29 June 2026  
**Status:** Draft — for stakeholder review and confirmation  
**Reference document:** SkillFleet-Growth-Platform-Requirements.md §11

> These answers are recommendations based on industry best practices from comparable platforms (Outschool, ClassPass, Khan Academy, Duolingo, Credly, Masterclass, and others). Each answer includes rationale and trade-offs. Please review, confirm, or mark changes needed before we move to build-ready specs.

---

## Q1. Final Parameter Set & Count — What Is "m three"?

### Our Recommendation

**Use exactly 10 parameters.** "m three" should be interpreted as **Mindfulness / Mental Wellness**.

### Proposed Full Parameter Set

| # | Parameter | What it covers |
|---|---|---|
| 1 | IQ / Cognitive | Reasoning, problem-solving, academic thinking |
| 2 | EQ / Emotional Intelligence | Self-awareness, empathy, emotional regulation |
| 3 | Fitness / Physical | Physical health, stamina, motor skills |
| 4 | Social Skills | Collaboration, teamwork, conflict resolution |
| 5 | Communication | Speaking, writing, presentation, listening |
| 6 | **Mindfulness / Mental Wellness** | Resilience, stress management, focus, self-regulation |
| 7 | Creativity | Arts, innovation, design thinking, lateral reasoning |
| 8 | Leadership | Initiative, responsibility, decision-making |
| 9 | Digital Literacy | Technology fluency, coding basics, media literacy |
| 10 | Financial Literacy | Money concepts, budgeting basics, entrepreneurial thinking |

### Why This Answer Is Best

**Why 10?** Ten is the proven sweet spot for holistic assessment frameworks. The CASEL framework (used globally in social-emotional learning), WHO's child development model, and platforms like ClassDojo and Brightwheel all converge on 8–12 dimensions. Fewer than 8 misses important human dimensions; more than 12 overwhelms parents and makes the profile visually unreadable.

**Why Mindfulness for "m three"?** The three "M" parameters in the brief appear to be: Mental Wellness (Mindfulness), Money (Financial Literacy), and Media/Digital (Digital Literacy). Mindfulness is the most directly in demand — it appears in virtually every modern school development curriculum globally, it pairs naturally with IQ and EQ as the "inner life" trio, and it has direct mappings to activities like yoga, meditation workshops, art therapy, and journaling — all easy to source from vendors.

**Why these 5 additional parameters?** Creativity, Leadership, Digital Literacy, and Financial Literacy are the four skills most commonly cited by employers, schools, and parents as gaps in traditional education. They also have rich offering ecosystems (coding bootcamps, robotics clubs, drama, entrepreneurship events) that SkillFleet can source immediately.

### What We Need Confirmed

- [ ] Confirm "m three" = Mindfulness (or correct it)
- [ ] Approve or revise the 10-parameter list above
- [ ] Are any of the 5 suggested parameters not relevant to SkillFleet's audience or available offering types?

---

## Q2. Parameter Weighting & Targets — Equal or Weighted? What Defines a "Good" Score?

### Our Recommendation

**Start with equal weighting across all 10 parameters. Use age-band-based targets, not a single universal benchmark.**

### Age Band Structure (Proposed)

| Age Band | Label | Notes |
|---|---|---|
| 6–9 years | Junior | Foundational stage; expect low but broad scores |
| 10–12 years | Explorer | Pre-teen; rapid EQ and social development phase |
| 13–15 years | Builder | Early adolescence; leadership and digital skills emerge |
| 16–18 years | Achiever | Near-adult; career-awareness, financial literacy become relevant |

Each parameter has a **target score range per age band** (e.g., a score of 40/100 in Fitness is "on track" for a 7-year-old, but "below target" for a 15-year-old). Admin sets these ranges and can adjust them.

### Why This Answer Is Best

**Why equal weights to start?** There is no defensible reason — without data — to say EQ matters more than Fitness or Communication matters more than Creativity. Platforms that hard-code weights early (Duolingo's early skill weighting, for example) often have to reset them after seeing real user data, which breaks existing student scores. Equal weights avoid that. Once the platform has 6–12 months of completion data, weights can be tuned based on which parameters actually correlate with student outcomes.

**Why age-band targets?** A 10-year-old and a 16-year-old exist in entirely different developmental stages. Comparing their raw scores against the same benchmark would make a 10-year-old's profile look permanently "underdeveloped" in parameters like Financial Literacy and Leadership — creating discouragement rather than motivation. Pediatric health charts, school assessment rubrics (CBSE, IB, Cambridge), and EdTech platforms like Khan Academy all use age-appropriate benchmarks. This is the standard.

**Why admin-configurable?** SkillFleet's philosophy and offering mix will evolve. If they expand into a sport-heavy market, Fitness targets may need upward revision. Hardcoding benchmarks creates a code-change requirement every time the curriculum team adjusts their educational philosophy.

### What We Need Confirmed

- [ ] Agree on equal weighting at launch?
- [ ] Confirm the 4 age bands (6–9, 10–12, 13–15, 16–18) — any adjustments to band boundaries?
- [ ] Who sets the initial target ranges per parameter per band — internal team, an education consultant, or both?

---

## Q3. Baseline Math — How Are the Three Inputs Combined Into First Scores?

### Our Recommendation

**Weighted average with objectivity bias. Certificates held at provisional value until reviewed.**

### Proposed Weights

| Input | Weight | Reasoning |
|---|---|---|
| Diagnostic / analytical tests | 45% | Most objective; platform-controlled; hardest to fake |
| Certificate uploads | 30% | Verifiable but self-submitted; held at 50% value until admin-approved, then full 30% |
| Profile questionnaire | 25% | Useful signal but fully self-reported; lowest trust weight |

### How the Provisional Certificate Score Works

When a student uploads a certificate, it contributes **15% to the baseline** (50% of its full 30% weight) immediately. Once an admin approves the certificate, it tops up to the full **30%** contribution. If rejected, the provisional 15% is removed and the student is notified with a reason. This means the student is never blocked from using the platform while waiting for review.

### Example Baseline Calculation

A student takes an EQ diagnostic test and scores 60/100 (45% weight = 27 points). They submit a questionnaire with answers mapping to an EQ score of 50 (25% weight = 12.5 points). They upload a certificate (provisional: 15% weight = 7.5 points). **Total provisional baseline EQ score = 47/100.**  After admin approves the certificate: **total = 53.5/100**, rounded to 54.

### Why This Answer Is Best

**Why weight tests highest?** Tests are the only input the platform controls end-to-end. Questionnaires are self-reported and prone to social desirability bias (students/parents answering what they think sounds good). Certificates are real but unverifiable at the moment of upload. The higher the trust of the input, the higher its weight — this is the standard approach in academic assessments, background-check platforms (Checkr, HireRight), and credential platforms (Credly, Badgr).

**Why provisional scoring instead of blocking?** Blocking a student from their profile until admin reviews their certificate creates a poor first impression. New users who hit a wall immediately after signing up are the highest churn risk. Provisional scoring lets them see a live (if slightly lower) profile immediately, keeps them engaged, and creates a natural incentive to complete the process ("your score will go up once your certificate is verified").

**Why make the formula explainable?** The requirements document specifically asks for a "deterministic, explainable baseline." The weighted average formula is transparent — the system can show a student exactly how their score was calculated: "Your Fitness score of 62 comes from: test result (28 pts) + questionnaire (16 pts) + certificate (18 pts)." This builds trust with parents and students.

### What We Need Confirmed

- [ ] Agree on the 45/30/25 weight split? (Or would you prefer, for example, 50/30/20?)
- [ ] Confirm the provisional certificate approach (50% value until reviewed)?
- [ ] What happens if a student skips one of the three inputs (e.g., does not upload any certificates)? Does their score re-normalize, or do they simply score 0 in that component?

---

## Q4. Score Scale — Points-Based, 0–100, or Levels?

### Our Recommendation

**Store scores internally as 0–1000 points. Display in the UI as 0–100 with named levels.**

### Proposed Level System

| Score Range | Level Name | Visual |
|---|---|---|
| 0–20 | Seed | Earliest stage — just starting |
| 21–40 | Sprout | Foundational awareness |
| 41–60 | Growing | Active development |
| 61–80 | Thriving | Solid proficiency |
| 81–100 | Flourishing | High mastery |

*(Level names to be confirmed — these are illustrative and should match SkillFleet's brand voice.)*

### Why This Answer Is Best

**Why 0–1000 internally?** Offering point contributions (e.g., a workshop awards 25 Fitness points) will be small increments. If the display scale is also 0–1000, parents see their child go from 450 to 475 after a workshop — which feels like slow progress. Internally storing 0–1000 and displaying 0–100 means the same workshop moves the displayed score from 45 to 47.5 — still visible progress, but on a cleaner scale. More importantly, fine granularity in the data model prevents score "clumping" where large groups of students end up on the same number.

**Why the same scale across all parameters?** The entire value of the Growth Profile is cross-parameter comparison — the radar/spider chart visualization only works if all axes share a common scale. If Fitness is 0–100 and Financial Literacy is 0–50, the profile chart is meaningless. One scale, all parameters — this is non-negotiable for the product to make sense visually.

**Why named levels alongside the number?** Numbers alone are not motivating for students. Named levels create identity and milestone moments ("I just reached Thriving in Communication!"). This is the core engagement mechanism in Duolingo, Khan Academy badges, and scout/belt ranking systems. Parents can share milestones; students feel a sense of progression that raw numbers don't convey. The number provides precision; the level name provides meaning.

### What We Need Confirmed

- [ ] Confirm the 0–1000 internal / 0–100 display approach?
- [ ] Approve level names (or provide preferred alternatives that match SkillFleet's brand voice)?
- [ ] Should the level names be the same across all parameters, or can different parameters have thematic level names (e.g., Fitness uses athletic terms, Creativity uses art terms)?

---

## Q5. Package Fill Timing — All Upfront or Progressive During the Year?

### Our Recommendation

**Progressive selection with an optional upfront planning tool.**

### How It Works

- When a parent buys a 12-pack, they get 12 slots with a 12-month validity.
- They can book offerings one at a time as they browse, whenever it suits them.
- Optionally, they can use the AI Curriculum Recommender to map out the full year in one session (recommended for motivated/organised parents).
- As the year progresses, the platform sends nudges: "6 months left — you have 5 slots remaining. Here are offerings that would balance your child's profile."

### Why This Answer Is Best

**Why not force upfront selection?** Forcing parents to pick 12 activities in one session before they've experienced the platform causes decision fatigue — a well-documented conversion barrier in subscription commerce. ClassPass (which pioneered class-pack models) learned this early and moved to progressive usage. Gym memberships, Masterclass subscriptions, and Outschool credit packs all use progressive consumption. Parents cannot reliably predict a child's schedule, interests, or energy for the next 12 months. A system that forces them to try is a system that frustrates them.

**Why offer an optional upfront tool?** Some parents — especially Type-A, planning-oriented parents who are exactly the early adopters SkillFleet wants — genuinely want to plan the whole year. The AI Curriculum Recommender makes this fast and intelligent ("here's a balanced 12-offering year for your child based on their profile gaps"). Making it optional captures both user types without alienating either.

**Business angle:** Progressive selection keeps parents engaged with the platform all year — every time they return to book a slot, that's a touchpoint to upsell, show new offerings, and reinforce the product value. Upfront-only selection removes 11 of those 12 touchpoints for a 12-pack buyer.

### What We Need Confirmed

- [ ] Confirm progressive selection as the primary model?
- [ ] Should slots have a "reserve/hold" mechanic (e.g., parent can earmark a slot for a future offering that isn't open yet)?
- [ ] What happens if a parent books progressively but an offering they booked later gets cancelled — does the slot return to the package?

---

## Q6. Package Economics — Pricing, Discounts, Refunds, and Expiry

### Our Recommendation

### Discount Structure

| Package Tier | Slots | Suggested Discount Off Base Price |
|---|---|---|
| À la carte | 1 | 0% (base price per offering) |
| Starter Pack | 6 | 10% off per offering |
| Growth Pack | 12 | 15% off per offering |
| Pro Pack | 15 | 18% off per offering |
| Excellence Pack | 18 | 20% off per offering |

*(Exact rupee pricing to be confirmed by the business team.)*

### Validity

- **12 months from purchase date** (not from calendar year-start).
- Example: purchased March 15 → valid until March 14 next year.

### Unused Slots Policy

- Slots expire at the end of the validity window.
- **No cash refund** after a 30-day grace period from purchase date.
- **Goodwill rollover:** 1–2 unused slots (maximum) can roll over into the next package if the parent renews within 30 days of expiry. This reduces churn significantly without giving away unlimited rollovers.

### Upgrade Path

- A parent can upgrade from a lower to a higher tier at any time.
- They pay only the **price difference** between their current package and the new tier.
- Already-redeemed slots are preserved and counted toward the new package total.
- The validity window **resets to 12 months from upgrade date** (simplest approach; alternatively, keep original end date — confirm preference).

### Pause Option

- Allow one **30-day pause per package year** (for illness, long family holidays, etc.).
- The validity window extends by the paused days.
- This is standard in fitness and subscription businesses and significantly reduces cancellation requests.

### Why This Answer Is Best

**Why this discount ladder?** A 10–20% discount range is the proven sweet spot in subscription commerce. Too low (< 8%) and there's no perceived value in committing; too high (> 25%) and you either erode margins or signal that the à la carte price is inflated. The ladder creates a clear progression incentive: each step up saves meaningfully more, making the "commitment ladder" (1 → 6 → 12 → 18) financially rational for parents.

**Why no refunds after 30 days?** This is the industry standard for service-based subscriptions where the "product" is access to a pipeline of offerings (ClassPass, gym memberships, online course platforms). Unlimited refund windows create abuse — parents buying a 12-pack, using 11 slots, then refunding the whole thing. However, the 30-day grace period is long enough to handle genuine buyer's remorse and is required by consumer protection norms in most markets.

**Why 1–2 slot rollover instead of full rollover?** Full rollover is unsustainable — it means a parent who barely uses a 12-pack carries 10 slots into the next year, permanently discounting the next year's revenue. Limited rollover (1–2 slots) is a trust signal ("we won't just take your unused slots") without undermining the business model. Outschool and similar platforms use exactly this pattern.

**Why reset validity on upgrade?** Keeping the original end date after an upgrade can create a perverse situation where a parent upgrades to an 18-pack with only 1 month of validity left — they'll never use 18 slots in 1 month, creating frustration and refund requests. Resetting to 12 months on upgrade is cleaner and makes the upgrade feel like a fresh start.

### What We Need Confirmed

- [ ] Confirm the 4 package tiers (6/12/15/18) and the discount percentages?
- [ ] Confirm the 30-day refund grace period?
- [ ] Rollover: 1 slot or 2 slots maximum?
- [ ] On upgrade: reset validity to 12 months, or keep original end date?
- [ ] Should there be a family/sibling discount for parents with multiple linked student accounts?

---

## Q7. Recommender Ownership — Build In-House vs. LLM API? Auto-Plan vs. Suggest?

### Our Recommendation

**Use an LLM API (Claude) for natural language and reasoning. Use a rules engine for gap detection. Always suggest, never auto-plan.**

### Architecture

```
Student Profile + Scores + Taxonomy (structured data)
         ↓
[Rules Engine] → Gap Detection (e.g., "Fitness is 35% below target")
         ↓
[LLM / Claude API] → Natural language explanation + ranked offering suggestions
         ↓
[UI] → Parent reviews suggestions → Parent approves/rejects/modifies → Booked
```

### What the Rules Engine Does (In-House)

- Calculates which parameters are below the age-band target
- Ranks parameters by severity of the gap
- Filters the offering catalog by: parameter boost, age-appropriateness, availability, schedule, and remaining package slots
- Returns a shortlist of candidate offerings

### What the LLM Does

- Converts the gap analysis into a friendly, readable explanation: *"Arjun's Creativity and Fitness scores are below where we'd expect for his age. A good next step would be Dance & Movement Workshop — it builds both at once and fits within your Growth Pack."*
- Builds a coherent year-long curriculum narrative when the parent uses the "Plan my year" feature
- Handles follow-up questions from parents: *"Can you suggest something on weekends only?"*

### Why This Answer Is Best

**Why not build the full AI in-house?** The gap detection logic is simple enough to be rule-based. The *hard* part — turning structured data into persuasive, personalised, human-readable guidance — is exactly what LLMs are trained for. Building that from scratch in-house would take months and still not match an LLM's language quality. Use the LLM for what it does best; use code for the deterministic parts.

**Why Claude specifically?** Claude (Anthropic) performs best in long-form reasoning and safe, nuanced communication with non-technical users — which is exactly the parent communication context. It is also the best choice for an education/children platform given Anthropic's safety focus. The structured tool-calling API makes it straightforward to pass the student's profile as structured data and receive a ranked recommendation list as structured output, without parsing freeform text.

**Why suggest and never auto-plan?** Parents of school-age children are deeply invested in their child's schedule and activities. Any system that makes bookings on their behalf — even with the best intentions — will be seen as overstepping. This is a fundamental trust issue. Apps that auto-enroll or auto-book for children (even with notifications) consistently get negative reviews and chargebacks. The AI should feel like a knowledgeable advisor sitting next to the parent, not an automated agent acting for them. One-click confirmation of a suggestion is the right interaction model.

### What We Need Confirmed

- [ ] Confirm Claude API as the LLM choice?
- [ ] Is there a budget/cost ceiling per student per month for API calls? (This determines how frequently we can refresh recommendations.)
- [ ] Should recommendations be re-generated in real-time on demand, or batched nightly and cached?
- [ ] Should the recommender be able to suggest vendor offerings, or only SkillFleet's own offerings in Phase 3?

---

## Q8. Certificate Verification — Manual, Automated, or Trust-Based?

### Our Recommendation

**Trust-based with provisional scoring and async admin spot-check review.**

### Workflow

```
Student uploads certificate
        ↓
System immediately grants provisional score (50% of full certificate value)
        ↓
Certificate joins admin review queue (target SLA: 48–72 hours)
        ↓
Admin reviews:
    → Approves → score tops up to 100% of certificate value → student notified
    → Rejects  → provisional score removed → student notified with reason
                                          → can re-upload a corrected document
        ↓
Repeat offenders (2+ rejections for fake/irrelevant certificates) → flagged for manual scrutiny
```

### Why This Answer Is Best

**Why not fully manual (every certificate reviewed before any points)?** At scale — say, 500 students each uploading 3–5 certificates during onboarding — that is 1,500–2,500 certificates in the admin queue in the first month alone. Fully blocking scoring on review creates a support backlog, delays the student's first usable profile by days, and is the #1 reason users drop off after onboarding (they signed up, uploaded documents, and then... nothing happened). This is well-documented in EdTech onboarding research.

**Why not fully automated (AI/OCR to verify)?** Certificate formats in India (and globally) are enormously diverse — school certificates, sports day ribbons, online course completions, music grade certificates, competition participation letters. There is no single standard format. OCR-based automation has a 20–35% error rate on non-standard documents, meaning 1 in 4 legitimate certificates would be incorrectly flagged as suspicious. This creates a worse experience than manual review.

**Why provisional scoring?** The student sees immediate value from their upload — their score moves — keeping them engaged. The provisional state is visible in the UI ("Score includes 1 certificate pending review") so there is full transparency. Once approved, the score bump is a positive moment. This is the exact model used by LinkedIn Skills Assessments (provisional endorsement visibility), Credly (pending credential state), and background-check platforms. It balances trust with user experience.

**Why flag repeat offenders?** The vast majority of students will upload legitimate certificates in good faith. A small minority may attempt to game the system. Rather than treating all students as suspects (strict upfront verification) or ignoring the problem (pure trust), flagging accounts with a pattern of rejected/suspicious uploads for stricter review is proportionate and scalable.

### What We Need Confirmed

- [ ] Confirm the provisional scoring approach (50% value until reviewed)?
- [ ] What is the target admin review SLA — 48 hours? 72 hours? 1 week?
- [ ] Will admin review happen in the existing admin console, or does a new certificate review queue need to be built?
- [ ] After how many rejected uploads should an account be flagged for stricter review (suggest: 2)?

---

## Q9. "Planned" Offerings — Interest Threshold and How Interest Is Collected

### Our Recommendation

**Soft sign-up (free expression of interest, no payment). Threshold of 20 expressions of interest to trigger admin review for conversion.**

### Status Lifecycle

```
[Admin creates] → PLANNED (collecting interest)
                        ↓
              [Threshold reached: 20 sign-ups]
                        ↓
              Admin reviews → decides to convert
                        ↓
                    LIVE / OPEN
              (real bookings open; interested users notified)
                        ↓
                   COMPLETED / RETIRED
```

### What "Soft Sign-Up" Means in the UI

- A Planned offering shows up in the catalog with a **"Notify me when this is live"** button (not "Book now" or "Pay").
- Clicking it registers interest and adds the offering to the student's "Watchlist."
- No payment is taken.
- Students/parents can see how many others are interested: *"18 families have expressed interest"* — this social proof nudges more sign-ups.
- When the offering goes Live, everyone who signed up is notified by email + in-app notification with a direct link to book.

### Why 20 as the Threshold?

A cohort-based workshop or trip needs a minimum viable group size to run (typically 8–15 students for a workshop, more for a trip). Setting the interest threshold at 20 accounts for the typical 40–60% drop-off between expressing interest and actually booking and paying. 20 expressions of interest → expect 8–12 actual bookings → viable cohort.

Admin can manually override the threshold in either direction — lower it for a premium small-group offering (viable at 5 students) or raise it for a large-scale event requiring 50+ participants.

### Why This Answer Is Best

**Why no pre-payment for planned offerings?** Pre-payment for a non-confirmed offering creates legal liability (consumer protection laws in most markets require refunds within set timeframes if the event doesn't happen), adds payment processing complexity (holding funds, refund workflows), and damages trust if the offering ultimately doesn't run. The free sign-up removes all of that risk while still generating a genuine demand signal. Kickstarter proved this model can drive real commitment without upfront payment.

**Why show the interest count to users?** Social proof is one of the most powerful drivers of sign-up behaviour. A parent who sees "18 families interested" is far more likely to click "Notify me" than one who sees a blank counter. This is why restaurant reservation platforms show "Only 3 seats left" and event platforms show attendance counts. It creates momentum without manufactured urgency.

**Why an admin override on the threshold?** A blanket threshold of 20 will be wrong for edge cases. A one-on-one tutoring session is viable at 1. A school excursion may need 40. Admin flexibility ensures the threshold is a starting point, not a constraint that blocks viable niche offerings.

### What We Need Confirmed

- [ ] Confirm the threshold of 20 expressions of interest (or adjust)?
- [ ] Soft sign-up only, or allow soft pre-payment (e.g., a ₹100 token deposit that applies toward the booking price if the offering goes live)?
- [ ] Should Planned offerings appear in the AI Curriculum Recommender, or only Live offerings?
- [ ] When an offering is retired (threshold never reached), how are the interested users notified — email only, or also in-app?

---

## Q10. Student vs. Parent Permissions — What Can a Student Do Alone?

### Our Recommendation

**Split permissions by action type. Payments and financial decisions always require a parent. Exploration and self-expression are always available to students.**

### Permission Matrix

| Action | Student alone | Parent required | Notes |
|---|---|---|---|
| View own Growth Profile, scores, history | Yes | No | Core student right |
| Browse the full catalog | Yes | No | Discovery should never be gated |
| Express interest in a Planned offering | Yes (13+) | Required (under 13) | No financial commitment involved |
| Submit an offering request | Yes (13+) | Required (under 13) | Text input only, no payment |
| Take diagnostic/baseline assessments | Yes | No | Student-owned action |
| Upload certificates | Yes | Also can upload on student's behalf | Both can initiate |
| Complete the profile questionnaire | Yes | Also can fill in | Both can initiate; parent can review |
| Enroll in a **free** or **trial** offering | Yes (13+) | Required (under 13) | No payment involved |
| **Make any payment** | **Never** | **Always required** | Hard rule — no exceptions |
| Redeem a package slot to book an offering | No | Yes | Financial action |
| Accept / act on AI curriculum suggestions | Student can view & shortlist | Parent confirms and books | Two-step: student curates, parent executes |
| Upgrade or purchase a new package | No | Yes | Financial action |
| Edit student profile details | Yes | Can also edit / override | Parent has final authority |
| Link/unlink a parent account | No | Yes | Account security action |
| Delete account or export personal data | No | Yes | Legal compliance requirement |
| Flag a concern or send a message to admin | Yes (14+) | Yes | Both can contact support |

### Why This Answer Is Best

**Why are payments always parent-only?** This is not a design preference — it is a legal requirement. COPPA (Children's Online Privacy Protection Act, US), India's DPDP Act (Digital Personal Data Protection), and equivalent laws in every major market prohibit minors from entering into financial transactions. Beyond legal compliance, it protects SkillFleet from chargebacks and fraud. No exceptions.

**Why can students 13+ express interest and submit requests without a parent?** These actions carry zero financial commitment and are analogous to a student raising their hand in class — they're expressing preference, not making a decision. Blocking these for students 13+ would be paternalistic and would make the product feel hostile to the actual user whose profile it is. Platforms like YouTube (13+), Spotify, and Khan Academy all give teenagers meaningful self-agency over non-transactional actions.

**Why the two-step model for AI recommendations (student shortlists, parent acts)?** The student is the one experiencing the activities and best knows what interests them. The parent is the one managing the budget and schedule. A model where the student can express preferences ("I want to try rock climbing and coding") and the parent approves and books respects both roles — it doesn't cut the student out, and it doesn't override the parent's authority. This is the same model used by family streaming platforms (where children have wishlists that parents approve) and educational platforms aimed at school students.

**Why under-13 students require a parent for even basic actions like submitting a request?** Children under 13 are in a different legal category in most jurisdictions. Actions like submitting text describing what they want (even without payment) constitute data processing of a minor's expressed preferences — which requires verifiable parental consent under COPPA, GDPR-K, and India's upcoming guidelines for children's data. The safest and most compliant approach is to route all under-13 actions through the linked parent account.

### What We Need Confirmed

- [ ] Confirm the age threshold of 13 as the dividing line (or adjust to a different age, e.g., 14 or 15)?
- [ ] For the recommendation flow: should students be able to shortlist suggestions themselves, or only view them (with all action through the parent)?
- [ ] Can a student see their own score breakdown and certificate review status? Or is that parent-only to protect them from anxiety about pending reviews?
- [ ] What happens when there is no linked parent account — can older students (16+) operate independently with additional verification?

---

## Summary: Key Decisions Needed

This table summarises every question that needs a stakeholder decision before build-ready specs can be written.

| # | Question | Our Recommendation | Needs Confirmed |
|---|---|---|---|
| Q1 | Parameter set & "m three" | 10 parameters; "m three" = Mindfulness | Full parameter list approval |
| Q2 | Weighting & targets | Equal weight; age-band targets | Band boundaries; who sets targets |
| Q3 | Baseline math | 45% tests / 30% certs / 25% questionnaire | Weight split; what if an input is skipped |
| Q4 | Score scale | 0–1000 internal / 0–100 display + 5 named levels | Level names; per-parameter theming |
| Q5 | Package fill timing | Progressive, with optional AI-powered upfront plan | Reserve/hold mechanic; cancellation slot return |
| Q6 | Package economics | 10–20% discount ladder; 1–2 slot rollover; 30-day refund window | Exact pricing; rollover count; upgrade validity reset |
| Q7 | Recommender | Claude API + rules engine; suggest only, never auto-plan | API budget; refresh cadence; vendor offerings included? |
| Q8 | Certificate verification | Provisional scoring + async admin review | SLA; review UI location; rejection threshold |
| Q9 | Planned offerings | Free soft sign-up; threshold of 20 | Threshold number; token deposit option; Planned in recommender? |
| Q10 | Student vs. parent permissions | Payments always parent; exploration student-led (13+) | Age threshold; student shortlisting for recommendations |

---

*Once these decisions are confirmed or revised, this document will be updated and handed to engineering as the authoritative input for build-ready specifications.*
