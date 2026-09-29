begin;
create table public.hdmotors_accounts (
 user_id uuid primary key references auth.users(id) on delete cascade,
 data jsonb not null default '{"clients":[],"assets":[],"service_orders":[],"order_items":[],"payments":[],"settings":[]}'::jsonb,
 revision bigint not null default 0,
 updated_at timestamptz not null default now(),
 constraint hdmotors_data_object check (jsonb_typeof(data)='object')
);
alter table public.hdmotors_accounts enable row level security;
revoke all on public.hdmotors_accounts from anon;
grant select,insert,update on public.hdmotors_accounts to authenticated;
create policy hdmotors_owner_select on public.hdmotors_accounts for select to authenticated using ((select auth.uid())=user_id);
create policy hdmotors_owner_insert on public.hdmotors_accounts for insert to authenticated with check ((select auth.uid())=user_id);
create policy hdmotors_owner_update on public.hdmotors_accounts for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create function public.hdmotors_save_account(p_data jsonb,p_revision bigint)
returns bigint language plpgsql security invoker set search_path=public,pg_temp as $$
declare v_revision bigint; v_store text;
begin
 if auth.uid() is null then raise exception 'authentication_required'; end if;
 if jsonb_typeof(p_data) is distinct from 'object' then raise exception 'invalid_data'; end if;
 foreach v_store in array array['clients','assets','service_orders','order_items','payments','settings'] loop
  if jsonb_typeof(p_data->v_store) is distinct from 'array' then raise exception 'invalid_store'; end if;
 end loop;
 if p_revision=0 then
  insert into public.hdmotors_accounts(user_id,data,revision) values(auth.uid(),p_data,1)
  on conflict(user_id) do nothing returning revision into v_revision;
  if v_revision is not null then return v_revision; end if;
 end if;
 update public.hdmotors_accounts set data=p_data,revision=revision+1,updated_at=now()
 where user_id=auth.uid() and revision=p_revision returning revision into v_revision;
 if v_revision is null then raise exception 'revision_conflict'; end if;
 return v_revision;
end $$;
revoke all on function public.hdmotors_save_account(jsonb,bigint) from public,anon;
grant execute on function public.hdmotors_save_account(jsonb,bigint) to authenticated;
commit;