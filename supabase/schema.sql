create extension if not exists "pgcrypto";

do $$ begin
  create type public.user_role as enum ('collector', 'store');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.inventory_status as enum ('active', 'reserved', 'sold', 'archived');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.transaction_status as enum ('pending', 'paid', 'shipped', 'completed', 'canceled');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  role public.user_role not null default 'collector',
  display_name text,
  store_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint store_users_have_store_name check (role <> 'store' or store_name is not null)
);

create table if not exists public.catalog_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null,
  brand text,
  description text,
  image_url text,
  estimated_value numeric(12, 2) check (estimated_value is null or estimated_value >= 0),
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.store_inventory (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.users(id) on delete cascade,
  catalog_item_id uuid not null references public.catalog_items(id) on delete cascade,
  sku text,
  condition text,
  quantity integer not null default 1 check (quantity >= 0),
  price numeric(12, 2) not null check (price >= 0),
  status public.inventory_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_collections (
  id uuid primary key default gen_random_uuid(),
  collector_id uuid not null references public.users(id) on delete cascade,
  catalog_item_id uuid not null references public.catalog_items(id) on delete cascade,
  condition text,
  quantity integer not null default 1 check (quantity > 0),
  acquired_at date,
  notes text,
  visibility text not null default 'private' check (visibility in ('private', 'public')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references public.users(id) on delete restrict,
  seller_id uuid not null references public.users(id) on delete restrict,
  inventory_item_id uuid references public.store_inventory(id) on delete set null,
  catalog_item_id uuid not null references public.catalog_items(id) on delete restrict,
  quantity integer not null default 1 check (quantity > 0),
  unit_price numeric(12, 2) not null check (unit_price >= 0),
  status public.transaction_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint buyer_and_seller_are_different check (buyer_id <> seller_id)
);

create index if not exists users_role_idx on public.users(role);
create index if not exists catalog_items_category_idx on public.catalog_items(category);
create index if not exists store_inventory_store_id_idx on public.store_inventory(store_id);
create index if not exists store_inventory_catalog_item_id_idx on public.store_inventory(catalog_item_id);
create index if not exists user_collections_collector_id_idx on public.user_collections(collector_id);
create index if not exists transactions_buyer_id_idx on public.transactions(buyer_id);
create index if not exists transactions_seller_id_idx on public.transactions(seller_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_users_updated_at on public.users;
create trigger set_users_updated_at
before update on public.users
for each row execute function public.set_updated_at();

drop trigger if exists set_catalog_items_updated_at on public.catalog_items;
create trigger set_catalog_items_updated_at
before update on public.catalog_items
for each row execute function public.set_updated_at();

drop trigger if exists set_store_inventory_updated_at on public.store_inventory;
create trigger set_store_inventory_updated_at
before update on public.store_inventory
for each row execute function public.set_updated_at();

drop trigger if exists set_user_collections_updated_at on public.user_collections;
create trigger set_user_collections_updated_at
before update on public.user_collections
for each row execute function public.set_updated_at();

drop trigger if exists set_transactions_updated_at on public.transactions;
create trigger set_transactions_updated_at
before update on public.transactions
for each row execute function public.set_updated_at();

create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.users where id = (select auth.uid());
$$;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_role public.user_role;
begin
  requested_role := coalesce((new.raw_user_meta_data ->> 'role')::public.user_role, 'collector');

  if requested_role = 'store' then
    requested_role := 'collector';
  end if;

  insert into public.users (id, email, role, display_name)
  values (
    new.id,
    coalesce(new.email, ''),
    requested_role,
    nullif(new.raw_user_meta_data ->> 'display_name', '')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

alter table public.users enable row level security;
alter table public.catalog_items enable row level security;
alter table public.store_inventory enable row level security;
alter table public.user_collections enable row level security;
alter table public.transactions enable row level security;

drop policy if exists "users read own row" on public.users;
create policy "users read own row"
on public.users for select
to authenticated
using ((select auth.uid()) = id);

drop policy if exists "collectors create own profile" on public.users;
create policy "collectors create own profile"
on public.users for insert
to authenticated
with check ((select auth.uid()) = id and role = 'collector');

drop policy if exists "users update own non-role fields" on public.users;
create policy "users update own non-role fields"
on public.users for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id and role = public.current_user_role());

drop policy if exists "catalog visible to everyone" on public.catalog_items;
create policy "catalog visible to everyone"
on public.catalog_items for select
to anon, authenticated
using (true);

drop policy if exists "stores create catalog items" on public.catalog_items;
create policy "stores create catalog items"
on public.catalog_items for insert
to authenticated
with check (public.current_user_role() = 'store' and created_by = (select auth.uid()));

drop policy if exists "stores update own catalog items" on public.catalog_items;
create policy "stores update own catalog items"
on public.catalog_items for update
to authenticated
using (public.current_user_role() = 'store' and created_by = (select auth.uid()))
with check (public.current_user_role() = 'store' and created_by = (select auth.uid()));

drop policy if exists "active inventory visible to everyone" on public.store_inventory;
create policy "active inventory visible to everyone"
on public.store_inventory for select
to anon, authenticated
using (status = 'active');

drop policy if exists "stores read own inventory" on public.store_inventory;
create policy "stores read own inventory"
on public.store_inventory for select
to authenticated
using (public.current_user_role() = 'store' and store_id = (select auth.uid()));

drop policy if exists "stores create own inventory" on public.store_inventory;
create policy "stores create own inventory"
on public.store_inventory for insert
to authenticated
with check (public.current_user_role() = 'store' and store_id = (select auth.uid()));

drop policy if exists "stores update own inventory" on public.store_inventory;
create policy "stores update own inventory"
on public.store_inventory for update
to authenticated
using (public.current_user_role() = 'store' and store_id = (select auth.uid()))
with check (public.current_user_role() = 'store' and store_id = (select auth.uid()));

drop policy if exists "stores delete own inventory" on public.store_inventory;
create policy "stores delete own inventory"
on public.store_inventory for delete
to authenticated
using (public.current_user_role() = 'store' and store_id = (select auth.uid()));

drop policy if exists "collections readable by owner or public visibility" on public.user_collections;
create policy "collections readable by owner or public visibility"
on public.user_collections for select
to authenticated
using (visibility = 'public' or collector_id = (select auth.uid()));

drop policy if exists "collectors create own collection rows" on public.user_collections;
create policy "collectors create own collection rows"
on public.user_collections for insert
to authenticated
with check (public.current_user_role() = 'collector' and collector_id = (select auth.uid()));

drop policy if exists "collectors update own collection rows" on public.user_collections;
create policy "collectors update own collection rows"
on public.user_collections for update
to authenticated
using (public.current_user_role() = 'collector' and collector_id = (select auth.uid()))
with check (public.current_user_role() = 'collector' and collector_id = (select auth.uid()));

drop policy if exists "collectors delete own collection rows" on public.user_collections;
create policy "collectors delete own collection rows"
on public.user_collections for delete
to authenticated
using (public.current_user_role() = 'collector' and collector_id = (select auth.uid()));

drop policy if exists "participants read transactions" on public.transactions;
create policy "participants read transactions"
on public.transactions for select
to authenticated
using ((select auth.uid()) in (buyer_id, seller_id));

drop policy if exists "collectors create purchases" on public.transactions;
create policy "collectors create purchases"
on public.transactions for insert
to authenticated
with check (public.current_user_role() = 'collector' and buyer_id = (select auth.uid()));

drop policy if exists "participants update transactions" on public.transactions;
create policy "participants update transactions"
on public.transactions for update
to authenticated
using ((select auth.uid()) in (buyer_id, seller_id))
with check ((select auth.uid()) in (buyer_id, seller_id));
