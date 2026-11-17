-- =====================================================================
-- Segurança: perfis, permissões (RLS), auditoria e atribuição automática
-- =====================================================================

-- ---------- Funções auxiliares (security definer, sem recursão de RLS) ----------
create or replace function public.meu_papel() returns public.papel
language sql stable security definer set search_path = '' as $$
  select coalesce((select papel from public.perfis where id = auth.uid()), 'pendente'::public.papel)
$$;

create or replace function public.meu_vendedor_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select vendedor_id from public.perfis where id = auth.uid()
$$;

create or replace function public.eh_gestao() returns boolean
language sql stable security definer set search_path = '' as $$
  select public.meu_papel() in ('admin','gerente')
$$;

create or replace function public.eh_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select public.meu_papel() = 'admin'
$$;

-- Externo vê só o próprio território; os demais papéis ativos veem tudo.
create or replace function public.pode_ver_cliente(c_vendedor uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select case public.meu_papel()
    when 'pendente' then false
    when 'externo' then c_vendedor is not null and c_vendedor = public.meu_vendedor_id()
    else true end
$$;

-- Gestão edita tudo; vendedor/externo editam só clientes atribuídos a eles.
create or replace function public.pode_editar_cliente(c_vendedor uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.eh_gestao()
      or (public.meu_papel() in ('vendedor','externo')
          and c_vendedor is not null and c_vendedor = public.meu_vendedor_id())
$$;

create or replace function public.pode_ver_cliente_id(cid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.clientes c where c.id = cid and public.pode_ver_cliente(c.vendedor_id))
$$;

create or replace function public.pode_editar_cliente_id(cid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.clientes c where c.id = cid and public.pode_editar_cliente(c.vendedor_id))
$$;

-- ---------- Novo usuário → perfil (o primeiro vira admin, os demais aguardam aprovação) ----------
create or replace function public.criar_perfil_novo_usuario() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.perfis (id, nome, email, papel)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)),
    new.email,
    case when exists (select 1 from public.perfis where papel = 'admin')
         then 'pendente'::public.papel else 'admin'::public.papel end
  );
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.criar_perfil_novo_usuario();

-- Usuário comum não pode alterar o próprio papel/vendedor
create or replace function public.proteger_perfil() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not public.eh_admin() and (new.papel is distinct from old.papel or new.vendedor_id is distinct from old.vendedor_id) then
    raise exception 'Somente administradores podem alterar papel ou vendedor';
  end if;
  return new;
end $$;
create trigger trg_proteger_perfil before update on public.perfis
  for each row execute function public.proteger_perfil();

-- ---------- Atribuição automática de território/vendedor pela localização ----------
create or replace function public.atribuir_territorio() returns trigger
language plpgsql security definer set search_path = '' as $$
declare t record;
begin
  if new.localizacao is not null and (tg_op = 'INSERT' or new.localizacao is distinct from old.localizacao or new.vendedor_manual is distinct from old.vendedor_manual) then
    select id, vendedor_id into t from public.territorios
      where geom is not null and extensions.st_covers(geom, new.localizacao::extensions.geometry)
      order by ordem limit 1;
    new.territorio_id := t.id;
    if not new.vendedor_manual then new.vendedor_id := t.vendedor_id; end if;
  end if;
  return new;
end $$;
create trigger trg_clientes_territorio before insert or update on public.clientes
  for each row execute function public.atribuir_territorio();

-- ---------- Auditoria ----------
create or replace function public.registrar_auditoria() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.auditoria (tabela, registro_id, acao, antes, depois, usuario_id)
  values (tg_table_name,
          coalesce((case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end)->>'id', ''),
          tg_op,
          case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) end,
          case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) end,
          auth.uid());
  return null;
end $$;
create trigger aud_clientes after insert or update or delete on public.clientes for each row execute function public.registrar_auditoria();
create trigger aud_territorios after insert or update or delete on public.territorios for each row execute function public.registrar_auditoria();
create trigger aud_territorio_areas after insert or update or delete on public.territorio_areas for each row execute function public.registrar_auditoria();
create trigger aud_perfis after update or delete on public.perfis for each row execute function public.registrar_auditoria();

-- ---------- RLS ----------
alter table public.frentes enable row level security;
alter table public.vendedores enable row level security;
alter table public.territorios enable row level security;
alter table public.territorio_areas enable row level security;
alter table public.funil_etapas enable row level security;
alter table public.motivos_perda enable row level security;
alter table public.produtos enable row level security;
alter table public.produto_frentes enable row level security;
alter table public.perfis enable row level security;
alter table public.clientes enable row level security;
alter table public.cliente_frentes enable row level security;
alter table public.cliente_unidades enable row level security;
alter table public.contatos enable row level security;
alter table public.interacoes enable row level security;
alter table public.tarefas enable row level security;
alter table public.pedidos enable row level security;
alter table public.vendas_anuais enable row level security;
alter table public.auditoria enable row level security;

-- Tabelas de referência: leitura para usuários aprovados, escrita para admin
do $$
declare t text;
begin
  foreach t in array array['frentes','vendedores','territorios','territorio_areas','funil_etapas','motivos_perda','produtos','produto_frentes'] loop
    execute format('create policy "ler %1$s" on public.%1$I for select to authenticated using ((select public.meu_papel()) <> ''pendente'')', t);
    execute format('create policy "admin escreve %1$s" on public.%1$I for all to authenticated using ((select public.eh_admin())) with check ((select public.eh_admin()))', t);
  end loop;
end $$;

-- Perfis
create policy "ver proprio perfil ou gestao" on public.perfis for select to authenticated
  using (id = (select auth.uid()) or (select public.eh_gestao()));
create policy "editar proprio nome ou admin" on public.perfis for update to authenticated
  using (id = (select auth.uid()) or (select public.eh_admin()))
  with check (id = (select auth.uid()) or (select public.eh_admin()));
create policy "admin exclui perfil" on public.perfis for delete to authenticated
  using ((select public.eh_admin()));

-- Clientes
create policy "ver clientes" on public.clientes for select to authenticated
  using (public.pode_ver_cliente(vendedor_id));
create policy "criar clientes" on public.clientes for insert to authenticated
  with check ((select public.meu_papel()) in ('admin','gerente','vendedor','externo'));
create policy "editar clientes" on public.clientes for update to authenticated
  using (public.pode_editar_cliente(vendedor_id))
  with check ((select public.eh_gestao()) or (select public.meu_papel()) in ('vendedor','externo'));
create policy "excluir clientes" on public.clientes for delete to authenticated
  using ((select public.eh_admin()));

-- Tabelas filhas do cliente
do $$
declare t text;
begin
  foreach t in array array['cliente_frentes','cliente_unidades','contatos','interacoes','tarefas','pedidos','vendas_anuais'] loop
    execute format('create policy "ver %1$s" on public.%1$I for select to authenticated using (cliente_id is null or public.pode_ver_cliente_id(cliente_id))', t);
    execute format('create policy "criar %1$s" on public.%1$I for insert to authenticated with check (cliente_id is null or public.pode_editar_cliente_id(cliente_id))', t);
    execute format('create policy "editar %1$s" on public.%1$I for update to authenticated using (cliente_id is null or public.pode_editar_cliente_id(cliente_id)) with check (cliente_id is null or public.pode_editar_cliente_id(cliente_id))', t);
    execute format('create policy "excluir %1$s" on public.%1$I for delete to authenticated using (public.pode_editar_cliente_id(cliente_id))', t);
  end loop;
end $$;

-- Tarefas sem cliente: só o responsável
create policy "tarefas pessoais" on public.tarefas for all to authenticated
  using (cliente_id is null and responsavel_id = (select auth.uid()))
  with check (cliente_id is null and responsavel_id = (select auth.uid()));

-- Auditoria: só admin lê; escrita apenas pelos gatilhos
create policy "admin le auditoria" on public.auditoria for select to authenticated
  using ((select public.eh_admin()));

-- Funções auxiliares não devem ser chamáveis por anônimos
revoke execute on function public.meu_papel, public.meu_vendedor_id, public.eh_gestao, public.eh_admin,
  public.pode_ver_cliente, public.pode_editar_cliente, public.pode_ver_cliente_id, public.pode_editar_cliente_id from anon, public;
grant execute on function public.meu_papel, public.meu_vendedor_id, public.eh_gestao, public.eh_admin,
  public.pode_ver_cliente, public.pode_editar_cliente, public.pode_ver_cliente_id, public.pode_editar_cliente_id to authenticated;
revoke execute on function public.criar_perfil_novo_usuario, public.proteger_perfil, public.atribuir_territorio,
  public.registrar_auditoria, public.set_updated_at from anon, authenticated, public;
