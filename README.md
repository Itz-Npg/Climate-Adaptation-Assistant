# Climate Adaptation Assistant

A full-stack student project by **Aaditya  Bhattarai**, **Shivanshu Thakur** and **Ritik Sharma** (WS Section).

The application helps a household understand four local climate hazards — extreme heat, flooding,
drought and water scarcity — save illustrative risk assessments, build an adaptation plan with
tasks and deadlines, and compare two or three places side by side.

It is a working application: React frontend, Express API, MongoDB database, JWT cookie sessions,
bcrypt password hashing and user-scoped data access.

---

## 1. Stack 

| Layer | Technology |
| --- | --- |
| Frontend | React 18 + Vite, Tailwind CSS, React Router, Axios, Recharts, Leaflet (react-leaflet), Lucide React |
| Backend | Node.js, Express, Mongoose |
| Database | MongoDB Atlas (or local MongoDB) |
| Auth | JWT in an HTTP-only cookie, bcryptjs hashing, express-validator |

## 2. Project structure

```
.
├── client/                  React frontend (Vite)
│   ├── src/
│   │   ├── api/             Axios client + endpoint helpers
│   │   ├── components/      Layout, Navbar, Footer, ProtectedRoute, ClimateMap, ErrorBoundary, UI primitives
│   │   ├── context/         AuthContext (session state)
│   │   ├── hooks/           useGeocode (place name -> coordinates)
│   │   └── pages/           Home, Login, Signup, Dashboard, RiskChecker, Planner, Compare, MapExplorer, Team, NotFound
│   └── vite.config.js       Dev server + /api proxy to port 5000
├── server/                  Express backend
│   ├── config/db.js         MongoDB connection
│   ├── controllers/         auth, risk, plan, comparison
│   ├── middleware/          requireAuth, validation, error handling
│   ├── models/              User, RiskAssessment, AdaptationPlan, PlaceComparison
│   ├── routes/              /api/auth, /api/risks, /api/plans, /api/comparisons, /api/geo
│   ├── services/            risk engine, geo/weather service, optional weather provider
│   └── server.js            App entry point
└── package.json             Convenience scripts for both apps
```

## 3. Installation

Requirements: Node.js 18+ and npm.

```bash
# from the project root
npm install
npm run install:all
```

Create the backend environment file:

```bash
cp server/.env.example server/.env
```

Then edit `server/.env`:

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/climate-adaptation?retryWrites=true&w=majority
JWT_SECRET=replace-with-a-long-random-string
JWT_EXPIRES_DAYS=7
CLIENT_URL=http://localhost:5173
OPENWEATHER_API_KEY=
```

Notes:

- `MONGODB_URI` — create a free **MongoDB Atlas** cluster, add a database user, allow your IP, and
  copy the connection string. Append a database name such as `/climate-adaptation`.
- `JWT_SECRET` — any long random string. Never commit `server/.env`.
- If `MONGODB_URI` is empty and `NODE_ENV` is not `production`, the server starts a **temporary
  in-memory MongoDB** so the app runs without an Atlas account. That data disappears when the server
  stops; set `MONGODB_URI` for real persistence. The connection is always a real Mongoose connection,
  so models and queries are identical in both modes.

## 4. Run

```bash
# both apps together (root)
npm run dev
```

or in two terminals:

```bash
npm run server   # http://localhost:5000
npm run client   # http://localhost:5173
```

Open <http://localhost:5173>, sign up, then use the Risk Checker, Planner and Compare tools.
Vite proxies `/api` to the Express server, so the HTTP-only JWT cookie works in development.

Production build:

```bash
npm run build      # builds client/dist
npm start          # Express serves the API and the built frontend on PORT
```

## 5. API routes

All protected routes require a valid session cookie (or `Authorization: Bearer <token>`) and only
return records owned by the signed-in user.

### Auth

| Method | Route | Description |
| --- | --- | --- |
| POST | `/api/auth/register` | Create an account, hash the password, set the session cookie |
| POST | `/api/auth/login` | Verify credentials, set the session cookie (`remember` extends it) |
| GET | `/api/auth/me` | Current user |
| POST | `/api/auth/logout` | Clear the session cookie |
| POST | `/api/auth/forgot-password` | Generate a one-time reset link (printed in the server log) |
| POST | `/api/auth/reset-password` | Set a new password with the token |

### Risk assessments (protected)

| Method | Route |
| --- | --- |
| POST | `/api/risks` |
| GET | `/api/risks` |
| GET | `/api/risks/:id` |
| DELETE | `/api/risks/:id` |

### Adaptation plans (protected)

| Method | Route |
| --- | --- |
| POST | `/api/plans` |
| GET | `/api/plans` |
| GET | `/api/plans/:id` |
| PUT | `/api/plans/:id` |
| DELETE | `/api/plans/:id` |

`PUT /api/plans/:id` accepts `title`, `description`, `priority`, `dueDate`, `completed` and a full
`tasks` array (used for adding, editing, deleting and completing tasks).

### Comparisons (protected)

| Method | Route |
| --- | --- |
| POST | `/api/comparisons` |
| GET | `/api/comparisons` |
| DELETE | `/api/comparisons/:id` |

### Map and live weather (public)

| Method | Route | Description |
| --- | --- | --- |
| GET | `/api/geo/search?q=Kochi&count=6` | Place search (name, region, country, coordinates, elevation) |
| GET | `/api/geo/profile?lat=9.93&lon=76.26` | Live conditions, three-day outlook, elevation and a climate-zone hint for a point |

Both proxy the free **Open-Meteo** APIs from the server, so no API key is needed and the browser
never talks to a third party directly. Responses are cached in memory for 30 minutes and the route is
rate limited to 80 requests per minute per IP.

## 6. Data models

- **User** — `name`, `email` (unique), `passwordHash`, timestamps.
- **RiskAssessment** — `userId`, `location` (city/state/country, location type, housing type, water
  body, drainage, climate, average temperature), `riskScores` (heat, flood, drought,
  waterScarcity), `riskLevel`, `factors`, `recommendations`, `dataSource`, `createdAt`.
- **AdaptationPlan** — `userId`, `title`, `description`, `tasks[]` (`title`, `completed`,
  `priority`, `dueDate`), `priority`, `dueDate`, `completed`, timestamps, plus a computed
  `progress` percentage.
- **PlaceComparison** — `userId`, `locations[]`, `comparisonData` (per-place scores, best-for
  summary, guidance), `createdAt`.

## 7. How the risk scores work

`server/services/riskEngine.js` is a transparent rule-based model. It starts from the climate profile
you pick, then adjusts for temperature, location type, housing type, nearby water bodies and drainage.
Every contribution is returned as an explanatory factor, so a score can always be traced back to the
answers given. Scores are clamped to 5–95 and mapped to `low`, `moderate`, `high` or `severe`.

**These scores are illustrative estimates built for a student project. They are not forecasts,
official warnings or verified risk ratings.**

## 8. Maps and live weather (no API key required)

`client/src/components/ClimateMap.jsx` is a reusable Leaflet map with three base layers:

| Layer | Tiles | Attribution |
| --- | --- | --- |
| Satellite | Esri World Imagery + Esri place labels | Esri, Maxar, Earthstar Geographics |
| Streets | CARTO Voyager on OpenStreetMap data | OpenStreetMap contributors, CARTO |
| Terrain | OpenTopoMap | OpenStreetMap contributors, SRTM, OpenTopoMap |

All three are free public tile services and need no key or account. The map is used in:

- **Climate Map** (`/map`, public) — search any place, inspect live temperature, humidity, wind and
  rainfall, read a three-day outlook, then jump into a risk assessment for that location.
- **Risk Checker** — after a result is calculated, the assessed location is pinned on a satellite map.
- **Compare Places** — every compared place is pinned, with its heat/flood/water scores in the popup.
- **Home** — a satellite preview with example pins.

Live weather and place search use the free [Open-Meteo](https://open-meteo.com/) geocoding and forecast
APIs, proxied by `/api/geo/*`. If the upstream service is unreachable the UI shows a clear error and the
rest of the app keeps working.

## 9. External climate API (optional)

The integration point is already in place in `server/services/weatherProvider.js`:

- Set `OPENWEATHER_API_KEY` in `server/.env` to fetch the **current temperature** for the city you
  enter. That temperature is then used inside the heat and drought calculations, and the response
  marks the assessment as `illustrative+live-weather`.
- Without a key — or if the provider request fails — the app continues normally with the climate
  answers you provide and shows a clearly labelled illustrative-data notice.

The key stays on the server and is never sent to the browser. No other external service is required.

## 10. Security and behaviour

- Passwords are hashed with bcryptjs (10 salt rounds) and never returned by any endpoint.
- JWTs are signed with `JWT_SECRET` and stored in an HTTP-only, same-site cookie (`secure` in
  production). `Authorization: Bearer` is also supported for API clients.
- Every private query filters by `req.user._id`, so users cannot read or delete another user's data.
- Validation runs on both the client and the server (express-validator on the API).
- Loading, success and error states are handled in every form and list.
- The dashboard, risk checker, planner and compare pages are guarded by `ProtectedRoute`; signed-out
  visitors are redirected to the login page and returned to the requested page after signing in.

## 11. Password reset without an email provider

This project does not include an email service. `POST /api/auth/forgot-password` generates a
single-use token (valid 30 minutes, stored as a SHA-256 hash) and prints the reset link in the backend
terminal:

```
[auth] Password reset link for someone@example.com: http://localhost:5173/reset-password?token=...
```

Open that link to choose a new password. To email the link instead, add an email provider in
`authController.forgotPassword` where the link is currently logged.

## 12. Screens

- **Home** — hero, adaptation overview, feature cards, climate statistics, how it works, CTA.
- **Login / Sign up / Forgot / Reset** — validated forms, password visibility toggle, strength meter.
- **Dashboard** — latest assessment, highest hazard, plan progress, pending tasks, recent activity,
  quick links.
- **Risk Checker** — full location form, four hazard scores, contributing factors, recommendations,
  saved assessment list.
- **Planner** — create/edit/delete plans, add/edit/delete tasks, priorities, deadlines, completion
  percentage, suggested actions.
- **Compare Places** — two or three locations, profile cards, satellite map of the places, bar chart,
  factor table with best-value markers, local recommendations, saved comparisons.
- **Climate Map** — place search, satellite/street/terrain layers, live conditions, three-day outlook.
- **404 Not found** — friendly not-found page with the requested path and quick links; render crashes
  are caught by an error boundary instead of leaving a blank page.
- **Our Team** — team, project purpose, technologies, disclaimer.

## 13. Security hardening

| Control | Implementation |
| --- | --- |
| Password hashing | bcryptjs, 12 salt rounds (`server/models/User.js`) |
| Sessions | JWT (HS256) in an HTTP-only, SameSite=Lax cookie; no tokens in localStorage |
| JWT hardening | `issuer`/`audience` claims, algorithm allow-list, 32-character minimum secret enforced at boot |
| CSRF | Same-origin `Origin`/`Referer` check on every unsafe method (`server/middleware/security.js`) |
| Injection | `$`/dotted/prototype keys rejected before any query runs |
| Authorisation | every private query filters by `req.user._id`; foreign ids return 404 |
| Rate limiting | 600 req/min per IP API-wide, 20/15 min auth, 10/h registration, 80/min maps |
| MFA | TOTP (RFC 6238) with backup codes, implemented on Node crypto — no extra dependency |
| Headers | helmet CSP, HSTS (production), nosniff, frame-ancestors none, strict referrer policy |
| CORS | explicit allow-list from `CLIENT_URL`, credentials only for those origins |
| Secrets | server-side only (`.env`), never bundled into the client |
| Logs | reset links/tokens are only printed in development with `EXPOSE_RESET_LINK=true`; emails are masked |
| Source maps | disabled in `vite.config.js`; `dist/` ships no `.map` files |

Run the automated audit at any time:

```bash
node scripts/security-check.mjs        # 18 checks against the running API
```

Two-factor authentication: sign in, open **Account security** (shield icon in the navbar), choose
*Set up authenticator app*, add the secret to Google Authenticator/Authy, then confirm a 6-digit code.
Store the one-time backup codes somewhere safe.

Known limitation: `npm audit` still reports advisories in development-only build tooling
(picomatch via vite/tailwind and nodemon). No patched release exists yet and none of those packages
ship in the browser bundle or the production server.

## 14. SEO, sharing and accessibility

- Per-page titles, meta descriptions, canonical URLs, Open Graph and Twitter card tags via
  `client/src/lib/seo.js` (no head-management dependency).
- JSON-LD: `WebApplication` on Home and the map, `AboutPage`/`Organization` on the team page, and a
  `BreadcrumbList` wherever breadcrumbs render.
- `client/public/robots.txt` and `client/public/sitemap.xml` (regenerate icons/assets with
  `node scripts/generate-brand-assets.mjs`).
- Favicon, PNG app icons, web manifest, Apple touch icon and a generated 1200x630 Open Graph image.
- Visible breadcrumbs on the map, compare, risk checker and security pages; contextual
  "Related tools" links on the tool pages.
- Cookie consent banner with a preferences panel (analytics opt-in) and a footer link to reopen it.
- Toasts, loading skeletons, skip-to-content link and `prefers-reduced-motion` support.
- Set `VITE_SITE_URL` (e.g. `https://yourdomain.com`) before deploying so canonical URLs, `og:url` and
  structured data use the real domain, and adjust the domain in `sitemap.xml` and `robots.txt`.

## 15. Verification performed

The build and the API were checked locally:

- `npm run build` in `client/` compiles successfully.
- Registration, login, `/api/auth/me`, logout, risk assessment create/list/delete, plan create/update
  (tasks + completion), comparison create/list/delete were exercised against the running API,
  including a second account to confirm records stay isolated per user and unauthenticated requests
  are rejected with 401.

- `node scripts/security-check.mjs` passes 18/18 checks (injection, CSRF, cross-user access,
  security headers, MFA enrolment/login, rate limiting, live weather).
- Client build passes on Vite 8 with no source maps and no oversized bundle warnings.

Add your own `MONGODB_URI` before presenting the project so data survives a restart.

## 16. Demo account, seed data and admin panel

```bash
npm run seed              # create demo@example.com with sample data (skips if it exists)
npm run seed -- --reset   # replace the demo data
npm run security:check    # 26 API security checks
```

Demo login: **demo@example.com / Demo1234** — three assessments (Kochi, Phagwara, Shimla, scored with
live weather), an adaptation plan with five tasks, and a Kochi vs Shimla comparison. The seed script
drives the public API, so it works with the in-memory development database and MongoDB Atlas alike.

Roles: `User.role` is `user` or `admin`. Emails listed in `ADMIN_EMAILS` (server/.env) are promoted on
sign-in; the demo account is listed there so the panel can be demonstrated.

Admin panel at `/admin` (admin accounts only):

- platform totals — users, admins, new this week, assessments, plans, comparisons
- searchable, paginated user list with per-user record counts and MFA status
- promote / demote roles, clear a lost two-factor device, delete a user and all of their data
- guards, all enforced on the server: `requireAuth` + `requireAdmin` on every admin route, no
  self-role change, no self deletion, the last admin cannot be removed, Mongo id validation,
  request validation, a write rate limit, and every action logged with the actor's masked email
