-- Run in Supabase SQL Editor. Server-only SKU mapping; no public policies.
create table if not exists public.merch_factory_skus (
  velzo_product_id text not null references public.products(id) on delete cascade,
  size text not null default '',
  color text not null default '',
  sku text not null,
  primary key (velzo_product_id,size,color)
);
alter table public.merch_factory_skus enable row level security;
-- No browser access is granted. Server service-role reads this table.
create table if not exists public.merch_factory_fulfillments (
  order_id text primary key references public.orders(id) on delete restrict,
  merch_factory_order_id text unique,
  order_ref text not null unique,
  status text not null default 'NOT_SUBMITTED',
  tracking_url text,
  last_error text,
  updated_at timestamptz not null default now()
);
alter table public.merch_factory_fulfillments enable row level security;
