import { createClient, type Session } from '@supabase/supabase-js';

export type Env = {
  SUPABASE_URL: string;
  SUPABASE_PUBLISHABLE_KEY: string;
  APP_ORIGIN: string;
  ASSETS: { fetch(request: Request): Promise<Response> };
};

const accessName = '__Host-sf-access';
const refreshName = '__Host-sf-refresh';
export const csrfName = '__Host-sf-csrf';

export function readCookies(request: Request) {
  return new Map((request.headers.get('Cookie') ?? '').split(';').map(entry => {
    const [key, ...value] = entry.trim().split('=');
    return [key, value.join('=')];
  }));
}

export function cookie(name: string, value: string, seconds: number) {
  return name + '=' + value + '; Path=/; Max-Age=' + seconds + '; HttpOnly; Secure; SameSite=Lax';
}

export function provider(env: Env, token?: string) {
  return createClient(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: (input, init) => fetch(input, {
      ...init, redirect: 'manual', // workerd rejects 'error'; a 3xx from the provider surfaces as a failed call
      signal: AbortSignal.any([AbortSignal.timeout(8000), ...(init?.signal ? [init.signal] : [])])
    }) },
    ...(token ? { accessToken: async () => token } : {})
  });
}

export function sessionCookies(session: Session) {
  return [
    cookie(accessName, session.access_token, session.expires_in),
    cookie(refreshName, session.refresh_token, 8 * 60 * 60)
  ];
}

export function clearSession() {
  return [cookie(accessName,'',0), cookie(refreshName,'',0)];
}

export async function authenticate(env: Env, cookies: Map<string,string>) {
  const access = cookies.get(accessName);
  const refresh = cookies.get(refreshName);
  if (!access && !refresh) return { token: null, cookies: [] };
  const api = provider(env);
  if (access) {
    const { data, error } = await api.auth.getUser(access);
    if (data.user) return { token: access, cookies: [] };
    if (error?.status && error.status >= 500) throw new Error('Provider not ready');
  }
  if (refresh) {
    const { data, error } = await api.auth.refreshSession({ refresh_token: refresh });
    if (data.session) return { token: data.session.access_token, cookies: sessionCookies(data.session) };
    if (error?.status && error.status >= 500) throw new Error('Provider not ready');
  }
  return { token: null, cookies: clearSession() };
}

export async function revokeSession(env: Env, cookies: Map<string,string>) {
  const session = await authenticate(env,cookies);
  if (session.token) {
    const { error } = await provider(env).auth.admin.signOut(session.token, 'local');
    if (error) throw new Error('Provider did not confirm logout');
  }
}
