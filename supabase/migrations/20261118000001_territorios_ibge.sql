-- =====================================================================
-- Fase 2: territórios montados a partir de municípios do IBGE
-- Cada município pertence a no máximo um território; o contorno do território
-- é a união (ST_UnaryUnion) dos municípios. Mover um município = mudar territorio_id.
-- =====================================================================
create extension if not exists http with schema extensions;

create table public.municipios_ibge (
  codigo text primary key,
  nome text not null,
  uf char(2) not null,
  microrregiao text,
  mesorregiao text,
  territorio_id uuid references public.territorios(id) on delete set null,
  geom extensions.geometry(MultiPolygon, 4326) not null
);
create index municipios_ibge_geom_idx on public.municipios_ibge using gist (geom);
create index on public.municipios_ibge (territorio_id);
create index on public.municipios_ibge (uf);

alter table public.municipios_ibge enable row level security;
create policy "ler municipios" on public.municipios_ibge for select to authenticated
  using ((select privado.meu_papel()) <> 'pendente');
create policy "admin escreve municipios" on public.municipios_ibge for all to authenticated
  using ((select privado.eh_admin())) with check ((select privado.eh_admin()));

-- a composição por lista de áreas é substituída pela atribuição por município
drop table public.territorio_areas;

-- ---------- Carga (rodada uma vez; funções privadas) ----------
create or replace function privado.sigla_uf(cod int) returns text language sql immutable as $$
  select case cod when 11 then 'RO' when 12 then 'AC' when 13 then 'AM' when 14 then 'RR' when 15 then 'PA' when 16 then 'AP'
    when 17 then 'TO' when 21 then 'MA' when 22 then 'PI' when 23 then 'CE' when 24 then 'RN' when 25 then 'PB' when 26 then 'PE'
    when 27 then 'AL' when 28 then 'SE' when 29 then 'BA' when 31 then 'MG' when 32 then 'ES' when 33 then 'RJ' when 35 then 'SP'
    when 41 then 'PR' when 42 then 'SC' when 43 then 'RS' when 50 then 'MS' when 51 then 'MT' when 52 then 'GO' when 53 then 'DF' end
$$;

-- Geometrias: tbrugz/geodata-br (malha municipal do IBGE em GeoJSON)
create or replace function privado.carregar_geometrias_uf(cod int) returns int
language plpgsql set search_path = '' as $$
declare r extensions.http_response; n int;
begin
  perform extensions.http_set_curlopt('CURLOPT_TIMEOUT_MS', '120000');
  r := extensions.http_get(format('https://raw.githubusercontent.com/tbrugz/geodata-br/master/geojson/geojs-%s-mun.json', cod));
  if r.status <> 200 then raise exception 'Falha ao baixar malha da UF % (HTTP %)', cod, r.status; end if;
  insert into public.municipios_ibge (codigo, nome, uf, geom)
  select f->'properties'->>'id', f->'properties'->>'name', privado.sigla_uf(cod),
         extensions.st_multi(extensions.st_makevalid(extensions.st_setsrid(extensions.st_geomfromgeojson(f->>'geometry'), 4326)))
  from jsonb_array_elements(r.content::jsonb->'features') f
  on conflict (codigo) do update set nome = excluded.nome, geom = excluded.geom;
  get diagnostics n = row_count;
  return n;
end $$;

-- Micro e mesorregião: API de localidades do IBGE
create or replace function privado.carregar_hierarquia_uf(cod int) returns int
language plpgsql set search_path = '' as $$
declare r extensions.http_response; n int;
begin
  perform extensions.http_set_curlopt('CURLOPT_TIMEOUT_MS', '120000');
  r := extensions.http_get(format('https://servicodados.ibge.gov.br/api/v1/localidades/estados/%s/municipios', cod));
  if r.status <> 200 then raise exception 'Falha ao consultar IBGE da UF % (HTTP %)', cod, r.status; end if;
  update public.municipios_ibge m
     set microrregiao = j->'microrregiao'->>'nome', mesorregiao = j->'microrregiao'->'mesorregiao'->>'nome'
    from jsonb_array_elements(r.content::jsonb) j
   where m.codigo = j->>'id';
  get diagnostics n = row_count;
  return n;
end $$;

-- ---------- Regras de divisão (definidas com o usuário) ----------
-- MT, MS → Centro-Oeste | GO, DF, BA → GO/DF/BA | MG → MG/SP Leste | SC, RS → Sul
-- SP: mesorregiões São José do Rio Preto, Ribeirão Preto, Campinas e Vale do Paraíba → MG/SP Leste; resto → SP/PR Norte
-- PR: do paralelo de Maringá para baixo → Sul; acima → SP/PR Norte
create or replace function privado.atribuir_municipios_padrao() returns void
language plpgsql set search_path = '' as $$
declare lat_maringa double precision;
begin
  select extensions.st_y(extensions.st_pointonsurface(geom)) into lat_maringa from public.municipios_ibge where codigo = '4115200';
  update public.municipios_ibge m set territorio_id = t.id
    from public.territorios t
   where t.nome = case
     when m.uf in ('MT','MS') then 'Centro-Oeste (MT/MS)'
     when m.uf in ('GO','DF','BA') then 'GO/DF/BA'
     when m.uf = 'MG' then 'MG/SP Leste'
     when m.uf in ('SC','RS') then 'Sul'
     when m.uf = 'SP' and m.mesorregiao in ('São José do Rio Preto','Ribeirão Preto','Campinas','Vale do Paraíba Paulista') then 'MG/SP Leste'
     when m.uf = 'SP' then 'SP/PR Norte'
     when m.uf = 'PR' and extensions.st_y(extensions.st_pointonsurface(m.geom)) <= lat_maringa then 'Sul'
     when m.uf = 'PR' then 'SP/PR Norte'
   end;
end $$;

-- Contorno de cada território = união dos seus municípios (simplificada ~1 km)
create or replace function privado.recalcular_contornos() returns void
language plpgsql set search_path = '' as $$
begin
  update public.territorios t set geom = (
    select extensions.st_multi(extensions.st_simplifypreservetopology(
             extensions.st_makevalid(extensions.st_unaryunion(extensions.st_collect(m.geom))), 0.008))
      from public.municipios_ibge m where m.territorio_id = t.id);
end $$;

-- Reatribui todos os clientes pelo município onde o ponto cai (respeita vendedor definido à mão)
create or replace function privado.reatribuir_clientes() returns void
language plpgsql set search_path = '' as $$
begin
  update public.clientes c set
    territorio_id = m.territorio_id,
    vendedor_id = case when c.vendedor_manual then c.vendedor_id else t.vendedor_id end
  from public.municipios_ibge m
  left join public.territorios t on t.id = m.territorio_id
  where c.localizacao is not null and extensions.st_covers(m.geom, c.localizacao::extensions.geometry);
end $$;

-- Gatilho de cliente: usa o município do ponto
create or replace function public.atribuir_territorio() returns trigger
language plpgsql security definer set search_path = '' as $$
declare t record;
begin
  if new.localizacao is not null and (tg_op = 'INSERT' or new.localizacao is distinct from old.localizacao or new.vendedor_manual is distinct from old.vendedor_manual) then
    select m.territorio_id, tt.vendedor_id into t
      from public.municipios_ibge m left join public.territorios tt on tt.id = m.territorio_id
     where extensions.st_covers(m.geom, new.localizacao::extensions.geometry) limit 1;
    new.territorio_id := t.territorio_id;
    if not new.vendedor_manual then new.vendedor_id := t.vendedor_id; end if;
  end if;
  return new;
end $$;

-- ---------- Editor de territórios (só administrador) ----------
create or replace function public.mover_municipios(codigos text[], territorio uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not privado.eh_admin() then raise exception 'Somente administradores podem alterar territórios'; end if;
  update public.municipios_ibge set territorio_id = territorio where codigo = any(codigos);
  perform privado.recalcular_contornos();
  perform privado.reatribuir_clientes();
end $$;
revoke execute on function public.mover_municipios from anon, public;
grant execute on function public.mover_municipios to authenticated;

-- Alterar o vendedor de um território reatribui os clientes
create or replace function public.definir_vendedor_territorio(territorio uuid, vendedor uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not privado.eh_admin() then raise exception 'Somente administradores podem alterar territórios'; end if;
  update public.territorios set vendedor_id = vendedor where id = territorio;
  perform privado.reatribuir_clientes();
end $$;
revoke execute on function public.definir_vendedor_territorio from anon, public;
grant execute on function public.definir_vendedor_territorio to authenticated;

revoke execute on function public.atribuir_territorio from anon, authenticated, public;

-- Resumo para o painel (sem trazer geometrias pesadas)
create or replace view public.territorios_resumo with (security_invoker = true) as
select t.id, t.nome, t.cor, t.vendedor_id, v.nome as vendedor, v.externo, t.ordem,
       (select count(*) from public.municipios_ibge m where m.territorio_id = t.id) as municipios,
       (select array_agg(distinct m.uf order by m.uf) from public.municipios_ibge m where m.territorio_id = t.id) as ufs,
       (select count(*) from public.clientes c where c.territorio_id = t.id) as clientes
from public.territorios t left join public.vendedores v on v.id = t.vendedor_id;
grant select on public.territorios_resumo to authenticated;
revoke all on public.territorios_resumo from anon;
