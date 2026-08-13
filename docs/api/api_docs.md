# NexusDeploy API Reference

This is the complete reference for the endpoints currently registered by the
backend. Request and non-redirect response bodies are JSON.

## Base URL and conventions

Replace `<base-url>` with the running backend URL, for example
`http://localhost:8000`. FastAPI's interactive API explorer is available at
`<base-url>/docs`.

| Item                   | Value                                                                     |
|------------------------|---------------------------------------------------------------------------|
| Content type           | Send `Content-Type: application/json` for endpoints with a request body.  |
| Access authentication  | `Authorization: Bearer <access_token>`                                    |
| Access-token lifetime  | 15 minutes                                                                |
| Refresh-token lifetime | 7 days                                                                    |
| Browser refresh token  | `refresh_token` HTTP-only, `SameSite=Lax` cookie                          |
| Rate-limited routes    | `/auth/login` and `/auth/register`; default: 5 requests per IP per minute |

The backend accepts credentialed browser requests from its configured frontend
URL and `http://localhost:5173`. Browser clients using the refresh cookie must
send credentials, e.g. `fetch(url, { credentials: "include" })`.

## Endpoint index

| Method | Path                          | Authentication                     | Description                                         |
|--------|-------------------------------|------------------------------------|-----------------------------------------------------|
| `GET`  | `/`                           | None                               | Placeholder API response.                           |
| `POST` | `/auth/register`              | None                               | Create a local account.                             |
| `POST` | `/auth/login`                 | None                               | Sign in with email and password.                    |
| `GET`  | `/auth/me`                    | Access token                       | Get the signed-in user's profile.                   |
| `POST` | `/auth/refresh`               | Refresh token or cookie            | Rotate a refresh token.                             |
| `POST` | `/auth/logout`                | Refresh token or cookie (optional) | Revoke a user session.                              |
| `GET`  | `/auth/oauth/google`          | None                               | Start Google OpenID Connect sign-in.                |
| `GET`  | `/auth/oauth/google/callback` | Google callback/session            | Finish Google sign-in and redirect to the frontend. |

## Response and error format

Application errors use this shape unless stated otherwise:

```json
{ "detail": "Explanation of the error" }
```

| Status | When it is returned                                                                                              |
|--------|------------------------------------------------------------------------------------------------------------------|
| `200`  | A successful root, register, login, profile, refresh, or logout request.                                         |
| `302`  | Successful Google OAuth callback redirect.                                                                       |
| `400`  | Duplicate local registration, invalid Google OAuth flow, or Google account without an email.                     |
| `401`  | Invalid credentials, invalid/expired/revoked token, wrong JWT type, or unavailable Google identity verification. |
| `403`  | `/auth/me` has no valid HTTP Bearer credentials (FastAPI HTTPBearer behavior).                                   |
| `422`  | JSON is missing, has the wrong type, or fails field validation. FastAPI includes field details in `detail`.      |
| `429`  | Auth rate limit has been exceeded. Detail: `Too many authentication attempts. Please try again later.`           |
| `500`  | An unexpected database or server error.                                                                          |

## Authentication behavior

### JWTs

`/auth/login`, `/auth/refresh`, and the Google callback issue both an access
JWT and a refresh JWT. The `type` claim differentiates them: protected routes
only accept a token whose type is `access`.

Use an access token only in the Authorization header:

```http
Authorization: Bearer eyJ...
```

### Refresh cookies and rotation

The sign-in and refresh endpoints return the refresh token in JSON and set it
as `refresh_token` cookie with `HttpOnly`, `SameSite=Lax`, and a seven-day
maximum age. The cookie is currently created without the `Secure` flag. Enable
secure cookies when deploying behind HTTPS.

`POST /auth/refresh` accepts the token from the body or cookie. A non-empty
body value wins over the cookie. Refresh tokens are single-use: a successful
refresh revokes the old token and creates a new pair. Reuse of a revoked token
causes all refresh-token sessions for that user to be revoked.

## `GET /`

Placeholder route. It accepts no request body or authentication.

**Success — `200 OK`**

```json
{ "text": "This is the api for the resume analysis" }
```

## `POST /auth/register`

Creates an account for local email/password authentication. This endpoint is
rate-limited.

**Headers**

```http
Content-Type: application/json
```

**Request body**

```json
{
  "email": "dev@example.com",
  "username": "dev_user",
  "password": "StrongPassword123"
}
```

| Field      | Type   | Required | Validation                                           |
|------------|--------|----------|------------------------------------------------------|
| `email`    | string | Yes      | Valid email address.                                 |
| `username` | string | Yes      | 3–50 characters; letters, digits, `_`, and `-` only. |
| `password` | string | Yes      | 8–128 characters.                                    |

**Success — `200 OK`**

```json
{
  "id": "2c5fd650-720c-4806-a5a3-31db47bcbb6f",
  "email": "dev@example.com",
  "username": "dev_user",
  "status": "pending",
  "is_verified": false,
  "created_at": "2026-08-11T10:30:00Z"
}
```

| Response field | Type               | Notes                                                                                |
|----------------|--------------------|--------------------------------------------------------------------------------------|
| `id`           | UUID string        | New user's identifier.                                                               |
| `email`        | string             | Registered email.                                                                    |
| `username`     | string or `null`   | User's display/name field.                                                           |
| `status`       | string             | One of `pending`, `running`, `success`, or `failed`; new users default to `pending`. |
| `is_verified`  | boolean            | Initially `false` for local registration.                                            |
| `created_at`   | ISO 8601 date-time | Account creation timestamp.                                                          |

**Errors**

- `400`: `Email OR Name already registered`
- `422`: Invalid/missing `email`, `username`, or `password`
- `429`: Too many registration/login attempts from the IP address
- `500`: Server error

## `POST /auth/login`

Authenticates a local account. It creates a browser session, returns a token
pair, and sets the `refresh_token` cookie. This endpoint is rate-limited.

**Headers**

```http
Content-Type: application/json
```

**Request body**

```json
{
  "email": "dev@example.com",
  "password": "StrongPassword123"
}
```

| Field      | Type   | Required | Validation             |
|------------|--------|----------|------------------------|
| `email`    | string | Yes      | Valid email address.   |
| `password` | string | Yes      | At least 8 characters. |

**Success — `200 OK`**

```json
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "token_type": "bearer",
  "username": "dev_user"
}
```

**Response cookies**

- `refresh_token`: HTTP-only refresh JWT; seven-day max age; `SameSite=Lax`.
- `fastapi_session`: signed session cookie used by the backend for the local session.

**Errors**

- `401`: `Invalid email or password`
- `422`, `429`, `500`: See [Response and error format](#response-and-error-format).

## `GET /auth/me`

Returns the authenticated account's profile.

**Required header**

```http
Authorization: Bearer <access_token>
```

No request body is accepted.

**Success — `200 OK`**

```json
{
  "id": "2c5fd650-720c-4806-a5a3-31db47bcbb6f",
  "email": "dev@example.com",
  "username": "dev_user",
  "is_verified": false
}
```

**Errors**

- `403`: Authorization header is absent or is not Bearer authentication.
- `401`: Token is expired, invalid, a refresh token, or identifies a user no longer present.
- `500`: Server error.

## `POST /auth/refresh`

Rotates a valid refresh token and updates the browser refresh cookie. It does
not require an access token.

**Headers**

```http
Content-Type: application/json
Cookie: refresh_token=<refresh_token>   # optional alternative to body
```

**Optional request body**

```json
{ "refresh_token": "eyJ..." }
```

The body itself is optional. Send `{}` or no body to rely on the cookie. If
both sources are present, `refresh_token` in the body is used.

**Success — `200 OK`**

```json
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "token_type": "bearer"
}
```

The response also sends a replacement `refresh_token` cookie and updates the
backend session.

**Errors**

- `401`: `Refresh token missing. Please log in again.` when neither body nor cookie supplies a token.
- `401`: `Token has expired`, `Could not validate credentials`, `Invalid or expired refresh token status`, or session-reuse/session-expiration errors.
- `500`: Server error.

## `POST /auth/logout`

Revokes all refresh tokens for the user represented by the supplied refresh
token, removes cached profile data, clears the refresh cookie, and clears the
backend session. Authentication is optional so a client can safely call it even
after losing its token.

**Headers**

```http
Content-Type: application/json
Cookie: refresh_token=<refresh_token>   # optional alternative to body
```

**Optional request body**

```json
{ "refresh_token": "eyJ..." }
```

Body precedence and cookie behavior are the same as `/auth/refresh`.

**Success — `200 OK`**

```json
{ "detail": "Successfully logged out and session revoked." }
```

Without a token, the endpoint still clears local cookie/session state and
returns the same `200` response. A malformed or expired provided refresh token
returns `401`; unexpected failures return `500`.

## `GET /auth/oauth/google`

Starts the Google OpenID Connect flow. This is a browser navigation endpoint,
not a JSON API call. It requests the `openid`, `email`, and `profile` scopes.

**Request**

No client-provided body or parameters are required. The backend determines the
callback URL as `<base-url>/auth/oauth/google/callback` and saves OAuth state
in the session cookie.

**Success**

Returns a redirect to Google's authorization page. Follow redirects in the
browser. Google client ID/secret and this callback URL must be configured in
both the backend environment and Google Cloud Console.

## `GET /auth/oauth/google/callback`

Receives Google's authorization response. The browser reaches it after Google
sign-in; frontend code should not invoke it directly.

**Query parameters supplied by Google**

| Parameter | Required in normal flow | Description                                                                     |
|-----------|-------------------------|---------------------------------------------------------------------------------|
| `code`    | Yes                     | One-time authorization code.                                                    |
| `state`   | Yes                     | OAuth state value validated against the session.                                |
| `error`   | No                      | Google authorization error when the user cancels or Google rejects the request. |

The matching `fastapi_session` cookie must accompany the callback so OAuth
state can be validated.

**Success — `302 Found`**

The backend creates or updates the local user from the Google identity, stores
the provider relationship, issues NexusDeploy tokens, sets a `refresh_token`
cookie, and redirects to:

```text
<configured-frontend-url>/auth/google/callback?access_token=<url-encoded-jwt>&username=<url-encoded-name>&provider=google
```

| Redirect query field | Description                             |
|----------------------|-----------------------------------------|
| `access_token`       | Newly issued NexusDeploy access JWT.    |
| `username`           | Google profile name, or an empty value. |
| `provider`           | Always `google`.                        |

Read the access token immediately and remove it from browser-visible URLs when
possible; query strings can be retained in browser history and logs. Use it as
a Bearer token for protected API calls.

**Errors**

- `400`: Google OAuth handshake failed or the Google identity has no email.
- `401`: Google user identity profile verification is unavailable.
- `500`: Server or database error.

## Typical browser client sequence

1. Register with `POST /auth/register`, or navigate to `/auth/oauth/google`.
2. For local accounts, call `POST /auth/login` and retain the access token in memory.
3. Send the access token in the `Authorization` header to `/auth/me` and other protected routes.
4. When an access token expires, call `POST /auth/refresh` with `credentials: "include"`, replace the access token, then retry the failed request once.
5. Sign out through `POST /auth/logout` with credentials included.
