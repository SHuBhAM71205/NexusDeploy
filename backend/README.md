# NexusDeploy Backend

## Environment variables

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
