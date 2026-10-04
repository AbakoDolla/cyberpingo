// Boots an in-memory Postgres (PGlite) that looks enough like a Supabase project to run
// supabase/migrations/*.sql unchanged. Used by the database tests and the type generator.
const fs = require("node:fs");
const path = require("node:path");
const { root } = require("./ts-loader.cjs");

const migrationsDir = path.join(root, "supabase", "migrations");
const seedDir = path.join(root, "supabase", "seed");

// Minimal stand-ins for what Supabase provides before project migrations run, including its
// permissive default grants (so the tests prove every migration revokes what it must).
const SUPABASE_STUBS = `
  create role anon nologin;
  create role authenticated nologin;
  create schema auth;
  create table auth.users (id uuid primary key default gen_random_uuid(), email text, raw_user_meta_data jsonb not null default '{}');
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;
  grant usage on schema auth, public to anon, authenticated;
  grant execute on function auth.uid() to anon, authenticated;
  alter default privileges in schema public grant all on tables to anon, authenticated;
  alter default privileges in schema public grant all on sequences to anon, authenticated;
  alter default privileges in schema public grant all on functions to anon, authenticated;

  create schema storage;
  create table storage.buckets (id text primary key, name text not null, public boolean not null default false,
    file_size_limit bigint, allowed_mime_types text[]);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets (id),
    name text not null, owner uuid default auth.uid(), unique (bucket_id, name));
  create function storage.foldername(name text) returns text[] language sql immutable as $$
    select (string_to_array(name, '/'))[1:greatest(cardinality(string_to_array(name, '/')) - 1, 0)]
  $$;
  alter table storage.objects enable row level security;
  grant usage on schema storage to anon, authenticated;
  grant select, insert, update, delete on storage.objects to anon, authenticated;
  grant select on storage.buckets to anon, authenticated;
`;

const sqlFiles = (dir) => (fs.existsSync(dir) ? fs.readdirSync(dir).filter((name) => name.endsWith(".sql")).sort() : []);

async function runFiles(db, dir, keep = () => true) {
  for (const file of sqlFiles(dir).filter(keep)) {
    try {
      await db.exec(fs.readFileSync(path.join(dir, file), "utf8"));
    } catch (error) {
      error.message = `${file}: ${error.message}`;
      throw error;
    }
  }
}

/** Returns a PGlite instance with every migration (and optionally the seed) applied. `seedFilter` keeps only some seed files. */
async function createSupabaseDatabase({ seed = false, seedFilter = () => true } = {}) {
  const { PGlite } = await import("@electric-sql/pglite");
  const db = new PGlite();
  await db.exec(SUPABASE_STUBS);
  await runFiles(db, migrationsDir);
  if (seed) await runFiles(db, seedDir, seedFilter);
  return db;
}

module.exports = { createSupabaseDatabase, SUPABASE_STUBS };
