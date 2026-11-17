-- =====================================================================
-- Dados iniciais: frentes, funil, motivos de perda, produtos, vendedores e territórios
-- =====================================================================
insert into public.frentes (slug, nome, cor, ordem) values
  ('pastagens', 'Pastagens / Forrageiras', '#16A34A', 1),
  ('grandes-culturas', 'Grandes Culturas (Soja/Milho)', '#D97706', 2);

insert into public.funil_etapas (slug, nome, ordem, cor, ganho) values
  ('lead-frio', 'Lead Frio', 1, '#94A3B8', false),
  ('lead', 'Lead', 2, '#38BDF8', false),
  ('qualificado', 'Qualificado', 3, '#0891D1', false),
  ('validacao', 'Validação Industrial/Mercado', 4, '#8B5CF6', false),
  ('fechado', 'Fechado/Ganha', 5, '#17A89A', true),
  ('recorrente', 'Recorrente', 6, '#15803D', true);

insert into public.motivos_perda (nome) values
  ('Não incrusta sementes'),
  ('Não trabalha com sementes de pastagens'),
  ('Já foi cliente, parou de incrustar'),
  ('Incrusta sementes em SP'),
  ('Preço'),
  ('Concorrente'),
  ('Outro');

insert into public.produtos (nome, linha, embalagem) values
  ('SEEDGEL FR SACO 25KG', 'SEEDGEL', 'Saco 25 kg'),
  ('SEEDGEL FR BIGBAG 1000KG', 'SEEDGEL', 'Big bag 1000 kg'),
  ('SEEDGEL FR BB 1000KG', 'SEEDGEL', 'Big bag 1000 kg'),
  ('SEEDGEL FR M BB 1000KG', 'SEEDGEL', 'Big bag 1000 kg'),
  ('SEEDGEL FR GRAF BIG BAG 1000KG', 'SEEDGEL', 'Big bag 1000 kg'),
  ('SEEDGRAF CAIXA 20KG', 'SEEDGRAF', 'Caixa 20 kg'),
  ('SEEDGRAF BIG BAG 500 KG', 'SEEDGRAF', 'Big bag 500 kg'),
  ('GRAFITE EM PO SACARIA 20 KG', 'GRAFITE EM PÓ', 'Saco 20 kg'),
  ('GRAFITE EM PO BB 1000 KG', 'GRAFITE EM PÓ', 'Big bag 1000 kg'),
  ('SEEDFLOW VERDE CAIXA 15 KG', 'SEEDFLOW', 'Caixa 15 kg'),
  ('SEEDCOLOR AMARELO CAIXA 25KG', 'SEEDCOLOR', 'Caixa 25 kg'),
  ('SEEDCOLOR AZUL CAIXA 25KG', 'SEEDCOLOR', 'Caixa 25 kg'),
  ('SEEDCOLOR LARANJA P CAIXA 25KG', 'SEEDCOLOR', 'Caixa 25 kg'),
  ('SEEDCOLOR PRETO CAIXA 25KG', 'SEEDCOLOR', 'Caixa 25 kg'),
  ('SEEDCOLOR VERDE CAIXA 25KG', 'SEEDCOLOR', 'Caixa 25 kg'),
  ('SEEDCOLOR VERMELHO CAIXA 25KG', 'SEEDCOLOR', 'Caixa 25 kg'),
  ('SEEDCOLOR VERMELHO PLUS CAIXA 25 KG', 'SEEDCOLOR', 'Caixa 25 kg'),
  ('POLÍMERO', 'POLÍMERO', null);

-- Linha → frente: SEEDGEL, SEEDGRAF, GRAFITE, SEEDCOLOR = pastagens; SEEDFLOW = ambas; POLÍMERO = grandes culturas
insert into public.produto_frentes (produto_id, frente_id)
select p.id, f.id from public.produtos p join public.frentes f on
  (f.slug = 'pastagens' and p.linha in ('SEEDGEL','SEEDGRAF','GRAFITE EM PÓ','SEEDCOLOR','SEEDFLOW'))
  or (f.slug = 'grandes-culturas' and p.linha in ('SEEDFLOW','POLÍMERO'));

insert into public.vendedores (nome, externo) values
  ('Edson Diniz', true),
  ('Gustavo Ique', false),
  ('João Rafael', false),
  ('Larissa Machado', false);

insert into public.territorios (nome, cor, vendedor_id, ordem) values
  ('Centro-Oeste (MT/MS)', '#EC0B7B', (select id from public.vendedores where nome = 'Edson Diniz'), 1),
  ('GO/DF/BA', '#22C55E', (select id from public.vendedores where nome = 'Larissa Machado'), 2),
  ('MG/SP Leste', '#DC2626', (select id from public.vendedores where nome = 'Gustavo Ique'), 3),
  ('SP/PR Norte', '#F59E0B', (select id from public.vendedores where nome = 'João Rafael'), 4),
  ('Sul', '#8B5CF6', null, 5);

-- Composição (códigos IBGE de UF; mesorregiões/microrregiões recebem código na Fase 2)
insert into public.territorio_areas (territorio_id, tipo, uf, nome, codigo_ibge)
select t.id, a.tipo::public.tipo_area, a.uf, a.nome, a.cod from (values
  ('Centro-Oeste (MT/MS)', 'uf', 'MT', 'Mato Grosso', '51'),
  ('Centro-Oeste (MT/MS)', 'uf', 'MS', 'Mato Grosso do Sul', '50'),
  ('GO/DF/BA', 'uf', 'GO', 'Goiás', '52'),
  ('GO/DF/BA', 'uf', 'DF', 'Distrito Federal', '53'),
  ('GO/DF/BA', 'uf', 'BA', 'Bahia', '29'),
  ('MG/SP Leste', 'uf', 'MG', 'Minas Gerais', '31'),
  ('MG/SP Leste', 'mesorregiao', 'SP', 'São José do Rio Preto', null),
  ('MG/SP Leste', 'mesorregiao', 'SP', 'Ribeirão Preto', null),
  ('MG/SP Leste', 'mesorregiao', 'SP', 'Campinas', null),
  ('MG/SP Leste', 'mesorregiao', 'SP', 'Vale do Paraíba Paulista', null),
  ('SP/PR Norte', 'mesorregiao', 'SP', 'Araçatuba', null),
  ('SP/PR Norte', 'mesorregiao', 'SP', 'Presidente Prudente', null),
  ('SP/PR Norte', 'mesorregiao', 'SP', 'Marília', null),
  ('SP/PR Norte', 'mesorregiao', 'SP', 'Assis', null),
  ('SP/PR Norte', 'mesorregiao', 'SP', 'Bauru', null),
  ('SP/PR Norte', 'mesorregiao', 'SP', 'Araraquara', null),
  ('SP/PR Norte', 'mesorregiao', 'SP', 'Piracicaba', null),
  ('SP/PR Norte', 'mesorregiao', 'SP', 'Itapetininga', null),
  ('SP/PR Norte', 'mesorregiao', 'SP', 'Macro Metropolitana Paulista', null),
  ('SP/PR Norte', 'mesorregiao', 'SP', 'Metropolitana de São Paulo', null),
  ('SP/PR Norte', 'mesorregiao', 'SP', 'Litoral Sul Paulista', null),
  ('SP/PR Norte', 'mesorregiao', 'PR', 'Noroeste Paranaense', null),
  ('SP/PR Norte', 'mesorregiao', 'PR', 'Norte Central Paranaense (exceto Maringá)', null),
  ('SP/PR Norte', 'mesorregiao', 'PR', 'Norte Pioneiro Paranaense', null),
  ('SP/PR Norte', 'mesorregiao', 'PR', 'Centro Oriental Paranaense', null),
  ('SP/PR Norte', 'mesorregiao', 'PR', 'Metropolitana de Curitiba', null),
  ('Sul', 'microrregiao', 'PR', 'Maringá', null),
  ('Sul', 'mesorregiao', 'PR', 'Centro Ocidental Paranaense', null),
  ('Sul', 'mesorregiao', 'PR', 'Oeste Paranaense', null),
  ('Sul', 'mesorregiao', 'PR', 'Sudoeste Paranaense', null),
  ('Sul', 'mesorregiao', 'PR', 'Centro-Sul Paranaense', null),
  ('Sul', 'mesorregiao', 'PR', 'Sudeste Paranaense', null),
  ('Sul', 'uf', 'SC', 'Santa Catarina', '42'),
  ('Sul', 'uf', 'RS', 'Rio Grande do Sul', '43')
) as a(territorio, tipo, uf, nome, cod)
join public.territorios t on t.nome = a.territorio;
