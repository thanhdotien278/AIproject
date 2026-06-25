# Project Documentation Index

Generated: 2026-06-25

## Project Overview

- **Project:** Conference Registration System
- **Type:** Multi-part web application
- **Primary stack:** Node.js, Express, EJS, MongoDB/Mongoose, Tailwind CSS, React/Vite, Socket.IO
- **Entry point:** `backend/server.js`
- **Database:** MongoDB via Mongoose models in `backend/models/`
- **Primary generated document:** [Project Overview](./project-overview.md)

## Generated Documentation

- [Project Overview](./project-overview.md)
- [Architecture](./architecture.md)
- [API and Route Catalog](./api-routes.md)
- [Data Models](./data-models.md)
- [Operational Flows](./operational-flows.md)
- [Source Tree Analysis](./source-tree-analysis.md)
- [Scripts and Development Guide](./scripts-and-development.md)
- [Known Gaps and Suspected Bugs](./known-gaps-and-suspected-bugs.md)

## Existing Documentation

- [README](../README.md) - setup, core features, and usage summary.
- [Deployment Guide](../DEPLOYMENT_GUIDE.md) - DigitalOcean-oriented deployment notes.
- [Seed README](../backend/SEED_README.md) - export/import workflow for MongoDB seed data.
- [Participant ID System](../backend/docs/PARTICIPANT_ID_SYSTEM.md) - intended per-conference participant ID design.
- `/Users/Super/Documents/Bao cao QRcode.pdf` - external report context for dynamic QR, IP/Subnet filtering, check-in, realtime dashboard, and testing expectations.

## Quick Start

1. Install dependencies: `npm install`
2. Configure `.env`, especially `MONGODB_URI`, `SESSION_SECRET`, `EMAIL_USER`, and `EMAIL_PASS`.
3. Build CSS: `npm run build:css`
4. Start server: `npm start` or `npm run dev`
5. Visit `/`, `/register`, `/qrcode`, `/dashboard`, and `/admin/login`.
