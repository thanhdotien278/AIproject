---
title: AIproject Dynamic QR Attendance Epic Breakdown
status: implementation-ready planning draft
created: 2026-06-25
updated: 2026-06-25
stepsCompleted:
  - analyst-requirements-extraction
  - pm-mvp-backlog-shaping
  - architect-guardrail-mapping
  - po-coverage-validation
  - sm-story-slicing
  - qa-test-expectations
inputDocuments:
  - _bmad-output/planning-artifacts/prds/prd-AIproject-2026-06-25/prd.md
  - _bmad-output/planning-artifacts/prds/prd-AIproject-2026-06-25/addendum.md
  - _bmad-output/planning-artifacts/architecture/attendance-checkin/ARCHITECTURE-SPINE.md
  - _bmad-output/planning-artifacts/architecture/register-thankyou-data/ARCHITECTURE-SPINE.md
  - _bmad-output/project-context.md
  - docs/index.md
  - docs/project-overview.md
  - docs/architecture.md
  - docs/api-routes.md
  - docs/data-models.md
  - docs/operational-flows.md
  - docs/known-gaps-and-suspected-bugs.md
  - docs/source-tree-analysis.md
  - docs/scripts-and-development.md
  - backend/docs/PARTICIPANT_ID_SYSTEM.md
---

# AIproject - Dynamic QR Attendance Epic Breakdown

## 1. Title and Status

This document is the implementation-ready BMAD epic and story breakdown for completing Dynamic QR Attendance and Check-in in the existing AIproject / Q-Event Manager repository.

Status: ready for story-by-story development planning. It is not feature implementation.

## 2. Source Documents Used

- PRD: `_bmad-output/planning-artifacts/prds/prd-AIproject-2026-06-25/prd.md`
- PRD addendum: `_bmad-output/planning-artifacts/prds/prd-AIproject-2026-06-25/addendum.md`
- Attendance/check-in architecture spine: `_bmad-output/planning-artifacts/architecture/attendance-checkin/ARCHITECTURE-SPINE.md`
- Architecture spine: `_bmad-output/planning-artifacts/architecture/register-thankyou-data/ARCHITECTURE-SPINE.md`
- Agent project context: `_bmad-output/project-context.md`
- Repository documentation index and overview: `docs/index.md`, `docs/project-overview.md`
- Current architecture source of truth: `docs/architecture.md`
- Current route catalog source of truth: `docs/api-routes.md`
- Current data model source of truth: `docs/data-models.md`
- Current operational flow source of truth: `docs/operational-flows.md`
- Current gaps and suspected bugs source of truth: `docs/known-gaps-and-suspected-bugs.md`
- Current source tree and development scripts source of truth: `docs/source-tree-analysis.md`, `docs/scripts-and-development.md`
- Participant ID design source of truth: `backend/docs/PARTICIPANT_ID_SYSTEM.md`
- Current repository code was inspected only to confirm documented paths and route/model names; no feature implementation is included in this task.

## 3. Summary of Current Problem

The repository already supports conference registration, configurable registration fields, participant storage, confirmation email, admin pages, public dashboards, Socket.IO registration stats, a dynamic Attendance QR API, and an IP filter middleware. The attendance product is incomplete because the dynamic QR flow validates a short-lived token and then redirects to registration; it does not identify a participant, persist attendance state, store check-in time, emit attendance updates, or provide a complete admin correction flow.

The docs folder is treated as current source-of-truth for the existing system. It identifies several launch blockers and mismatches: participant IDs are generated per conference but enforced globally unique, PM2 cluster mode conflicts with process-local QR tokens, registration route params are not consistently read, IP filtering exists but is not mounted, admin attendance and conference-scoped bulk-email UI calls lack matching backend routes, admin authorization is authentication-only, CSRF is not visible for mutations, and the seed command is currently broken.

The MVP must create a safe internal-production path without broad redesign. Stories below preserve the current 30-second Attendance QR lifetime unless a later product decision changes it.

## 4. BMAD Role Synthesis

### Analyst Extraction

Product requirements are FR-1 through FR-14 and NFR-1 through NFR-17 from the PRD. Implementation notes are kept separate: Express, Mongoose, EJS, Socket.IO, PM2, route names, schema fields, and dashboard components are constraints and source context, not product goals. The attendance/check-in architecture spine is now the binding implementation substrate for token validation, network verification, attendance state, evidence, admin inspection/correction, realtime updates, export, performance, accessibility, role authorization, and CSRF.

Key contradictions and decisions:

- Token strategy: PRD requires production-safe validation; current docs say tokens are process-local while PM2 cluster uses two instances. Decision Required.
- Participant identity: a shared Attendance QR proves scan freshness, not who attended. Decision Required for the identity input used after QR validation.
- Conference-scoped participant ID: `Counter` is per conference, but `Participant.participantId` is globally unique. This must be fixed before ID-based check-in or admin operations rely on participant ID.
- Admin routes: dashboard UI calls attendance and conference-scoped bulk email endpoints that are not registered.
- CSRF and authorization: admin mutations are session-authenticated but no CSRF protection or role-based route enforcement is visible.
- Realtime updates: `statsUpdated` exists for registration counts, but attendance counts must come from persisted attendance state and include `conferenceCode`.
- Public surfaces: public dashboard can show aggregate stats today, but participant-level attendance must remain private.
- Thank-you data correctness: the architecture spine says registration confirmation must reload the exact persisted participant and the participant's conference, not rely on email-only or latest conference lookups.

### PM Backlog Shape

The MVP backlog is organized around business outcomes: safe production foundation, correct participant identity, valid QR admission, reliable check-in recording, venue network control, live operations dashboard, admin correction, email route alignment, and audit/regression readiness. Deferred items remain explicit rather than hidden in story assumptions.

### Architect Guardrails

- Keep the existing layered MVC shape: routes wire HTTP paths, controllers own request behavior, models own schema constraints, services own reusable token/view-model logic.
- Use persisted state as the authority for attendance and thank-you confirmation.
- Do not rely on process-local memory for multi-process token validation unless single-process or sticky routing is explicitly accepted.
- All participant lookup for check-in must include `conferenceCode`.
- All attendance mutations must be authenticated, authorized, and CSRF-protected before internal production.
- Socket.IO payloads must include `conferenceCode`; dashboards must ignore mismatched conference updates.
- Public pages and public APIs must not expose participant-level attendance data.
- Attendance/check-in stories must cite `_bmad-output/planning-artifacts/architecture/attendance-checkin/ARCHITECTURE-SPINE.md`; unresolved choices stay `Decision Required` until the product owner chooses them.

### PO Validation

Every FR and NFR is mapped to at least one epic/story in section 10 with concrete acceptance-criteria references and test notes. Stories include concrete Given/When/Then acceptance criteria and no template placeholder remains.

### Scrum Master Slicing

Stories are sized for focused development passes. Several stories are decision-enabling because development would be unsafe without resolving token deployment, identity input, role authorization, or bulk-email scope.

### QA Risk Focus

Required regression coverage appears in the relevant stories for token expiry, denied network, duplicate check-in, ambiguous participant lookup, conference-scoped participant IDs, admin attendance mutation, dashboard count consistency, and thank-you page identity correctness.

## 5. Epic List

| Epic | Title | Outcome |
| --- | --- | --- |
| EP-01 | Production Readiness and Security Foundation | The app has safe environment, seed, auth, CSRF, QR base URL, and deployment decisions before attendance data can be trusted. |
| EP-02 | Conference-Scoped Participant Identity and Registration Correctness | Participant identity, registration route scoping, duplicate detection, and thank-you confirmation are correct per conference. |
| EP-03 | Attendance QR Issuance and Token Validation | Attendance QR generation rejects unknown conferences, preserves the 30-second TTL, and validates tokens safely for the selected deployment mode. |
| EP-04 | Participant Identity Resolution and Check-in Recording | A valid QR scan resolves exactly one participant, persists attendance state, handles duplicates, and records evidence. |
| EP-05 | Network Verification and IP Whitelist Enforcement | Check-in is blocked outside allowed venue networks and network behavior is configurable for registration. |
| EP-06 | Realtime Attendance Dashboard | Admin dashboards show persisted attendance counts by conference and update in realtime after successful check-ins. |
| EP-07 | Admin Attendance Management and Route Alignment | Admin attendance controls use real backend routes, correct vocabulary, authorization, CSRF, and export behavior. |
| EP-08 | Conference-Scoped Bulk Email Decision or UI Removal | The conference bulk-email mismatch is resolved by implementing scoped email or removing the action from MVP. |
| EP-09 | Audit Evidence, Export, Observability, and Regression Testing | The MVP has audit evidence, exports, operational logs, automated regression coverage, and event rehearsal criteria. |

## 6. Suggested Implementation Order

1. EP-01: resolve launch-blocking production and security prerequisites.
2. EP-02: fix conference-scoped identity before check-in depends on participant lookup.
3. EP-03: make Attendance QR issuance and validation safe.
4. EP-04: implement participant resolution and persisted check-in.
5. EP-05: enforce venue network controls around the new check-in path.
6. EP-06: expose persisted attendance counts and realtime updates.
7. EP-07: align admin attendance management and exports.
8. EP-08: resolve the bulk-email UI/backend mismatch.
9. EP-09: complete audit, observability, and regression hardening before rollout.

## 7. Dependency Map

| Item | Depends On | Blocks |
| --- | --- | --- |
| ST-1.1 seed/env readiness | none | all internal-production verification |
| ST-1.2 admin auth, authorization, CSRF plan | none | ST-7.1, ST-7.2 |
| ST-1.3 token deployment decision | docs/architecture, ecosystem config | EP-03 and EP-04 |
| ST-2.1 participant ID index strategy | data model docs, Participant ID doc | ST-2.3, ST-4.1, ST-7.1 |
| ST-2.2 registration route scoping | route catalog | ST-2.3, ST-4.1 |
| ST-3.1 QR generation hardening | ST-1.3 if strategy changes QR store | ST-3.2, EP-04 |
| ST-3.2 token validation errors | ST-3.1 | EP-04, EP-05 |
| ST-4.1 identity resolution | ST-2.1, ST-2.2, ST-3.2 | ST-4.2, ST-4.3 |
| ST-4.2 persisted attendance | ST-4.1 | EP-06, EP-07, EP-09 |
| ST-5.1 network trust boundary | ST-1.3 | ST-5.2, ST-5.3 |
| ST-6.1 attendance stats API | ST-4.2 | ST-6.2, ST-6.3 |
| ST-7.1 admin mutation route | ST-1.2, ST-4.2 | ST-7.2, ST-7.3 |
| ST-7.4 admin attendance inspection | ST-1.2, ST-4.2, ST-4.4 | ST-7.1, ST-7.3, ST-9.4 |
| ST-8.1 bulk email decision | route catalog and PM decision | ST-8.2 or ST-8.3 |
| ST-9.2 regression suite | all feature stories | launch readiness |

## 8. Role Authorization Matrix

Default policy from the Attendance/Check-in Architecture Spine AD-12. These permissions must be enforced on view, export, mutation, QR generation, network configuration, and conference-scoped bulk-email surfaces until the product owner changes them.

| Surface / Action | admin | manager | staff | receptionist | user |
| --- | --- | --- | --- | --- | --- |
| Generate Attendance QR | allow | allow | allow | allow | deny |
| View attendance counts | allow | allow | allow | allow | deny |
| View participant-level attendance list | allow | allow | allow | allow own desk scope if introduced | deny |
| Inspect check-in evidence | allow | allow | allow limited non-sensitive fields | deny by default | deny |
| Export attendance | allow | allow | deny by default | deny | deny |
| Correct attendance state | allow | allow | deny by default | deny by default | deny |
| Configure Network Verification | allow | deny by default | deny | deny | deny |
| Send conference-scoped bulk email if included | allow | allow | deny | deny | deny |

Decision Required: final role policy, including whether `staff` or `receptionist` may correct attendance or inspect evidence.

## 9. Architecture Guardrails by Epic

| Epic | Binding guardrails |
| --- | --- |
| EP-01 | Apply AD-2 token deployment strategy, AD-12 role matrix, and AD-13 CSRF before exposing attendance routes. |
| EP-02 | Apply AD-7 conference-scoped participant identity and the register thank-you spine AD-1 through AD-4. |
| EP-03 | Apply AD-1 QR issuance, AD-2 token deployment strategy, AD-3 server-time authority, and AD-17 result-state accessibility. |
| EP-04 | Apply AD-6 identity resolution, AD-8 persistence boundary, AD-9 evidence shape, AD-17 accessibility, and AD-18 performance criteria. |
| EP-05 | Apply AD-4 Network Verification ordering and AD-5 trusted source IP handling. |
| EP-06 | Apply AD-10 read-model-first admin inspection, AD-14 realtime after persistence, AD-15 refresh/polling recovery, and AD-12 view permissions. |
| EP-07 | Apply AD-10 admin inspection, AD-11 correction route, AD-12 role matrix, AD-13 CSRF, and AD-16 export rules. |
| EP-08 | Apply AD-12 bulk-email permission and AD-13 CSRF if conference-scoped bulk email remains in MVP. |
| EP-09 | Apply AD-9 audit evidence, AD-16 export rules, AD-17 accessibility, AD-18 performance criteria, and BMAD QA deterministic test-quality rules. |

## 10. FR/NFR Coverage Map

| Requirement | Epic | Story | Specific AC coverage | Test coverage note |
| --- | --- | --- | --- | --- |
| FR-1 Generate scoped Attendance QR | EP-03 | ST-3.1, ST-3.3 | ST-3.1 validates selected Conference Code, rejects unknown/missing code, preserves 30-second TTL, rejects unauthorized QR generation; ST-3.3 refreshes from expiry metadata. | Test valid/unknown/missing code, TTL metadata, authorized/unauthorized roles, and QR refresh/error behavior. |
| FR-2 Validate Check-in Token | EP-03 | ST-1.3, ST-3.2 | ST-1.3 blocks implementation without production-safe token strategy; ST-3.2 accepts valid unexpired token and rejects expired, missing, unknown, mismatched token before attendance actions. | Test selected token strategy, expiry, missing, unknown, mismatched code, and no participant lookup after failure. |
| FR-3 Resolve Participant for Check-in | EP-04 | ST-2.1, ST-2.2, ST-4.1, ST-4.3 | ST-4.1 requires chosen identity input and exactly one conference-scoped participant; ST-4.3 distinguishes not-found and ambiguous outcomes. | Test participant ID plus conference lookup, no match, ambiguous match, and same identity across conferences. |
| FR-4 Record Attendance State | EP-04 | ST-4.2, ST-4.3 | ST-4.2 persists checked-in state and timestamp before success; ST-4.3 prevents conflicting duplicate attendance state. | Test success persistence, DB failure, no success before save, duplicate check-in, and scoped update query. |
| FR-5 Preserve Check-in Event evidence | EP-04, EP-07, EP-09 | ST-4.4, ST-7.4, ST-9.1, ST-9.3 | ST-4.4 evidence includes participant, Conference Code, timestamp, path; ST-7.4 admin inspection shows safe evidence; ST-9.1 retention owner/duration; ST-9.3 logs non-sensitive outcomes. | Test evidence fields, authorized evidence inspection, redaction, retention/export alignment, and log/audit checks. |
| FR-6 Enforce allowed network ranges for check-in | EP-05 | ST-5.1, ST-5.2 | ST-5.1 defines trusted proxy and allowlist source; ST-5.2 blocks denied network before token/identity work and returns browser/API denial states. | Extend IP filter tests for allow/deny, spoofed forwarded headers, no mutation on denial, browser/API response shape. |
| FR-7 Configure network verification surfaces | EP-05 | ST-5.1, ST-5.3 | ST-5.1 restricts configuration by role; ST-5.3 makes registration enforcement configurable while check-in is required. | Test role denial for configuration and registration allowed/denied behavior under both config states. |
| FR-8 Show attendance counts by Conference Code | EP-06 | ST-6.1, ST-6.3 | ST-6.1 returns total, checked-in, not-yet-checked-in counts scoped by selected Conference Code and denies unauthorized roles; ST-6.3 refresh/polling reads persisted state. | Test count math for zero/all/some checked-in, conference scoping, authorized/unauthorized access, refresh after state change. |
| FR-9 Realtime update after successful Check-in | EP-06 | ST-6.2, ST-6.3 | ST-6.2 emits after persistence with `conferenceCode` and updated counts; dashboards ignore other conferences; ST-6.3 refresh recovers from socket failure. | Test payload shape, post-persistence emit, mismatched conference ignore, and manual/polling refresh reconciliation. |
| FR-10 Admin view and correct Attendance State | EP-07 | ST-7.1, ST-7.2, ST-7.4 | ST-7.4 covers participant-level list, filters, evidence inspection, role denial; ST-7.1 correction route persists secured changes; ST-7.2 UI maps to real routes and vocabulary. | Test list/filter/evidence access, correction success/denial/CSRF/wrong conference, and no calls to missing route. |
| FR-11 Conference-scoped Participant ID | EP-02 | ST-2.1, ST-2.3, ST-9.2 | ST-2.1 compound uniqueness allows `0001` in different conferences and blocks duplicate inside one; ST-2.3 requires all lookup by participant ID to include Conference Code. | Test index behavior, same ID across conferences, duplicate within one conference, and lookup never by participant ID alone. |
| FR-12 Duplicate and ambiguous identity protection | EP-02, EP-04 | ST-2.3, ST-4.1, ST-4.3 | ST-2.3 keeps duplicate email scoped by conference; ST-4.1/4.3 require not-found/ambiguous states and no silent selection. | Test same email across conferences, duplicate names/phones, ambiguous identity, not-found, and duplicate check-in. |
| FR-13 Admin attendance API aligns with UI | EP-07 | ST-7.1, ST-7.2 | ST-7.1 registers secured correction route; ST-7.2 removes/disabled broken endpoint calls and aligns UI vocabulary with backend state. | Test registered route, UI/client does not call missing route, success/failure display, auth/CSRF denial. |
| FR-14 Conference-scoped bulk email or UI removal | EP-08 | ST-8.1, ST-8.2, ST-8.3 | ST-8.1 requires product decision; ST-8.2 implements scoped send with role/CSRF; ST-8.3 removes/disables action if deferred. | If included, test scoped recipients and auth/CSRF; if deferred, verify no missing route call remains. |
| NFR-1 Persist before success | EP-04, EP-09 | ST-4.2, ST-9.2 | ST-4.2 success only after persisted attendance and timestamp; ST-9.2 regression suite blocks acceptance on failures. | Test no success before save, DB failure path, persisted state after response, regression gate. |
| NFR-2 Token validation works in deployment topology | EP-01, EP-03 | ST-1.3, ST-3.2 | ST-1.3 requires selected strategy across workers or explicit deployment constraint; ST-3.2 applies selected strategy. | Test cross-worker or chosen constraint, token validation under selected strategy, and deployment doc check. |
| NFR-3 Check-in completes within 2 seconds | EP-04, EP-09 | ST-4.2, ST-9.4 | ST-4.2 and ST-9.4 define 4 desks, one check-in per 10 seconds for 10 minutes, 60-second burst at twice rate, p95 under 2 seconds, errors under 1%. | Run or simulate load scenario; record p95 latency, error rate, and persisted-count reconciliation. |
| NFR-4 Admin attendance mutations authenticated and authorized | EP-01, EP-07 | ST-1.2, ST-7.1 | ST-1.2 defines permissions and reusable checks; ST-7.1 rejects unauthenticated, unauthorized, missing CSRF, and missing Conference Code. | Test unauthenticated, unauthorized role, missing CSRF, wrong conference, success, duplicate/no-op. |
| NFR-5 Public surfaces do not expose participant-level attendance | EP-06, EP-07 | ST-6.4, ST-7.4 | ST-6.4 keeps public dashboard/stats free of participant-level attendance; ST-7.4 role-protects participant-level list/evidence. | Test public response shapes omit participant attendance data and unauthorized participant-level access is denied. |
| NFR-6 Check-in outcomes diagnosable | EP-04, EP-09 | ST-4.4, ST-9.3 | ST-4.4 records evidence for success/duplicate/denial paths; ST-9.3 records safe outcome, conference, route, timestamp, reason. | Test audit/log fields for success, duplicate, expired, mismatched code, network denial; verify no token/PII leakage. |
| NFR-7 Failure and success states readable without color only | EP-03, EP-04, EP-05 | ST-3.3, ST-4.2, ST-4.3, ST-5.2 | ST-3.3 expired/invalid states; ST-4.2 success; ST-4.3 duplicate/not-found/ambiguous; ST-5.2 denied network all require heading, text, status text, no color-only meaning. | Add view/browser assertions or manual checks for success, duplicate, not-found, ambiguous, expired/invalid, denied states. |
| NFR-8 QR validation authority is server-side | EP-03 | ST-3.2 | ST-3.2 keeps server time authoritative and token validation before any attendance action. | Test client clock cannot force validity and expired/mismatched tokens fail server-side. |
| NFR-9 QR failures do not leak participant data | EP-03, EP-04 | ST-3.2, ST-4.3 | ST-3.2 failure before lookup; ST-4.3 privacy-safe not-found/ambiguous messages. | Test failed token response has no participant fields; identity failure messages avoid email/phone leakage. |
| NFR-10 Participant-level attendance remains authenticated | EP-06, EP-07 | ST-6.4, ST-7.4 | ST-6.4 public surfaces omit participant-level data; ST-7.4 participant list/evidence requires allowed role. | Test public routes, unauthenticated admin route, unauthorized roles, and allowed-role list/evidence access. |
| NFR-11 Failed check-in states avoid identity leakage | EP-04 | ST-4.1, ST-4.3 | ST-4.1/4.3 not-found and ambiguous states do not reveal unrelated participant data. | Test not-found/ambiguous responses for absence of unsafe email/phone/participant details. |
| NFR-12 CSRF addressed before admin attendance production | EP-01, EP-07, EP-08 | ST-1.2, ST-7.1, ST-8.2 | ST-1.2 selects CSRF mechanism; ST-7.1 correction route requires CSRF; ST-8.2 bulk email requires CSRF if included. | Test missing/invalid CSRF for correction and bulk email, plus positive path with valid CSRF. |
| NFR-13 Startup requires explicit MONGODB_URI | EP-01 | ST-1.1 | ST-1.1 startup fails clearly without `MONGODB_URI` and no hardcoded fallback is used. | Run syntax check and startup/config check; verify no remote fallback in seed/admin setup. |
| NFR-14 QR URL generation uses correct deployed base URL | EP-01, EP-03 | ST-1.3, ST-3.1 | ST-1.3 verifies `BASE_URL` and fallback behavior; ST-3.1 returns scoped check-in URL. | Test URL generation with `BASE_URL` and request-derived fallback. |
| NFR-15 Seed/admin setup is reliable | EP-01 | ST-1.1 | ST-1.1 seed command is syntactically valid and creates/verifies admin account predictably. | Run `node --check backend/config/seedAdmin.js`; run smallest safe seed verification or document unavailable DB. |
| NFR-16 Attendance evidence retained through reporting | EP-04, EP-09 | ST-4.4, ST-9.1 | ST-4.4 captures evidence; ST-9.1 defines retention duration/owner and aligns fields/export. | Verify evidence fields exist through reporting period and retention documentation is present. |
| NFR-17 Export distinguishes registered and checked-in | EP-07, EP-09 | ST-7.3, ST-9.1 | ST-7.3 export rows distinguish registered, checked-in, timestamp, manual correction marker, safe source/path; ST-9.1 aligns retention/export. | Test export rows for checked-in, not checked-in, manual correction, conference scoping, and unauthorized denial. |

## 11. Full Epic Breakdown

## Epic 1: Production Readiness and Security Foundation

Goal: remove known production blockers and make security/deployment decisions before attendance behavior is exposed to staff.

### Story 1.1: Stabilize Environment and Admin Seed Readiness

As a system operator, I want startup and admin seed behavior to be explicit and reliable, so internal production can be rehearsed without hidden database or account failures.

**Acceptance Criteria:**

**Given** the app starts without `MONGODB_URI`
**When** the server startup path runs
**Then** startup fails clearly with an environment configuration error
**And** no hardcoded remote database fallback is used.

**Given** an operator runs the documented admin seed command
**When** `npm run seed` executes in a configured environment
**Then** the command is syntactically valid and creates or verifies an admin account predictably.

**Tasks/Subtasks:**

- Verify `backend/server.js` and seed scripts require explicit database configuration.
- Fix the documented seed syntax blocker in `backend/config/seedAdmin.js`.
- Remove or neutralize hardcoded remote fallback behavior from seed/admin setup.
- Update docs only if the verified command or environment requirements differ from current docs.

**Testing Notes:**

- Run `node --check backend/config/seedAdmin.js`.
- Run the smallest safe seed verification against a local test database or document why DB verification was not available.
- Confirm `npm run seed` no longer fails from syntax before database access.

**Definition of Done:**

- Environment and seed behavior are explicit.
- No hardcoded production-looking MongoDB fallback remains in the admin seed path.
- The documented admin creation path is usable for internal production rehearsal.

### Story 1.2: Define Admin Authorization and CSRF Guardrails

As a product owner, I want admin mutation security rules fixed before attendance changes, so staff actions cannot be added on top of weak mutation controls.

**Acceptance Criteria:**

**Given** an unauthenticated request targets an attendance mutation route
**When** the request is sent
**Then** the server rejects it with a non-success status
**And** no attendance state changes.

**Given** an authenticated user with a role not allowed to mutate attendance
**When** the user attempts an attendance mutation
**Then** the server rejects it according to the chosen role policy.

**Given** an authenticated browser session sends a mutation without valid CSRF protection
**When** CSRF protection is required for the route
**Then** the mutation is rejected before data changes.

**Given** a user accesses attendance counts, participant-level attendance, evidence inspection, export, QR generation, Network Verification configuration, attendance correction, or conference-scoped bulk email
**When** their `User.userRole` is evaluated
**Then** access follows the Role Authorization Matrix in section 8 or a product-owner-approved replacement matrix.

**Tasks/Subtasks:**

- Decide which `User.userRole` values may view, create, and correct attendance.
- Decide which `User.userRole` values may view attendance counts, view participant-level attendance, inspect evidence, export attendance, generate Attendance QR, configure Network Verification, and send conference-scoped bulk email.
- Add or document the admin mutation CSRF mechanism to use in later attendance routes.
- Define reusable authorization checks for attendance mutations.
- Define reusable authorization checks for attendance reads, exports, QR generation, Network Verification configuration, and bulk-email actions.
- Keep existing admin pages working while hardening new attendance behavior.

**Testing Notes:**

- Add focused route or middleware tests for unauthenticated, unauthorized, and missing-CSRF mutation attempts.
- Add permission matrix tests for counts, participant-level list, evidence inspection, export, QR generation, Network Verification configuration, correction, and conference-scoped bulk email.
- Include a positive-path authorized mutation test once ST-7.1 creates the route.

**Definition of Done:**

- Role and CSRF requirements are explicit for read, export, generation, configuration, mutation, and email surfaces.
- Later attendance mutation stories have a security contract to implement against.

### Story 1.3: Resolve QR Token Deployment Strategy and Base URL Behavior

As a system operator, I want token validation to match the event-day deployment mode, so valid QR scans do not fail across PM2 workers.

**Acceptance Criteria:**

**Given** production uses more than one Node process
**When** an Attendance QR is generated by one worker and validated by another
**Then** the selected token strategy either validates successfully or the deployment is explicitly constrained to avoid cross-worker validation.

**Given** the app generates an Attendance QR behind a deployed base URL
**When** `BASE_URL` is configured
**Then** the QR check-in URL uses that base URL consistently.

**Given** no production-safe token strategy has been selected
**When** implementation planning reaches token validation
**Then** the story is blocked as Decision Required rather than silently relying on process-local memory.

**Tasks/Subtasks:**

- Decide between shared token store, stateless signed token, sticky routing, or single-process deployment.
- Preserve the current 30-second QR lifetime unless the product owner changes it explicitly.
- Document the selected token deployment constraint in deployment docs.
- Verify QR base URL behavior with `BASE_URL` and request-derived fallback.

**Testing Notes:**

- Add tests for token validation under the selected strategy.
- Add a configuration test or integration check for `BASE_URL` URL generation.

**Definition of Done:**

- Token validation has a documented production-safe strategy.
- Cluster/process-local risk is either removed or explicitly accepted with deployment constraints.

### Story 1.4: Set Privacy and Observability Baselines

As an operator, I want clear privacy and log boundaries before attendance is exposed, so operational visibility does not leak participant-level data publicly.

**Acceptance Criteria:**

**Given** a public route or public API is requested
**When** attendance data is included in the response
**Then** participant-level attendance data is not exposed.

**Given** a check-in succeeds, duplicates, expires, or is denied by network
**When** the event occurs
**Then** the system has a server-side log or audit record sufficient to diagnose the outcome.

**Tasks/Subtasks:**

- Define which attendance data can appear on public aggregate surfaces.
- Define minimum log/audit fields for success, duplicate, token failure, network denial, and admin correction.
- Ensure later stories use the same privacy vocabulary.

**Testing Notes:**

- Add response-shape checks for public APIs touched by attendance.
- Add log/audit assertions where the chosen implementation makes them testable.

**Definition of Done:**

- Public/private attendance boundary is explicit.
- Required observability outcomes are known before check-in storage is implemented.

## Epic 2: Conference-Scoped Participant Identity and Registration Correctness

Goal: make participant identity reliable per conference before check-in, dashboard, and admin actions depend on it.

### Story 2.1: Correct Participant ID Uniqueness Per Conference

As an admin, I want participant IDs to be unique within each conference, so each event can safely have participant `0001`.

**Acceptance Criteria:**

**Given** two different Conference Codes
**When** the first participant is registered for each conference
**Then** both can receive participant ID `0001`
**And** no global participant ID uniqueness error occurs.

**Given** one Conference Code already has participant ID `0001`
**When** another participant in the same conference would receive `0001`
**Then** the database prevents the duplicate.

**Tasks/Subtasks:**

- Replace global participant ID uniqueness with compound uniqueness on `conferenceCode` and `participantId`.
- Plan index migration for existing MongoDB indexes and seeded data.
- Keep `Counter.getNextSequenceValue(conferenceCode)` as the sequence authority.

**Testing Notes:**

- Add model/integration tests for same ID across different conferences and duplicate ID within one conference.
- Include migration/index verification steps for existing databases.

**Definition of Done:**

- Participant ID behavior matches `backend/docs/PARTICIPANT_ID_SYSTEM.md`.
- Check-in and admin stories can safely reference participant ID only with Conference Code.

### Story 2.2: Align Registration Conference Code Routing

As a participant, I want `/register/:conferenceCode` and `/register?code=CONF` to load the intended conference, so registrations and later check-ins are scoped correctly.

**Acceptance Criteria:**

**Given** a valid active Conference Code in the route parameter
**When** the browser opens `/register/CONF`
**Then** the registration form loads conference `CONF`.

**Given** a valid active Conference Code in the query string
**When** the browser opens `/register?code=CONF`
**Then** the registration form loads conference `CONF`.

**Given** an inactive or unknown Conference Code
**When** registration is requested
**Then** the user sees the correct closed or not-found behavior without falling through to the wrong conference.

**Tasks/Subtasks:**

- Make registration GET and POST consistently resolve Conference Code from route params, query, or body in a defined order.
- Ensure server-side validation uses the resolved Conference Code.
- Preserve the existing active-conference fallback only when no explicit code is supplied.

**Testing Notes:**

- Add tests for route-param registration, query registration, body code registration, inactive conference, and unknown conference.
- Regression-test duplicate detection with `email + conferenceCode`.

**Definition of Done:**

- Registration is conference-scoped at entry, validation, duplicate detection, and persistence.

### Story 2.3: Preserve Duplicate and Ambiguous Identity Safety

As reception staff, I want duplicate and ambiguous identity cases surfaced clearly, so check-in never marks the wrong person present.

**Acceptance Criteria:**

**Given** two participants in different conferences share an email
**When** either participant registers or is looked up
**Then** lookup remains scoped by Conference Code.

**Given** multiple participants in the same conference match a staff identity search
**When** check-in identity resolution runs
**Then** the system returns an ambiguous state and requires disambiguation.

**Given** a participant is already registered in one conference
**When** the same email registers in another conference
**Then** registration is allowed if the conference differs.

**Tasks/Subtasks:**

- Define check-in identity match fields after the product identity decision.
- Ensure every identity lookup includes Conference Code.
- Return not-found and ambiguous states separately from success.

**Testing Notes:**

- Add regression tests for same email across conferences.
- Add ambiguous lookup tests for duplicate names, phones, or chosen identity input.

**Definition of Done:**

- No identity path silently chooses among multiple possible participants.

### Story 2.4: Keep Thank-you Confirmation Bound to Persisted Participant

As a participant, I want the thank-you page to show my exact registration and event, so confirmation details are trustworthy.

**Acceptance Criteria:**

**Given** a participant registers for Conference Code `CONF`
**When** `/thankyou` renders after redirect
**Then** it reloads the persisted participant by stable session key
**And** resolves the conference from the participant's `conferenceCode`.

**Given** two participants share an email across conferences
**When** either participant opens `/thankyou` immediately after registration
**Then** the page does not show the other participant or the latest conference by mistake.

**Tasks/Subtasks:**

- Keep session data as a pointer to persisted state, not the source of truth.
- Use the existing thank-you view model service pattern.
- Preserve deferred decision for bookmarkable/sessionless confirmation URLs.

**Testing Notes:**

- Keep or add tests for same-email cross-conference identity, participant-conference details, and registration ID display.

**Definition of Done:**

- Confirmation data correctness remains protected while attendance work proceeds.

## Epic 3: Attendance QR Issuance and Token Validation

Goal: make the Attendance QR a safe entry point for check-in rather than a registration shortcut.

### Story 3.1: Generate Attendance QR Only for Valid Conference Codes

As staff, I want Attendance QR generation to be scoped to one known conference, so scans cannot start from unknown event codes.

**Acceptance Criteria:**

**Given** a valid selected Conference Code
**When** staff requests `/api/attendance-qr?code=CONF`
**Then** the response contains a check-in URL scoped to `CONF`, a QR image, token metadata, and expiry information.

**Given** an unknown Conference Code
**When** staff requests an Attendance QR
**Then** the API returns a non-success response
**And** no usable token is issued.

**Given** the current product decision is unchanged
**When** an Attendance QR is generated
**Then** the TTL remains 30 seconds.

**Given** a user requests Attendance QR generation
**When** the user's role is not allowed by the Role Authorization Matrix
**Then** the request is rejected and no usable token is issued.

**Tasks/Subtasks:**

- Validate `Conference.code` before issuing QR data.
- Enforce the Role Authorization Matrix for QR generation.
- Preserve the 30-second lifetime from `attendanceQrStore.TTL_MS`.
- Return enough expiry metadata for `qrcode.ejs` to refresh correctly.

**Testing Notes:**

- Test valid conference, unknown conference, missing code, authorized role, unauthorized role, and TTL response metadata.

**Definition of Done:**

- Unknown Conference Codes cannot generate Attendance QR.
- QR payloads are explicitly conference-scoped.

### Story 3.2: Validate Tokens Before Any Attendance Action

As reception staff, I want expired or mismatched tokens blocked before check-in, so attendance cannot be recorded from stale scans.

**Acceptance Criteria:**

**Given** a valid unexpired token for Conference Code `CONF`
**When** `/qr/checkin?token=...&code=CONF` is requested
**Then** the request can proceed to participant identity resolution.

**Given** an expired, missing, unknown, or conference-mismatched token
**When** `/qr/checkin` is requested
**Then** no attendance state is recorded
**And** the response has a clear browser-facing error and non-success status.

**Given** token validation fails
**When** the error is shown
**Then** no participant-level data is leaked.

**Tasks/Subtasks:**

- Apply the selected ST-1.3 token strategy.
- Keep server time as the authority for token freshness.
- Normalize token failure responses for browser and API callers as applicable.

**Testing Notes:**

- Required regression tests: token expiry, missing token, unknown token, mismatched Conference Code.
- Verify no participant lookup runs after token failure.

**Definition of Done:**

- Token validation is authoritative, server-side, conference-scoped, and safe for the chosen deployment mode.

### Story 3.3: Make QR Page Refresh and Failure States Operationally Clear

As staff, I want the QR display and scan failures to be readable under event pressure, so expired QR issues can be corrected quickly.

**Acceptance Criteria:**

**Given** the QR page is open
**When** a QR token approaches expiry
**Then** the page refreshes or prompts refresh using server-provided expiry metadata.

**Given** a scan fails because the token expired
**When** the browser shows the error state
**Then** the message explains that staff should rescan the current QR
**And** the message has a clear heading, visible text label, and screen-reader-friendly status text where practical
**And** the message is readable without relying only on color.

**Tasks/Subtasks:**

- Review `frontend/views/qrcode.ejs` expiry behavior.
- Align copy for expired, unknown, and mismatched token states.
- Align browser-facing failure states with Architecture Spine AD-17.
- Keep QR page behavior compatible with existing static `/api/qrcode` registration QR behavior.

**Testing Notes:**

- Add view or route tests where feasible; otherwise document manual browser checks for expiry and refresh.
- Include accessibility checks for expired, unknown, and mismatched token states.

**Definition of Done:**

- Staff can recover from expired QR scans without developer help.

## Epic 4: Participant Identity Resolution and Check-in Recording

Goal: turn a valid QR scan into one persisted participant attendance state with clear failure paths.

### Story 4.1: Resolve Exactly One Participant After Valid QR

As reception staff, I want to identify the participant after QR validation, so attendance is recorded for the correct registration.

**Acceptance Criteria:**

**Given** token validation succeeds
**When** the scan reaches identity resolution
**Then** the system requests or receives the chosen participant identity input.

**Given** exactly one participant in the scanned Conference Code matches the input
**When** resolution runs
**Then** the check-in flow can proceed with that participant.

**Given** no participants or multiple participants match
**When** resolution runs
**Then** attendance is not recorded and the user sees not-found or ambiguous state.

**Tasks/Subtasks:**

- Decision Required: choose v1 identity input, such as email, phone, participant ID plus Conference Code, admin-selected participant, or registration confirmation artifact.
- Implement lookup scoped by Conference Code.
- Keep identity failure messages privacy-safe.

**Testing Notes:**

- Required regression tests: ambiguous participant lookup, not-found lookup, conference-scoped participant ID lookup.

**Definition of Done:**

- Check-in cannot proceed without exactly one resolved participant.

### Story 4.2: Persist Attendance State Before Success

As a participant, I want check-in success to mean attendance was saved, so the success screen and admin dashboard are truthful.

**Acceptance Criteria:**

**Given** a valid token and resolved participant
**When** check-in completes
**Then** the participant's attendance state is persisted as checked in
**And** a check-in timestamp is saved before success is rendered.

**Given** persistence fails
**When** the check-in request completes
**Then** the user does not see success
**And** the failure is diagnosable.

**Given** a successful check-in is rendered in a browser
**When** staff or participant reads the result
**Then** the success state has a clear heading, visible text label, and screen-reader-friendly status text where practical
**And** success is not communicated by color alone.

**Given** 4 concurrent reception desks process one valid check-in every 10 seconds for 10 minutes
**When** the check-in route persists state and evidence
**Then** at least 95% of successful check-ins complete within 2 seconds
**And** server-side non-validation errors stay under 1%.

**Tasks/Subtasks:**

- Add or confirm fields for attendance boolean/status and check-in timestamp.
- Persist state with a query scoped to participant and Conference Code.
- Ensure success response happens only after database write completes.
- Render success with accessible state text consistent with Architecture Spine AD-17.
- Keep implementation compatible with Architecture Spine AD-18 performance target.

**Testing Notes:**

- Test successful persistence, database failure behavior if mockable, and no success before save.
- Test or manually verify accessible success text.
- Include the normal internal load target from Architecture Spine AD-18: 4 desks for 10 minutes, p95 successful check-in latency under 2 seconds, non-validation errors under 1%.

**Definition of Done:**

- Attendance success is never reported before persisted state changes.

### Story 4.3: Handle Duplicate, Not-found, and Ambiguous Check-in Outcomes

As reception staff, I want each non-success check-in state to be distinct, so I can take the right next action.

**Acceptance Criteria:**

**Given** a participant is already checked in
**When** the same participant checks in again
**Then** the system shows a duplicate check-in state
**And** does not create conflicting attendance state.

**Given** identity lookup finds no participant
**When** the staff submits identity input
**Then** the system shows a not-found state without revealing unrelated participant data.

**Given** identity lookup is ambiguous
**When** the staff submits identity input
**Then** the system requires disambiguation rather than selecting one match silently.

**Given** duplicate, not-found, or ambiguous states are rendered in a browser
**When** staff or participant reads the result
**Then** each state has a distinct heading, visible text label, next-action copy, and screen-reader-friendly status text where practical
**And** no state relies on color alone.

**Tasks/Subtasks:**

- Define duplicate behavior as idempotent success or explicit duplicate state.
- Add distinct status codes or view states for duplicate, not-found, and ambiguous outcomes.
- Ensure all messages are readable without color-only cues and satisfy Architecture Spine AD-17.

**Testing Notes:**

- Required regression tests: duplicate check-in, ambiguous lookup, not-found lookup.
- Add view/browser assertions or documented manual checks for headings, text labels, and non-color-only state communication.

**Definition of Done:**

- Failure and duplicate states are distinct, privacy-safe, and do not corrupt attendance state.

### Story 4.4: Preserve Check-in Event Evidence

As an organizer, I want check-in evidence retained through reporting, so post-event attendance can be reconciled.

**Acceptance Criteria:**

**Given** a check-in succeeds
**When** audit evidence is inspected
**Then** the evidence includes participant, Conference Code, timestamp, and check-in path.

**Given** a duplicate, token failure, or network denial occurs
**When** operational logs are inspected
**Then** the outcome is diagnosable without exposing sensitive data publicly.

**Tasks/Subtasks:**

- Decide whether v1 stores successful check-in events in Participant fields, a separate collection, or both.
- Capture check-in path and timestamp.
- Define retention through post-event reporting.

**Testing Notes:**

- Test successful evidence fields.
- Add log/audit checks for duplicate and denial paths where feasible.

**Definition of Done:**

- Successful check-ins can be traced for internal reporting.

## Epic 5: Network Verification and IP Whitelist Enforcement

Goal: enforce venue network rules for check-in using the existing IP filter capability and explicit proxy assumptions.

### Story 5.1: Define Trusted Proxy and Allowed Network Configuration

As an operator, I want a clear network trust boundary, so IP filtering cannot be bypassed by spoofed headers.

**Acceptance Criteria:**

**Given** the app is behind a trusted reverse proxy
**When** IP filtering reads client IP
**Then** the trusted proxy behavior is documented and configured.

**Given** the app is directly exposed
**When** `x-forwarded-for` is supplied by a client
**Then** the system does not blindly trust spoofable headers for security decisions.

**Given** a user attempts to configure allowed network ranges or trusted proxy behavior
**When** their role is not allowed by the Role Authorization Matrix
**Then** configuration is rejected and the prior Network Verification policy remains active.

**Tasks/Subtasks:**

- Define deployment trust boundary for `x-forwarded-for`.
- Define allowlist source, such as environment variable or config.
- Enforce the Role Authorization Matrix for Network Verification configuration.
- Preserve existing support for exact IPs and IPv4 CIDR ranges.

**Testing Notes:**

- Extend existing `ipFilter` tests for trusted proxy assumptions if code changes.
- Test unauthorized Network Verification configuration attempts if configuration becomes runtime-editable.
- Confirm default allowed ranges still support local development.

**Definition of Done:**

- Network filtering has an explicit trust boundary and configurable allowlist.

### Story 5.2: Enforce Network Verification for Check-in

As an event operator, I want off-network check-ins blocked, so attendance can only be recorded from allowed venue networks.

**Acceptance Criteria:**

**Given** a check-in request comes from an allowed IP range
**When** token and identity validation also pass
**Then** the request can record attendance.

**Given** a check-in request comes from a denied IP range
**When** the request reaches the server
**Then** no attendance state is recorded
**And** browser requests show an access-denied page while API requests receive structured 403 JSON.

**Given** a denied browser request is rendered
**When** staff or participant reads the page
**Then** the denied state has a clear heading, visible text label, next-action copy, and screen-reader-friendly status text where practical
**And** denial is not communicated by color alone.

**Tasks/Subtasks:**

- Mount IP filtering on check-in routes before attendance mutation.
- Keep token and identity checks from running after a network denial.
- Ensure denial messages are clear and satisfy Architecture Spine AD-17.

**Testing Notes:**

- Required regression test: denied network cannot record attendance.
- Reuse existing IP filter middleware test patterns.
- Include an accessibility check or documented manual browser check for the denied state.

**Definition of Done:**

- Check-in cannot succeed outside allowed networks.

### Story 5.3: Make Registration Network Enforcement Configurable

As a product owner, I want registration network enforcement configurable, so offsite pre-registration can remain allowed when needed.

**Acceptance Criteria:**

**Given** a conference allows offsite registration
**When** a participant registers from outside the venue network
**Then** registration can proceed if all registration validations pass.

**Given** a conference requires onsite registration
**When** a participant registers from a denied network
**Then** registration is blocked server-side.

**Tasks/Subtasks:**

- Decision Required: choose global or per-conference registration network enforcement.
- Mount IP filter on registration only under the chosen setting.
- Document operator setup for event-day configuration.

**Testing Notes:**

- Test registration allowed/denied behavior for both configuration states.

**Definition of Done:**

- Check-in enforcement is required; registration enforcement is configurable and server-authoritative.

## Epic 6: Realtime Attendance Dashboard

Goal: show accurate persisted attendance counts by conference and update operations views after check-in.

### Story 6.1: Add Persisted Attendance Counts by Conference

As an admin, I want attendance counts by selected conference, so I can monitor event-day status.

**Acceptance Criteria:**

**Given** a selected Conference Code
**When** the admin dashboard loads attendance stats
**Then** it shows total registered, checked-in, and not-yet-checked-in counts for that conference.

**Given** attendance state changes in the database
**When** the dashboard refreshes
**Then** counts are derived from persisted Participant attendance state.

**Given** a user requests attendance counts
**When** their role is not allowed by the Role Authorization Matrix
**Then** the count endpoint or page denies access without exposing participant-level data.

**Tasks/Subtasks:**

- Extend or add an admin stats API for attendance counts.
- Scope all counts by Conference Code.
- Enforce the Role Authorization Matrix for attendance count views.
- Keep existing registration/logistics counts intact.

**Testing Notes:**

- Test count math for zero participants, all absent, some checked in, and all checked in.
- Test authorized and unauthorized attendance count access.

**Definition of Done:**

- Admin attendance counts match persisted participant records.

### Story 6.2: Emit Conference-Scoped Realtime Attendance Updates

As an admin, I want check-in updates to appear without refresh, so the dashboard is useful during live events.

**Acceptance Criteria:**

**Given** a check-in succeeds for Conference Code `CONF`
**When** the attendance state is persisted
**Then** the server emits a realtime payload including `conferenceCode: "CONF"` and updated attendance counts.

**Given** a dashboard is viewing another conference
**When** it receives the realtime payload
**Then** it ignores the update.

**Tasks/Subtasks:**

- Emit Socket.IO updates only after attendance persistence succeeds.
- Include Conference Code and attendance counts in payload.
- Preserve existing `statsUpdated` behavior or introduce a clearly documented attendance event.

**Testing Notes:**

- Test payload shape at the controller/service level where feasible.
- Manual Socket.IO verification may be needed for browser behavior.

**Definition of Done:**

- Realtime updates are conference-scoped and persistence-backed.

### Story 6.3: Provide Refresh or Polling Fallback

As an admin, I want dashboard counts to recover after realtime disconnects, so operations can continue during temporary Socket.IO issues.

**Acceptance Criteria:**

**Given** Socket.IO is disconnected
**When** the admin manually refreshes or polling runs
**Then** attendance counts match persisted database state.

**Given** realtime and refreshed counts disagree
**When** the dashboard refreshes
**Then** persisted counts become the displayed authority.

**Tasks/Subtasks:**

- Reuse existing dashboard refresh patterns.
- Add or confirm manual refresh for attendance counts.
- Consider polling only if manual refresh is insufficient.

**Testing Notes:**

- Test API response and client update logic if code is touched.
- Manual browser check for disconnect/refresh behavior.

**Definition of Done:**

- Dashboard correctness does not depend solely on Socket.IO delivery.

### Story 6.4: Keep Public Dashboard Attendance Privacy Safe

As a product owner, I want public surfaces to avoid participant attendance details, so operational data remains private.

**Acceptance Criteria:**

**Given** a public dashboard or public stats API is requested
**When** attendance data is returned
**Then** no participant-level attendance data appears.

**Given** aggregate attendance is considered for public display
**When** no explicit product approval exists
**Then** aggregate attendance remains admin-only.

**Tasks/Subtasks:**

- Audit `/dashboard`, `/api/stats`, and related public routes.
- Keep participant-level attendance behind authenticated admin routes.
- Mark public aggregate attendance as Decision Required if requested.

**Testing Notes:**

- Add public API response-shape tests for absence of participant-level attendance.

**Definition of Done:**

- Public attendance exposure is deliberately limited and test-covered.

## Epic 7: Admin Attendance Management and Route Alignment

Goal: make the admin attendance UI and backend agree before staff use it for corrections.

### Story 7.1: Register Secure Admin Attendance Mutation Route

As an authorized admin, I want a real backend route for attendance correction, so UI actions persist changes safely.

**Acceptance Criteria:**

**Given** an authorized admin submits an attendance correction for a participant and Conference Code
**When** the request passes CSRF validation
**Then** the server persists the attendance state and returns success.

**Given** the request is unauthenticated, unauthorized, missing CSRF, or missing Conference Code
**When** the route is called
**Then** the server rejects it and does not mutate attendance.

**Given** a correction changes attendance state
**When** the change is persisted
**Then** the evidence records participant, Conference Code, timestamp, actor/source when available, and correction path.

**Tasks/Subtasks:**

- Add a registered route matching the chosen admin API shape.
- Require participant identity plus Conference Code where uniqueness depends on both.
- Apply ST-1.2 auth, authorization, and CSRF guardrails.
- Capture manual correction evidence according to Architecture Spine AD-9 and AD-11.
- Emit dashboard update after successful admin correction if needed.

**Testing Notes:**

- Required regression test: admin attendance mutation.
- Test unauthorized role, unauthenticated, missing CSRF, wrong conference, success, duplicate/no-op changes, and correction evidence fields.

**Definition of Done:**

- Admin attendance correction works through a registered, secured backend route.

### Story 7.2: Align Admin Dashboard UI With Attendance State Vocabulary

As an admin, I want dashboard buttons and labels to match backend state, so I can trust what the UI shows.

**Acceptance Criteria:**

**Given** participant attendance is stored as the selected backend state
**When** the admin dashboard renders participant rows
**Then** labels and buttons use the same vocabulary as the backend.

**Given** the dashboard calls an attendance endpoint
**When** the endpoint is missing or disabled
**Then** the UI does not expose a broken action.

**Tasks/Subtasks:**

- Align `attendance`, `attendanceStatus`, checked-in, absent, and duplicate vocabulary.
- Remove or disable broken controls until routes exist.
- Keep participant-level attendance visible only on authenticated admin surfaces.

**Testing Notes:**

- Add focused view/client tests if available; otherwise document browser verification.
- Verify no call remains to an unregistered attendance route.

**Definition of Done:**

- Admin UI actions map to real routes and real persisted state.

### Story 7.3: Include Attendance State in Admin Export

As an organizer, I want exports to distinguish registered and checked-in participants, so reporting uses event-day evidence.

**Acceptance Criteria:**

**Given** an admin exports participants for a Conference Code
**When** the export is generated
**Then** each row distinguishes registered from checked-in participants
**And** includes check-in timestamp when available.

**Given** a participant has not checked in
**When** the export is generated
**Then** the row clearly shows not checked in without implying absence was manually confirmed.

**Given** an export includes attendance evidence fields
**When** rows are generated
**Then** each row distinguishes registration status from attendance status
**And** includes safe check-in timestamp, check-in path, manual correction marker, and actor/source when available.

**Given** a user requests attendance export
**When** their role is not allowed by the Role Authorization Matrix
**Then** the export is denied and no participant-level attendance file is produced.

**Tasks/Subtasks:**

- Extend existing admin export data shape.
- Scope exports by Conference Code.
- Enforce the Role Authorization Matrix for exports.
- Include safe evidence fields from Architecture Spine AD-16.
- Preserve existing registration/logistics fields.

**Testing Notes:**

- Add export data tests for checked-in and not-yet-checked-in participants.
- Test conference scoping, unauthorized export denial, manual correction markers, and safe evidence fields.

**Definition of Done:**

- Post-event exports can support attendance reconciliation.

### Story 7.4: Provide Admin Attendance List, Filters, and Evidence Inspection

As an event admin, I want a conference-scoped attendance list with filters and evidence inspection, so I can operate the event without relying only on aggregate counts.

**Acceptance Criteria:**

**Given** an authorized user opens the admin attendance list for Conference Code `CONF`
**When** the list loads
**Then** it shows participant-level attendance state only for `CONF`
**And** it does not include participants from other conferences.

**Given** the attendance list is displayed
**When** the admin filters by checked-in, not checked-in, duplicate, or manually corrected where those states exist
**Then** the list updates to only participants matching the selected state
**And** the unfiltered total remains available for reconciliation.

**Given** a user inspects check-in evidence for a participant
**When** their role is allowed by the Role Authorization Matrix
**Then** the evidence shows participant identifier, Conference Code, timestamp, check-in path, and actor/source when available
**And** sensitive values are redacted or omitted according to the audit/logging policy.

**Given** a user requests participant-level attendance or evidence inspection
**When** their role is not allowed by the Role Authorization Matrix
**Then** the request is denied without exposing participant-level attendance data.

**Tasks/Subtasks:**

- Add or align an admin attendance read API scoped by Conference Code.
- Add filters for checked-in, not checked-in, duplicate, and manually corrected states where applicable.
- Expose safe evidence fields from Architecture Spine AD-9 and AD-10.
- Apply the Role Authorization Matrix to participant-level list and evidence inspection.
- Keep public dashboard and public stats free of participant-level attendance data.

**Testing Notes:**

- Test Conference Code scoping with participants in at least two conferences.
- Test each supported filter state and unfiltered totals.
- Test authorized and unauthorized role access for participant-level list and evidence inspection.
- Test evidence fields include participant, conferenceCode, timestamp, check-in path, and actor/source when available while omitting unsafe PII.

**Definition of Done:**

- Admins can inspect participant-level attendance state and evidence through a secured, conference-scoped read model.

## Epic 8: Conference-Scoped Bulk Email Decision or UI Removal

Goal: remove the mismatch where the dashboard implies conference-scoped bulk email but the backend only supports all-unsent participants.

### Story 8.1: Decide MVP Bulk Email Scope

As a product owner, I want a clear decision on conference-scoped bulk email, so MVP does not accidentally email the wrong audience.

**Acceptance Criteria:**

**Given** the admin dashboard exposes conference-specific bulk email
**When** MVP scope is reviewed
**Then** the product owner chooses either implement scoped email or remove/defer the UI action.

**Given** no decision has been made
**When** development reaches bulk email work
**Then** the implementation is blocked as Decision Required.

**Tasks/Subtasks:**

- Choose one path: implement ST-8.2 or remove/defer via ST-8.3.
- Document why the non-selected path is out of MVP.

**Testing Notes:**

- No code test required for the decision story.
- Later implementation story must verify no all-participant behavior is reused silently.

**Definition of Done:**

- Bulk email scope is explicit and assigned to an implementation path.

### Story 8.2: Implement Conference-Scoped Bulk Email If Included

As an admin, I want bulk email limited to the selected Conference Code, so only the intended participants receive messages.

**Acceptance Criteria:**

**Given** Conference Code `CONF` is selected
**When** the admin sends bulk email for that conference
**Then** emails are sent only to participants in `CONF` that match the selected send criteria.

**Given** participants in other conferences have `emailSent: false`
**When** conference-scoped bulk email runs for `CONF`
**Then** those other participants are not emailed.

**Given** a user requests conference-scoped bulk email
**When** their role is not allowed by the Role Authorization Matrix or the browser mutation lacks CSRF protection
**Then** no email is sent.

**Tasks/Subtasks:**

- Register `POST /admin/api/conferences/:conferenceCode/send-bulk-emails` or chosen equivalent.
- Scope recipient query by Conference Code.
- Apply auth, authorization, and CSRF guardrails.
- Apply the Role Authorization Matrix for conference-scoped bulk email.
- Return counts and failures clearly.

**Testing Notes:**

- Test recipients are conference-scoped.
- Test unauthorized role, unauthenticated, missing-CSRF behavior, and conference-scoped recipient selection.

**Definition of Done:**

- The dashboard's conference-scoped email action has a safe matching backend route.

### Story 8.3: Remove or Disable Conference Bulk Email UI If Deferred

As a product owner, I want deferred email actions hidden, so admins do not trigger broken or misleading behavior.

**Acceptance Criteria:**

**Given** conference-scoped bulk email is out of MVP
**When** the admin dashboard renders
**Then** the conference-scoped bulk-email action is removed or disabled with clear copy.

**Given** old all-participant bulk email remains
**When** it is used
**Then** the UI does not imply it is filtered by selected conference.

**Tasks/Subtasks:**

- Remove calls to missing `POST /admin/api/conferences/:conferenceCode/send-bulk-emails`.
- Preserve or label legacy all-unsent-participants behavior accurately if retained.

**Testing Notes:**

- Verify no frontend call remains to the missing route.
- Browser-check the dashboard action state.

**Definition of Done:**

- MVP does not expose a broken or misleading conference bulk-email action.

## Epic 9: Audit Evidence, Export, Observability, and Regression Testing

Goal: prove the MVP is ready for a controlled internal production event.

### Story 9.1: Define Attendance Evidence and Retention Policy

As an organizer, I want attendance evidence retained long enough for reporting, so post-event reconciliation is possible.

**Acceptance Criteria:**

**Given** an event has ended
**When** an admin reviews attendance records
**Then** successful check-ins remain available through the agreed reporting period.

**Given** exports are generated
**When** attendance fields are included
**Then** registered and checked-in states are distinguishable.

**Tasks/Subtasks:**

- Decision Required: define retention duration and owner.
- Align Participant fields, check-in event evidence, and export data.
- Document data retention in deployment or operations docs.

**Testing Notes:**

- Verify retention fields exist and exports include required evidence.

**Definition of Done:**

- Attendance evidence can support internal reporting after the event.

### Story 9.2: Build Required Regression Test Suite

As a developer, I want regression tests for the high-risk attendance paths, so later stories do not silently break core correctness.

**Acceptance Criteria:**

**Given** the regression suite runs
**When** it reaches attendance tests
**Then** it covers token expiry, denied network, duplicate check-in, ambiguous participant lookup, conference-scoped participant IDs, admin attendance mutation, dashboard count consistency, and thank-you identity correctness.

**Given** any required regression fails
**When** a story is marked done
**Then** the story cannot be accepted until the failure is addressed or explicitly deferred.

**Tasks/Subtasks:**

- Add focused Jest tests in `__tests__/`.
- Prefer module/controller tests before broad server tests.
- Keep existing `ipFilter` and `totp` coverage intact.

**Testing Notes:**

- Run `npm test` when implementation touches tested modules.
- Use `node --check` for syntax-sensitive files when full tests are not possible.

**Definition of Done:**

- The required regression areas are automated or explicitly documented if a browser-only check is required.

### Story 9.3: Add Operational Logging for Check-in Outcomes

As an operator, I want check-in outcomes diagnosable from logs or audit records, so event-day failures can be triaged quickly.

**Acceptance Criteria:**

**Given** a check-in succeeds, duplicates, expires, mismatches Conference Code, or is denied by network
**When** the outcome occurs
**Then** the system records enough non-sensitive context to diagnose it.

**Given** logs are reviewed
**When** participant-level data is not needed
**Then** sensitive fields such as full email or phone are not exposed unnecessarily.

**Tasks/Subtasks:**

- Define safe log fields and redaction rules.
- Record outcome, Conference Code, route, timestamp, and coarse reason.
- Avoid logging secrets or token values.

**Testing Notes:**

- Add log spy tests where feasible.
- Manual review log output during event rehearsal.

**Definition of Done:**

- Operators can distinguish success, duplicate, token failure, and denied-network failures.

### Story 9.4: Run Event-Day Readiness Rehearsal

As an operator, I want a rehearsal checklist, so internal production starts only after critical flows are proven.

**Acceptance Criteria:**

**Given** a rehearsal conference exists
**When** staff runs the checklist
**Then** valid check-in, expired token, denied network, duplicate check-in, ambiguous identity, admin correction, dashboard refresh, realtime update, and export are verified.

**Given** the event-day load rehearsal runs
**When** 4 concurrent reception desks process one valid check-in every 10 seconds for 10 minutes plus a 60-second burst at twice that rate
**Then** at least 95% of successful check-ins complete within 2 seconds
**And** server-side non-validation errors stay under 1%
**And** persisted attendance counts match completed check-ins after dashboard refresh.

**Given** any critical rehearsal check fails
**When** launch readiness is assessed
**Then** MVP is not marked ready until the failure is fixed or explicitly accepted by the product owner.

**Tasks/Subtasks:**

- Create a short rehearsal checklist tied to stories.
- Verify allowed and denied network behavior.
- Verify dashboard consistency after refresh and realtime updates.
- Run or simulate the reception-desk burst scenario from Architecture Spine AD-18.
- Capture unresolved decisions before launch.

**Testing Notes:**

- Manual browser and API walkthrough is expected.
- Record commands, accounts, Conference Code, and observed result.
- Record load scenario parameters, p95 latency, error rate, and persisted-count reconciliation result.

**Definition of Done:**

- Internal production launch has concrete verification evidence, not only passing unit tests.

## 12. Risks and Unresolved Decisions

### Risks

- Process-local QR tokens can fail in PM2 cluster mode.
- Participant ID indexes can block per-conference `0001` behavior until migrated.
- A shared Attendance QR does not identify a participant without an explicit identity step.
- Admin attendance routes are unsafe unless authentication, authorization, and CSRF are addressed.
- IP filtering can be bypassed if spoofable forwarding headers are trusted without a proxy boundary.
- Public dashboards must not drift into participant-level attendance exposure.
- Broken seed/admin setup can block internal production rehearsal.

### Decision Required

- QR token strategy for production: shared store, stateless signed token, sticky routing, or single-process event-day deployment.
- Participant identity input for v1 check-in after QR validation.
- Which `User.userRole` values may view, create, or correct attendance.
- CSRF implementation for admin mutation routes.
- Whether registration, in addition to check-in, is venue-network restricted.
- Whether public dashboard may show aggregate attendance.
- Whether conference-scoped bulk email is included or removed from MVP.
- Attendance/check-in evidence retention duration.
- Whether thank-you confirmation should work after session loss through a signed URL.

## 13. First Sprint Recommendation

Recommended first sprint stories:

1. ST-1.1 Stabilize Environment and Admin Seed Readiness.
2. ST-1.2 Define Admin Authorization and CSRF Guardrails.
3. ST-1.3 Resolve QR Token Deployment Strategy and Base URL Behavior.
4. ST-2.1 Correct Participant ID Uniqueness Per Conference.
5. ST-2.2 Align Registration Conference Code Routing.

Reason: these stories remove launch blockers and identity/deployment contradictions before check-in recording is implemented. Starting check-in first would create attendance behavior on top of unresolved token, participant ID, route-scope, and admin mutation risks.

## 14. Final Self-Check

- All FR-1 through FR-14 are mapped in section 10 with epic, story, acceptance-criteria coverage, and test notes.
- All NFR-1 through NFR-17 are mapped in section 10 with epic, story, acceptance-criteria coverage, and test notes.
- Every story includes Given/When/Then acceptance criteria.
- Every story includes tasks/subtasks, testing notes, and Definition of Done.
- Required QA regressions are explicitly covered: token expiry, denied network, duplicate check-in, ambiguous participant lookup, conference-scoped participant IDs, admin attendance mutation, dashboard count consistency, and thank-you identity correctness.
- The current 30-second Attendance QR lifetime is preserved unless changed by explicit product decision.
- Unknown Conference Codes cannot generate Attendance QR in the planned QR story.
- Check-in success is blocked until Attendance State is persisted.
- Participant lookup is always scoped by Conference Code.
- Ambiguous identity matches are never silently selected.
- Duplicate check-ins cannot create conflicting attendance state.
- Realtime payloads must include Conference Code.
- Public surfaces do not expose participant-level attendance data.
- Admin mutations require authentication, authorization, and CSRF guardrails before production.
- Process-local token memory is not accepted silently for multi-process deployment.
- All-participant bulk email is not silently reused for conference-scoped bulk email.
- No template placeholder tokens remain.
