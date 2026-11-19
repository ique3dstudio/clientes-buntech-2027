-- Integração com o buscasementeiras: o site de busca envia empresas para o mapa por esta função.
-- Protegida por token (guardado só como hash). Nunca duplica: confere raiz do CNPJ e nome na mesma UF.

create table if not exists privado.integracao_tokens (
  nome text primary key,
  token_hash bytea not null,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  ultimo_uso timestamptz
);

create or replace function public.importar_leads(p_token text, p_leads jsonb)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  l jsonb;
  i int := 0;
  res jsonb := '[]'::jsonb;
  v_doc text; v_raiz text; v_nome text; v_uf text; v_cidade text; v_ibge text;
  ex record; novo_id uuid; v_lat double precision; v_lng double precision; v_prec text; v_fr smallint;
begin
  if p_token is null or not exists (
    select 1 from privado.integracao_tokens t
    where t.ativo and t.token_hash = extensions.digest(p_token, 'sha256')
  ) then
    raise exception 'Token da integração inválido';
  end if;
  update privado.integracao_tokens set ultimo_uso = now() where token_hash = extensions.digest(p_token, 'sha256');

  if jsonb_typeof(p_leads) <> 'array' then raise exception 'p_leads deve ser uma lista'; end if;
  if jsonb_array_length(p_leads) > 200 then raise exception 'No máximo 200 empresas por envio'; end if;

  for l in select * from jsonb_array_elements(p_leads) loop
    i := i + 1;
    v_nome := btrim(coalesce(l->>'nome', ''));
    v_uf := upper(btrim(coalesce(l->>'uf', '')));
    v_cidade := nullif(btrim(coalesce(l->>'cidade', '')), '');
    v_doc := regexp_replace(coalesce(l->>'documento', ''), '\D', '', 'g');
    v_raiz := case when length(v_doc) = 14 then left(v_doc, 8) end;
    if v_nome = '' or length(v_uf) <> 2 then
      res := res || jsonb_build_object('indice', i, 'status', 'invalido', 'nome', v_nome);
      continue;
    end if;

    select c.id, c.nome into ex from public.clientes c
    where (v_raiz is not null and left(c.documento, 8) = v_raiz)
       or (c.uf = v_uf and privado.norm_nome(v_nome) <> '' and privado.norm_nome(c.nome) = privado.norm_nome(v_nome))
    limit 1;

    if found then
      -- empresa repetida: não cria outra, só completa o que estiver vazio
      update public.clientes set
        telefone = coalesce(telefone, nullif(l->>'telefone', '')),
        email = coalesce(email, nullif(l->>'email', '')),
        site = coalesce(site, nullif(l->>'site', ''))
      where id = ex.id;
      res := res || jsonb_build_object('indice', i, 'status', 'ja_existe', 'id', ex.id, 'nome', ex.nome);
      continue;
    end if;

    v_lat := nullif(l->>'lat', '')::double precision;
    v_lng := nullif(l->>'lng', '')::double precision;
    v_prec := case when l->>'precisao' = 'exata' then 'exata' else 'cidade' end;
    select m.codigo into v_ibge from public.municipios_ibge m
      where m.uf = v_uf and v_cidade is not null
        and extensions.unaccent(lower(m.nome)) = extensions.unaccent(lower(v_cidade)) limit 1;

    insert into public.clientes (nome, razao_social, documento, telefone, email, site, endereco, cep, cidade, uf,
                                 municipio_ibge, localizacao, localizacao_precisao, status, etapa_id, porte, origem, observacoes)
    values (v_nome, nullif(l->>'razao_social', ''), case when length(v_doc) = 14 then v_doc end,
            nullif(l->>'telefone', ''), nullif(l->>'email', ''), nullif(l->>'site', ''),
            nullif(l->>'endereco', ''), nullif(regexp_replace(coalesce(l->>'cep', ''), '\D', '', 'g'), ''),
            v_cidade, v_uf, v_ibge,
            case when v_lat is not null and v_lng is not null
                 then extensions.st_setsrid(extensions.st_makepoint(v_lng, v_lat), 4326)::extensions.geography end,
            v_prec, 'prospect', 1, nullif(l->>'porte', ''),
            left(coalesce(nullif(l->>'origem', ''), 'buscasementeiras'), 200),
            left(nullif(l->>'observacoes', ''), 4000))
    returning id into novo_id;

    v_fr := case l->>'frente' when 'pastagens' then 1 when 'grandes-culturas' then 2 end;
    if v_fr is not null then
      insert into public.cliente_frentes (cliente_id, frente_id, manual) values (novo_id, v_fr, true) on conflict do nothing;
    end if;
    res := res || jsonb_build_object('indice', i, 'status', 'criado', 'id', novo_id, 'nome', v_nome);
  end loop;
  return res;
end $$;

revoke all on function public.importar_leads(text, jsonb) from public;
grant execute on function public.importar_leads(text, jsonb) to anon, authenticated;
