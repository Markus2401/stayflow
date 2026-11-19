import { authenticate, clearSession, cookie, csrfName, provider, readCookies, revokeSession, sessionCookies, type Env } from './auth';
import { boundedText, readBody, uuid, validDate } from './validation';

const headers = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security': 'max-age=31536000',
  'Content-Security-Policy': "default-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'"
};

function json(body: unknown, status = 200, cookies: string[] = []) {
  const result = new Headers({ ...headers, 'Cache-Control': 'no-store' });
  for (const value of cookies) result.append('Set-Cookie',value);
  return Response.json(body,{status,headers:result});
}

const permission = 'You do not have access to this property or action.';
const unavailable = 'The service is temporarily unavailable. Please try again.';
function rpcFailure(code: string, cookies: string[], checkingIn: boolean) {
  if (code === '42501') return json({error:permission},403,cookies);
  if (code === 'PT409' || code === '23505') return json({
    error: checkingIn ? 'This room is no longer available. Refresh the list and choose an available room.'
      : 'This room is occupied or the identifier is already in use.'
  },409,cookies);
  if (code === 'PT422') return json({error:'Expected departure cannot be in the past.'},422,cookies);
  if (code === '23514' || code === '23502' || code.startsWith('22')) {
    return json({error:'Check the form values and try again.'},422,cookies);
  }
  return json({error:unavailable},503,cookies);
}

async function sessionState(env: Env, token: string | null, csrf: string, responseCookies: string[]) {
  if (!token) return json({csrf,session:null},200,responseCookies);
  const result = await provider(env,token).rpc('list_properties');
  if (result.error) return rpcFailure(result.error.code,responseCookies,false);
  return json({csrf,session:{properties:result.data}},200,responseCookies);
}

async function api(request: Request, env: Env, path: string) {
  const incoming = readCookies(request);
  const site = request.headers.get('Sec-Fetch-Site');
  if (site && !['same-origin','none'].includes(site)) return json({error:permission},403);

  if (request.method === 'GET' && path === '/api/session') {
    const auth = await authenticate(env,incoming);
    const csrf = incoming.get(csrfName) ?? crypto.randomUUID();
    if (!incoming.has(csrfName)) auth.cookies.push(cookie(csrfName,csrf,8*60*60));
    return sessionState(env,auth.token,csrf,auth.cookies);
  }

  let body: Record<string,unknown> = {};
  if (request.method === 'POST') {
    const csrf = incoming.get(csrfName);
    if (request.headers.get('Origin') !== env.APP_ORIGIN || !csrf || request.headers.get('X-CSRF-Token') !== csrf) {
      return json({error:'The request could not be verified. Reload the page and try again.'},403);
    }
    const input = await readBody(request);
    if (!input) return json({error:'Check the form values and try again.'},422);
    body = input;
    if (path === '/api/sign-in') {
      const email = boundedText(body.email,254);
      const password = typeof body.password === 'string' ? body.password : '';
      if (!email || !email.includes('@') || !password || password.length > 256) {
        return json({error:'Enter your work email and password.'},422);
      }
      const { data, error } = await provider(env).auth.signInWithPassword({email,password});
      if (!data.session) {
        if (error?.status === 429) return json({error:'Too many sign-in attempts. Try again shortly.'},429);
        return error?.status && error.status < 500
          ? json({error:'Email or password was not accepted.'},401)
          : json({error:unavailable},503);
      }
      const nextCsrf = crypto.randomUUID();
      return sessionState(env,data.session.access_token,nextCsrf,
        [...sessionCookies(data.session),cookie(csrfName,nextCsrf,8*60*60)]);
    }
    if (path === '/api/sign-out') {
      await revokeSession(env, incoming);
      return json({ok:true},200,[...clearSession(),cookie(csrfName,'',0)]);
    }
  }

  const route = /^\/api\/properties\/([^/]+)\/rooms(?:\/([^/]+)\/check-in)?$/.exec(path);
  if (!route || !uuid.test(route[1]) || (route[2] && !uuid.test(route[2]))) return json({error:'Page not found.'},404);
  const auth = await authenticate(env,incoming);
  if (!auth.token) return json({error:'Your session ended. Sign in again.'},401,auth.cookies);
  const database = provider(env,auth.token);
  const p_property = route[1];
  if (request.method === 'GET' && !route[2]) {
    const {data,error} = await database.rpc('list_rooms',{p_property});
    return error ? rpcFailure(error.code,auth.cookies,false) : json({rooms:data},200,auth.cookies);
  }
  if (request.method !== 'POST') return json({error:'Method not allowed.'},405,auth.cookies);
  if (route[2]) {
    const guest = boundedText(body.guest,100);
    if (!guest || (body.expectedDeparture !== null && !validDate(body.expectedDeparture))) {
      return json({error:'Enter a guest name and a valid expected departure date.'},422,auth.cookies);
    }
    const {data,error} = await database.rpc('check_in',{
      p_property,p_room:route[2],p_guest:guest,p_departure:body.expectedDeparture
    });
    return error ? rpcFailure(error.code,auth.cookies,true) : json({id:data},200,auth.cookies);
  }
  const label = boundedText(body.label,32);
  if (!label || (body.status !== 'available' && body.status !== 'out_of_service')
      || (body.id !== undefined && (typeof body.id !== 'string' || !uuid.test(body.id)))) {
    return json({error:'Enter a room identifier and choose a status.'},422,auth.cookies);
  }
  const {data,error} = await database.rpc('save_room',{
    p_property,p_room:body.id ?? null,p_label:label,p_state:body.status
  });
  return error ? rpcFailure(error.code,auth.cookies,false) : json({id:data},200,auth.cookies);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.origin !== env.APP_ORIGIN) return json({error:'This host is not configured for Stayflow.'},403);
    if (url.pathname.startsWith('/api/')) {
      try { return await api(request,env,url.pathname); }
      catch { return json({error:unavailable},503); }
    }
    const response = await env.ASSETS.fetch(request);
    const secure = new Response(response.body,response);
    for (const [name,value] of Object.entries(headers)) secure.headers.set(name,value);
    return secure;
  }
};
