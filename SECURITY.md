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
