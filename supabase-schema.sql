-- 在 Supabase SQL Editor 中完整执行一次。
create extension if not exists pgcrypto;

create table if not exists public.soft_articles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null,
  body text not null default '',
  product text not null default '',
  status text not null default '草稿',
  source_notes text not null default '',
  notes text not null default '',
  tags jsonb not null default '[]'::jsonb,
  hook_analysis jsonb not null default '{}'::jsonb,
  risk_analysis jsonb not null default '{}'::jsonb,
  structure_analysis jsonb not null default '{}'::jsonb,
  versions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists soft_articles_user_updated_idx
  on public.soft_articles (user_id, updated_at desc);

create or replace function public.set_soft_article_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_soft_article_updated_at on public.soft_articles;
create trigger set_soft_article_updated_at
before update on public.soft_articles
for each row execute function public.set_soft_article_updated_at();

alter table public.soft_articles enable row level security;

drop policy if exists "read own soft articles" on public.soft_articles;
create policy "read own soft articles"
on public.soft_articles for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "insert own soft articles" on public.soft_articles;
create policy "insert own soft articles"
on public.soft_articles for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "update own soft articles" on public.soft_articles;
create policy "update own soft articles"
on public.soft_articles for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "delete own soft articles" on public.soft_articles;
create policy "delete own soft articles"
on public.soft_articles for delete
to authenticated
using (auth.uid() = user_id);

revoke all on table public.soft_articles from anon;
grant select, insert, update, delete on table public.soft_articles to authenticated;

