import { useEffect, useRef, useState } from 'react';
import { CircleCheck, DoorOpen, Plus, Search, X } from 'lucide-react';
import type { Property, Room, RoomStatus } from '../shared/contracts';
import { call, message, RequestError } from './api';
import { departure, localToday } from './departure';
import { RoomDialog, type RoomAction } from './room-dialog';

const titles: Record<RoomStatus, string> = { available: 'Available', occupied: 'Occupied', out_of_service: 'Out of service' };
const order = new Intl.Collator('en-ZA',{numeric:true,sensitivity:'base'});
const today = new Intl.DateTimeFormat('en-ZA',{weekday:'long',day:'numeric',month:'long'});
type Filter = 'all' | RoomStatus;

export function Rooms({ property, csrf, onSessionEnded }:{property:Property;csrf:string;onSessionEnded:()=>void}) {
  const [rooms,setRooms] = useState<Room[] | null>(null);
  const [query,setQuery] = useState('');
  const [filter,setFilter] = useState<Filter>('all');
  const [error,setError] = useState('');
  const [success,setSuccess] = useState('');
  const [flash,setFlash] = useState('');
  const [action,setAction] = useState<RoomAction | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const endpoint = 'properties/'+property.id+'/rooms';
  const canManage = property.role === 'owner' || property.role === 'manager';
  const canCheckIn = property.role !== 'operations';

  async function load() {
    setError('');
    try {
      const data = await call<{ rooms: Room[] }>(endpoint);
      setRooms(data.rooms.toSorted((a,b)=>order.compare(a.label,b.label)));
    } catch(error) {
      if (error instanceof RequestError && error.status === 401) { onSessionEnded(); return; }
      setRooms(null);
      setError(message(error));
    }
  }
  useEffect(()=>{void load();},[endpoint]);
  useEffect(()=>{
    if (!success) return;
    const timer = setTimeout(()=>setSuccess(''),8000);
    return ()=>clearTimeout(timer);
  },[success]);

  const count = (status:RoomStatus) => rooms?.filter(room=>room.status===status).length ?? '–';
  const segments: [Filter,string,number | string][] = [
    ['all','All',rooms?.length ?? '–'], ['available','Available',count('available')],
    ['occupied','Occupied',count('occupied')], ['out_of_service','Out of service',count('out_of_service')]];
  const needle = query.trim().toLowerCase();
  const shown = rooms?.filter(room=>(filter==='all' || room.status===filter) &&
    (room.label+' '+(room.guest ?? '')).toLowerCase().includes(needle));
  const now = localToday();
  function saved(text:string,label:string) {
    setAction(null);
    setSuccess(text);
    setFlash(label);
    setTimeout(()=>setFlash(''),2000);
    heading.current?.focus();
    void load();
  }

  return <>
    <div className="page-head">
      <div><h1 ref={heading} tabIndex={-1}>Rooms</h1><p className="sub">{today.format(new Date())}{rooms && rooms.length>0 && <> · <b>{count('occupied')} of {rooms.length}</b> occupied</>}</p></div>
      {canManage && <button className="btn btn-primary" onClick={()=>setAction({kind:'new'})}><Plus size={18} aria-hidden="true"/>Add room</button>}
    </div>
    {rooms && rooms.length>0 && <div className="occupancy" role="img" aria-label={count('occupied')+' occupied, '+count('available')+' available, '+count('out_of_service')+' out of service'}>
      {(Object.keys(titles) as RoomStatus[]).map(status=><i key={status} className={status} style={{flexGrow:rooms.filter(room=>room.status===status).length}}/>)}
    </div>}
    <div className="notice-slot" role="status">{success && <p className="notice"><CircleCheck size={18} aria-hidden="true"/>{success}
      <button type="button" className="btn btn-quiet" aria-label="Dismiss message" onClick={()=>setSuccess('')}><X size={16} aria-hidden="true"/></button></p>}</div>
    <div className="filters">
      <div className="segments" role="group" aria-label="Filter rooms by status">
        {segments.map(([value,title,total])=><button type="button" className="segment" key={value} aria-pressed={filter===value}
          onClick={()=>setFilter(value)}>{title}<b>{total}</b></button>)}
      </div>
      <label className="search"><Search size={16} aria-hidden="true"/>
        <span className="sr-only">Search rooms</span>
        <input type="search" placeholder={canCheckIn?'Search rooms or guests':'Search rooms'} value={query}
          onChange={event=>setQuery(event.target.value)}/>
      </label>
    </div>
    <section className="register" aria-label="Room register">
      {error ? <div className="state"><p className="alert" role="alert">{error}</p><button className="btn btn-secondary" onClick={load}>Try again</button></div>
        : !shown ? <div className="skeleton" role="status" aria-label="Loading rooms"><i/><i/><i/><i/><i/><i/></div>
        : shown.length===0 ? <div className="state"><DoorOpen size={24} aria-hidden="true"/><h2>{rooms?.length?'No matching rooms':'No rooms yet'}</h2>
          {rooms?.length ? <button className="btn btn-secondary" onClick={()=>{setFilter('all');setQuery('');}}>Clear filters</button>
            : <p>{canManage?'Add a room to begin checking in guests.':'Your manager can configure rooms for this property.'}</p>}</div>
        : <table>
          <caption className="sr-only">Rooms at {property.name}, ordered by room identifier</caption>
          <thead><tr><th scope="col">Room</th><th scope="col">Status</th><th scope="col">Guest</th><th scope="col">Departs</th>
            <th scope="col"><span className="sr-only">Actions</span></th></tr></thead>
          <tbody>{shown.map(room=>{
            const leaving = departure(room.expectedDeparture,now);
            return <tr key={room.id} className={[flash===room.label && 'flash', room.label.length>8 && 'long-id'].filter(Boolean).join(' ') || undefined}>
              <th className="room-id" scope="row">{room.label}</th>
              <td className="row-status"><span className={'badge '+room.status}>{titles[room.status]}</span></td>
              <td className={'guest'+(room.guest?'':' blank')}>{room.guest}</td>
              <td className={'when'+(leaving?'':' blank')} data-prefix="Departs ">
                {leaving && room.expectedDeparture ? <time dateTime={room.expectedDeparture} className={leaving.tone}>{leaving.text}</time> : null}
              </td>
              <td className="row-actions">
                {canCheckIn && room.status==='available' && <button className="btn btn-quiet go" aria-label={'Check in to '+room.label}
                  onClick={()=>setAction({kind:'check-in',room})}>Check in</button>}
                {canManage && room.status!=='occupied' && <button className="btn btn-quiet" aria-label={'Edit room '+room.label}
                  onClick={()=>setAction({kind:'edit',room})}>Edit</button>}
              </td>
            </tr>;
          })}</tbody>
        </table>}
    </section>
    {shown && <p className="sr-only" role="status">{shown.length} of {rooms?.length} rooms shown</p>}
    {action && <RoomDialog action={action} endpoint={endpoint} csrf={csrf} onClose={()=>setAction(null)}
      onSaved={saved} onConflict={load} onSessionEnded={onSessionEnded}/>}
  </>;
}
