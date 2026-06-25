# Source Tree Analysis

```text
AIproject/
|-- backend/
|   |-- server.js                         # Express/Socket.IO entry point
|   |-- routes/
|   |   |-- register.js                   # Registration page and submit routes
|   |   |-- admin.js                      # Admin pages and JSON APIs
|   |   |-- api.js                        # Public dashboard APIs
|   |   |-- attendanceQr.js               # Dynamic QR API and QR redirect
|   |   `-- speaker.js                    # Speaker admin routes
|   |-- controllers/
|   |   |-- registerController.js         # Registration, stats APIs, email confirmation
|   |   |-- adminController.js            # Admin auth, CRUD, dashboard, export, email
|   |   `-- speakerController.js          # Speaker CRUD and avatar upload
|   |-- middleware/
|   |   |-- registrationValidation.js     # Server-side registration validation
|   |   |-- ipFilter.js                   # CIDR/IP whitelist middleware
|   |   |-- attendanceQr.js               # Dynamic QR token validation
|   |   `-- ejsLayouts.js                 # Layout helper
|   |-- services/
|   |   |-- attendanceQrStore.js          # In-memory 30s QR token store
|   |   `-- totp.js                       # Tested TOTP helper, currently unused by routes
|   |-- models/
|   |   |-- Participant.js
|   |   |-- Conference.js
|   |   |-- Counter.js
|   |   |-- Location.js
|   |   |-- User.js
|   |   `-- Speaker.js
|   |-- seedExport.js
|   |-- seedImport.js
|   |-- seedLocations.js
|   `-- config/seedAdmin.js
|-- frontend/
|   |-- views/
|   |   |-- index.ejs
|   |   |-- register.ejs
|   |   |-- thankyou.ejs
|   |   |-- qrcode.ejs
|   |   |-- stats.ejs
|   |   `-- admin/
|   |       |-- dashboard.ejs
|   |       |-- conferences.ejs
|   |       |-- settings.ejs
|   |       |-- users.ejs
|   |       |-- speakers.ejs
|   |       `-- login.ejs
|   |-- public/
|   |   |-- css/
|   |   |-- js/
|   |   |-- images/
|   |   |-- downloads/
|   |   |-- uploads/
|   |   `-- dashboard/                    # Built React dashboard
|   |-- components/
|   |   `-- RealTimeConferenceAnalyticsDashboard.jsx
|   `-- react-dashboard/
|       |-- src/App.jsx
|       `-- vite.config.js
|-- __tests__/
|   |-- ipFilterMiddleware.test.js
|   `-- totp.test.js
|-- package.json
|-- ecosystem.config.js
|-- railway.json
|-- DEPLOYMENT_GUIDE.md
`-- README.md
```

## Critical Integration Points

- `backend/server.js` mounts all routes and static assets.
- EJS pages submit to Express routes directly.
- React dashboard calls public Express JSON APIs and Socket.IO.
- Registration writes `Participant` and emits Socket.IO stats.
- `Counter` protects participant ID sequence generation.
- QR code routes use process-local token memory.
