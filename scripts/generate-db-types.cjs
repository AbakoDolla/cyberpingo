#!/usr/bin/env node
// Generates types/database.types.ts from supabase/migrations, in the same shape as
// `supabase gen types typescript`. Runs offline against PGlite, so the types always match the
// migrations committed in this repository. Against a hosted project you can also run:
//   npx supabase gen types typescript --linked --schema public > types/database.types.ts
const fs = require("node:fs");
const path = require("node:path");
const { root } = require("./ts-loader.cjs");
const { createSupabaseDatabase } = require("./pglite-supabase.cjs");

const OUTPUT = path.join(root, "types", "database.types.ts");

const SCALARS = {
  bool: "boolean",
  int2: "number", int4: "number", int8: "number", float4: "number", float8: "number", numeric: "number", oid: "number",
  text: "string", varchar: "string", bpchar: "string", citext: "string", name: "string", uuid: "string",
  date: "string", time: "string", timetz: "string", timestamp: "string", timestamptz: "string", interval: "string",
  inet: "string", cidr: "string", bytea: "string",
  json: "Json", jsonb: "Json",
  void: "undefined",
};

function tsType(typname, elemTypname) {
  if (elemTypname) return `${tsType(elemTypname)}[]`;
  const mapped = SCALARS[typname];
  if (!mapped) throw new Error(`Type Postgres non géré : ${typname}`);
  return mapped;
}

const key = (name) => (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name) ? name : JSON.stringify(name));
const indent = (text, depth) => text.split("\n").map((line) => (line ? "  ".repeat(depth) + line : line)).join("\n");

async function introspect(db) {
  const columns = (await db.query(`
    select c.relname as relation, c.relkind as kind, a.attname as name, t.typname, et.typname as elem,
           a.attnotnull as not_null, a.atthasdef as has_default, a.attidentity <> '' as identity, a.attgenerated <> '' as generated
    from pg_attribute a
    join pg_class c on c.oid = a.attrelid
    join pg_namespace n on n.oid = c.relnamespace
    join pg_type t on t.oid = a.atttypid
    left join pg_type et on et.oid = t.typelem and t.typcategory = 'A'
    where n.nspname = 'public' and c.relkind in ('r', 'v', 'p') and a.attnum > 0 and not a.attisdropped
    order by c.relname, a.attnum`)).rows;

  const relationships = (await db.query(`
    select con.conname as name, src.relname as relation, dst.relname as referenced,
           (select array_agg(a.attname order by k.ord) from unnest(con.conkey) with ordinality k(attnum, ord)
              join pg_attribute a on a.attrelid = con.conrelid and a.attnum = k.attnum) as columns,
           (select array_agg(a.attname order by k.ord) from unnest(con.confkey) with ordinality k(attnum, ord)
              join pg_attribute a on a.attrelid = con.confrelid and a.attnum = k.attnum) as referenced_columns,
           exists (select 1 from pg_constraint u where u.conrelid = con.conrelid and u.contype in ('p', 'u')
              and (select array_agg(x order by x) from unnest(u.conkey) x) = (select array_agg(x order by x) from unnest(con.conkey) x)) as one_to_one
    from pg_constraint con
    join pg_class src on src.oid = con.conrelid
    join pg_class dst on dst.oid = con.confrelid
    join pg_namespace sn on sn.oid = src.relnamespace
    join pg_namespace dn on dn.oid = dst.relnamespace
    where con.contype = 'f' and sn.nspname = 'public' and dn.nspname = 'public'
    order by src.relname, con.conname`)).rows;

  const functions = (await db.query(`
    select p.proname as name, p.pronargs as nargs, p.pronargdefaults as ndefaults, p.proretset as returns_set,
           coalesce(p.proargnames, '{}') as arg_names,
           (select array_agg(t.typname order by k.ord) from unnest(p.proargtypes) with ordinality k(oid, ord) join pg_type t on t.oid = k.oid) as arg_types,
           (select array_agg(coalesce(et.typname, '') order by k.ord) from unnest(p.proargtypes) with ordinality k(oid, ord)
              join pg_type t on t.oid = k.oid left join pg_type et on et.oid = t.typelem and t.typcategory = 'A') as arg_elems,
           rt.typname as return_type, coalesce(ret.typname, '') as return_elem
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    join pg_type rt on rt.oid = p.prorettype
    left join pg_type ret on ret.oid = rt.typelem and rt.typcategory = 'A'
    where n.nspname = 'public' and p.prokind = 'f' and rt.typname <> 'trigger'
      and (has_function_privilege('authenticated', p.oid, 'execute') or has_function_privilege('anon', p.oid, 'execute'))
    order by p.proname`)).rows;

  return { columns, relationships, functions };
}

function renderRelation(name, cols, rels, isView) {
  const row = cols.map((col) => {
    const nullable = isView || !col.not_null;
    return `${key(col.name)}: ${tsType(col.typname, col.elem)}${nullable ? " | null" : ""}`;
  });
  const insert = cols.filter((col) => !col.generated).map((col) => {
    const optional = !col.not_null || col.has_default || col.identity || isView;
    return `${key(col.name)}${optional ? "?" : ""}: ${tsType(col.typname, col.elem)}${!col.not_null || isView ? " | null" : ""}`;
  });
  const update = cols.filter((col) => !col.generated).map((col) => `${key(col.name)}?: ${tsType(col.typname, col.elem)}${!col.not_null || isView ? " | null" : ""}`);
  const relationships = rels.length
    ? `[\n${rels.map((rel) => indent([
      "{",
      `  foreignKeyName: ${JSON.stringify(rel.name)}`,
      `  columns: ${JSON.stringify(rel.columns)}`,
      `  isOneToOne: ${rel.one_to_one}`,
      `  referencedRelation: ${JSON.stringify(rel.referenced)}`,
      `  referencedColumns: ${JSON.stringify(rel.referenced_columns)}`,
      "},",
    ].join("\n"), 1)).join("\n")}\n]`
    : "[]";
  const block = (title, fields) => `${title}: {\n${fields.map((field) => `  ${field}`).join("\n")}\n}`;
  const parts = [block("Row", row)];
  if (!isView) parts.push(block("Insert", insert), block("Update", update));
  parts.push(`Relationships: ${relationships}`);
  return `${key(name)}: {\n${indent(parts.join("\n"), 1)}\n}`;
}

function renderFunction(fn) {
  const names = fn.arg_names.slice(0, fn.nargs);
  const firstOptional = fn.nargs - fn.ndefaults;
  const args = names.map((argName, index) => `${key(argName)}${index >= firstOptional ? "?" : ""}: ${tsType(fn.arg_types[index], fn.arg_elems[index] || null)}`);
  const argsType = args.length ? `{\n${args.map((arg) => `  ${arg}`).join("\n")}\n}` : "never";
  const returns = tsType(fn.return_type, fn.return_elem || null) + (fn.returns_set ? "[]" : "");
  return `${key(fn.name)}: {\n${indent(`Args: ${argsType}\nReturns: ${returns}`, 1)}\n}`;
}

async function buildDatabaseTypes() {
  const db = await createSupabaseDatabase();
  try {
    const { columns, relationships, functions } = await introspect(db);
    const byRelation = new Map();
    for (const col of columns) {
      if (!byRelation.has(col.relation)) byRelation.set(col.relation, { kind: col.kind, cols: [] });
      byRelation.get(col.relation).cols.push(col);
    }
    const relsOf = (name) => relationships.filter((rel) => rel.relation === name);
    const tables = [...byRelation].filter(([, rel]) => rel.kind !== "v").map(([name, rel]) => renderRelation(name, rel.cols, relsOf(name), false));
    const views = [...byRelation].filter(([, rel]) => rel.kind === "v").map(([name, rel]) => renderRelation(name, rel.cols, relsOf(name), true));
    const section = (title, items) => `${title}: ${items.length ? `{\n${indent(items.join("\n"), 1)}\n}` : "{\n  [_ in never]: never\n}"}`;

    const schema = [
      section("Tables", tables),
      section("Views", views),
      section("Functions", functions.map(renderFunction)),
      section("Enums", []),
      section("CompositeTypes", []),
    ].join("\n");

    return `// Generated by scripts/generate-db-types.cjs from supabase/migrations. Do not edit by hand.
// Regenerate with \`npm run db:types\` after every schema change.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
${indent(schema, 2)}
  }
}

type PublicSchema = Database["public"]

export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"]
export type TablesInsert<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Insert"]
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Update"]
export type Views<T extends keyof PublicSchema["Views"]> = PublicSchema["Views"][T]["Row"]
export type Functions<T extends keyof PublicSchema["Functions"]> = PublicSchema["Functions"][T]
`;
  } finally {
    await db.close();
  }
}

if (require.main === module) {
  buildDatabaseTypes().then((source) => {
    fs.writeFileSync(OUTPUT, source);
    console.log(`Types écrits dans ${path.relative(root, OUTPUT)}`);
  }).catch((error) => { console.error(error); process.exit(1); });
}

module.exports = { buildDatabaseTypes, OUTPUT };
