begin;

create schema stayflow;
revoke all on schema stayflow from public, anon, authenticated;
revoke create on schema public from public, anon, authenticated;
create role stayflow_commands nologin nobypassrls;
grant usage on schema stayflow, public to stayflow_commands;

-- The command role cannot use schema auth (owned by supabase_admin, so a grant here is silently ignored).
-- PostgREST sets request.jwt.claims for each request from a signature-verified JWT; the Supabase auth.uid() helper reads the same
-- setting. Malformed claims raise an error, so a bad identity fails closed. Only the authenticated role counts.
create function stayflow.current_user_id() returns uuid language sql stable set search_path='' as $$
  select case when c->>'role'='authenticated' then (c->>'sub')::uuid end
  from (select nullif(current_setting('request.jwt.claims',true),'')::jsonb as c) t
$$;

create table stayflow.organisation (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 1 and 120)
);
create table stayflow.property (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references stayflow.organisation,
  name text not null check (length(btrim(name)) between 1 and 120),
  timezone text not null default 'Africa/Johannesburg',
  unique(org_id,id)
);
create table stayflow.membership (
  org_id uuid references stayflow.organisation,
  user_id uuid references auth.users,
  role text not null check (role in ('owner','manager','reception','operations')),
  active boolean not null default true,
  primary key(org_id,user_id)
);
create index membership_active_user on stayflow.membership(user_id,org_id) where active;
create table stayflow.property_grant (
  org_id uuid not null,
  user_id uuid not null,
  property_id uuid not null,
  primary key(property_id,user_id),
  foreign key(org_id,user_id) references stayflow.membership,
  foreign key(org_id,property_id) references stayflow.property(org_id,id)
);
create table stayflow.room (
  property_id uuid references stayflow.property,
  id uuid default gen_random_uuid(),
  label text not null check (label=btrim(label) and length(label) between 1 and 32),
  state text not null check (state in ('available','out_of_service')),
  primary key(property_id,id)
);
create unique index room_label_per_property on stayflow.room(property_id,lower(label));
create table stayflow.guest (
  property_id uuid references stayflow.property,
  id uuid default gen_random_uuid(),
  display_name text not null check (display_name=btrim(display_name) and length(display_name) between 1 and 100),
  primary key(property_id,id)
);
create table stayflow.stay (
  property_id uuid references stayflow.property,
  id uuid default gen_random_uuid(),
  room_id uuid not null,
  guest_id uuid not null,
  arrived_at timestamptz not null default clock_timestamp(),
  expected_departure date,
  closed_at timestamptz check(closed_at is null or closed_at>=arrived_at),
  primary key(property_id,id),
  foreign key(property_id,room_id) references stayflow.room,
  foreign key(property_id,guest_id) references stayflow.guest
);
create unique index one_active_stay on stayflow.stay(property_id,room_id) where closed_at is null;

do $$
declare relation text;
begin
  foreach relation in array array['organisation','property','membership','property_grant','room','guest','stay'] loop
    execute format('alter table stayflow.%I enable row level security', relation);
    execute format('alter table stayflow.%I force row level security', relation);
  end loop;
end
$$;

grant select on stayflow.property, stayflow.membership, stayflow.property_grant,
  stayflow.room, stayflow.guest, stayflow.stay to stayflow_commands;
grant update(active) on stayflow.membership to stayflow_commands;
grant update(org_id) on stayflow.property_grant to stayflow_commands;
grant insert on stayflow.room, stayflow.guest, stayflow.stay to stayflow_commands;
grant update(label,state) on stayflow.room to stayflow_commands;

create policy own_membership on stayflow.membership for select to stayflow_commands using(user_id=(select stayflow.current_user_id()));
create policy own_grant on stayflow.property_grant for select to stayflow_commands using(user_id=(select stayflow.current_user_id()));
-- Row locks need UPDATE privilege and visibility. WITH CHECK denies actual writes.
create policy lock_membership on stayflow.membership for update to stayflow_commands using(user_id=(select stayflow.current_user_id())) with check(false);
create policy lock_grant on stayflow.property_grant for update to stayflow_commands using(user_id=(select stayflow.current_user_id())) with check(false);

create function stayflow.visible_role(p_org uuid,p_property uuid)
returns text language sql stable set search_path='' as $$
  select m.role from stayflow.membership m
  where m.org_id=p_org and m.user_id=stayflow.current_user_id() and m.active
    and (m.role='owner' or exists(select 1 from stayflow.property_grant g
       where g.org_id=m.org_id and g.user_id=m.user_id and g.property_id=p_property))
$$;
create policy scoped_property on stayflow.property for select to stayflow_commands
  using(stayflow.visible_role(org_id,id) is not null);
create policy scoped_room_read on stayflow.room for select to stayflow_commands
  using(property_id in(select id from stayflow.property));
create policy scoped_stay_read on stayflow.stay for select to stayflow_commands
  using(property_id in(select id from stayflow.property));
create policy scoped_guest_read on stayflow.guest for select to stayflow_commands
  using(property_id in(select id from stayflow.property
    where stayflow.visible_role(org_id,id) in ('owner','manager','reception')));
create policy scoped_room_create on stayflow.room for insert to stayflow_commands
  with check(property_id in(select id from stayflow.property where stayflow.visible_role(org_id,id) in ('owner','manager')));
create policy scoped_room_lock on stayflow.room for update to stayflow_commands
  using(property_id in(select id from stayflow.property where stayflow.visible_role(org_id,id) in ('owner','manager','reception')))
  with check(property_id in(select id from stayflow.property where stayflow.visible_role(org_id,id) in ('owner','manager')));
create policy scoped_guest_create on stayflow.guest for insert to stayflow_commands
  with check(property_id in(select id from stayflow.property where stayflow.visible_role(org_id,id) in ('owner','manager','reception')));
create policy scoped_stay_create on stayflow.stay for insert to stayflow_commands
  with check(property_id in(select id from stayflow.property where stayflow.visible_role(org_id,id) in ('owner','manager','reception')));

create function stayflow.require_scope(p_property uuid, p_roles text[])
returns text language plpgsql set search_path='' as $$
declare organisation_id uuid; staff_role text;
begin
  select org_id into organisation_id from stayflow.property where id=p_property;
  select role into staff_role from stayflow.membership
    where org_id=organisation_id and user_id=stayflow.current_user_id() and active for share;
  if staff_role is null or not (staff_role=any(p_roles)) then
    raise insufficient_privilege using message='Property access denied';
  end if;
  if staff_role <> 'owner' then
    perform 1 from stayflow.property_grant
      where org_id=organisation_id and property_id=p_property and user_id=stayflow.current_user_id() for share;
    if not found then raise insufficient_privilege using message='Property access denied'; end if;
  end if;
  return staff_role;
end
$$;

create function public.list_properties()
returns table(id uuid, name text, role text)
language sql stable security definer set search_path='' as $$
  select p.id,p.name,stayflow.visible_role(p.org_id,p.id) from stayflow.property p order by p.name,p.id
$$;

create function public.list_rooms(p_property uuid)
returns table(id uuid,label text,status text,guest text,"expectedDeparture" date)
language plpgsql security definer set search_path='' as $$
declare staff_role text;
begin
  staff_role:=stayflow.require_scope(p_property,array['owner','manager','reception','operations']);
  return query
    select r.id,r.label,case when s.id is not null then 'occupied' else r.state end,
      g.display_name,case when staff_role <> 'operations' then s.expected_departure end
    from stayflow.room r
    left join stayflow.stay s on (s.property_id,s.room_id)=(r.property_id,r.id) and s.closed_at is null
    left join stayflow.guest g on (g.property_id,g.id)=(s.property_id,s.guest_id)
    where r.property_id=p_property order by r.label,r.id;
end
$$;

create function public.save_room(p_property uuid, p_room uuid,p_label text,p_state text)
returns uuid language plpgsql security definer set search_path='' as $$
declare room_id uuid;
begin
  perform stayflow.require_scope(p_property,array['owner','manager']);
  if p_room is null then
    insert into stayflow.room(property_id,label,state) values(p_property,btrim(p_label),p_state) returning id into room_id;
  else
    perform 1 from stayflow.room where property_id=p_property and id=p_room for update;
    if not found then raise insufficient_privilege using message='Room access denied'; end if;
    if exists(select 1 from stayflow.stay where property_id=p_property and stayflow.stay.room_id=p_room and closed_at is null)
      then raise sqlstate 'PT409' using message='This room is occupied'; end if;
    update stayflow.room set label=btrim(p_label),state=p_state where property_id=p_property and id=p_room;
    room_id:=p_room;
  end if;
  return room_id;
end
$$;

create function public.check_in(p_property uuid,p_room uuid,p_guest text,p_departure date)
returns uuid language plpgsql security definer set search_path='' as $$
declare room_state text; property_tz text; new_guest uuid; new_stay uuid;
begin
  perform stayflow.require_scope(p_property,array['owner','manager','reception']);
  select r.state into room_state from stayflow.room r where r.property_id=p_property and r.id=p_room for update;
  if not found then raise insufficient_privilege using message='Room access denied'; end if;
  if room_state <> 'available' or exists(select 1 from stayflow.stay s
        where (s.property_id,s.room_id)=(p_property,p_room) and s.closed_at is null)
    then raise sqlstate 'PT409' using message='This room is no longer available'; end if;
  select timezone into property_tz from stayflow.property where id=p_property;
  if p_departure < (clock_timestamp() at time zone property_tz)::date
    then raise sqlstate 'PT422' using message='Expected departure cannot be in the past'; end if;
  insert into stayflow.guest(property_id,display_name) values(p_property,btrim(p_guest)) returning id into new_guest;
  insert into stayflow.stay(property_id,room_id,guest_id,expected_departure)
    values(p_property,p_room,new_guest,p_departure) returning id into new_stay;
  return new_stay;
end
$$;

grant stayflow_commands to current_user with set true;
grant create on schema public to stayflow_commands;
alter function public.list_properties() owner to stayflow_commands;
alter function public.list_rooms(uuid) owner to stayflow_commands;
alter function public.save_room(uuid,uuid,text,text) owner to stayflow_commands;
alter function public.check_in(uuid,uuid,text,date) owner to stayflow_commands;
revoke create on schema public from stayflow_commands;
revoke all on all functions in schema stayflow from public, anon, authenticated, service_role;
grant execute on all functions in schema stayflow to stayflow_commands;
revoke all on function public.list_properties(), public.list_rooms(uuid),
  public.save_room(uuid,uuid,text,text), public.check_in(uuid,uuid,text,date) from public, anon, authenticated, service_role;
grant execute on function public.list_properties(), public.list_rooms(uuid),
  public.save_room(uuid,uuid,text,text), public.check_in(uuid,uuid,text,date) to authenticated;

commit;
