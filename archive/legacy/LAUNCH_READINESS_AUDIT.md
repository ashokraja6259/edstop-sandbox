# EdStop Launch Readiness Audit (IIT Kharagpur First Launch)

## 1) Executive assessment: how far from launch?

**Current estimated readiness for a public campus launch: ~35% (MVP foundation present, production readiness not met).**

What is already in place:
- Next.js app shell and primary user flows for food ordering, dark-store shopping, wallet screens, student dashboard, rider/admin surfaces.
- Supabase-backed schema and migrations for orders, wallets, transactions, promo codes, audit/error logging, and atomic checkout logic.

What blocks launch now:
- Code quality gate is red (`npm run lint` reports 193 issues, including 97 errors).
- Production build fails in this environment due to required Supabase env vars not being present at build/prerender time.
- Multiple core experiences still rely on hardcoded/mock values (wallet, AI response generation, dashboard fallbacks, dark-store catalog/constants).
- Several requested product pillars are not yet implemented in app flows (blogs, lost-and-found, student marketplace, ad stack, services directory).

## 2) Scope fit vs requested EdStop super-app vision

### Implemented or partially implemented
- Food ordering UX and API routes: present.
- Dark-store shopping UX (single store model): present (currently with static catalog).
- Wallet concept and checkout wallet support: partially present.
- AI companion UX: present, but currently simulated responses (not LLM backend).

### Not yet implemented (major scope gaps)
- Blogs module.
- Lost & found module.
- Student marketplace (buy/sell listings).
- Ads platform (self-serve or managed placements).
- Campus/student services directory module.
- Closed-loop campus merchant acceptance network for wallet (on-ground + backend settlement controls).

## 3) Critical corrections required before launch (P0)

- [ ] **Fix build/lint gates to green** and enforce CI policy (no merge on failing lint/type/build).
- [ ] **Stabilize environment handling** for Supabase so builds/prerenders don’t fail when env is missing/misconfigured.
- [ ] **Replace mock data with live data** on wallet, dashboard fallback blocks, AI responses, and catalog/control surfaces.
- [ ] **Harden payments path** (Razorpay verification, idempotency, failed payment retries, reconciliation jobs).
- [ ] **Finish production observability**: centralized logs, error tracing, SLOs, alerts, runbooks.
- [ ] **Security + compliance pass**: authz review, RLS validation, data retention/export/privacy policy pages, abuse controls.
- [ ] **Define release tracks**: internal alpha (IIT KGP halls), then public KGP rollout, then multi-campus tenancy expansion.

## 4) Detailed launch checklist (actionable work plan)

## A. Engineering quality & release readiness
- [ ] Reduce lint errors to zero and warnings to agreed threshold.
- [ ] Add type-check script (`tsc --noEmit`) and make it mandatory in CI.
- [ ] Introduce test pyramid:
  - [ ] Unit tests (pricing, order state machine, wallet calculations).
  - [ ] Integration tests (order create + payment verify + wallet debit/cashback).
  - [ ] E2E tests (student order, rider lifecycle, admin settlement).
- [ ] Add branch protection + required checks.
- [ ] Add staging environment with production-like env vars.

## B. Product modules (must-have for your requested launch scope)

### B1. Food delivery (IIT KGP MVP)
- [ ] Restaurant onboarding pipeline (menus, availability windows, prep SLA).
- [ ] Delivery zones inside campus, distance rules, surge controls.
- [ ] Real rider assignment logic (not only UI states).
- [ ] Support & dispute workflow for failed/late/wrong orders.

### B2. Dark-store (Blinkit-style, single store at launch)
- [ ] Move catalog/inventory from static constants to DB-driven source of truth.
- [ ] Add low-stock alerts, picking workflows, substitution policy.
- [ ] SLA clocks (10/15/20 min windows) with operational breach alerts.
- [ ] Return/refund policy implementation.

### B3. AI study companion
- [ ] Replace simulated timeout response with real LLM backend + safety filters.
- [ ] Add rate limits + abuse controls + per-user cost governance.
- [ ] Add study tools roadmap: summaries, quiz generation, schedule planner, productivity nudges.
- [ ] Human escalation and content moderation for harmful prompts.

### B4. Blogs + lost & found + student marketplace
- [ ] Define schemas and moderation queue for user-generated content.
- [ ] Add posting, search, category, report/flag, and takedown flows.
- [ ] Add trust primitives: verified student identity, anti-fraud heuristics.
- [ ] Add messaging/contact-safe relay for marketplace and lost/found.

### B5. Ads + student services directory
- [ ] Define ad inventory and placements (home feed, search, category banners).
- [ ] Build campaign manager + billing + reporting (impressions/clicks/conversions).
- [ ] Build services directory taxonomy (academic/non-academic), ratings, verification badges.
- [ ] Add policy controls for restricted categories and campus rules.

## C. Wallet + cashback + closed payment ecosystem (campus loop)
- [ ] Migrate wallet UX from static values to transactional ledger-backed views.
- [ ] Support add-money, redeem, refund, reversal, and dispute states end-to-end.
- [ ] Define cashback engine rules (category, cap, expiry, anti-abuse).
- [ ] Build merchant acceptance app/QR + settlement cycle + reconciliation dashboard.
- [ ] Add finance controls: double-entry accounting model, daily close reports, audit exports.
- [ ] Align currency defaults and reports for INR-focused launch.

## D. Operations (IIT Kharagpur launch)
- [ ] Merchant acquisition: hostels, canteens, key outlets first.
- [ ] Rider operations: shifts, incentives, attendance, incident reporting.
- [ ] Dark-store SOPs: procurement, picking/packing, demand forecasting.
- [ ] Campus GTM: ambassador program, referral loops, launch-week incentives.
- [ ] Customer support runbook (chat/phone/escalations/refunds).

## E. Scale architecture (post-IIT KGP expansion)
- [ ] Multi-campus tenancy model (campus_id partitioning in data and access controls).
- [ ] Configurable campus modules (feature flags per institute).
- [ ] Rate/latency SLOs and autoscaling policy.
- [ ] National compliance readiness (KYC, payments policy, taxation workflows).

## 5) Suggested phased timeline

- **Phase 0 (2–4 weeks)**: Engineering hardening (build/lint/test/CI), environment stabilization, observability, and security review.
- **Phase 1 (4–8 weeks)**: IIT KGP commerce MVP hard launch (food + dark-store + real wallet flows + rider/admin ops).
- **Phase 2 (6–10 weeks)**: AI companion productionization + blogs/lost&found/marketplace MVP + moderation stack.
- **Phase 3 (4–8 weeks)**: Ads + directory + merchant closed-loop wallet acceptance + campus scale playbook.

## 6) Launch exit criteria (go/no-go)

- [ ] 0 P0/P1 security issues open.
- [ ] CI pipeline green on all required checks for 2 consecutive weeks.
- [ ] Payment success + reconciliation accuracy at target threshold.
- [ ] Delivery SLA + support SLA at target threshold during pilot.
- [ ] Campus merchant/rider operations stable for at least 14 days.
- [ ] Incident response drills completed with on-call ownership.

---

If you want, next I can convert this into:
1) a **Jira-ready epic/story breakdown**, and
2) a **week-by-week owner-based execution sheet** for IIT Kharagpur launch.
