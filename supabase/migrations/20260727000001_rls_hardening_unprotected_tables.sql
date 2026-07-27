-- RLS hardening: enable Row Level Security + tenant-scoped policies on tables
-- that were previously left unprotected.
--
-- Why this matters: several of these tables are queried DIRECTLY from the
-- browser with the anon/publishable key — automation_configs, automation_logs,
-- bylda_events, and notifications. With no RLS, the client-side
-- `.eq("organization_id", ...)` / `.eq("user_id", ...)` filters were the ONLY
-- thing scoping the data, and a client can simply omit or change them. That is
-- an active cross-tenant read/write exposure, not just a missing backstop.
--
-- service_role (used by the Cloudflare Workers and Edge Functions) has the
-- BYPASSRLS attribute, so these policies do NOT affect those server paths —
-- workers keep functioning unchanged. The policies only constrain the
-- anon/authenticated roles used by the browser.
--
-- The migration is defensive because a few of these tables were created via the
-- Supabase dashboard rather than in migration source: it skips tables that do
-- not exist and derives the scoping predicate from whichever tenant columns are
-- actually present (organization_id and/or user_id).

do $$
declare
  tbl        text;
  has_user   boolean;
  has_org    boolean;
  has_admin  boolean;
  pred       text;
begin
  -- Is the admin-override helper available on this database/branch?
  select exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'is_admin'
  ) into has_admin;

  foreach tbl in array array[
    'notifications',
    'tool_outputs',
    'bylda_conversations',
    'bylda_events',
    'automation_configs',
    'automation_logs'
  ]
  loop
    -- Skip tables that do not exist on this database/branch.
    if to_regclass('public.' || tbl) is null then
      continue;
    end if;

    select exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = tbl and column_name = 'user_id'
    ) into has_user;

    select exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = tbl and column_name = 'organization_id'
    ) into has_org;

    -- Build the tenant predicate from the columns that actually exist.
    pred := '';
    if has_org then
      pred := 'public.is_org_member(organization_id, auth.uid())';
    end if;
    if has_user then
      pred := case when pred = '' then '' else pred || ' or ' end || 'user_id = auth.uid()';
    end if;

    -- No recognizable tenant column: do NOT enable RLS here (enabling it with no
    -- policy would deny all client access and could break a legitimate read).
    -- Flag it instead so it gets a hand-written policy.
    if pred = '' then
      raise notice 'rls_hardening: % has no user_id/organization_id column; left unchanged', tbl;
      continue;
    end if;

    if has_admin then
      pred := '(' || pred || ') or public.is_admin()';
    end if;

    execute format('alter table public.%I enable row level security', tbl);

    -- Single FOR ALL policy covers select/insert/update/delete for the browser.
    execute format('drop policy if exists %I on public.%I', 'tenant_isolation', tbl);
    execute format(
      'create policy %I on public.%I for all to authenticated using (%s) with check (%s)',
      'tenant_isolation', tbl, pred, pred
    );
  end loop;
end $$;

-- plan_entitlements_data is global, non-sensitive plan/tier reference config
-- (not user data). Enable RLS so anon/authenticated cannot WRITE it, but keep it
-- readable. Writes continue via service_role (migrations / admin tooling).
do $$
begin
  if to_regclass('public.plan_entitlements_data') is not null then
    alter table public.plan_entitlements_data enable row level security;
    drop policy if exists "plan_entitlements_data_read" on public.plan_entitlements_data;
    create policy "plan_entitlements_data_read"
      on public.plan_entitlements_data
      for select
      using (true);
  end if;
end $$;
