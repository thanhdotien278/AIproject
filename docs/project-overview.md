# Project Overview

## Purpose

This repository implements an event/conference registration system. The current system supports event pages, configurable registration forms, participant storage, email confirmations, QR-code entry points, admin management, Excel export, and realtime statistics dashboards.

The external QR report describes the broader intended system as dynamic QR plus network/IP verification, check-in logging, and realtime dashboard updates. The repo implements pieces of that design, but the current check-in path is incomplete: dynamic QR validation redirects users into registration; it does not yet record attendance/check-in time.

## Main Capabilities

- Public home page and event registration page.
- Configurable conference registration fields managed from admin pages.
- Server-side validation for required fields, phone, and email.
- Participant creation with atomic MongoDB counter-based participant IDs.
- Background confirmation email with optional attachments from `frontend/public/downloads`.
- Printable dynamic QR page at `/qrcode`.
- Dynamic attendance QR API at `/api/attendance-qr` with 30-second token TTL.
- Admin session login and protected admin CRUD pages for conferences, locations, users, speakers, and participants.
- Public React realtime dashboard at `/dashboard`.
- Admin dashboard with Socket.IO updates and participant table management.
- Database export/import scripts for moving seed data between machines.

## Project Classification

The repo is best treated as a multi-part web app:

- **Backend/server:** `backend/` Express app, Mongoose models, controllers, routes, middleware, seed scripts.
- **Server-rendered frontend:** `frontend/views/` EJS templates and `frontend/public/` static CSS/JS/assets.
- **React dashboard:** `frontend/react-dashboard/` Vite source, built into `frontend/public/dashboard/`.

## Important Current Facts

- `backend/server.js` connects with `mongoose.connect(process.env.MONGODB_URI)`; the local fallback is commented out.
- Session auth is boolean-session based through `req.session.isAuthenticated`.
- Role fields exist in `User`, but route authorization currently only checks authentication.
- `/dashboard` is served publicly and uses public `/api/conferences` and `/api/stats`.
- The IP filter middleware exists and has tests, but registration routes currently comment out the filter.
- The dynamic QR token store is in-memory, which matters for clustered PM2 deployments.
