-- Run this SQL inside your Supabase project's SQL editor.
create extension if not exists "uuid-ossp";

create table if not exists public.trips (
  id text primary key,
  destination_country text,
  home_country text,
  trip_length_days integer,
  budget_total integer,
  result jsonb,
  contact jsonb,
  itinerary jsonb,
  published boolean default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_trips_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_trips_updated_at on public.trips;
create trigger set_trips_updated_at
before update on public.trips
for each row execute procedure public.set_trips_updated_at();

-- (optional for now) disable row level security while wiring auth.
alter table public.trips disable row level security;
