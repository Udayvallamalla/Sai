create extension if not exists pgcrypto;

create type public.admin_role as enum ('admin');
create type public.enquiry_status as enum ('New','Contacted','Consultation Scheduled','In Progress','Converted','Closed');

create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 full_name text,
 role public.admin_role not null default 'admin',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.services (
 id uuid primary key default gen_random_uuid(), title text not null, slug text not null unique,
 short_description text not null default '', full_description text not null default '', icon text,
 cover_image text, offerings jsonb not null default '[]'::jsonb, sort_order integer not null default 0,
 is_published boolean not null default true, seo_title text, seo_description text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.projects (
 id uuid primary key default gen_random_uuid(), title text not null, slug text not null unique,
 category text not null check(category in ('Residential','Commercial','Interior','Landscape','Other')),
 location text, description text not null default '', cover_image text, gallery_images jsonb not null default '[]'::jsonb,
 floor_area text, project_status text, completion_date date, is_published boolean not null default false,
 published_at timestamptz, seo_title text, seo_description text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.enquiries (
 id uuid primary key default gen_random_uuid(), reference_number text not null unique default ('SM-' || upper(substr(encode(gen_random_bytes(8),'hex'),1,10))),
 full_name text not null check(length(full_name) between 2 and 120), phone text not null check(length(phone) between 8 and 20),
 email text check(email is null or length(email)<=254), service_id uuid references public.services(id) on delete set null,
 service_name text, project_type text not null default 'Contact', project_location text, budget text,
 message text not null check(length(message) between 1 and 5000), preferred_contact_method text not null default 'Phone' check(preferred_contact_method in ('Phone','Email','WhatsApp')),
 consent_timestamp timestamptz not null, status public.enquiry_status not null default 'New', assigned_to uuid references public.profiles(id) on delete set null,
 follow_up_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.enquiry_notes (
 id uuid primary key default gen_random_uuid(), enquiry_id uuid not null references public.enquiries(id) on delete cascade,
 author_id uuid not null references public.profiles(id), note text not null check(length(note) between 1 and 5000), created_at timestamptz not null default now()
);
create table public.site_settings (
 id uuid primary key default gen_random_uuid(), setting_key text not null unique, setting_value jsonb not null,
 updated_at timestamptz not null default now(), updated_by uuid references public.profiles(id)
);
create table public.audit_log (
 id uuid primary key default gen_random_uuid(), actor_id uuid references public.profiles(id), action text not null,
 entity text not null, entity_id uuid, details jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
create index enquiries_created_idx on public.enquiries(created_at desc);
create index enquiries_status_idx on public.enquiries(status);
create index projects_published_idx on public.projects(is_published, published_at desc);
create index services_order_idx on public.services(sort_order);

create or replace function public.is_admin() returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'::public.admin_role)
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

create or replace function public.touch_updated_at() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end $$;
create trigger services_updated before update on public.services for each row execute function public.touch_updated_at();
create trigger projects_updated before update on public.projects for each row execute function public.touch_updated_at();
create trigger enquiries_updated before update on public.enquiries for each row execute function public.touch_updated_at();
create trigger settings_updated before update on public.site_settings for each row execute function public.touch_updated_at();

alter table public.profiles enable row level security;
alter table public.services enable row level security;
alter table public.projects enable row level security;
alter table public.enquiries enable row level security;
alter table public.enquiry_notes enable row level security;
alter table public.site_settings enable row level security;
alter table public.audit_log enable row level security;

create policy "Admins read profiles" on public.profiles for select to authenticated using (public.is_admin());
create policy "Admins manage profiles" on public.profiles for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Public reads published services" on public.services for select to anon, authenticated using (is_published or public.is_admin());
create policy "Admins manage services" on public.services for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Public reads published projects" on public.projects for select to anon, authenticated using (is_published or public.is_admin());
create policy "Admins manage projects" on public.projects for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Public submit enquiries" on public.enquiries for insert to anon, authenticated with check (
 status = 'New' and assigned_to is null and follow_up_at is null and length(trim(full_name)) between 2 and 120
 and length(trim(phone)) between 8 and 20 and consent_timestamp <= now() and consent_timestamp > now() - interval '10 minutes'
);
create policy "Admins read enquiries" on public.enquiries for select to authenticated using (public.is_admin());
create policy "Admins update enquiries" on public.enquiries for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admins delete enquiries" on public.enquiries for delete to authenticated using (public.is_admin());
create policy "Admins manage notes" on public.enquiry_notes for all to authenticated using (public.is_admin()) with check (public.is_admin() and author_id=(select auth.uid()));
create policy "Public reads public settings" on public.site_settings for select to anon, authenticated using (setting_key in ('company_public','homepage_public'));
create policy "Admins manage settings" on public.site_settings for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admins read audit" on public.audit_log for select to authenticated using (public.is_admin());
create policy "Admins add audit" on public.audit_log for insert to authenticated with check (public.is_admin() and actor_id=(select auth.uid()));

grant select on public.services, public.projects, public.site_settings to anon, authenticated;
grant insert on public.enquiries to anon, authenticated;
grant select, insert, update, delete on public.profiles, public.services, public.projects, public.enquiries, public.enquiry_notes, public.site_settings, public.audit_log to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('brand-assets','brand-assets',true,5242880,array['image/jpeg','image/png','image/webp','image/svg+xml']),
 ('service-images','service-images',true,10485760,array['image/jpeg','image/png','image/webp']),
 ('project-images','project-images',true,15728640,array['image/jpeg','image/png','image/webp'])
on conflict(id) do nothing;
create policy "Public reads published media buckets" on storage.objects for select to anon, authenticated using (bucket_id in ('brand-assets','service-images','project-images'));
create policy "Admins upload media" on storage.objects for insert to authenticated with check (bucket_id in ('brand-assets','service-images','project-images') and public.is_admin());
create policy "Admins update media" on storage.objects for update to authenticated using (bucket_id in ('brand-assets','service-images','project-images') and public.is_admin()) with check (bucket_id in ('brand-assets','service-images','project-images') and public.is_admin());
create policy "Admins delete media" on storage.objects for delete to authenticated using (bucket_id in ('brand-assets','service-images','project-images') and public.is_admin());

-- No administrator is seeded. Create an Auth user, then provision its profiles row
-- through the SQL editor or a trusted operator after verifying the identity.
