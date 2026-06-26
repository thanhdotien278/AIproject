# Addendum: Source Notes and Implementation Context

This addendum preserves technical and source context that informed the PRD but does not belong in the main requirements narrative.

## Source Inputs

- `/Users/Super/AIproject/docs/project-overview.md`
- `/Users/Super/AIproject/docs/architecture.md`
- `/Users/Super/AIproject/docs/api-routes.md`
- `/Users/Super/AIproject/docs/data-models.md`
- `/Users/Super/AIproject/docs/operational-flows.md`
- `/Users/Super/AIproject/docs/source-tree-analysis.md`
- `/Users/Super/AIproject/docs/scripts-and-development.md`
- `/Users/Super/AIproject/docs/known-gaps-and-suspected-bugs.md`
- `/Users/Super/AIproject/docs/project-scan-report.json`
- `/Users/Super/AIproject/_bmad-output/project-context.md`

## Current-State Evidence

- Current `/api/attendance-qr` issues dynamic QR data for a `Conference Code` with a 30-second token TTL.
- Product decision as of 2026-06-25: QR timing is now configurable per Conference. The 30-second token TTL remains only the default `qrConfig.rotationTtlSeconds`, not a hardcoded product rule.
- Product decision as of 2026-06-25: for multi-day Conferences, the QR availability window applies once from the first Conference start date/time and does not repeat daily.
- Current `/qr/checkin` validates a token and redirects to `/register?code=CONF`; it does not identify a participant or record attendance.
- Current `Participant` model has `attendance: false` by default and `participantId` marked globally unique.
- Current `Counter` model issues participant IDs per conference using keys like `participants_CONF`.
- Current Admin Dashboard UI appears to call `PATCH /admin/api/participants/:participantId/attendance`, but the route catalog says that route is not registered.
- Current Admin Dashboard UI appears to call `POST /admin/api/conferences/:conferenceCode/send-bulk-emails`, but the route catalog says only `/admin/send-bulk-emails` exists and does not filter by selected conference.
- Current IP filter middleware supports exact IPs and IPv4 CIDR ranges but is not mounted on registration routes.
- Current Socket.IO `statsUpdated` event updates registration/logistics counts after registration, not after check-in.
- Current deployment notes include PM2 cluster mode with two instances, which conflicts with process-local dynamic QR token storage.

## Implementation Notes to Carry Forward

- Product requirements intentionally avoid choosing MongoDB, Redis, TOTP, JWT, or sticky sessions as the token strategy. Architecture should choose the smallest production-safe strategy.
- Add `Conference.qrConfig` as the recommended durable home for QR availability and rotation settings: `availableFromTime` (`HH:mm` string), `availableDurationMinutes` (positive number, default 30), and `rotationTtlSeconds` (positive number, default 30).
- If participant identity is resolved by email or phone, ambiguous matches must be handled explicitly because names and phone numbers may not be globally unique.
- If participant identity is resolved by participant ID, every lookup and route must include `Conference Code`.
- If admin staff with non-admin roles can mutate attendance, route authorization needs more than `req.session.isAuthenticated`.
- CSRF protection is not visible in current admin mutation routes and should be addressed before introducing new attendance mutation endpoints.
- The existing public dashboard should not be assumed safe for participant-level attendance data.
