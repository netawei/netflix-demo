# Netflix Demo

A full-stack demo that recreates core Netflix-style streaming flows. The backend (Node.js + Express + MongoDB) exposes APIs for authentication, profile management, catalog CRUD, watch history, and recommendations. The frontend (static HTML/CSS/JS) is served via Express and consumes those APIs to render the user experience.

## Features

- **Authentication & Profiles** – users can register, log in, and manage up to five viewer profiles with avatars and personalized preferences.
- **Content Management** – administrators can add series or movies (including seasons/episodes) and enrich them with external ratings via OMDb.
- **Watch History Tracking** – captures progress for movies and episodic content, enabling resume-watching and popularity insights.
- **Personalized Recommendations** – suggests content based on liked titles and favorite genres while avoiding duplicates.
- **Rich Telemetry** – structured event/error logging with request correlation IDs stored in MongoDB for troubleshooting and analytics.

## Project Structure

```
.
├── episodes-overlay.html            # Standalone overlay helper for episode browsing
├── backend
│   ├── package.json
│   ├── package-lock.json
│   ├── server.js                    # Express bootstrap, middleware chain, static serving
│   ├── config
│   │   ├── cloudinary.js            # Cloudinary storage configuration
│   │   └── db.js                    # MongoDB connection and logging hooks
│   ├── controllers
│   │   ├── contentController.js     # CRUD for content, OMDb integration
│   │   ├── userController.js        # Auth, profiles, likes, recommendations
│   │   └── watchHistoryController.js# Watch progress, popularity stats
│   ├── middleware
│   │   └── logging.js               # Request-ID assignment, request/error logging
│   ├── models
│   │   ├── Content.js               # Content schema
│   │   ├── Log.js                   # Structured log schema
│   │   ├── User.js                  # User + profiles schema
│   │   └── watchHistory.js          # Watch history schema
│   ├── routes
│   │   ├── contentRoutes.js         # /api/content
│   │   ├── userRoutes.js            # /api/users
│   │   └── watchHistoryRoutes.js    # /api/watchHistory
│   ├── scripts                      # (reserved for automation scripts)
│   └── utils
│       └── logger.js                # Log helpers (debug/info/error) persisted to MongoDB
└── frontend
    ├── package-lock.json
    ├── add-content.html             # Admin UI for uploading titles
    ├── admin-dashboard.html         # Admin overview
    ├── cast-list.html               # Cast modal
    ├── index.html                   # Landing / login page
    ├── main-page.html               # Main browsing experience
    ├── profiles.html                # Profile selector/manager
    ├── statistics.html              # Analytics dashboard consuming watch stats
    ├── watch.html                   # Playback page
    └── images
```

**How components interact**

- Browser requests hit Express (`server.js`), which first assigns a request ID and records lifecycle logs via `middleware/logging.js`.
- REST routes under `/api/*` proxy to the respective controller in `backend/controllers/`, which orchestrates validation, database calls, and response formatting.
- Controllers rely on Mongoose models in `backend/models/` to read/write MongoDB data.
- Successful and failed operations are logged through `utils/logger.js`, which persists structured documents via the `Log` schema.
- Static frontend assets under `frontend/` are served by Express, consuming the API endpoints for data.

## Installation & Setup

### Prerequisites

- Node.js 18+
- npm (ships with Node)
- MongoDB (local instance or remote cluster)

### 1. Clone & install dependencies

```bash
git clone <repo-url>
cd netflix-demo
cd backend
npm install
```

> The frontend is static and currently does not require its own build step.

### 2. Configure environment variables

Use (or update) `backend/.env` with the keys your project already defines. A typical setup is:

```bash
PORT=5001
COOKIE_SECRET=super-secret-cookie-key
MONGO_HOST=localhost
MONGO_PORT=27017
MONGO_DB=netflix-demo
MONGO_USER=root
MONGO_PASS=password
```

The MongoDB credentials above assume an auth-enabled instance; adjust them to match your setup. Optional variables (such as `LOG_LEVEL` or external API keys) can be added if your environment already relies on them.

**Log level control**

Set `LOG_LEVEL=<debug|info|error>` in your environment variables before launching the server. (`$env:LOG_LEVEL = "debug"` in PowerShell, `LOG_LEVEL=debug npm run dev` in bash).

### 3. Run the backend

```bash
cd backend
npm run dev    # starts with nodemon
# or
npm start      # starts with node
```

The server listens on `http://localhost:5001` (or the `PORT` you set) and serves both the API (`/api/users`, `/api/content`, `/api/watchHistory`) and the static frontend.

### 4. Access the app

Open a browser to `http://localhost:5001` and interact with the frontend pages. Admin views (e.g., `add-content.html`) expect an authenticated admin session.

## Logging & Troubleshooting

- Logs are persisted to the `logs` collection in MongoDB with fields such as level, message, request ID, user ID, and metadata.
- Default log level is `info`; switch to `debug` to capture additional request lifecycle events during troubleshooting.
- Console output remains enabled for quick inspection when running locally.

---

For any questions about the data model, logging pipeline, or API behavior, check the corresponding files in `backend/controllers/` and `backend/models/`, or reach out to the maintainers.

