-- Fase 1: precisão da localização e visão de clientes para o mapa
alter table public.clientes
  add column localizacao_precisao text not null default 'exata'
  check (localizacao_precisao in ('exata','cidade','manual'));

-- Ponto em lat/lng + frentes + última compra. security_invoker: respeita o RLS de quem consulta.
create view public.clientes_mapa with (security_invoker = true) as
select
  c.id, c.nome, c.razao_social, c.documento, c.cidade, c.uf, c.status, c.etapa_id,
  c.vendedor_id, c.territorio_id, c.alerta_financeiro, c.porte, c.localizacao_precisao,
  extensions.st_y(c.localizacao::extensions.geometry) as lat,
  extensions.st_x(c.localizacao::extensions.geometry) as lng,
  coalesce((select array_agg(f.slug order by f.ordem) from public.cliente_frentes cf
            join public.frentes f on f.id = cf.frente_id where cf.cliente_id = c.id), '{}') as frentes,
  (select max(p.data) from public.pedidos p where p.cliente_id = c.id) as ultima_compra,
  c.updated_at
from public.clientes c;

grant select on public.clientes_mapa to authenticated;
revoke all on public.clientes_mapa from anon;

-- Sugere frentes a partir dos produtos comprados (pedidos + histórico), sem tocar nas definidas à mão
create or replace function public.sugerir_frentes(cid uuid) returns void
language plpgsql security invoker set search_path = '' as $$
begin
  delete from public.cliente_frentes where cliente_id = cid and not manual;
  insert into public.cliente_frentes (cliente_id, frente_id, manual)
  select distinct cid, pf.frente_id, false
  from (
    select produto_id from public.pedidos where cliente_id = cid and produto_id is not null
    union select produto_id from public.vendas_anuais where cliente_id = cid and produto_id is not null
  ) x
  join public.produto_frentes pf on pf.produto_id = x.produto_id
  -- produtos usados nas duas frentes (SEEDFLOW) não definem a frente sozinhos
  where (select count(*) from public.produto_frentes p2 where p2.produto_id = x.produto_id) = 1
  on conflict (cliente_id, frente_id) do nothing;
end $$;
revoke execute on function public.sugerir_frentes from anon, public;
grant execute on function public.sugerir_frentes to authenticated;
