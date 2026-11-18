-- =====================================================================
-- RENASEM (Registro Nacional de Sementes e Mudas – MAPA): consulta pública
-- Carregado direto no banco a partir de https://sistemasweb.agricultura.gov.br/renasem/
-- Atividades usadas: 3 = Beneficiador de Sementes, 13 = Produtor de Sementes
-- =====================================================================
drop function if exists privado.teste_renasem();

create table public.renasem (
  id bigint generated always as identity primary key,
  cd_renasem text not null,
  atividade text not null,
  documento text,              -- CNPJ (só dígitos); CPF vem mascarado pela fonte e fica nulo
  documento_exibido text,      -- como a fonte mostra (inclui CPF mascarado)
  nome text not null,
  uf char(2) not null,
  municipio text,
  validade date,
  endereco text,
  cep text,
  cliente_id uuid references public.clientes(id) on delete set null,
  carregado_em timestamptz not null default now(),
  unique (cd_renasem, atividade, nome)
);
create index on public.renasem (documento);
create index on public.renasem (uf, municipio);
alter table public.renasem enable row level security;
create policy "ler renasem" on public.renasem for select to authenticated using ((select privado.meu_papel()) <> 'pendente');
create policy "admin escreve renasem" on public.renasem for all to authenticated using ((select privado.eh_admin())) with check ((select privado.eh_admin()));

create or replace function privado.carregar_renasem(p_uf text, p_atividade int) returns int
language plpgsql set search_path = '' as $$
declare
  url constant text := 'https://sistemasweb.agricultura.gov.br/renasem/psq_consultarenasems.do';
  filtro text := format('&valor%%28idTipoClientePesquisa%%29=%s&valor%%28sgUf%%29=%s', p_atividade, p_uf);
  r extensions.http_response; sess text; pag int := 1; total int := 1; n int := 0; m text[];
begin
  perform extensions.http_set_curlopt('CURLOPT_TIMEOUT_MS', '60000');
  r := extensions.http_post(url, 'metodo=gridPesquisa&componenteSelecionado=grid&grid.pesquisou=false&grid.pagina=1' || filtro, 'application/x-www-form-urlencoded');
  sess := substring(r.content from 'jsessionid=([^"&?]+)');
  loop
    total := coalesce(substring(regexp_replace(r.content, '<[^>]+>', ' ', 'g') from 'P.ginas\s+\d+\s+de\s+(\d+)')::int, 1);
    for m in select regexp_matches(r.content,
      '<tr bgcolor=''#[^'']*''>\s*<td[^>]*>([^<]*)</td>\s*<td[^>]*>([^<]*)</td>\s*<td[^>]*>([^<]*)</td>\s*<td[^>]*>([^<]*)</td>\s*<td[^>]*>([^<]*)</td>\s*<td[^>]*>([^<]*)</td>\s*<td[^>]*>([^<]*)</td>\s*<td[^>]*>([^<]*)</td>\s*<td[^>]*>([^<]*)</td>', 'g')
    loop
      insert into public.renasem (cd_renasem, atividade, documento, documento_exibido, nome, uf, municipio, validade, endereco, cep)
      values (trim(m[3]), trim(m[5]),
              case when trim(m[6]) ~ '^\d{2}\.\d{3}\.\d{3}/\d{4}-\d{2}$' then regexp_replace(m[6], '\D', '', 'g') end,
              nullif(trim(m[6]), ''), regexp_replace(trim(m[7]), '\s+', ' ', 'g'), trim(m[1]), nullif(trim(m[2]), ''),
              case when trim(m[4]) ~ '^\d{2}/\d{2}/\d{4}$' then to_date(trim(m[4]), 'DD/MM/YYYY') end,
              nullif(trim(m[8]), ''), nullif(regexp_replace(m[9], '\D', '', 'g'), ''))
      on conflict (cd_renasem, atividade, nome) do update set validade = excluded.validade, documento = excluded.documento, municipio = excluded.municipio, carregado_em = now();
      n := n + 1;
    end loop;
    exit when pag >= total or sess is null;
    r := extensions.http_post(url || ';jsessionid=' || sess,
      'metodo=gridPesquisaProximo&componenteSelecionado=grid&grid.pesquisou=true&grid.pagina=' || pag || filtro, 'application/x-www-form-urlencoded');
    pag := pag + 1;
  end loop;
  return n;
end $$;
