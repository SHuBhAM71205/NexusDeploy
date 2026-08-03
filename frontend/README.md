# NexusDeploy Frontend

The React application for NexusDeploy. It is a production-oriented starter with a feature-based structure, typed HTTP layer, routing, accessible baseline styles, tests, linting, formatting, and a Docker production image.

## Requirements

- Node.js 20.19+ or 22.12+
- npm 10+

## Quick start

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

The development server is available at `http://localhost:3000`.

## Commands

| Command                | Purpose                                  |
| ---------------------- | ---------------------------------------- |
| `npm run dev`          | Start the Vite development server        |
| `npm run build`        | Type-check and create a production build |
| `npm run typecheck`    | Type-check without building              |
| `npm run lint`         | Run ESLint with zero warnings allowed    |
| `npm run format:check` | Verify Prettier formatting               |
| `npm run test`         | Run unit tests once                      |
| `npm run test:watch`   | Run tests in watch mode                  |

## Environment

Only variables prefixed with `VITE_` reach the browser. They are public build-time values, never secrets.

| Variable        | Required | Description                                       |
| --------------- | -------- | ------------------------------------------------- |
| `VITE_API_URL`  | Yes      | API base URL, e.g. `http://localhost:5000/api/v1` |
| `VITE_APP_NAME` | No       | Display name for the application                  |

## Project structure

```text
src/
├── app/          # Composition root and route definitions
├── components/   # Reusable UI and layout components
├── features/     # Product domains; keep page-specific code close together
├── lib/          # Framework-neutral helpers and environment access
├── pages/        # Route-level standalone pages
├── services/     # Network clients and API calls
├── styles/       # Global design tokens and baseline styles
└── test/         # Test configuration and shared test helpers
```

## Team conventions

- Add a product area under `src/features/<feature-name>`.
- Keep reusable UI in `src/components`; do not make a global component for one use case.
- Call the backend through `src/services`; avoid direct `fetch`/Axios calls inside components.
- Add a focused test alongside meaningful UI or business logic changes.
- Run `npm run format:check && npm run lint && npm run typecheck && npm run test` before opening a PR.

## Production image

Vite environment values are embedded during the build, so provide them as Docker build arguments:

```bash
docker build --build-arg VITE_API_URL=https://api.example.com/api/v1 -t nexusdeploy-frontend .
docker run --rm -p 8080:80 nexusdeploy-frontend
```
