-- Initialize admin_user for TAO SDLC
-- Run this as postgres superuser: psql -U postgres -f init_user.sql

-- Create admin_user if doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_user WHERE usename = 'admin_user') THEN
    CREATE USER admin_user WITH PASSWORD 'Postgres@9527';
  END IF;
END
$$;

-- Reset password (in case user already exists)
ALTER USER admin_user WITH PASSWORD 'Postgres@9527';

-- Grant database creation privilege
ALTER USER admin_user CREATEDB;

-- Grant all privileges on sdlc database
GRANT ALL PRIVILEGES ON DATABASE sdlc TO admin_user;

-- Change database owner
ALTER DATABASE sdlc OWNER TO admin_user;

-- Connect to sdlc database and grant schema permissions
\c sdlc

-- Grant all on public schema
GRANT ALL ON SCHEMA public TO admin_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO admin_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO admin_user;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO admin_user;

-- Set default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO admin_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO admin_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO admin_user;

\echo 'User admin_user has been configured successfully!'
\echo 'You can now connect with: postgresql://admin_user:Postgres@9527@localhost:5432/sdlc'

