# Operational Flows

## Registration Flow

1. User opens `/register` or `/register?code=CONF`.
2. `showRegisterForm` loads the requested conference by query `code`, or falls back to the active conference.
3. If a requested conference exists but is inactive, the user sees `registration_closed`.
4. The EJS view renders fields based on `conference.registrationFields`.
5. Client validation runs from `frontend/public/js/register-validation.js`.
6. The browser posts JSON to `/register`.
7. `registerParticipant` finds an active conference from `req.body.conferenceCode` or active fallback.
8. Server-side validation sanitizes name, email, phone, and required configured fields.
9. Duplicate detection checks `email + conferenceCode`.
10. The participant ID is generated through `Counter.getNextSequenceValue(confCode)` and padded to 4 digits.
11. A `Participant` document is saved.
12. Session fields are set for `/thankyou`.
13. The HTTP response is returned immediately with `{ success: true, redirectUrl: "/thankyou" }`.
14. Stats are emitted in the background through Socket.IO.
15. Confirmation email is sent in a `setImmediate` task if email credentials exist.

## Dynamic QR and Check-in Flow

There are two QR systems:

- `/api/qrcode` creates a registration QR pointing directly to `/register`.
- `/api/attendance-qr` creates an expiring QR that points to `/qr/checkin`.

Dynamic QR flow:

1. `/qrcode` renders `frontend/views/qrcode.ejs`.
2. The page fetches `/api/attendance-qr` and refreshes after token expiry.
3. `attendanceQrStore` creates a random token per `conferenceCode` and 30-second time window.
4. The API returns a QR image, token, timestamps, TTL, and check-in URL.
5. A scanner opens `/qr/checkin?token=...&code=CONF`.
6. `requireValidAttendanceQrToken` validates the token from memory.
7. Valid tokens redirect to `/register?code=CONF`.
8. Invalid or expired tokens render an error page with status 410.

Current limitation: this flow validates QR freshness but does not record attendance, check-in time, or participant identity.

## IP Filtering Flow

`backend/middleware/ipFilter.js` can:

- extract client IP from `x-forwarded-for`, connection, socket, or `req.ip`
- normalize IPv6-mapped IPv4 addresses
- allow exact IPs and IPv4 CIDR ranges
- return JSON 403 for API requests
- return an HTML denied page for browser page requests

Default allowed ranges include localhost and common local subnets.

Current limitation: `backend/routes/register.js` comments out the IP filter import and does not mount it on GET/POST registration routes.

## Email Confirmation Flow

Initial registration email:

1. Registration saves the participant first.
2. Response returns before email is sent.
3. A background task reads files from `frontend/public/downloads`.
4. Nodemailer sends an HTML confirmation email with optional attachments and a Dropbox document link.
5. On success, `Participant.emailSent` is set to true.

Admin emails:

- `POST /admin/api/participants/:participantId/send-email` sends a simple confirmation to one participant.
- `POST /admin/send-bulk-emails` sends to all participants where `emailSent` is false.

The admin dashboard UI attempts a conference-specific bulk-email endpoint, but that endpoint is not registered.

## Admin Dashboard Flow

1. Admin logs in at `/admin/login`.
2. Session stores `isAuthenticated` and `username`.
3. `/admin/dashboard` renders aggregate stats and participant rows.
4. Client-side JS connects to Socket.IO and calls `/admin/api/dashboard-data`.
5. Conference activation/deactivation calls `/admin/api/conferences/:conferenceCode/activate` or `/deactivate`.
6. Participant edit/delete/email actions call `/admin/api/participants/*`.

Known mismatch: the dashboard UI includes attendance buttons, but there is no matching attendance update API route.

## Realtime Dashboard Flow

The public React dashboard is served at `/dashboard/`.

1. `App.jsx` sets `apiBaseUrl` to `http://localhost:3000` in Vite dev and empty string in production.
2. `RealTimeConferenceAnalyticsDashboard` fetches `/api/conferences`.
3. It fetches `/api/stats?conferenceCode=...`.
4. It opens a Socket.IO connection and listens for `statsUpdated`.
5. It updates only when the event payload `conferenceCode` matches the selected conference.

Current limitation: the dashboard reports registration/logistics counts, not actual check-in/attendance counts.
