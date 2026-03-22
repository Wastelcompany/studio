-- ============================================================
-- ChemStats / SevesoApp — Supabase Schema
-- Voer dit script uit in de Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- CUSTOMERS
-- ============================================================
create table public.customers (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  address     text,
  kvk_number  text,
  created_at  timestamptz not null default now()
);

alter table public.customers enable row level security;

-- Alleen admins mogen customers beheren
create policy "Admins kunnen customers lezen"
  on public.customers for select
  using (
    auth.jwt() ->> 'email' = 'admin@chemstats.nl'
    or auth.jwt() ->> 'email' = 'post@wastelcompany.eu'
    or exists (
      select 1 from public.user_profiles
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "Admins kunnen customers aanmaken"
  on public.customers for insert
  with check (
    auth.jwt() ->> 'email' = 'admin@chemstats.nl'
    or auth.jwt() ->> 'email' = 'post@wastelcompany.eu'
    or exists (
      select 1 from public.user_profiles
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "Admins kunnen customers updaten"
  on public.customers for update
  using (
    auth.jwt() ->> 'email' = 'admin@chemstats.nl'
    or auth.jwt() ->> 'email' = 'post@wastelcompany.eu'
    or exists (
      select 1 from public.user_profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Gebruikers mogen hun eigen customer-record lezen
create policy "Gebruikers mogen eigen customer lezen"
  on public.customers for select
  using (
    exists (
      select 1 from public.user_profiles
      where id = auth.uid() and customer_id = customers.id
    )
  );

-- ============================================================
-- USER PROFILES
-- ============================================================
create table public.user_profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text not null,
  display_name  text,
  customer_id   uuid references public.customers(id),
  customer_name text not null default '',
  disabled      boolean not null default false,
  role          text not null default 'user' check (role in ('admin', 'user')),
  created_at    timestamptz not null default now()
);

alter table public.user_profiles enable row level security;

-- Gebruikers mogen hun eigen profiel lezen
create policy "Gebruikers mogen eigen profiel lezen"
  on public.user_profiles for select
  using (id = auth.uid() and disabled = false);

-- Admins mogen alle profielen lezen
create policy "Admins mogen alle profielen lezen"
  on public.user_profiles for select
  using (
    auth.jwt() ->> 'email' = 'admin@chemstats.nl'
    or auth.jwt() ->> 'email' = 'post@wastelcompany.eu'
    or exists (
      select 1 from public.user_profiles up
      where up.id = auth.uid() and up.role = 'admin'
    )
  );

-- Admins mogen profielen aanmaken
create policy "Admins mogen profielen aanmaken"
  on public.user_profiles for insert
  with check (
    auth.jwt() ->> 'email' = 'admin@chemstats.nl'
    or auth.jwt() ->> 'email' = 'post@wastelcompany.eu'
    or exists (
      select 1 from public.user_profiles up
      where up.id = auth.uid() and up.role = 'admin'
    )
  );

-- Admins mogen profielen updaten
create policy "Admins mogen profielen updaten"
  on public.user_profiles for update
  using (
    auth.jwt() ->> 'email' = 'admin@chemstats.nl'
    or auth.jwt() ->> 'email' = 'post@wastelcompany.eu'
    or exists (
      select 1 from public.user_profiles up
      where up.id = auth.uid() and up.role = 'admin'
    )
  );

-- ============================================================
-- COMPANIES (vestigingen)
-- ============================================================
create table public.companies (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  name        text not null,
  address     text not null default '',
  created_at  timestamptz not null default now()
);

alter table public.companies enable row level security;

-- Gebruikers mogen eigen companies lezen (via customer_id)
create policy "Gebruikers mogen eigen companies lezen"
  on public.companies for select
  using (
    exists (
      select 1 from public.user_profiles
      where id = auth.uid()
        and customer_id = companies.customer_id
        and disabled = false
    )
  );

-- Gebruikers mogen companies aanmaken voor eigen customer
create policy "Gebruikers mogen companies aanmaken"
  on public.companies for insert
  with check (
    exists (
      select 1 from public.user_profiles
      where id = auth.uid()
        and customer_id = companies.customer_id
        and disabled = false
    )
  );

-- Gebruikers mogen eigen companies updaten
create policy "Gebruikers mogen companies updaten"
  on public.companies for update
  using (
    exists (
      select 1 from public.user_profiles
      where id = auth.uid()
        and customer_id = companies.customer_id
        and disabled = false
    )
  );

-- Gebruikers mogen eigen companies verwijderen
create policy "Gebruikers mogen companies verwijderen"
  on public.companies for delete
  using (
    exists (
      select 1 from public.user_profiles
      where id = auth.uid()
        and customer_id = companies.customer_id
        and disabled = false
    )
  );

-- Admins mogen alle companies lezen
create policy "Admins mogen alle companies lezen"
  on public.companies for select
  using (
    auth.jwt() ->> 'email' = 'admin@chemstats.nl'
    or auth.jwt() ->> 'email' = 'post@wastelcompany.eu'
    or exists (
      select 1 from public.user_profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- ============================================================
-- INVENTORY (gevaarlijke stoffen per vestiging)
-- ============================================================
create table public.inventory (
  id                  uuid primary key default uuid_generate_v4(),
  company_id          uuid not null references public.companies(id) on delete cascade,
  product_name        text not null,
  cas_number          text,
  h_statements        text[] not null default '{}',
  seveso_category_ids text[] not null default '{}',
  arie_category_ids   text[] not null default '{}',
  is_named_substance  boolean not null default false,
  named_substance_name text,
  quantity            numeric not null default 0,
  sds_uri             text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

alter table public.inventory enable row level security;

-- Gebruikers mogen inventory van eigen companies lezen
create policy "Gebruikers mogen eigen inventory lezen"
  on public.inventory for select
  using (
    exists (
      select 1 from public.companies c
      join public.user_profiles up on up.customer_id = c.customer_id
      where c.id = inventory.company_id
        and up.id = auth.uid()
        and up.disabled = false
    )
  );

-- Gebruikers mogen inventory aanmaken voor eigen companies
create policy "Gebruikers mogen inventory aanmaken"
  on public.inventory for insert
  with check (
    exists (
      select 1 from public.companies c
      join public.user_profiles up on up.customer_id = c.customer_id
      where c.id = inventory.company_id
        and up.id = auth.uid()
        and up.disabled = false
    )
  );

-- Gebruikers mogen inventory updaten
create policy "Gebruikers mogen inventory updaten"
  on public.inventory for update
  using (
    exists (
      select 1 from public.companies c
      join public.user_profiles up on up.customer_id = c.customer_id
      where c.id = inventory.company_id
        and up.id = auth.uid()
        and up.disabled = false
    )
  );

-- Gebruikers mogen inventory verwijderen
create policy "Gebruikers mogen inventory verwijderen"
  on public.inventory for delete
  using (
    exists (
      select 1 from public.companies c
      join public.user_profiles up on up.customer_id = c.customer_id
      where c.id = inventory.company_id
        and up.id = auth.uid()
        and up.disabled = false
    )
  );

-- ============================================================
-- INVENTORY HISTORY
-- ============================================================
create table public.inventory_history (
  id           uuid primary key default uuid_generate_v4(),
  inventory_id uuid not null references public.inventory(id) on delete cascade,
  company_id   uuid not null references public.companies(id) on delete cascade,
  date         date not null,
  quantity     numeric not null,
  updated_at   timestamptz not null default now(),
  unique (inventory_id, date)
);

alter table public.inventory_history enable row level security;

create policy "Gebruikers mogen eigen history lezen"
  on public.inventory_history for select
  using (
    exists (
      select 1 from public.companies c
      join public.user_profiles up on up.customer_id = c.customer_id
      where c.id = inventory_history.company_id
        and up.id = auth.uid()
        and up.disabled = false
    )
  );

create policy "Gebruikers mogen eigen history aanmaken/updaten"
  on public.inventory_history for insert
  with check (
    exists (
      select 1 from public.companies c
      join public.user_profiles up on up.customer_id = c.customer_id
      where c.id = inventory_history.company_id
        and up.id = auth.uid()
        and up.disabled = false
    )
  );

create policy "Gebruikers mogen eigen history updaten"
  on public.inventory_history for update
  using (
    exists (
      select 1 from public.companies c
      join public.user_profiles up on up.customer_id = c.customer_id
      where c.id = inventory_history.company_id
        and up.id = auth.uid()
        and up.disabled = false
    )
  );

-- ============================================================
-- AI USAGE LOGS
-- ============================================================
create table public.ai_usage_logs (
  id             uuid primary key default uuid_generate_v4(),
  user_id        uuid not null references auth.users(id),
  type           text not null check (type in ('SDS_EXTRACTION', 'KVK_SEARCH')),
  model          text,
  estimated_cost numeric not null default 0,
  created_at     timestamptz not null default now()
);

alter table public.ai_usage_logs enable row level security;

-- Ingelogde gebruikers mogen logs aanmaken
create policy "Gebruikers mogen AI logs aanmaken"
  on public.ai_usage_logs for insert
  with check (auth.uid() = user_id);

-- Admins mogen alle logs lezen
create policy "Admins mogen AI logs lezen"
  on public.ai_usage_logs for select
  using (
    auth.jwt() ->> 'email' = 'admin@chemstats.nl'
    or auth.jwt() ->> 'email' = 'post@wastelcompany.eu'
    or exists (
      select 1 from public.user_profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- ============================================================
-- REALTIME inschakelen voor live updates
-- ============================================================
alter publication supabase_realtime add table public.companies;
alter publication supabase_realtime add table public.inventory;
alter publication supabase_realtime add table public.user_profiles;
alter publication supabase_realtime add table public.customers;
alter publication supabase_realtime add table public.ai_usage_logs;

-- ============================================================
-- ADMIN gebruiker profiel aanmaken via trigger
-- Na signup wordt automatisch een user_profile aangemaakt
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.user_profiles (id, email, disabled, role)
  values (
    new.id,
    new.email,
    false,
    case
      when new.email = 'admin@chemstats.nl' then 'admin'
      when new.email = 'post@wastelcompany.eu' then 'admin'
      else 'user'
    end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
