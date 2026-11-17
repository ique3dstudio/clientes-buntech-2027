-- Move as funções auxiliares de permissão para um schema não exposto pela API
create schema if not exists privado;
grant usage on schema privado to authenticated;

alter function public.meu_papel() set schema privado;
alter function public.meu_vendedor_id() set schema privado;
alter function public.eh_gestao() set schema privado;
alter function public.eh_admin() set schema privado;
alter function public.pode_ver_cliente(uuid) set schema privado;
alter function public.pode_editar_cliente(uuid) set schema privado;
alter function public.pode_ver_cliente_id(uuid) set schema privado;
alter function public.pode_editar_cliente_id(uuid) set schema privado;

create or replace function privado.eh_gestao() returns boolean
language sql stable security definer set search_path = '' as $$
  select privado.meu_papel() in ('admin','gerente')
$$;

create or replace function privado.eh_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select privado.meu_papel() = 'admin'
$$;

create or replace function privado.pode_ver_cliente(c_vendedor uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select case privado.meu_papel()
    when 'pendente' then false
    when 'externo' then c_vendedor is not null and c_vendedor = privado.meu_vendedor_id()
    else true end
$$;

create or replace function privado.pode_editar_cliente(c_vendedor uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select privado.eh_gestao()
      or (privado.meu_papel() in ('vendedor','externo')
          and c_vendedor is not null and c_vendedor = privado.meu_vendedor_id())
$$;

create or replace function privado.pode_ver_cliente_id(cid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.clientes c where c.id = cid and privado.pode_ver_cliente(c.vendedor_id))
$$;

create or replace function privado.pode_editar_cliente_id(cid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.clientes c where c.id = cid and privado.pode_editar_cliente(c.vendedor_id))
$$;

create or replace function public.proteger_perfil() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not privado.eh_admin() and (new.papel is distinct from old.papel or new.vendedor_id is distinct from old.vendedor_id) then
    raise exception 'Somente administradores podem alterar papel ou vendedor';
  end if;
  return new;
end $$;
revoke execute on function public.proteger_perfil from anon, authenticated, public;
