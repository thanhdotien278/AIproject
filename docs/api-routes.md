# API and Route Catalog

## Public Pages

| Method | Path | Handler | Notes |
| --- | --- | --- | --- |
| GET | `/` | inline in `backend/server.js` | Latest conference, receptionist `rec1`, speakers, homepage. |
| GET | `/register` | `registerController.showRegisterForm` | Active conference fallback. |
| GET | `/register/:conferenceCode` | `registerController.showRegisterForm` | Route exists, but controller currently reads `req.query.code`, not `req.params.conferenceCode`. |
| POST | `/register` | `registerController.registerParticipant` | Creates participant and returns JSON redirect URL. |
| POST | `/register/:conferenceCode` | `registerController.registerParticipant` | Route exists, but controller uses body `conferenceCode`, not route param. |
| GET | `/thankyou` | inline in `backend/server.js` | Uses session email/name to find participant and render confirmation. |
| GET | `/stats` | `registerController.showPublicStatsPage` | Public stats page rendered from participants. |
| GET | `/qrcode` | inline in `backend/server.js` | Printable dynamic QR page. |
| GET | `/dashboard` | inline in `backend/server.js` | Redirects to `/dashboard/`. |
| GET | `/dashboard/` and `/dashboard/*` | static React build | Public realtime dashboard shell. |

## Public APIs

| Method | Path | Handler | Notes |
| --- | --- | --- | --- |
| GET | `/api/qrcode?code=CONF` | inline in `backend/server.js` | Generates a static registration QR URL pointing to `/register?code=CONF`. |
| GET | `/api/attendance-qr?code=CONF` | `backend/routes/attendanceQr.js` | Generates a 30-second dynamic QR check-in URL. |
| GET | `/qr/checkin?token=...&code=CONF` | `requireValidAttendanceQrToken` then redirect | Validates token and redirects to `/register?code=CONF`; does not mark attendance. |
| GET | `/api/conferences` | `registerController.getConferencesApi` | Public list of conference code/name/isActive. |
| GET | `/api/stats?conferenceCode=CONF` | `registerController.getStatsApi` | Public aggregate statistics. |

## Admin Routes

All routes below are mounted under `/admin`.

| Method | Path | Purpose |
| --- | --- | --- |
| GET/POST | `/login` | Login page and login API. |
| GET | `/logout` | Destroy session. |
| GET | `/dashboard` | Admin dashboard. |
| GET | `/export?conferenceCode=CONF` | Excel export. |
| POST | `/send-email/:participantId` | Legacy single email route. |
| POST | `/send-bulk-emails` | Sends to all participants with `emailSent: false`; does not filter by conference. |
| GET/POST | `/settings` | User profile/settings. |
| GET | `/conferences` | Conference management page. |
| POST | `/conferences/create` | Create conference. |
| POST | `/conferences/update/:id` | Update conference. |
| DELETE | `/conferences/delete/:id` | Delete conference if no participants exist. |
| GET/POST/PUT/DELETE | `/locations`, `/locations/:id` | Location CRUD. |
| GET | `/users` | User management page. |
| GET/POST/PUT/DELETE | `/api/users`, `/api/users/:id` | User JSON CRUD. |
| GET | `/api/conferences/:id` | Conference details for editing. |
| GET | `/api/dashboard-data?conferenceCode=CONF` | Participants, stats, conference details, dropdown data. |
| POST | `/api/conferences/:conferenceCode/activate` | Deactivates all conferences, then activates selected code. |
| POST | `/api/conferences/:conferenceCode/deactivate` | Deactivates selected active conference. |
| GET/PUT/DELETE | `/api/participants/:id` | Participant JSON CRUD. |
| POST | `/api/participants/:participantId/send-email` | Single participant email. |
| CRUD | `/speakers/*` | Speaker management via mounted `speakerRoutes`. |

## Frontend Calls With No Matching Backend Route

The admin dashboard calls these routes, but `backend/routes/admin.js` does not register them:

- `PATCH /admin/api/participants/:participantId/attendance`
- `POST /admin/api/conferences/:conferenceCode/send-bulk-emails`
