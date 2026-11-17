-- =====================================================================
-- Buntech Mapa de Clientes 2027 — schema inicial (Fase 0)
-- =====================================================================
create extension if not exists postgis with schema extensions;

-- ---------- Tipos ----------
create type public.papel as enum ('pendente','leitura','externo','vendedor','gerente','admin');
create type public.status_cliente as enum ('prospect','carteira','perdido');
create type public.tipo_area as enum ('uf','mesorregiao','microrregiao','municipio');
create type public.tipo_interacao as enum ('ligacao','whatsapp','email','visita','amostra','reuniao','nota');

-- ---------- Função updated_at ----------
create or replace function public.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end $$;

-- ---------- Cadastros de referência ----------
create table public.frentes (
  id smallint generated always as identity primary key,
  slug text not null unique,
  nome text not null,
  cor text not null,
  ordem smallint not null default 0
);

create table public.vendedores (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  email text,
  telefone text,
  externo boolean not null default false,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_vendedores_updated before update on public.vendedores for each row execute function public.set_updated_at();

create table public.territorios (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  cor text not null,
  vendedor_id uuid references public.vendedores(id) on delete set null,
  geom extensions.geometry(MultiPolygon, 4326),
  ordem smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index territorios_geom_idx on public.territorios using gist (geom);
create trigger trg_territorios_updated before update on public.territorios for each row execute function public.set_updated_at();

-- Composição do território por áreas oficiais do IBGE
create table public.territorio_areas (
  id uuid primary key default gen_random_uuid(),
  territorio_id uuid not null references public.territorios(id) on delete cascade,
  tipo public.tipo_area not null,
  uf char(2) not null,
  nome text not null,
  codigo_ibge text,
  unique (tipo, uf, nome)
);
create index on public.territorio_areas (territorio_id);

create table public.funil_etapas (
  id smallint generated always as identity primary key,
  slug text not null unique,
  nome text not null,
  ordem smallint not null,
  cor text not null,
  ganho boolean not null default false
);

create table public.motivos_perda (
  id smallint generated always as identity primary key,
  nome text not null unique,
  ativo boolean not null default true
);

create table public.produtos (
  id smallint generated always as identity primary key,
  nome text not null unique,
  linha text not null,
  embalagem text,
  ativo boolean not null default true
);

create table public.produto_frentes (
  produto_id smallint not null references public.produtos(id) on delete cascade,
  frente_id smallint not null references public.frentes(id) on delete cascade,
  primary key (produto_id, frente_id)
);

-- ---------- Usuários ----------
create table public.perfis (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null default '',
  email text,
  papel public.papel not null default 'pendente',
  vendedor_id uuid references public.vendedores(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_perfis_updated before update on public.perfis for each row execute function public.set_updated_at();

-- ---------- Clientes ----------
create table public.clientes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  razao_social text,
  documento text,                      -- CNPJ ou CPF, só dígitos
  site text,
  email text,
  telefone text,
  endereco text,
  cidade text,
  uf char(2),
  cep text,
  municipio_ibge text,
  localizacao extensions.geography(Point, 4326),
  localizacao_manual boolean not null default false,
  status public.status_cliente not null default 'prospect',
  etapa_id smallint references public.funil_etapas(id),
  motivo_perda_id smallint references public.motivos_perda(id),
  territorio_id uuid references public.territorios(id) on delete set null,
  vendedor_id uuid references public.vendedores(id) on delete set null,
  vendedor_manual boolean not null default false,
  porte text check (porte in ('Pequeno','Médio','Grande')),
  equipamento text,
  potencial_ton_ano numeric(12,2),
  ritmo_ton_mes numeric(12,2),
  alerta_financeiro text,
  condicao_pagamento text,
  observacoes text,
  origem text,
  cadastrado_em date not null default current_date,
  created_by uuid references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint documento_digitos check (documento is null or documento ~ '^([0-9]{11}|[0-9]{14})$')
);
create unique index clientes_documento_uniq on public.clientes (documento) where documento is not null;
create index clientes_localizacao_idx on public.clientes using gist (localizacao);
create index on public.clientes (vendedor_id);
create index on public.clientes (territorio_id);
create index on public.clientes (etapa_id);
create trigger trg_clientes_updated before update on public.clientes for each row execute function public.set_updated_at();

create table public.cliente_frentes (
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  frente_id smallint not null references public.frentes(id) on delete cascade,
  manual boolean not null default false,
  primary key (cliente_id, frente_id)
);

-- Outros cadastros no TOTVS (outro CNPJ / código)
create table public.cliente_unidades (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  codigo_totvs text,
  loja text,
  razao_social text,
  documento text,
  cidade text,
  uf char(2),
  principal boolean not null default false,
  created_at timestamptz not null default now()
);
create index on public.cliente_unidades (cliente_id);

create table public.contatos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  nome text,
  cargo text,
  telefone text,
  email text,
  principal boolean not null default false,
  created_at timestamptz not null default now()
);
create index on public.contatos (cliente_id);

create table public.interacoes (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  tipo public.tipo_interacao not null,
  data timestamptz not null default now(),
  descricao text,
  localizacao extensions.geography(Point, 4326),
  autor_id uuid references auth.users(id) default auth.uid(),
  autor_nome text,
  created_at timestamptz not null default now()
);
create index on public.interacoes (cliente_id, data desc);

create table public.tarefas (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references public.clientes(id) on delete cascade,
  responsavel_id uuid references auth.users(id) default auth.uid(),
  titulo text not null,
  vencimento date,
  concluida_em timestamptz,
  created_at timestamptz not null default now()
);
create index on public.tarefas (responsavel_id, vencimento);
create index on public.tarefas (cliente_id);

create table public.pedidos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  unidade_id uuid references public.cliente_unidades(id) on delete set null,
  data date not null,
  produto_id smallint references public.produtos(id),
  produto_nome text,
  quantidade numeric(12,3),
  unidade text default 'TN',
  valor_total numeric(14,2),
  tipo text,
  created_at timestamptz not null default now()
);
create index on public.pedidos (cliente_id, data desc);

create table public.vendas_anuais (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  produto_id smallint references public.produtos(id),
  produto_nome text,
  ano smallint not null,
  periodo text,
  quantidade numeric(12,3),
  faturamento numeric(14,2),
  origem text
);
create index on public.vendas_anuais (cliente_id);

create table public.auditoria (
  id bigint generated always as identity primary key,
  tabela text not null,
  registro_id text,
  acao text not null,
  antes jsonb,
  depois jsonb,
  usuario_id uuid,
  em timestamptz not null default now()
);
create index on public.auditoria (tabela, registro_id);
