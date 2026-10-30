-- Least-privilege login for the App Service.
--
-- Not a Drizzle migration. The deploy workflow applies drizzle/ as catraders_admin
-- (Key Vault secret database-url). Run this by hand, as that same admin, after
-- those migrations exist. Re-running is safe and does not change the password.
--
--   psql "$ADMIN_DATABASE_URL" -v ON_ERROR_STOP=1 -f db/catraders_app.sql
--   ALTER ROLE catraders_app PASSWORD 'url-safe-password';
--
-- Then store the URL in Key Vault secret database-url-app (see iac/README.md).
--
-- Tables are the ones in src/server/db/schema.ts. Production statements:
--   quote_requests        INSERT, SELECT, UPDATE (status)
--   quote_items           INSERT, SELECT
--   inquiries             INSERT, SELECT, UPDATE (status)
--   oauth_clients         INSERT, SELECT
--   oauth_codes           INSERT, SELECT, DELETE (consume and expiry sweep)
--   oauth_refresh_tokens  INSERT, SELECT, DELETE (rotate and expiry sweep)
-- DELETE ... RETURNING needs SELECT as well as DELETE.
-- Nothing in the application TRUNCATEs, and nothing else is deleted.
-- Test cleanup deletes rows as the table owner; those tests do not use this role.
-- Schema drizzle (migration history) stays admin-only.
--
-- SELECT, INSERT, and UPDATE are also the default privileges for tables
-- catraders_admin creates later. DELETE is not. Re-run this file if a migration
-- recreates oauth_codes or oauth_refresh_tokens, or if the app must delete
-- from a new table. There are no sequences today (uuid keys via gen_random_uuid);
-- USAGE is granted anyway so a future identity column keeps working.

BEGIN;

DO $$
BEGIN
  IF current_user IS DISTINCT FROM 'catraders_admin' THEN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'catraders_admin') THEN
      RAISE EXCEPTION 'run db/catraders_app.sql as catraders_admin (current user: %)', current_user;
    ELSIF NOT pg_has_role(current_user, 'catraders_admin', 'MEMBER') THEN
      RAISE EXCEPTION 'run db/catraders_app.sql as catraders_admin (current user: %)', current_user;
    END IF;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'catraders_app') THEN
    CREATE ROLE catraders_app WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE INHERIT;
  END IF;
END
$$;

-- Re-assert login and deny creating databases or roles. Password is omitted, so
-- this does not rotate or clear it. NOSUPERUSER is set on CREATE only: a
-- non-superuser admin (Azure) may not touch the SUPERUSER attribute, and
-- cannot create a superuser in the first place. The check below still rejects
-- a superuser role.
ALTER ROLE catraders_app WITH LOGIN NOCREATEDB NOCREATEROLE INHERIT;

DO $$
DECLARE
  missing text;
BEGIN
  SELECT string_agg(name, ', ' ORDER BY name)
    INTO missing
  FROM unnest(ARRAY[
    'quote_requests',
    'quote_items',
    'inquiries',
    'oauth_clients',
    'oauth_codes',
    'oauth_refresh_tokens'
  ]) AS name
  WHERE NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = name
  );

  IF missing IS NOT NULL THEN
    RAISE EXCEPTION 'catraders_app grants: missing public tables: %', missing;
  END IF;
END
$$;

DO $$
DECLARE
  super boolean;
  createdb boolean;
  createrole boolean;
BEGIN
  SELECT rolsuper, rolcreatedb, rolcreaterole
    INTO super, createdb, createrole
  FROM pg_roles
  WHERE rolname = 'catraders_app';

  IF super OR createdb OR createrole THEN
    RAISE EXCEPTION 'catraders_app must not be superuser and must not create databases or roles';
  END IF;
END
$$;

DO $$
BEGIN
  EXECUTE format('GRANT CONNECT ON DATABASE %I TO catraders_app', current_database());
  EXECUTE format('REVOKE CREATE ON DATABASE %I FROM catraders_app', current_database());
END
$$;

GRANT USAGE ON SCHEMA public TO catraders_app;
REVOKE CREATE ON SCHEMA public FROM catraders_app;

GRANT USAGE ON TYPE public.quote_status TO catraders_app;

REVOKE ALL ON TABLE
  public.quote_requests,
  public.quote_items,
  public.inquiries,
  public.oauth_clients,
  public.oauth_codes,
  public.oauth_refresh_tokens
FROM catraders_app;

GRANT SELECT, INSERT, UPDATE ON TABLE
  public.quote_requests,
  public.quote_items,
  public.inquiries,
  public.oauth_clients,
  public.oauth_codes,
  public.oauth_refresh_tokens
TO catraders_app;

-- DELETE only where src/server/oauth/repository.ts removes rows.
GRANT DELETE ON TABLE public.oauth_codes, public.oauth_refresh_tokens TO catraders_app;

REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM catraders_app;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO catraders_app;

ALTER DEFAULT PRIVILEGES FOR ROLE catraders_admin IN SCHEMA public
  REVOKE ALL ON TABLES FROM catraders_app;
ALTER DEFAULT PRIVILEGES FOR ROLE catraders_admin IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE ON TABLES TO catraders_app;

ALTER DEFAULT PRIVILEGES FOR ROLE catraders_admin IN SCHEMA public
  REVOKE ALL ON SEQUENCES FROM catraders_app;
ALTER DEFAULT PRIVILEGES FOR ROLE catraders_admin IN SCHEMA public
  GRANT USAGE ON SEQUENCES TO catraders_app;

DO $$
BEGIN
  IF has_schema_privilege('catraders_app', 'public', 'CREATE') THEN
    RAISE EXCEPTION 'catraders_app can create objects in public (DDL is not allowed)';
  END IF;
  IF has_database_privilege('catraders_app', current_database(), 'CREATE') THEN
    RAISE EXCEPTION 'catraders_app can create schemas (DDL is not allowed)';
  END IF;
END
$$;

COMMIT;
