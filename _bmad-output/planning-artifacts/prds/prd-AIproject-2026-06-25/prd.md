---
title: Dynamic QR Attendance and Check-in
status: draft
created: 2026-06-25
updated: 2026-06-25
---

# PRD: Dynamic QR Attendance and Check-in

## 0. Document Purpose

This PRD defines the internal-production requirements for completing dynamic QR attendance and check-in in the existing Conference Registration System. It is intended for product owners, implementers, testers, and downstream BMAD workflows that will create UX, architecture, and implementation stories. Requirements are grouped by capability with stable FR IDs, testable consequences, open questions, and indexed assumptions. Existing repository documentation is treated as source context; this PRD does not duplicate implementation design.

## 1. Vision

The current system handles event registration, participant storage, confirmation email, admin dashboards, QR entry points, and realtime registration statistics. The intended operating model goes further: on event day, staff should be able to use a dynamic QR flow to verify that a person is present at the event location, identify the registered participant, record the check-in, and update operational dashboards in realtime.

The v1 product outcome is a reliable internal attendance workflow for conferences: registration remains the source of participant identity, the dynamic QR becomes an attendance gate rather than a registration shortcut, and admins can trust the dashboard as an event-day status view. The system should reduce manual attendance tracking while keeping the flow simple enough for reception staff and participants under event pressure.

Because this is for internal production use, correctness, auditability, and operational resilience matter more than novelty. The product should be robust under normal event-day load, clear when a scan fails, and explicit about what was checked, when it happened, and by whom or by what route. [ASSUMPTION: Internal production means controlled organizational events, not a public SaaS check-in platform.]

## 2. Target User

### 2.1 Jobs To Be Done

- As reception staff, I need to check in registered participants quickly so entry does not become a queue.
- As an event admin, I need accurate attendance counts and participant attendance status so I can manage logistics during the event.
- As an organizer, I need attendance evidence after the event so reporting is based on actual presence, not registrations.
- As a participant, I need a clear scan/check-in experience so I know whether I am accepted, already checked in, or blocked.
- As a system operator, I need QR and network verification to behave predictably across deployment modes so event-day failures are diagnosable.

### 2.2 Non-Users (v1)

- External event organizers using the system as a self-service SaaS product.
- Anonymous walk-in attendees who are not represented by a Participant record.
- Third-party ticketing systems or hardware turnstiles.

### 2.3 Key User Journeys

- **UJ-1. Linh checks in a registered participant at reception.**
  - **Persona + context:** Linh is a receptionist working the check-in desk during a conference opening rush.
  - **Entry state:** Linh or the participant has access to the current event's Attendance QR on a web surface.
  - **Path:** The QR is scanned, the system validates token freshness and Conference Code, the participant identity is resolved, and the check-in is recorded.
  - **Climax:** The screen shows that the Participant is checked in for the selected Conference Code, including a clear success state.
  - **Resolution:** Linh can continue with the next participant, and the Admin Dashboard reflects the updated attendance count.
  - **Edge case:** If the Participant was already checked in, the system shows a duplicate check-in state instead of creating a second attendance event.

- **UJ-2. Minh monitors live attendance during the event.**
  - **Persona + context:** Minh is an event admin watching attendance and logistics counts during the event.
  - **Entry state:** Minh is authenticated in the Admin Dashboard and has selected a Conference Code.
  - **Path:** Minh views total registrations, checked-in Participants, not-yet-checked-in Participants, and logistics counts; new check-ins update without a manual page refresh.
  - **Climax:** Minh sees attendance status change shortly after each valid Check-in.
  - **Resolution:** Minh can export or inspect participant-level attendance state for follow-up.
  - **Edge case:** If realtime delivery fails, a manual refresh or polling fallback still shows the latest persisted attendance state. [ASSUMPTION: A polling fallback is acceptable for internal production if Socket.IO delivery is interrupted.]

- **UJ-3. An operator configures event-day network boundaries.**
  - **Persona + context:** Anh is responsible for deploying the app for an internal venue network.
  - **Entry state:** Anh knows the venue network ranges and the deployment mode.
  - **Path:** Anh configures the allowed IP ranges for registration/check-in, confirms the current Conference Code, and verifies that QR generation and QR validation use a shared token mechanism across running workers.
  - **Climax:** A test scan from the allowed network succeeds, and a test scan from a blocked network receives a clear denial.
  - **Resolution:** The operator can treat event-day check-in as production-ready for the venue.

## 3. Glossary

- **Admin Dashboard** - Authenticated operational dashboard used by event admins and staff.
- **Attendance QR** - Expiring QR code that starts the Check-in flow for a specific Conference Code.
- **Attendance State** - Persisted Participant-level state showing whether the Participant has checked in, and when.
- **Check-in** - The act of validating an Attendance QR, resolving a Participant, and recording Attendance State.
- **Check-in Event** - Auditable record of a Check-in attempt or successful Check-in. [ASSUMPTION: v1 requires at least successful Check-in history; failed attempt logging may be limited to operational logs.]
- **Check-in Token** - Short-lived value embedded in an Attendance QR and validated by the server before Check-in can continue.
- **Conference Code** - Four-character uppercase event code that scopes registration, Attendance QR, Participant identity, and dashboard statistics.
- **Network Verification** - Server-side validation that a check-in or registration request comes from an allowed IP address or network range.
- **Participant** - Registered attendee stored in the system and associated with one Conference Code.
- **Public Dashboard** - Public React dashboard at `/dashboard` that currently shows aggregate registration statistics.

## 4. Features

### 4.1 Attendance QR Issuance and Validation

**Description:** The system issues an Attendance QR for a selected Conference Code and validates that a scanned Check-in Token is fresh, scoped to that Conference Code, and safe to use. This upgrades the existing QR behavior from a registration redirect to a controlled Check-in entry point. Realizes UJ-1 and UJ-3.

**Functional Requirements:**

#### FR-1: Generate scoped Attendance QR

Staff can generate an Attendance QR for a selected active Conference Code from the existing QR page or admin-approved surface.

**Consequences (testable):**
- The generated Attendance QR contains a Check-in URL scoped to exactly one Conference Code.
- The Attendance QR expires after the Conference-specific rotation TTL; the default remains 30 seconds.
- The response includes enough expiry information for the QR page to refresh before or at expiry.
- The system does not generate Attendance QR for an unknown Conference Code.
- The system does not generate a valid Attendance QR outside the Conference-specific QR availability window.

#### FR-2: Validate Check-in Token before attendance actions

The system validates the Check-in Token before allowing Check-in to proceed.

**Consequences (testable):**
- A valid, unexpired Check-in Token for the requested Conference Code can proceed to Participant identity resolution.
- An expired, missing, unknown, or Conference Code mismatched Check-in Token cannot record Attendance State.
- Failed token validation returns a clear browser-facing error and an appropriate non-success HTTP status.
- Token validation works consistently in the intended internal production deployment mode. [ASSUMPTION: Production may run more than one Node process, so process-local token memory is not sufficient for the final production design.]

**Feature-specific NFRs:**
- QR validation must not depend on client-side clocks for authority.
- QR validation failures must not leak sensitive Participant data.

### 4.2 Participant Identity and Attendance Recording

**Description:** After a valid Attendance QR scan, the system resolves the Participant and records Attendance State. The exact identity step must be explicit: a scan alone proves QR freshness, not which registered Participant is present. [ASSUMPTION: v1 will identify the Participant by an existing registration-linked field or selected participant record, not by issuing per-participant QR tickets.] Realizes UJ-1.

**Functional Requirements:**

#### FR-3: Resolve Participant for Check-in

The system can resolve one registered Participant within the scanned Conference Code before recording a Check-in.

**Consequences (testable):**
- A Check-in cannot be recorded without a resolved Participant.
- Participant lookup is scoped by Conference Code.
- If no matching Participant exists, the system shows a clear not-found state and does not create Attendance State.
- If multiple Participants could match the submitted identity input, the system requires disambiguation rather than choosing silently.

#### FR-4: Record Attendance State

The system records a successful Check-in against the resolved Participant.

**Consequences (testable):**
- A successful Check-in sets the Participant Attendance State to checked in.
- A successful Check-in records a check-in timestamp.
- A successful Check-in is persisted before the user sees a success state.
- A duplicate Check-in does not create conflicting Attendance State.
- The Check-in result is scoped to the Participant and Conference Code.

#### FR-5: Preserve Check-in Event evidence

The system preserves enough Check-in Event evidence for internal audit and post-event reconciliation.

**Consequences (testable):**
- A successful Check-in can be traced to Participant, Conference Code, timestamp, and check-in path.
- Admin users can inspect or export Participant Attendance State after the event.
- The system can distinguish "registered but not checked in" from "checked in".

### 4.3 Network Verification

**Description:** The existing IP filter capability becomes a product requirement for event-day controls. Network Verification should protect the configured surfaces without relying on browser-only checks. Realizes UJ-3.

**Functional Requirements:**

#### FR-6: Enforce allowed network ranges for check-in

The system enforces configured allowed IP addresses or CIDR ranges for Check-in.

**Consequences (testable):**
- Requests outside allowed ranges cannot record Attendance State.
- Requests inside allowed ranges can proceed if all other Check-in validations pass.
- Denied browser requests show a clear access-denied page.
- Denied API requests return a structured 403 response.

#### FR-7: Apply Network Verification consistently to selected registration/check-in surfaces

The product owner can define which registration and Check-in surfaces require Network Verification.

**Consequences (testable):**
- Check-in enforcement is required for v1.
- Registration enforcement is configurable because some events may allow pre-event offsite registration. [ASSUMPTION: v1 should not globally block all registration unless the event explicitly requires onsite-only registration.]
- The server, not the client, is the authority for Network Verification.

### 4.4 Realtime Attendance Dashboard

**Description:** Admin-facing dashboards should reflect actual Attendance State, not just registration totals. Realtime updates should be driven by successful Check-ins and remain correct after page reload. Realizes UJ-2.

**Functional Requirements:**

#### FR-8: Show attendance counts by Conference Code

The Admin Dashboard shows attendance counts for the selected Conference Code.

**Consequences (testable):**
- The dashboard shows total registered Participants, checked-in Participants, and not-yet-checked-in Participants.
- Counts are scoped to the selected Conference Code.
- Counts are derived from persisted Participant Attendance State, not only in-memory events.

#### FR-9: Update attendance in realtime after successful Check-in

The system emits a realtime update after each successful Check-in.

**Consequences (testable):**
- The Admin Dashboard updates attendance counts without a manual refresh when Socket.IO is connected.
- The realtime payload includes the Conference Code needed to ignore updates for other selected conferences.
- Refreshing the dashboard after a Check-in shows the same persisted counts as the realtime state.

#### FR-10: Manage participant attendance from Admin Dashboard

Authorized admin users can view and correct Participant Attendance State from the Admin Dashboard.

**Consequences (testable):**
- The existing attendance button UI has a matching backend route or is removed from the v1 interface.
- A participant-level attendance update is persisted.
- Admin changes are scoped to the correct Participant and Conference Code.
- Unauthorized or unauthenticated users cannot mutate Attendance State.

### 4.5 Conference-scoped Participant Identity Integrity

**Description:** Check-in depends on reliable Participant identity. The existing participant ID sequence is intended to be per Conference Code, so the product must not allow cross-conference identity conflicts to break Check-in. Realizes UJ-1 and UJ-2.

**Functional Requirements:**

#### FR-11: Treat Participant ID as Conference-scoped

The system treats Participant ID as unique only within a Conference Code.

**Consequences (testable):**
- Two different Conference Codes can each have Participant ID `0001` without conflict.
- A single Conference Code cannot have duplicate Participant IDs.
- Participant lookup and admin operations do not identify a Participant by Participant ID alone when Conference Code is required for uniqueness.

#### FR-12: Protect duplicate registration and duplicate identity cases

The system prevents duplicate or ambiguous Participant identity from producing incorrect Check-ins.

**Consequences (testable):**
- Duplicate registration detection remains scoped by email and Conference Code.
- Check-in lookup does not mark the wrong Participant present when duplicate names or phone numbers exist.
- Ambiguous identity states are surfaced to staff for resolution.

### 4.6 Admin Operations and Email Route Alignment

**Description:** Internal production use requires that Admin Dashboard actions match backend capabilities. Attendance and conference-scoped bulk email routes should either work as shown or be removed/deferred from the UI. Realizes UJ-2.

**Functional Requirements:**

#### FR-13: Align Admin Dashboard attendance API with UI

The Admin Dashboard attendance controls use registered backend routes.

**Consequences (testable):**
- The dashboard does not call an unregistered attendance endpoint.
- Attendance mutation responses include success/failure state that the UI can display.
- The UI uses the same Attendance State vocabulary as the backend.

#### FR-14: Support conference-scoped bulk email or remove the implied action

The Admin Dashboard either supports conference-scoped bulk email or does not expose that action in v1.

**Consequences (testable):**
- If included, bulk email sends only to Participants in the selected Conference Code.
- If excluded, the UI does not call a missing conference-scoped bulk email route.
- Existing all-participant unsent-email behavior is not silently reused for a selected conference action.

### 4.7 Conference QR Check-in Configuration

**Description:** Admin users can configure when Attendance QR check-in opens, how long it remains available, and how often the QR rotates for each Conference. This is an explicit product decision replacing the previously hardcoded 30-second QR token lifetime while preserving 30 seconds as the default. Realizes UJ-1, UJ-2, and UJ-3.

**Functional Requirements:**

#### FR-15: Configure QR availability and rotation per Conference

Admin users can configure QR Check-in settings in both Add Conference and Edit Conference flows.

**Consequences (testable):**
- Conference stores QR settings in `qrConfig.availableFromTime`, `qrConfig.availableDurationMinutes`, and `qrConfig.rotationTtlSeconds`.
- `qrConfig.availableFromTime` is a `String` in `HH:mm` format.
- `qrConfig.availableDurationMinutes` is a `Number` with default `30`.
- `qrConfig.rotationTtlSeconds` is a `Number` with default `30`.
- If Admin does not provide `availableFromTime`, the system defaults it to 15 minutes before the Conference start time.
- For a Conference time of `08:00-17:00`, default `availableFromTime` is `07:45`.
- Backend validation rejects non-`HH:mm` `availableFromTime`.
- Backend validation rejects non-positive `availableDurationMinutes` and non-positive `rotationTtlSeconds`.
- Backend validation rejects `rotationTtlSeconds` greater than `availableDurationMinutes * 60`.
- Frontend validation may help Admins, but backend validation is the authority.
- Before the QR availability window, the Attendance QR API does not generate a valid QR and returns a clear `not_available_yet` state.
- During the QR availability window, the Attendance QR API generates QR using the Conference-specific `rotationTtlSeconds`.
- After the QR availability window, the Attendance QR API does not generate a valid QR and returns a clear `window_closed` state.
- For multi-day Conferences, the QR availability window applies once from the first Conference `startDate` plus `qrConfig.availableFromTime`; it does not repeat daily.
- Admin UI labels are Vietnamese: `Cấu hình QR Check-in`, `QR khả dụng từ`, `QR khả dụng trong ... phút`, and `QR tự đổi sau mỗi ... giây`.
- Admin UI includes helpful descriptions explaining QR open time, availability duration, and rotation TTL.

## 5. Cross-Cutting Non-Functional Requirements

- **Reliability:** Check-in must persist Attendance State before reporting success to the user.
- **Deployment resilience:** Check-in Token validation must work in the intended production process topology; multi-process deployments cannot rely on process-local token memory unless sticky routing or single-process mode is an explicit deployment constraint.
- **Performance:** [ASSUMPTION: The Check-in flow should complete within 2 seconds at normal internal event load and support reception-desk bursts without queue-forming latency.]
- **Security:** Admin attendance mutations require authenticated admin access. Role-specific authorization should be enforced if non-admin staff accounts can access attendance operations. [ASSUMPTION: Existing `userRole` values should become meaningful for attendance actions.]
- **Privacy:** Public surfaces must not expose participant-level attendance data. Aggregate public attendance visibility requires explicit product approval.
- **Observability:** Check-in success, duplicate Check-in, token validation failure, and Network Verification denial should be diagnosable from server logs or audit records.
- **Accessibility:** Browser-facing success, duplicate, not-found, expired, and denied states must be readable without relying only on color.

## 6. Constraints and Guardrails

### 6.1 Safety and Privacy

- Participant-level Attendance State is operational data and should remain behind authenticated admin surfaces unless explicitly approved.
- Failed Check-in states should explain the next step without revealing whether a specific email or phone belongs to a Participant.
- CSRF risk on admin mutations should be addressed before attendance mutation routes are considered internal-production ready. [ASSUMPTION: Admin session cookies remain the authentication mechanism in v1.]

### 6.2 Operational

- `MONGODB_URI` is required for startup; production readiness assumes explicit environment configuration.
- QR URL generation depends on the deployed base URL being correct.
- Seed/admin setup must be reliable enough for internal production; a broken seed script is a launch blocker if it is the documented admin creation path.

### 6.3 Data Governance

- Attendance State and Check-in Event evidence should be retained at least through post-event reporting. [ASSUMPTION: Retention duration follows internal event reporting policy and is not yet specified.]
- Exported data should distinguish registered Participants from checked-in Participants.

## 7. Non-Goals (Explicit)

- This PRD does not replace the whole registration system.
- This PRD does not define a new public event marketplace or SaaS organizer product.
- This PRD does not require per-participant ticket QR codes in v1. [ASSUMPTION: Shared dynamic Attendance QR plus participant identity resolution is the intended v1 model.]
- This PRD does not require native mobile apps, hardware scanners, turnstiles, NFC, or offline-first check-in.
- This PRD does not make the Public Dashboard an authenticated operations dashboard unless explicitly approved.
- This PRD does not redesign email templates beyond the route alignment needed for conference-scoped operations.

## 8. MVP Scope

### 8.1 In Scope

- Attendance QR generation for a selected Conference Code.
- Conference-specific QR availability and rotation configuration.
- Server-side Check-in Token validation.
- Participant identity resolution before Check-in.
- Persisted Attendance State and check-in timestamp.
- Duplicate Check-in handling.
- Network Verification for Check-in.
- Admin Dashboard attendance counts scoped by Conference Code.
- Realtime attendance updates after successful Check-in.
- Participant-level attendance inspection and correction for authorized admins.
- Conference-scoped Participant ID integrity needed for reliable Check-in.
- Removal or completion of dashboard calls to missing attendance and conference-scoped bulk email routes.

### 8.2 Out of Scope for MVP

- Native mobile app for staff check-in.
- Offline mode for venues without network access.
- Hardware scanner integration beyond normal browser QR scanning.
- Public participant-level attendance views.
- Full role-based access control redesign outside the permissions needed for attendance operations.
- External integrations with ticketing, CRM, or identity providers.
- Analytics beyond operational attendance and existing registration/logistics counts.

## 9. Success Metrics

**Primary**

- **SM-1:** Valid Check-in completion rate - at least 99% of valid Check-in attempts from allowed networks persist Attendance State and show success. Validates FR-2, FR-3, FR-4, FR-6.
- **SM-2:** Dashboard correctness - Admin Dashboard attendance counts match persisted Participant Attendance State after refresh and after realtime updates. Validates FR-8, FR-9.
- **SM-3:** Duplicate protection - duplicate scans for an already checked-in Participant never create conflicting Attendance State. Validates FR-4, FR-5, FR-12.

**Secondary**

- **SM-4:** Event-day speed - median successful Check-in completes within 2 seconds under expected internal event load. Validates FR-1, FR-2, FR-3, FR-4.
- **SM-5:** Operational clarity - staff-facing failure states distinguish expired QR, denied network, not-found Participant, ambiguous Participant, and already checked-in Participant. Validates FR-2, FR-3, FR-4, FR-6.

**Counter-metrics (do not optimize)**

- **SM-C1:** Do not increase speed by skipping persistence; a Check-in is not successful until Attendance State is saved.
- **SM-C2:** Do not increase public dashboard richness by exposing participant-level attendance data without approval.
- **SM-C3:** Do not reduce duplicate warnings by silently overwriting Attendance State.

## 10. Risks and Mitigations

- **Risk:** Process-local Check-in Tokens fail in multi-worker deployment. **Mitigation:** Require shared token validation, single-process event-day deployment, or sticky routing as an explicit production decision before launch.
- **Risk:** Admin configures QR rotation longer than the QR availability window. **Mitigation:** Backend validation rejects `rotationTtlSeconds > availableDurationMinutes * 60`.
- **Risk:** QR scan validates freshness but does not identify the Participant. **Mitigation:** Make Participant identity resolution a first-class Check-in step and block Check-in without it.
- **Risk:** Participant ID uniqueness conflicts across conferences. **Mitigation:** Treat Participant ID as Conference-scoped in requirements, lookup, and data constraints.
- **Risk:** Admin Dashboard shows actions that backend routes do not support. **Mitigation:** Align backend routes and UI before marking MVP complete.
- **Risk:** IP filtering can be spoofed if deployed without a trusted proxy boundary. **Mitigation:** Define deployment trust boundary before enabling Network Verification in production.
- **Risk:** Admin mutations lack CSRF protection. **Mitigation:** Treat CSRF hardening as a production-readiness requirement for attendance mutation endpoints.

## 11. Rollout and Change Management

1. Stabilize production prerequisites: admin seed path, environment configuration, token validation strategy, and participant identity integrity.
2. Release Check-in recording behind internal admin testing for one Conference Code.
3. Run a venue-network rehearsal using valid, expired, denied-network, duplicate, and ambiguous-participant cases.
4. Enable Admin Dashboard realtime attendance updates for event staff.
5. Use the first internal event as a controlled production rollout with manual fallback attendance tracking available.

## 12. Open Questions

1. What exact Participant identity input should v1 use after QR validation: email, phone, participant ID, admin-selected Participant, or a registration confirmation artifact?
2. Should Network Verification apply only to Check-in, or also to public registration for selected conferences?
3. What production deployment mode is required for event day: single Node process, PM2 cluster with shared token store, or sticky routing?
4. Which `userRole` values may view, create, or correct Attendance State?
5. How long should Attendance State and Check-in Event evidence be retained?
6. Should the Public Dashboard ever show attendance aggregates, or should attendance remain admin-only?
7. Is conference-scoped bulk email part of attendance MVP, or should the UI action be removed until a later release?

## 13. Assumptions Index

- §1 Vision - Internal production means controlled organizational events, not a public SaaS check-in platform.
- §2.3 UJ-2 - A polling fallback is acceptable if Socket.IO delivery is interrupted.
- §3 Glossary - v1 requires at least successful Check-in history; failed attempt logging may be limited to operational logs.
- §4.1 FR-2 - Production may run more than one Node process, so process-local token memory is not sufficient for final production design.
- §4.2 Description - v1 will identify the Participant by an existing registration-linked field or selected participant record, not by issuing per-participant QR tickets.
- §4.3 FR-7 - v1 should not globally block all registration unless the event explicitly requires onsite-only registration.
- §5 Performance - Check-in should complete within 2 seconds at normal internal event load.
- §5 Security - Existing `userRole` values should become meaningful for attendance actions.
- §6.1 Safety and Privacy - Admin session cookies remain the authentication mechanism in v1.
- §6.3 Data Governance - Retention duration follows internal event reporting policy and is not yet specified.
- §7 Non-Goals - Shared dynamic Attendance QR plus participant identity resolution is the intended v1 model.
