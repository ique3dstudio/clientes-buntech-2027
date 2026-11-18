-- A malha municipal tem pequenas frestas entre municípios vizinhos; ao unir, aparecem como "buracos"
-- minúsculos dentro do território. Remove buracos menores que o limite (km²).
create or replace function privado.preencher_buracos(g extensions.geometry, limite_km2 double precision default 500)
returns extensions.geometry language sql immutable set search_path = '' as $$
  select extensions.st_multi(extensions.st_collect(
    case when extensions.st_numinteriorrings(p.geom) = 0 then p.geom else (
      select extensions.st_makepolygon(
        extensions.st_exteriorring(p.geom),
        coalesce(array_agg(extensions.st_interiorringn(p.geom, i)) filter (
          where extensions.st_area(extensions.st_makepolygon(extensions.st_interiorringn(p.geom, i))::extensions.geography) > limite_km2 * 1e6
        ), '{}'::extensions.geometry[]))
      from generate_series(1, extensions.st_numinteriorrings(p.geom)) i) end))
  from extensions.st_dump(g) p
$$;

create or replace function privado.recalcular_contornos() returns void
language plpgsql set search_path = '' as $$
begin
  update public.territorios t set geom = (
    select privado.preencher_buracos(extensions.st_simplifypreservetopology(
             extensions.st_makevalid(extensions.st_unaryunion(extensions.st_collect(m.geom))), 0.008))
      from public.municipios_ibge m where m.territorio_id = t.id);
end $$;
