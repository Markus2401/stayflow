import { useEffect, useRef, useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import type { Room } from '../shared/contracts';
import { call, message, RequestError } from './api';

export type RoomAction = { kind:'new' } | { kind:'edit'|'check-in'; room:Room };

export function RoomDialog({ action, endpoint, csrf, onClose, onSaved, onConflict, onSessionEnded }:{
  action:RoomAction; endpoint:string; csrf:string; onClose:()=>void; onSaved:(text:string,label:string)=>void;
  onConflict:()=>void; onSessionEnded:()=>void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [pending,setPending] = useState(false);
  const [error,setError] = useState('');
  const edit = action.kind === 'edit' ? action.room : null;
  const target = action.kind === 'check-in' ? action.room : null;
  useEffect(()=>{
    const element = dialog.current;
    const trigger = document.activeElement;
    element?.showModal();
    element?.querySelector('input')?.focus();
    return () => {
      element?.close();
      if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus();
    };
  },[]);

  async function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    setPending(true);
    setError('');
    try {
      if (target) {
        await call(endpoint+'/'+target.id+'/check-in',{
          guest:values.get('guest'),expectedDeparture:values.get('departure') || null
        },csrf);
        onSaved('Guest checked into '+target.label+'.',target.label);
      } else {
        const label = String(values.get('label')).trim();
        await call(endpoint,{label,status:values.get('status'),...(edit ? {id:edit.id} : {})},csrf);
        onSaved(edit ? 'Room '+label+' updated.' : 'Room '+label+' added.',label);
      }
    } catch(error) {
      if (error instanceof RequestError && error.status === 401) onSessionEnded();
      if (error instanceof RequestError && error.status === 409 && target) onConflict();
      setError(message(error));
    } finally { setPending(false); }
  }
  return <dialog ref={dialog} aria-labelledby="dialog-heading"
    onCancel={event=>{event.preventDefault(); if (!pending) onClose();}}>
    <header className="dialog-head">
      <h2 id="dialog-heading">{target ? 'Check in to '+target.label : edit ? 'Edit room '+edit.label : 'Add room'}</h2>
      <button type="button" className="btn btn-quiet btn-icon" aria-label="Close dialog" onClick={onClose} disabled={pending}><X size={20} aria-hidden="true"/></button>
    </header>
    <form className="stack" onSubmit={submit}>
      {target ? <>
        <p className="dialog-lede">Confirm that the guest has arrived and is staying in room <strong>{target.label}</strong>.</p>
        <label className="field">Guest name<input name="guest" maxLength={100} required autoComplete="off"/></label>
        <label className="field"><span>Expected departure <span className="hint">Optional</span></span><input name="departure" type="date"/></label>
      </> : <>
        <label className="field">Room identifier<input name="label" maxLength={32} defaultValue={edit?.label} required autoComplete="off"/></label>
        <label className="field">Status<select name="status" defaultValue={edit?.status ?? 'available'}>
          <option value="available">Available</option><option value="out_of_service">Out of service</option>
        </select></label>
      </>}
      {error && <p className="alert" role="alert">{error}</p>}
      <footer className="dialog-foot">
        <button type="button" className="btn btn-secondary" onClick={onClose} disabled={pending}>Cancel</button>
        <button className="btn btn-primary" disabled={pending}>{pending ? 'Saving…' : target ? 'Confirm check-in' : edit ? 'Save room' : 'Add room'}</button>
      </footer>
    </form>
  </dialog>;
}
