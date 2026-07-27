# Security

## Reporting

Email security concerns to the maintainers privately rather than opening a public issue.

## Secrets policy

- **Never commit real secrets.** Tracked env files (`.env.development`, `.env.production`,
  `.env.example`) may contain only **public** values: `VITE_SUPABASE_URL`,
  `VITE_SUPABASE_PUBLISHABLE_KEY` / anon key, `VITE_SUPABASE_PROJECT_ID`, and Stripe
  **publishable** tokens (`pk_test_…` / `pk_live_…`). These are exposed to the browser by
  design.
- **Server-only secrets** — `SUPABASE_SERVICE_ROLE_KEY`, Stripe secret keys (`sk_…`),
  webhook signing secrets (`whsec_…`), `INTEGRATIONS_ENCRYPTION_KEY`, and all AI provider
  keys — must live **only** in a secret store:
  - Supabase Edge Functions → Manage secrets
  - Cloudflare Workers → `wrangler secret put <NAME>`
  - Local development → an untracked `.env.local` (already git-ignored)

The `SUPABASE_SERVICE_ROLE_KEY` bypasses Row Level Security entirely and grants full
read/write to **every** tenant's data. Treat it as the most sensitive secret in the system.

## Incident: service_role key previously committed

A live `SUPABASE_SERVICE_ROLE_KEY` was committed to `.env.development` and `.env.production`.
The value has been removed from the working tree, but **it remains in git history** and must
be treated as compromised.

Required remediation (in order):

1. **Rotate the key first.** Supabase Dashboard → Project Settings → API → *Reset*
   `service_role` (and reset the JWT secret if you want existing tokens invalidated).
   Rotation is what actually revokes the exposure — do this before anything else.
2. **Update the secret store** (Supabase Edge Functions, Cloudflare Workers, local
   `.env.local`) with the new key. Do **not** put it back into any tracked file.
3. **Purge the old value from git history** once rotated — e.g. with
   [`git filter-repo`](https://github.com/newren/git-filter-repo) or the BFG Repo-Cleaner —
   then force-push and have collaborators re-clone. (Rotation makes the leaked key useless;
   history purge removes the artifact.)
4. **Audit for misuse** — review Supabase logs for unexpected `service_role` access while the
   key was exposed.

## Hardening applied (2026-07-27)

**RLS on previously unprotected tables** — `migrations/20260727000001_rls_hardening_unprotected_tables.sql`.
Several tables were queried directly from the browser with the anon key while
having **no Row Level Security**, so the client-side `.eq("organization_id"/"user_id", …)`
filters were the only isolation — trivially bypassable from devtools. This closed
an active cross-tenant read/write exposure on `automation_configs`,
`automation_logs`, `bylda_events`, and `notifications`, and added database-level
policies to `tool_outputs` and `bylda_conversations` as well. `plan_entitlements_data`
(global plan/tier reference config) is now read-only to clients. `service_role`
has `BYPASSRLS`, so the Workers and Edge Functions are unaffected.

## Recommended next (staged — needs live verification)

- **Move the Cloudflare Workers off `service_role` for user data.** The user-facing
  Workers (`bylda-contacts-api`, `bylda-ai-api`, etc.) currently query with the
  `service_role` key and enforce isolation with an application-level
  `user_id=eq.<sub>` filter. That works today, but a forgotten filter would leak
  across tenants with no database backstop. The stronger design is to forward the
  caller's JWT to PostgREST (anon key as `apikey`) and let RLS enforce isolation.
  This was **not** applied blindly because it depends on table-level `GRANT`s to
  the `authenticated` role that must be verified against the live database first —
  do this behind a staging check, one worker at a time, keeping the existing filter
  as defense-in-depth. RLS policies for the affected tables now exist (above), so
  the database side is ready.
- **Rate limiting / abuse protection** on the unauthenticated public endpoints
  (`track-event`, `book-appointment`). Needs a shared store (Cloudflare KV /
  Durable Objects) — deferred rather than shipped untested.
- **Admin grant hardcoded in a migration** (`20260603030442…`) pins a specific user
  as a DB-level admin with an RLS bypass. Consider managing admin grants
  out-of-band so a personal account isn't coupled to god-mode in source.

## How user data is protected (summary)

- **Auth:** Supabase Auth (JWT). The frontend uses only the anon/publishable key. Edge
  Functions default to `verify_jwt = true`; the exceptions (webhooks, crons, public
  endpoints) enforce their own auth (Stripe signature verification, or a service-role shared
  secret). Cloudflare Workers validate the caller's JWT before acting and re-scope every
  query by `user_id`.
- **Row Level Security:** enabled with user/org-scoped policies keyed on `auth.uid()`,
  helper functions (`has_role`, `is_org_owner`, `is_org_member`), restrictive deny-all
  policies on sensitive tables, and `security_invoker` views.
- **Secrets at rest:** stored third-party integration credentials are AES-256 encrypted via
  `INTEGRATIONS_ENCRYPTION_KEY`; `save-integration` fails closed if the key is missing/weak.
