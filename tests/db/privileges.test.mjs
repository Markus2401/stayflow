import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import test from 'node:test';

// Runs SQL inside the project's own local database container, as the local admin. Synthetic data only.
const sql = query => execFileSync('docker', [
  'exec', 'supabase_db_stayflow-local', 'psql', '-U', 'postgres', '-tAq', '-v', 'ON_ERROR_STOP=1', '-c', query
], { encoding: 'utf8' }).trim();

// SET LOCAL prints nothing, so the whole output is the query result; the transaction never commits.
const asCommands = (claims, select) => sql(
  `begin; set local role stayflow_commands; set local request.jwt.claims = '${claims}'; ${select}; rollback;`
);

const user = '10000000-0000-4000-8000-000000000031';

test('identity comes only from the verified authenticated JWT claims', () => {
  const identity = 'select stayflow.current_user_id()';
  assert.equal(asCommands(JSON.stringify({ sub: user, role: 'authenticated' }), identity), user);
  assert.equal(asCommands(JSON.stringify({ sub: user, role: 'anon' }), identity), '');
  assert.equal(asCommands('{}', identity), '');
  // Malformed claims must fail closed with an error, never fall back to a default identity.
  assert.throws(() => asCommands('not json', identity), /invalid input syntax/);
  assert.throws(() => asCommands(JSON.stringify({ sub: 'not-a-uuid', role: 'authenticated' }), identity), /invalid input syntax/);
});

test('client roles cannot reach the identity helper or the private schema', () => {
  for (const role of ['anon', 'authenticated', 'service_role']) {
    assert.equal(sql(`select has_function_privilege('${role}','stayflow.current_user_id()','execute')`), 'f', role);
    assert.equal(sql(`select has_schema_privilege('${role}','stayflow','usage')`), 'f', role);
  }
});

test('only signed-in users may call the four public RPCs, and nobody else, including PUBLIC', () => {
  const rpcs = ['list_properties()', 'list_rooms(uuid)', 'save_room(uuid,uuid,text,text)', 'check_in(uuid,uuid,text,date)'];
  for (const rpc of rpcs) {
    const signature = `public.${rpc}`;
    assert.equal(sql(`select has_function_privilege('authenticated','${signature}','execute')`), 't', rpc);
    for (const role of ['anon', 'service_role']) {
      assert.equal(sql(`select has_function_privilege('${role}','${signature}','execute')`), 'f', `${role} ${rpc}`);
    }
    assert.equal(sql(`select count(*) from aclexplode((select proacl from pg_proc where oid='${signature}'::regprocedure)) where grantee=0`), '0', `PUBLIC ${rpc}`);
    assert.equal(sql(`select prosecdef from pg_proc where oid='${signature}'::regprocedure`), 't', rpc);
    assert.equal(sql(`select pg_get_userbyid(proowner) from pg_proc where oid='${signature}'::regprocedure`), 'stayflow_commands', rpc);
  }
});

test('the command role stays least-privilege and every private table forces row level security', () => {
  assert.equal(sql(`select rolsuper or rolbypassrls or rolcreatedb or rolcreaterole or rolcanlogin from pg_roles where rolname='stayflow_commands'`), 'f');
  assert.equal(sql(`select has_schema_privilege('stayflow_commands','auth','usage')`), 'f');
  assert.equal(sql(`select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='stayflow' and c.relkind='r' and not (c.relrowsecurity and c.relforcerowsecurity)`), '0');
  assert.equal(sql(`select count(*) from information_schema.table_privileges
    where table_schema='stayflow' and grantee in ('anon','authenticated','service_role','PUBLIC')`), '0');
});
