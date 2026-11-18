-- GeoJSON pronto para o mapa (a API devolve geometry em formato binário, difícil de usar no navegador)
create or replace view public.territorios_geojson with (security_invoker = true) as
select t.id, t.nome, t.cor, t.ordem, t.vendedor_id, v.nome as vendedor,
       extensions.st_asgeojson(t.geom, 4)::jsonb as geometria,
       extensions.st_asgeojson(extensions.st_pointonsurface(
         (select d.geom from extensions.st_dump(t.geom) d order by extensions.st_area(d.geom) desc limit 1)), 3)::jsonb as rotulo
from public.territorios t left join public.vendedores v on v.id = t.vendedor_id
where t.geom is not null;
grant select on public.territorios_geojson to authenticated;
revoke all on public.territorios_geojson from anon;
