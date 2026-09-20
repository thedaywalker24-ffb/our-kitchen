begin;

create table if not exists public.recipe_shares (
  recipe_id uuid primary key references public.recipes(id) on delete cascade,
  token uuid not null unique default gen_random_uuid(),
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.recipe_shares enable row level security;
revoke all on table public.recipe_shares from anon, authenticated;
grant select, insert, delete on table public.recipe_shares to authenticated;

drop policy if exists "Members can view recipe share links" on public.recipe_shares;
create policy "Members can view recipe share links"
on public.recipe_shares for select to authenticated
using (
  exists (
    select 1 from public.recipes
    where recipes.id = recipe_shares.recipe_id
      and public.is_household_member(recipes.household_id)
  )
);

drop policy if exists "Members can create recipe share links" on public.recipe_shares;
create policy "Members can create recipe share links"
on public.recipe_shares for insert to authenticated
with check (
  created_by = (select auth.uid())
  and exists (
    select 1 from public.recipes
    where recipes.id = recipe_shares.recipe_id
      and public.is_household_member(recipes.household_id)
  )
);

drop policy if exists "Members can disable recipe share links" on public.recipe_shares;
create policy "Members can disable recipe share links"
on public.recipe_shares for delete to authenticated
using (
  exists (
    select 1 from public.recipes
    where recipes.id = recipe_shares.recipe_id
      and public.is_household_member(recipes.household_id)
  )
);

create or replace function public.get_shared_recipe(share_token uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', recipes.id,
    'title', recipes.title,
    'description', recipes.description,
    'yield_text', recipes.yield_text,
    'active_time', recipes.active_time,
    'total_time', recipes.total_time,
    'ingredients', recipes.ingredients,
    'instructions', recipes.instructions,
    'source', recipes.source,
    'source_url', recipes.source_url,
    'notes', recipes.notes,
    'image_url', recipes.image_url,
    'categories', recipes.categories
  )
  from public.recipe_shares
  join public.recipes on recipes.id = recipe_shares.recipe_id
  where recipe_shares.token = share_token;
$$;

revoke all on function public.get_shared_recipe(uuid) from public;
grant execute on function public.get_shared_recipe(uuid) to anon, authenticated;

commit;
