-- Publicly documented synthetic credentials. Use solely in the isolated local project.
insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,
  raw_app_meta_data,raw_user_meta_data,created_at,updated_at,confirmation_token,email_change,recovery_token,email_change_token_new,email_change_token_current,phone_change,phone_change_token,reauthentication_token)
select '00000000-0000-0000-0000-000000000000',u.id::uuid,'authenticated','authenticated',u.alias||'@stayflow.test',
  extensions.crypt('Stayflow-local-demo-007!',extensions.gen_salt('bf',10)),now(),
  '{"provider":"email","providers":["email"]}','{}',now(),now(),'','','','','','','',''
from (values ('10000000-0000-4000-8000-000000000031','manager'),('10000000-0000-4000-8000-000000000032','reception'),('10000000-0000-4000-8000-000000000033','operations'),('10000000-0000-4000-8000-000000000034','other'),('10000000-0000-4000-8000-000000000035','revoked')) as u(id,alias);

insert into auth.identities(id,provider_id,user_id,identity_data,provider,last_sign_in_at,created_at,updated_at)
select gen_random_uuid(),id::text,id,jsonb_build_object('sub',id,'email',email,'email_verified',true),
  'email',now(),now(),now() from auth.users where email like '%@stayflow.test';

insert into stayflow.organisation(id,name) values ('10000000-0000-4000-8000-000000000001','Hillview Hospitality'),('10000000-0000-4000-8000-000000000002','Maroela Lodges');
insert into stayflow.property(id,org_id,name) values
  ('10000000-0000-4000-8000-000000000011','10000000-0000-4000-8000-000000000001','Hillview Guesthouse'),
  ('10000000-0000-4000-8000-000000000012','10000000-0000-4000-8000-000000000001','Hillview Annex'),
  ('10000000-0000-4000-8000-000000000021','10000000-0000-4000-8000-000000000002','Maroela Lodge');
insert into stayflow.membership(org_id,user_id,role,active) values
  ('10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000031','manager',true),
  ('10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000032','reception',true),
  ('10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000033','operations',true),
  ('10000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000034','manager',true),
  ('10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000035','reception',false);
insert into stayflow.property_grant(org_id,user_id,property_id)
select org_id,user_id,case when org_id='10000000-0000-4000-8000-000000000001' then '10000000-0000-4000-8000-000000000011'::uuid else '10000000-0000-4000-8000-000000000021'::uuid end
from stayflow.membership;

insert into stayflow.room(property_id,label,state)
select '10000000-0000-4000-8000-000000000011', label,case when label='A15' then 'out_of_service' else 'available' end
from unnest(array['A1','A2','A3','A4','A7','A9','A10','A14','A15']) as label;
insert into stayflow.room(property_id,label,state) values
  ('10000000-0000-4000-8000-000000000012','Annex 1','available'),('10000000-0000-4000-8000-000000000021','M1','available');
with seeded_guest(room_label, guest_name, nights) as
  (values ('A1','Thandi Mokoena',2),('A3','Daniel Adams',1),('A7','Naledi Dlamini',4),('A10','James van Wyk',3)),
  guests as (
    insert into stayflow.guest(property_id,display_name)
    select '10000000-0000-4000-8000-000000000011',guest_name from seeded_guest returning id,display_name,property_id
  )
insert into stayflow.stay(property_id,room_id,guest_id,expected_departure)
select g.property_id,r.id,g.id,(now() at time zone 'Africa/Johannesburg')::date+s.nights
from guests g join seeded_guest s on s.guest_name=g.display_name
join stayflow.room r on r.property_id=g.property_id and r.label=s.room_label;
