import { createRoot } from 'react-dom/client';
import { useEffect, useState, type FormEvent } from 'react';
import { ChevronsUpDown, LogOut } from 'lucide-react';
import type { SessionState, Property } from '../shared/contracts';
import { call, message } from './api';
import { Doorways, initials, Wordmark } from './brand';
import { Rooms } from './rooms';
import './styles.css';

function SignIn({ csrf, onSession }: { csrf: string; onSession: (session: SessionState) => void }) {
  const [pending,setPending] = useState(false);
  const [failure,setFailure] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    setPending(true);
    setFailure('');
    try {
      onSession(await call<SessionState>('sign-in',{email:values.get('email'),password:values.get('password')},csrf));
    } catch(error) { setFailure(message(error)); }
    finally { setPending(false); }
  }
  return <main className="entry">
    <div className="entry-brand">
      <Wordmark onDark/>
      <p className="tagline">Know every room.<br/><span>Welcome every guest.</span></p>
      <Doorways/>
    </div>
    <div className="entry-main">
      <div className="entry-form">
        <div>
          <h1>Sign in to Stayflow</h1>
          <p className="lede">Use your staff account to open your property.</p>
        </div>
        <form onSubmit={submit} className="stack">
          <label className="field">Work email<input name="email" type="email" autoComplete="username" maxLength={254} required/></label>
          <label className="field">Password<input name="password" type="password" autoComplete="current-password" maxLength={256} required/></label>
          {failure && <p className="alert" role="alert">{failure}</p>}
          <button className="btn btn-primary" disabled={pending}>{pending ? 'Signing in…' : 'Sign in'}</button>
        </form>
      </div>
      <p className="entry-note">Local demo · synthetic data only</p>
    </div>
  </main>;
}

const roles: Record<Property['role'],string> = {owner:'Owner', manager:'Manager', reception:'Reception', operations:'Operations'};

function App() {
  const [state,setState] = useState<SessionState | null>(null);
  const [selected,setSelected] = useState('');
  const [error,setError] = useState('');
  const [signingOut,setSigningOut] = useState(false);

  async function bootstrap() {
    setError('');
    try { setState(await call<SessionState>('session')); }
    catch(error) { setError(message(error)); }
  }
  useEffect(() => { void bootstrap(); },[]);
  const property = state?.session?.properties.find(p=>p.id===selected) ?? state?.session?.properties[0];
  const signedIn = Boolean(state?.session);
  useEffect(() => {
    if (state) history.replaceState(null,'',signedIn ? '/rooms' : '/sign-in');
  },[signedIn,state]);

  async function signOut() {
    setSigningOut(true);
    setError('');
    try {
      await call('sign-out',{},state?.csrf);
      setState(null);
      setSelected('');
      await bootstrap();
    } catch(error) { setError(message(error)); }
    finally { setSigningOut(false); }
  }
  if (!state) return <main className="splash">
    <Wordmark/>
    {error ? <><p role="alert" className="alert">{error}</p><button className="btn btn-secondary" onClick={bootstrap}>Try again</button></>
      : <p role="status" className="status">Connecting to Stayflow…</p>}
  </main>;
  if (!state.session) return <SignIn csrf={state.csrf} onSession={setState}/>;

  return <>
    <a className="skip" href="#workspace">Skip to rooms</a>
    <header className="topbar">
      <a href="/rooms" aria-label="Stayflow rooms"><Wordmark/></a>
      <span className="crumb" aria-hidden="true">/</span>
      <div className="identity">
        <span className="monogram" aria-hidden="true">{initials(property?.name ?? '?')}</span>
        <div className="identity-text">
          {state.session.properties.length > 1
            ? <span className="switcher">
                <select aria-label="Property" title={property?.name} value={property?.id} onChange={event=>setSelected(event.target.value)}>
                  {state.session.properties.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
                </select><ChevronsUpDown size={14} aria-hidden="true"/>
              </span>
            : <span className="property" title={property?.name}>{property?.name ?? 'Property access'}</span>}
          {property && <span className="role">{roles[property.role]}</span>}
        </div>
      </div>
      <nav aria-label="Main"><a href="/rooms" aria-current="page">Rooms</a></nav>
      <div className="account">
        <button className="btn btn-quiet" type="button" aria-label="Sign out" onClick={signOut} disabled={signingOut}>
          <LogOut size={18} aria-hidden="true"/><span>{signingOut ? 'Signing out…' : 'Sign out'}</span>
        </button>
      </div>
    </header>
    <main id="workspace" tabIndex={-1} className="workspace">
      {error && <p className="alert" role="alert">{error}</p>}
      {property ? <Rooms key={property.id} property={property} csrf={state.csrf} onSessionEnded={bootstrap}/>
        : <><h1>No property access</h1><p className="dialog-lede">Ask your manager to assign an active property to your account.</p></>}
    </main>
    <footer className="env">Local demo · synthetic data only</footer>
  </>;
}

const root = document.getElementById('root');
if (!root) throw new Error('Missing application root');
createRoot(root).render(<App/>);
