import assert from 'node:assert/strict';
import test from 'node:test';

const base = 'http://127.0.0.1:8787';
const property = '10000000-0000-4000-8000-000000000011';
const foreign = '10000000-0000-4000-8000-000000000021';
const sibling = '10000000-0000-4000-8000-000000000012';
const secrets = process.loadEnvFile;
secrets('.dev.vars');
const dataApi = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_PUBLISHABLE_KEY;
const password = 'Stayflow-local-demo-007!';

function browser() {
  const cookies = new Map();
  let csrf = '';
  return {
    cookies,
    async call(path, body, origin = base) {
      const headers = { Cookie: [...cookies].map(([k,v]) => k+'='+v).join('; ') };
      if (body !== undefined) Object.assign(headers, {
        Origin: origin, 'Content-Type': 'application/json', 'X-CSRF-Token': csrf
      });
      const response = await fetch(base + path, {
        method: body === undefined ? 'GET' : 'POST', headers, body: JSON.stringify(body)
      });
      for (const directive of response.headers.getSetCookie()) {
        const [pair] = directive.split(';');
        const [name, value] = pair.split('=');
        if (value) cookies.set(name, value);
        else cookies.delete(name);
      }
      const result = await response.json();
      if (result.csrf) csrf = result.csrf;
      return { status: response.status, result, headers: response.headers };
    }
  };
}

async function login(identity, client = browser()) {
  await client.call('/api/session');
  const response = await client.call('/api/sign-in', { email: identity+'@stayflow.test', password });
  assert.equal(response.status, 200);
  assert.match(response.headers.getSetCookie().join(' '), /HttpOnly; Secure; SameSite=Lax/i);
  assert.equal(response.result.session.properties.length, 1);
  return client;
}

const rooms = id => '/api/properties/' + id + '/rooms';
const roomStatus = 'available';

test('anonymous routes deny access and session API does not return provider credentials', async () => {
  const client = browser();
  assert.equal((await client.call(rooms(property))).status, 401);
  assert.equal((await client.call('/api/session')).result.session, null);
  const signIn = await client.call('/api/sign-in', { email: 'manager@stayflow.test', password }, 'https://outside.invalid');
  assert.equal(signIn.status, 403);
});

test('two organisations only see assigned rooms and cannot write to foreign or sibling properties', async () => {
  const a = await login('manager');
  const b = await login('other');
  assert.equal((await a.call(rooms(property))).status, 200);
  assert.equal((await b.call(rooms(foreign))).status, 200);
  for (const id of [foreign, sibling]) {
    assert.equal((await a.call(rooms(id))).status, 403);
    assert.equal((await a.call(rooms(id), { label: 'Foreign 01', status: roomStatus })).status, 403);
  }
  assert.equal((await b.call(rooms(property))).status, 403);
});

test('restricted staff cannot configure rooms or see guest details', async () => {
  const client = await login('operations');
  const read = await client.call(rooms(property));
  assert.equal(read.status, 200);
  assert.ok(read.result.rooms.some(r => r.status === 'occupied'));
  assert.ok(read.result.rooms.every(r => r.guest === null && r.expectedDeparture === null));
  assert.equal((await client.call(rooms(property), { label: 'Forbidden 01', status: roomStatus })).status, 403);
});

test('direct Data API denies anonymous routines, private tables, and foreign reads or writes for a real JWT', async () => {
  const provider = await fetch(dataApi+'/auth/v1/token?grant_type=password', {
    method:'POST', headers:{ apikey:key, 'Content-Type':'application/json' },
    body:JSON.stringify({email:'manager@stayflow.test',password})
  });
  assert.equal(provider.status,200);
  const {access_token:token} = await provider.json();
  const rpc = (name, body, authenticated) => fetch(dataApi+'/rest/v1/rpc/'+name, {
    method:'POST', headers:{ apikey:key, 'Content-Type':'application/json',
      ...(authenticated ? {Authorization:'Bearer '+token} : {}) }, body:JSON.stringify(body)
  });
  assert.equal((await rpc('list_rooms',{p_property:property},false)).ok,false);
  assert.equal((await fetch(dataApi+'/rest/v1/room',{headers:{apikey:key,Authorization:'Bearer '+token,'Accept-Profile':'stayflow'}})).ok,false);
  assert.equal((await rpc('list_rooms',{p_property:property},true)).ok,true);
  assert.equal((await rpc('list_rooms',{p_property:foreign},true)).status,403);
  assert.equal((await rpc('save_room',{p_property:foreign,p_room:null,p_label:'Foreign 02',p_state:roomStatus},true)).status,403);
});

test('two independent authenticated requests cannot check in two guests to the same room', async () => {
  const manager = await login('manager');
  const reception = await login('reception');
  const label = 'Race '+crypto.randomUUID().slice(0,7);
  const added = await manager.call(rooms(property), {label,status:roomStatus});
  assert.equal(added.status, 200);
  const id = added.result.id;
  const route = rooms(property)+'/'+id+'/check-in';
  const contenders = await Promise.all([manager,reception].map((actor,i) =>
    actor.call(route,{guest:'Synthetic Race '+i,expectedDeparture:null})));
  assert.deepEqual(contenders.map(r=>r.status).sort(),[200,409]);
  const persisted = (await manager.call(rooms(property))).result.rooms.find(r=>r.id===id);
  assert.equal(persisted.status,'occupied');
  assert.match(persisted.guest,/^Synthetic Race [01]$/);
  assert.equal((await manager.call(rooms(property),{id,label,status:'out_of_service'})).status,409);
});

test('refresh rotates a valid provider session and logout clears the browser session', async () => {
  const client = await login('reception');
  const expiredName = [...client.cookies.keys()].find(name=>name.endsWith('sf-access'));
  assert.ok(expiredName);
  client.cookies.set(expiredName,'invalid.jwt.signature');
  assert.equal((await client.call('/api/session')).result.session.properties.length,1);
  assert.equal((await client.call(rooms(property))).status,200);
  assert.equal((await client.call('/api/sign-out',{})).status,200);
  assert.equal((await client.call('/api/session')).result.session,null);
  assert.equal((await client.call(rooms(property))).status,401);
});
