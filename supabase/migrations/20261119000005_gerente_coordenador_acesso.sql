create or replace function privado.eh_acompanhamento()
returns boolean language sql stable security definer set search_path to '' as $$
  select privado.meu_papel() in ('admin','gerente','coordenador')
$$;

create or replace function privado.eh_gestao()
returns boolean language sql stable security definer set search_path to '' as $$
  select privado.meu_papel() = 'admin'
$$;

drop policy "ver proprio perfil ou gestao" on public.perfis;
create policy "ver proprio perfil ou gestao" on public.perfis for select
  using ((id = (select auth.uid())) or (select privado.eh_acompanhamento()));

drop policy "criar clientes" on public.clientes;
create policy "criar clientes" on public.clientes for insert
  with check ((select privado.meu_papel()) = any (array['admin'::public.papel,'vendedor'::public.papel,'externo'::public.papel]));
