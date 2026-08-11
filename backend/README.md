# NexusDeploy Backend

## Overview

This backend provides the core API for the NexusDeploy application, including auth, session handling, refresh-token rotation, and user profile endpoints. The project uses FastAPI, PostgreSQL, Redis, and JWT-based customer authentication with browser-friendly cookie-based refresh tokens.

## Local database startup with Docker

Start the PostgreSQL container used by this backend:

```bash
cd d:/Desktop/NexusDeploy/backend
docker compose up -d db
```

Check the database health and confirm the service is running:

```bash
docker compose ps
```

## Environment setup

Use `scripts/add_env.py` to add or update variables without manually editing
environment files. It updates each requested `.env` file atomically, creates or
updates its matching blank example file, and adds a typed field to
`app/core/config.py` when that field does not already exist. It also maintains
`ENVIRONMENT.md`, a safe Markdown inventory of variables, types, and required
status; it never writes values or secrets to that file.

```powershell
# Updates .env and generates/updates .env.example
.\.venv\Scripts\python.exe scripts\add_env.py LOG_LEVEL=info

# Apply a variable to all deployment environments.
# This also maintains .env.example, .env.staging.example, and .env.production.example.
.\.venv\Scripts\python.exe scripts\add_env.py SENTRY_ENABLED=true --type bool `
  --env .env --env .env.staging --env .env.production
```

Pass secrets as `KEY=VALUE` (quote the whole argument in PowerShell when it
contains spaces). Example files always contain blank values, never copied
secrets. Use `--no-settings` for a variable that should not be part of the
Pydantic `Settings` model, `--docs path\to\file.md` for a differently named
document, `--no-docs` to skip docs, and `--dry-run` to preview a change.

## Auth and session flow

The auth module currently supports:

- local email/password registration
- local email/password login
- JWT access token issuance
- refresh-token rotation with revocation checks
- HTTP-only refresh cookie storage for browser sessions
- logout revocation and session invalidation
- OAuth callback/session placeholders for Google login integration

### Auth endpoints

#### POST /auth/register

Creates a user account.

Request body:

```json
{
  "email": "user@example.com",
  "username": "johndoe",
  "password": "StrongPassword123"
}
```

#### POST /auth/login

Returns an access token and a refresh token. The refresh token is also stored in an HTTP-only cookie for browser use.

Request body:

```json
{
  "email": "user@example.com",
  "password": "StrongPassword123"
}
```

Response:

```json
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "token_type": "bearer",
  "username": "johndoe"
}
```

#### POST /auth/refresh

Validates the refresh token, rejects reuse, rotates the token, and issues a new access token. The response includes the new refresh token and updates the HTTP-only cookie.

Request body (optional when using the cookie):

```json
{
  "refresh_token": "old-refresh-token"
}
```

Response:

```json
{
  "access_token": "new-access-token",
  "refresh_token": "new-refresh-token",
  "token_type": "bearer"
}
```

#### POST /auth/logout

Revokes all refresh tokens for the user and clears the browser session cookie.

#### GET /auth/me

Returns the authenticated user profile for a valid access token.

#### GET /auth/oauth/google

OAuth entry point placeholder for Google login setup.

#### GET /auth/oauth/google/callback

OAuth callback placeholder that reads the user session after successful login.

## Development commands

```bash
# Install dependencies with uv
uv sync

# Start FastAPI app
uv run uvicorn app.main:app --reload

# Run tests
uv run pytest tests/unit/test_auth_sessions.py -q
```

## Security notes

- Refresh tokens are hashed before storage.
- Old refresh tokens are marked revoked during rotation.
- Reuse of a revoked token triggers immediate session invalidation.
- Cookies are HTTP-only and same-site lax for browser sessions.
- In production, set `secure=True` behind HTTPS.

## Current status

The backend auth module is in place and tested for the session-refresh pattern. The remaining integration work is to connect the Google OAuth provider with the frontend callback flow and use the issued access token in the app UI.
