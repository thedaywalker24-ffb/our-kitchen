begin;

create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 100),
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.household_members (
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  created_at timestamptz not null default now(),
  primary key (household_id, user_id)
);

create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  legacy_recipe_id text,
  title text not null check (char_length(title) between 1 and 300),
  description text not null default '',
  yield_text text not null default '',
  active_time text not null default '',
  total_time text not null default '',
  ingredients jsonb not null default '[]'::jsonb check (jsonb_typeof(ingredients) = 'array'),
  instructions jsonb not null default '[]'::jsonb check (jsonb_typeof(instructions) = 'array'),
  source text not null default '',
  source_url text,
  notes text not null default '',
  image_url text,
  categories text[] not null default '{}',
  rating numeric(2, 1) check (rating between 0 and 5),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (household_id, legacy_recipe_id)
);

create table public.recipe_favorites (
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (recipe_id, user_id)
);

create index household_members_user_id_idx on public.household_members(user_id);
create index recipes_household_id_idx on public.recipes(household_id);
create index recipes_title_idx on public.recipes(lower(title));
create index recipes_categories_idx on public.recipes using gin(categories);
create index recipe_favorites_user_id_idx on public.recipe_favorites(user_id);

create function public.is_household_member(target_household_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.household_members
    where household_id = target_household_id
      and user_id = (select auth.uid())
  );
$$;

create function public.is_household_owner(target_household_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.household_members
    where household_id = target_household_id
      and user_id = (select auth.uid())
      and role = 'owner'
  );
$$;

revoke all on function public.is_household_member(uuid) from public;
revoke all on function public.is_household_owner(uuid) from public;
grant execute on function public.is_household_member(uuid) to authenticated;
grant execute on function public.is_household_owner(uuid) to authenticated;

create function public.add_household_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.household_members (household_id, user_id, role)
  values (new.id, new.created_by, 'owner');
  return new;
end;
$$;

create trigger add_household_owner_after_insert
after insert on public.households
for each row execute function public.add_household_owner();

create function public.stamp_recipe_authorship()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.created_by = auth.uid();
  else
    new.created_by = old.created_by;
  end if;
  new.updated_by = auth.uid();
  new.updated_at = now();
  return new;
end;
$$;

create trigger stamp_recipe_authorship_before_write
before insert or update on public.recipes
for each row execute function public.stamp_recipe_authorship();

alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.recipes enable row level security;
alter table public.recipe_favorites enable row level security;

revoke all on table public.households from anon, authenticated;
revoke all on table public.household_members from anon, authenticated;
revoke all on table public.recipes from anon, authenticated;
revoke all on table public.recipe_favorites from anon, authenticated;

grant select, insert, update, delete on table public.households to authenticated;
grant select, insert, update, delete on table public.household_members to authenticated;
grant select, insert, update, delete on table public.recipes to authenticated;
grant select, insert, delete on table public.recipe_favorites to authenticated;

create policy "Members can view their households"
on public.households for select to authenticated
using (public.is_household_member(id));

create policy "Users can create a household"
on public.households for insert to authenticated
with check ((select auth.uid()) is not null and created_by = (select auth.uid()));

create policy "Owners can update their household"
on public.households for update to authenticated
using (public.is_household_owner(id))
with check (public.is_household_owner(id));

create policy "Owners can delete their household"
on public.households for delete to authenticated
using (public.is_household_owner(id));

create policy "Members can view household membership"
on public.household_members for select to authenticated
using (public.is_household_member(household_id));

create policy "Owners can add household members"
on public.household_members for insert to authenticated
with check (public.is_household_owner(household_id));

create policy "Owners can update household members"
on public.household_members for update to authenticated
using (public.is_household_owner(household_id))
with check (public.is_household_owner(household_id));

create policy "Owners can remove household members"
on public.household_members for delete to authenticated
using (public.is_household_owner(household_id));

create policy "Members can view household recipes"
on public.recipes for select to authenticated
using (public.is_household_member(household_id));

create policy "Members can create household recipes"
on public.recipes for insert to authenticated
with check (public.is_household_member(household_id));

create policy "Members can update household recipes"
on public.recipes for update to authenticated
using (public.is_household_member(household_id))
with check (public.is_household_member(household_id));

create policy "Members can delete household recipes"
on public.recipes for delete to authenticated
using (public.is_household_member(household_id));

create policy "Users can view their favorites"
on public.recipe_favorites for select to authenticated
using (user_id = (select auth.uid()));

create policy "Users can add their favorites"
on public.recipe_favorites for insert to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.recipes
    where recipes.id = recipe_id
      and public.is_household_member(recipes.household_id)
  )
);

create policy "Users can remove their favorites"
on public.recipe_favorites for delete to authenticated
using (user_id = (select auth.uid()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'recipe-images',
  'recipe-images',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do nothing;

create policy "Members can view household recipe images"
on storage.objects for select to authenticated
using (
  bucket_id = 'recipe-images'
  and exists (
    select 1 from public.household_members
    where household_members.user_id = (select auth.uid())
      and household_members.household_id::text = (storage.foldername(name))[1]
  )
);

create policy "Members can upload household recipe images"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'recipe-images'
  and exists (
    select 1 from public.household_members
    where household_members.user_id = (select auth.uid())
      and household_members.household_id::text = (storage.foldername(name))[1]
  )
);

create policy "Members can update household recipe images"
on storage.objects for update to authenticated
using (
  bucket_id = 'recipe-images'
  and exists (
    select 1 from public.household_members
    where household_members.user_id = (select auth.uid())
      and household_members.household_id::text = (storage.foldername(name))[1]
  )
)
with check (
  bucket_id = 'recipe-images'
  and exists (
    select 1 from public.household_members
    where household_members.user_id = (select auth.uid())
      and household_members.household_id::text = (storage.foldername(name))[1]
  )
);

create policy "Members can delete household recipe images"
on storage.objects for delete to authenticated
using (
  bucket_id = 'recipe-images'
  and exists (
    select 1 from public.household_members
    where household_members.user_id = (select auth.uid())
      and household_members.household_id::text = (storage.foldername(name))[1]
  )
);

commit;
