# Scripts and Development Guide

## Package Scripts

| Script | Purpose |
| --- | --- |
| `npm start` | Run `backend/server.js`. |
| `npm run dev` | Run server with nodemon. |
| `npm run build` | Build Tailwind CSS to `frontend/public/css/styles.css`. |
| `npm run build:css` | Same CSS build command. |
| `npm test` | Run Jest with coverage. |
| `npm run dashboard:dev` | Run Vite dev server for the React dashboard. |
| `npm run dashboard:build` | Build React dashboard from `frontend/react-dashboard`. |
| `npm run dashboard:preview` | Preview React dashboard build. |
| `npm run watch:css` | Watch Tailwind CSS. |
| `npm run seed` | Run `backend/config/seedAdmin.js`. Currently fails syntax check because the script contains stray bare text. |
| `npm run seed:locations` | Seed default locations. |
| `npm run seed:export` | Export MongoDB collections to `backend/seed-data`. |
| `npm run seed:import` | Import from `backend/seed-data`. |
| `npm run dev:all` | Run CSS watcher and backend concurrently. |
| `npm run dev:dashboard` | Run CSS watcher, backend, and Vite dashboard concurrently. |

## Environment Variables

Expected variables:

- `PORT`
- `NODE_ENV`
- `MONGODB_URI`
- `SESSION_SECRET`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `EMAIL_SERVICE`
- `EMAIL_USER`
- `EMAIL_PASS`
- `BASE_URL` for QR URL generation in deployed environments

## Seed and Data Transfer

- `backend/seedExport.js` exports Users, Locations, Conferences, Participants, Speakers, Counters, and metadata.
- `backend/seedImport.js` imports in dependency order and skips existing collections unless `--force` is passed.
- `backend/SEED_README.md` documents the transfer workflow.

## Tests

Current tests cover:

- `backend/middleware/ipFilter.js`
- `backend/services/totp.js`

Missing coverage:

- registration controller success/failure flow
- participant ID uniqueness across conferences
- dynamic attendance QR route/store behavior
- admin dashboard routes
- email error handling
- Socket.IO event behavior
