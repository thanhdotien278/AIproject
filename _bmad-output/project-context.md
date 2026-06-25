---
project_name: 'AIproject'
user_name: 'Thanhdaika'
date: '2026-06-25'
sections_completed: ['discovery', 'technology_stack', 'language_rules', 'framework_rules', 'testing_rules', 'code_quality_rules', 'workflow_rules', 'critical_rules']
existing_patterns_found: 8
status: 'complete'
rule_count: 50
optimized_for_llm: true
---

# Project Context for AI Agents

_This file contains critical rules and patterns that AI agents must follow when implementing code in this project. Focus on unobvious details that agents might otherwise miss._

---

## Technology Stack & Versions

- Runtime: Node.js app with Express `^4.18.2`, entry point `backend/server.js`.
- Database: MongoDB through Mongoose `^7.6.3`; startup requires `MONGODB_URI`.
- Views: EJS `^3.1.9` with `express-ejs-layouts ^2.5.1`, templates in `frontend/views/`.
- Styling: Tailwind CSS `^3.3.5`, built from `frontend/public/css/src/input.css` to `frontend/public/css/styles.css`.
- Realtime: Socket.IO server/client `^4.8.1`; current realtime event is `statsUpdated`.
- Dashboard: React `^18.3.1` with Vite `^5.4.11`; dashboard source is `frontend/react-dashboard/`, build output is `frontend/public/dashboard/`.
- Tests: Jest `^29.7.0` in Node environment with global coverage thresholds for branches/functions/lines at `80%`.
- Key backend libraries: bcrypt `^6.0.0`, express-session `^1.17.3`, nodemailer `^6.9.7`, multer `^1.4.5-lts.1`, qrcode `^1.5.4`, sharp `^0.34.3`, xlsx `^0.18.5`.

## Critical Implementation Rules

### Language-Specific Rules

- Backend code uses CommonJS: `require(...)`, `module.exports`, and `exports.handlerName`; do not convert backend files to ESM unless the whole runtime config is changed.
- Vite dashboard code uses ESM imports; keep React dashboard imports in `frontend/react-dashboard/` and shared dashboard component imports compatible with Vite.
- Use async/await in Express controllers and return responses from failure branches to avoid continuing after `res.status(...).json(...)` or `res.render(...)`.
- Do not trust client-side validation. Registration data must pass server-side validation through `validateRegistrationForm` before creating `Participant` records.
- Keep Vietnamese user-facing strings intact where the current flow already uses Vietnamese copy.

### Framework-Specific Rules

- `backend/server.js` is the integration shell: mount new routes there only when adding a new route module or public page; keep feature logic in route/controller/service files.
- Preserve the route/controller/model split: routes should wire HTTP paths, controllers should own request behavior, models should hold Mongoose schema rules.
- Registration currently supports `/register` and `/register/:conferenceCode`, but the controller reads `req.query.code` and `req.body.conferenceCode`; do not assume route params work without fixing the controller.
- Conference-scoped participant IDs must account for the current schema risk: `Counter` is per conference, but `Participant.participantId` is globally unique.
- Socket.IO stats updates use `global.io` and event name `statsUpdated`; update both all-conference and specific-conference payloads when registration stats change.
- React dashboard API calls use `apiBaseUrl = 'http://localhost:3000'` in Vite dev and relative URLs in production; keep `/dashboard/` base path compatibility.
- Build dashboard changes with `npm run dashboard:build`; the served artifact lives in `frontend/public/dashboard/`.
- Tailwind classes are scanned from EJS views, public JS, shared React components, and dashboard source; update `tailwind.config.js` content paths if new UI source roots are added.

### Testing Rules

- Jest runs in Node environment and enforces global coverage thresholds: branches `80`, functions `80`, lines `80`.
- Put tests in `__tests__/` using `*.test.js`; current tests import CommonJS backend modules directly.
- For middleware tests, use small request/response mocks with `jest.fn()` rather than starting the Express server.
- When changing registration, QR, attendance, or stats behavior, add focused tests around the backend module first; current coverage is sparse outside `ipFilter` and `totp`.
- Verify syntax-sensitive backend changes with at least the narrowest reliable check, such as `node --check <file>` or `npm test` when tests are affected.
- Do not treat the built React dashboard output as proof of source correctness; build with `npm run dashboard:build` when dashboard source changes.

### Code Quality & Style Rules

- Keep changes surgical; this repo has mixed older code and generated assets, so do not reformat unrelated files.
- Match existing JavaScript style: semicolons, single quotes in backend files, CommonJS exports, and direct Express handler functions.
- Keep generated/build artifacts separate from source. Source dashboard code is under `frontend/react-dashboard/`; built dashboard files are under `frontend/public/dashboard/`.
- Do not edit `coverage/` outputs as source.
- Keep EJS templates in `frontend/views/` and static browser assets in `frontend/public/`.
- Add comments only for non-obvious behavior, especially around process-local state, realtime events, or schema/index constraints.
- Prefer existing services/middleware before adding new abstractions; add a new helper only when it removes real duplication or isolates a testable rule.

### Development Workflow Rules

- Required local env includes `MONGODB_URI`; `backend/server.js` no longer uses the README's commented local fallback.
- Main scripts: `npm run dev` for backend, `npm run build:css` for Tailwind, `npm test` for Jest, `npm run dashboard:dev` and `npm run dashboard:build` for the React dashboard.
- `npm run seed` is currently documented as broken by a syntax error in `backend/config/seedAdmin.js`; verify before relying on it.
- Railway deployment runs `npm run build` then `npm start`; `npm run build` only builds Tailwind CSS, not the React dashboard.
- PM2 config uses cluster mode with 2 instances; do not use process-local memory for cross-request or cross-worker features unless cluster behavior is addressed.
- Seed import/export scripts use `backend/seed-data/`; keep collection dependency order in mind when changing seeded models.
- No repository-specific branch, commit, or PR convention was found; follow the user's explicit instructions and keep commits scoped.

### Critical Don't-Miss Rules

- Do not assume dynamic QR currently records attendance. `/qr/checkin` validates a token and redirects to registration; it does not identify a participant or set attendance state.
- Do not assume IP filtering protects registration. `backend/routes/register.js` has the IP filter commented out even though `ipFilter` is implemented and tested.
- Do not assume admin dashboard attendance or conference-specific bulk email actions work. Documented frontend calls currently lack matching backend routes.
- Do not put durable QR/session/check-in state only in process memory if PM2 cluster mode or multi-instance deployment is in scope.
- Do not use the hardcoded MongoDB Atlas-looking fallback in `backend/config/seedAdmin.js`; require explicit environment configuration before seed/admin operations.
- Do not weaken admin/security behavior silently. Admin mutations currently lack visible CSRF protection, and authorization is mostly authentication-only.
- Do not mark registration/conference-code work complete without testing both `/register?code=CONF` and any route-param path you touch.
- Do not change participant ID behavior without checking MongoDB indexes; moving from global to per-conference uniqueness needs schema and existing-index handling.
- Public `/dashboard` and `/api/stats` expose aggregate stats by design today; confirm product intent before adding sensitive data there.

---

## Usage Guidelines

**For AI Agents:**

- Read this file before implementing any code.
- Follow all rules as documented.
- When in doubt, prefer the more restrictive option.
- Update this file if new project patterns emerge.

**For Humans:**

- Keep this file lean and focused on agent needs.
- Update it when technology stack or deployment patterns change.
- Review periodically for outdated rules.
- Remove rules that become obvious or no longer apply.

Last Updated: 2026-06-25
