# Mapa de Clientes Buntech 2027 — Plano do Projeto

App oficial de prospecção de clientes para 2027: mapa do Brasil com clientes e prospects,
territórios de cada vendedor delimitados por linha tracejada, e gestão completa do funil comercial.

---

## 1. Visão e objetivos

**Problema:** hoje não existe uma visão única de onde estão os clientes, quem atende cada região e onde há espaço para prospectar.

**Objetivo:** uma plataforma web/app (PWA) onde a equipe comercial enxerga, no mapa, todas as sementeiras (clientes e prospects), separadas por frente de negócio e por vendedor, e consegue registrar visitas, contatos e negociações.

**Indicadores de sucesso (2027):**
- 100% das sementeiras do Brasil mapeadas (clientes + prospects).
- Cada vendedor abre o app no celular em campo e sabe quem visitar.
- Gestão acompanha cobertura por território, funil e atividades sem planilha.

---

## 2. Negócio: as 2 frentes

| Frente | Produto | Cliente-alvo | Cor sugerida no mapa |
|---|---|---|---|
| **Pastagens / Forrageiras** | Pó de revestimento | Sementeiras de pastagens | Verde |
| **Grandes Culturas** | Pó secante e polímero | Sementeiras de soja / milho | Âmbar/Laranja |

**Produtos por frente (definido pelo usuário):**
| Produto | Pastagens | Grandes Culturas |
|---|:-:|:-:|
| SEEDGEL | ✔ | |
| SEEDGRAF | ✔ | |
| GRAFITE EM PÓ | ✔ | |
| SEEDFLOW | ✔ | ✔ |
| Polímero | | ✔ |
| SEEDCOLOR | ✔ | |

- A frente de um cliente atual é **sugerida automaticamente pelos produtos que ele já comprou** (um produto exclusivo de cada frente → cliente nas duas). Cliente que só comprou **SEEDFLOW** (usado nas duas frentes) fica com a frente **a definir manualmente**. Prospects recebem a frente no cadastro.

- Um cliente pertence a uma frente, mas **pode atuar nas duas** (sementeira mista) → campo multi-seleção, marcador com ícone duplo.
- Estrutura preparada para adicionar uma 3ª frente no futuro sem refazer o sistema (frentes são cadastro, não código fixo).

---

## 3. Funcionalidades

### 3.1 Mapa (coração do app)
- Mapa do Brasil inteiro, zoom até o nível de rua, camadas: mapa claro/escuro/satélite.
- **Territórios por vendedor**: polígonos com **borda tracejada** na cor do vendedor + preenchimento translúcido leve; rótulo com nome do vendedor.
- **Marcadores de clientes**: forma/ícone por frente (pastagem × grandes culturas), cor do anel por status (ativo, prospect, negociação, inativo, perdido).
- **Clusterização** (agrupamento) em zoom baixo — suporta dezenas de milhares de pontos com fluidez.
- Clique no marcador → painel lateral com ficha do cliente.
- Busca (nome, CNPJ, cidade) com salto no mapa.
- Filtros: frente, status, vendedor, UF, estágio do funil, potencial.
- Mapa de calor de densidade (onde há mais sementeiras / onde há vazios de cobertura).
- Camada opcional de contexto agrícola: divisão por UF/município (IBGE).

### 3.2 Territórios
- Território = **união de áreas oficiais do IBGE**: estados inteiros e, onde o território pega só parte de um estado, **mesorregiões/municípios**. O contorno é calculado (unificação das áreas) e desenhado com **linha tracejada na cor do vendedor**, seguindo exatamente as divisas reais. Ver divisão definida na seção 11.
- Vantagem: o cliente cai em um território sem ambiguidade (pelo município), sem frestas nem sobreposição.
- Editor visual (admin): clicar em estados/mesorregiões/municípios no mapa para mover de um território para outro; polígono desenhado à mão só como exceção.
- Detecção de **sobreposição e buracos** (áreas sem dono) com alerta.
- Histórico de alterações de território (quem mudou, quando) — importante para comissão/auditoria.
- Cliente é atribuído automaticamente ao vendedor do território onde cai (com possibilidade de exceção manual).
- Resumo por território: nº de clientes, prospects, % cobertura, faturamento potencial.

### 3.3 Cadastro de clientes (campos iniciais; o resto incluímos depois)

> **Regra de localização (definida pelo usuário):** a Buntech atende **tratamento de sementes (produção/indústria)**. O ponto no mapa é sempre a **unidade de produção/tratamento/beneficiamento**, onde a empresa reveste/trata as sementes. **Nunca** usar localização de revenda, loja, escritório ou filial comercial. Se o cliente tiver mais de uma unidade de produção, cada uma vira um ponto (a unidade principal define o território e o vendedor). O formulário de cadastro e a importação devem lembrar essa regra.
- Identificação: razão social, nome fantasia, **CNPJ** (validado, único), inscrição estadual, **site**.
- Local: endereço, **cidade, UF**, CEP, **coordenadas** (geocodificação automática + ajuste arrastando o pino).
- Comercial: frente(s), status, estágio do funil, vendedor responsável, origem do lead.
- Contatos: múltiplas pessoas (nome, cargo, telefone/WhatsApp, e-mail).
- Técnico/potencial (a definir com você): volume de sementes beneficiadas/ano, culturas/forrageiras trabalhadas, concorrente atual.
- Anexos, tags, observações.
- Preenchimento automático via CNPJ (razão social, endereço, CNAE, situação cadastral) usando API pública (BrasilAPI).

### 3.4 Prospecção e funil
- Funil configurável, iniciando com o funil real da Buntech (ver 10.4): *Lead Frio → Lead → Qualificado → Validação Industrial/Mercado → Fechado/Ganha → Recorrente* (+ Perdido com motivo).
- **Registro de interações**: ligação, WhatsApp, e-mail, visita (com check-in por GPS), amostra enviada.
- **Tarefas e lembretes** (retornar em X dias), com agenda do dia por vendedor.
- Linha do tempo por cliente.
- **Planejador de rota**: selecionar clientes/prospects da região → ordem sugerida de visitas → abrir no Google Maps/Waze.
- "Prospects perto de mim": lista de sementeiras não visitadas em raio de X km da minha posição.

### 3.5 Importação e fontes de prospects
- **Anuário ABRASEM 2019/2020** (PDF): **378 empresas sementeiras inseridas** no banco (associações de MT, MS, GO, MG, SP, PR, SC, RS, MATOPIBA e produtores de forrageiras; 8 nomes repetidos foram unificados e 21 já eram clientes). Frentes deduzidas das culturas (soja/milho/trigo… → Grandes Culturas; braquiária/capim/azevém/forrageiras → Pastagens; hortaliças → sem frente). Localização inicial = cidade do endereço; a tela **Completar dados** refina.
- Importar planilha Excel/CSV com **geocodificação em lote** e detecção de duplicados por CNPJ.
- Exportar para Excel/CSV/PDF (respeitando permissões).
- Fonte de leads: cadastro oficial de produtores de sementes (RENASEM/MAPA) e CNAE de beneficiamento de sementes via base CNPJ da Receita — a validar viabilidade e atualização dos dados na fase de dados.

### 3.6 Dashboards e relatórios
- Visão geral: clientes por frente, por UF, por vendedor; evolução mensal.
- Funil: conversão por etapa, tempo médio, motivos de perda.
- Atividade: visitas/contatos por vendedor e período.
- Cobertura: % de sementeiras conhecidas já visitadas por território.
- Relatório mensal em PDF para diretoria.

### 3.7 Usuários e permissões
| Perfil | Pode |
|---|---|
| **Admin / Diretoria** | Tudo: territórios, usuários, configurações, todos os dados |
| **Gerente** | Ver todos os territórios, relatórios, reatribuir clientes |
| **Vendedor** | Ver/editar clientes do seu território; ver (somente leitura, configurável) os demais |
| **Leitura** | Dashboards e mapa, sem edição |

- Login seguro (e-mail + senha, opcional Google), recuperação de senha.
- **Log de auditoria** de alterações.

### 3.8 Mobile / campo
- **PWA instalável** no celular (ícone na tela inicial), layout responsivo.
- **Modo offline** básico: cache dos clientes do meu território e fila de registros que sincroniza quando voltar o sinal (campo tem sinal ruim).
- Check-in de visita por GPS, foto, anotação por voz (ditado).

---

## 4. Arquitetura técnica (proposta)

| Camada | Escolha | Motivo |
|---|---|---|
| Front-end | **Next.js + TypeScript + Tailwind** | Padrão de mercado, PWA, ótimo no celular |
| Mapa | **MapLibre GL JS** | Livre, sem custo por visualização, vetorial, suporta tracejado, cluster e milhares de pontos |
| Tiles/base map | MapTiler ou Stadia (plano gratuito/baixo custo) ou OSM | Troca fácil depois |
| Banco | **PostgreSQL + PostGIS** (via Supabase) | Consultas geográficas ("ponto dentro do polígono", raio, sobreposição) nativas |
| Auth/permissões | Supabase Auth + **Row Level Security** | Regras por vendedor aplicadas no banco, não só na tela |
| Arquivos | Supabase Storage | Anexos e fotos |
| Hospedagem | Vercel (app) + Supabase (dados) | Simples, deploy automático por branch |
| Geocodificação | Nominatim/MapTiler/Google (a decidir por custo × precisão no BR) | Endereço → coordenadas |
| Dados oficiais | IBGE (malhas de UF/município), BrasilAPI (CNPJ) | Gratuitos |
| Testes | Vitest + Playwright (E2E) | Qualidade para app "oficial" |

### Modelo de dados (resumo)
- `usuarios` (perfil, vendedor vinculado)
- `vendedores` (nome, cor, contato)
- `frentes` (pastagens, grandes culturas, …)
- `territorios` (vendedor, geometria PostGIS, versão) + `territorio_municipios`
- `clientes` (razão social, fantasia, CNPJ, site, cidade, UF, geom ponto, status, estágio, vendedor)
- `cliente_frentes` (N:N)
- `contatos`, `interacoes`, `tarefas`, `anexos`
- `funil_etapas`, `motivos_perda`
- `auditoria`
- `importacoes` (histórico de lotes)

---

## 5. Design / UX
- Visual limpo e profissional, identidade Buntech Agro (logo em `public/brand/`, azul `#0891D1` e verde-água `#17A89A`), logo grande no login e na tela inicial, modo claro e escuro.
- Layout: mapa em tela cheia + painel lateral recolhível + barra de filtros; no celular, painel como "gaveta" inferior.
- Legenda sempre visível (frentes × status × vendedores).
- Acessibilidade: contraste, não depender só de cor (formas diferentes por frente).
- Protótipo de telas antes de codar (Figma está disponível se quiser revisar visualmente).

---

## 6. Segurança, privacidade e qualidade
- LGPD: CNPJ é dado de empresa, mas contatos (nome/telefone/e-mail de pessoas) são dados pessoais → base legal, acesso restrito, exportação controlada, opção de exclusão.
- Backups automáticos diários, ambiente de homologação separado da produção.
- Logs de auditoria, HTTPS, sessões com expiração.
- Testes automatizados + CI no GitHub (lint, tipos, testes) em todo commit.

---

## 7. Roadmap por fases

| Fase | Entrega | Resultado visível |
|---|---|---|
| **0 — Fundação** | Repositório, stack, CI, banco, login, perfis | App no ar com login |
| **1 — Mapa + Clientes** | Mapa do Brasil, CRUD de clientes, 2 frentes, marcadores, filtros, busca, cluster | Você vê seus clientes no mapa |
| **2 — Territórios** | Editor de territórios (IBGE + desenho), borda tracejada por vendedor, atribuição automática | Mapa com as áreas de cada vendedor |
| **3 — Prospecção** | Funil, interações, tarefas, check-in, "perto de mim", rotas | Vendedor usa no dia a dia |
| **4 — Dados em massa** | Importação Excel + geocodificação, CNPJ automático, fonte de prospects | Base de sementeiras do Brasil carregada |
| **5 — Gestão** | Dashboards, relatórios PDF, auditoria, exportações | Diretoria acompanha tudo |
| **6 — Campo/PWA** | Offline, instalação, fotos, performance | Funciona no sítio sem sinal |
| **7 — Go-live** | Testes finais, treinamento, migração dos dados reais | Lançamento oficial |

Meta: Fases 0–2 formam um MVP já útil (mapa + clientes + territórios). Fases seguintes entram incrementalmente.

---

## Status
| Fase | Situação |
|---|---|
| 0 — Fundação | ✅ Concluída — no ar em https://clientes-buntech-2027.vercel.app (app Next.js, Supabase com RLS, login, perfis, CI) |
| 1 — Mapa + Clientes | ✅ **Concluída.** Mapa, filtros, ficha, importação (87 clientes) e cadastro/edição com busca de CNPJ e ponto arrastável. Ficha completa do cliente (indicadores, vendas por ano/produto, pedidos, contatos, TOTVS, histórico de contatos) |
| 2 — Territórios | 🚧 Contornos tracejados no mapa, atribuição automática de vendedor, tela Territórios (mover áreas) prontos; falta validar visualmente e ajustar a divisa do Paraná |
| 3 — Prospecção | ✅ Funil em quadro (arrastar), tarefas/agenda do dia, check-in de visita com GPS, "perto de mim" e planejador de rota (Google Maps/Waze). Pendente: lembrete offline (Fase 6) |
| 4 — Dados em massa | ✅ Concluída: importação de planilha, Anuário ABRASEM (378), UNIPASTO (44), **RENASEM/MAPA** (3.533 registros de 10 estados; 553 beneficiadores de sementes novos + CNPJ confirmado em 155 clientes), busca de CNPJ/site/e-mail na internet e **exportação Excel/CSV** |

---

## 8. Decisões tomadas

| # | Tema | Decisão |
|---|---|---|
| 1 | Territórios | **Seguir o formato exato dos estados**; nos territórios que pegam parte de estados (vermelho, laranja, roxo), dividir por mesorregião/município do IBGE. Divisão na seção 11. |
| 2 | Vendedores | **5 territórios**: Edson Diniz (externo), Gustavo Ique, João Rafael, Larissa Machado e 1 território ainda sem vendedor. Ver seção 11. |
| 3 | Dados existentes | Planilha recebida (87 clientes, 5 abas) — análise na seção 10. A importação dela entra já na **Fase 1** para o mapa nascer com dados reais. |
| 4 | Usuários | Equipe interna + **1 representante externo** (perfil "Externo": vê/edita só o próprio território, sem exportar). |
| 5 | Marca | Logo recebido em `public/brand/logo-buntech-agro.png`. Paleta: azul `#0891D1` e verde-água `#17A89A`. **Logo grande** na tela de login e na tela inicial/cabeçalho do mapa, além de ícone do app (PWA). |
| 6 | Infra | Começar nos planos gratuitos (Vercel + Supabase). |
| 7 | Offline | Fora do início; fica na Fase 6. Ver lembrete abaixo. |
| 8 | 2º Cadastro | São **outros cadastros no TOTVS (outro CNPJ)** do mesmo cliente → um cliente pode ter várias unidades/códigos TOTVS. Integração futura com o **TOTVS** (ERP) para puxar pedidos automaticamente. |

### Ainda em aberto
- Sementeira nas duas frentes: confirmado que existe.
- Idioma: assumido 100% português (BR).
- Integração futura com ERP/CRM (HubSpot, Apollo etc.).

---

## 10. Análise da planilha atual (`carteira-buntech-2026-11-17.xlsx`)

> A planilha **não é versionada no repositório** (contém telefones e e-mails de pessoas — LGPD). Fica fora do Git (`.gitignore`) e será importada direto no banco.

### 10.1 O que existe hoje
| Aba | Linhas | Conteúdo | Vira no app |
|---|---|---|---|
| **Clientes** | 87 (60 Carteira, 27 Perdidos) | 35 colunas: cadastro, funil, comercial, último pedido | `clientes` |
| **2º Cadastro** | 6 | Outros códigos/CNPJs do mesmo cliente (ex.: Agro Tonaco tem 2 CNPJs) | `cliente_unidades` (várias unidades/CNPJs por cliente, uma "principal") |
| **Contatos** | 71 | Cliente, responsável, telefone | `contatos` |
| **Histórico de vendas** | 47 | Qtd e faturamento por produto, 2023 → 2026 | `vendas_anuais` |
| **Pedidos** | 31 | Data, produto, qtd (TN), valor, tipo | `pedidos` |

### 10.2 Qualidade dos dados (o que a importação precisa tratar)
- **Coordenadas**: 66 de 87 têm lat/long → **21 sem localização** (geocodificar pelo endereço/cidade ou CNPJ; o que falhar vai para uma fila "posicionar no mapa").
- **CNPJ/CPF**: 58 preenchidos (55 CNPJ, **3 CPF** — produtor pessoa física) → o campo aceita os dois, validado; 29 sem documento.
- **Cidade** em formatos misturados ("Uberaba", "Corinto - Mg", "Buritis - MG") → separar em `cidade` + `UF` padronizados (código IBGE).
- **Valores como texto** ("R$ 13.500,00", "18 TN") → converter para número + unidade.
- **Condição de pagamento** com variações ("528 - 30/60 - DDL" × "528 - 30/60 DDL") → tabela padronizada.
- **Contatos** concatenados num campo só ("João - 38 9812-7969 | 38 3751…") → a aba Contatos já é a fonte estruturada.
- Colunas **vazias hoje** (Faturamento, Data último contato) → no app passam a ser **calculadas** (dos pedidos e das interações), não digitadas.
- Colunas **derivadas** (Meses sem comprar, Última compra, Último produto/qtd/valor, Ritmo) → calculadas automaticamente a partir de `pedidos`.

### 10.3 Mapeamento de campos → app
| Planilha | App | Observação |
|---|---|---|
| Cliente | nome fantasia | obrigatório |
| Razão social / CNPJ/CPF / Código / Loja | unidade (razão, documento, código ERP, loja) | código = cliente no ERP |
| Endereço, Cidade, Latitude, Longitude | endereço, cidade, UF, ponto no mapa | |
| Região | **ignorada** | Divisão de outro app do usuário; não é importada. As regiões deste app são os territórios desenhados à mão (3.2), e o cliente recebe território/vendedor automaticamente pela localização no mapa. |
| Situação (Carteira/Perdidos) + Motivo | status + motivo de perda | motivos viram lista padronizada |
| Funil | etapa do funil | ver 10.4 |
| Porte, Equipamento, Segmento | perfil (porte, equipamento: Betoneira/Coater + quantidade) | |
| Ritmo (ton/mês), Potencial (ton/ano) | potencial | base para priorizar prospecção |
| Visitado | calculado (existe visita registrada) | |
| Produto principal / Último produto | calculado dos pedidos | |
| Alerta financeiro, Condição de pagamento | aba "Financeiro" do cliente | alerta aparece como selo no mapa |
| Observações ("CRM do Alexandre: …") | 1ª interação da linha do tempo, autor = vendedor citado | |
| E-mail, Site, Contatos | contatos / site | |
| Cadastrado em | data de cadastro | |

### 10.4 Funil real (substitui o funil genérico da seção 3.4)
**Lead Frio → Lead → Qualificado → Validação Industrial/Mercado → Fechado/Ganha → Recorrente**, + **Perdido** (com motivo).
- Motivos de perda atuais: *Não incrusta sementes* (19), *Não trabalha com sementes de pastagens* (5), *Já foi cliente, parou de incrustar* (2), *Incrusta sementes em SP* (1).

### 10.5 Produtos (catálogo inicial)
Linhas: **SEEDGEL** (FR, FR M, FR GRAF — saco 25 kg / big bag 1000 kg), **SEEDCOLOR** (amarelo, azul, laranja, preto, verde, vermelho, vermelho plus — caixa 25 kg), **SEEDGRAF** (caixa 20 kg / big bag 500 kg), **GRAFITE EM PÓ** (saco 20 kg / big bag 1000 kg), **SEEDFLOW** (verde, caixa 15 kg). Unidade de venda: toneladas.

### 10.6 O que a planilha revela para o mapa
- Base atual concentrada em **MG e SP** e quase toda em **pastagens** — a frente Grandes Culturas praticamente ainda não existe na carteira → o app deve facilitar a **carga em massa de prospects de soja/milho**.
- A coluna **Região** da planilha **não é usada**: os territórios deste app são os da seção 11.
- Mapa poderá colorir por **status** (Carteira × Perdido), **etapa do funil** e destacar **"sem comprar há X meses"** (risco de churn) e **alerta financeiro**.

## 11. Territórios e vendedores

Cor da linha tracejada = cor do território no mapa enviado pelo usuário.

| Território | Cor | Vendedor | Área |
|---|---|---|---|
| **Centro-Oeste** | Rosa | **Edson Diniz** (representante externo) | **MT + MS** inteiros |
| **GO/BA** | Verde | **Larissa Machado** | **GO + DF + BA** inteiros |
| **MG/SP Leste** | Vermelho | **Gustavo Ique** | **MG** inteiro + **parte de SP** |
| **SP/PR Norte** | Laranja | **João Rafael** | **parte de SP** + **parte do PR** |
| **Sul** | Roxo | *Sem vendedor (vago)* | **parte do PR** + **SC + RS** inteiros |

Fora dos 5 territórios (Norte, Nordeste exceto BA, TO, ES, RJ) = **área livre** (confirmado, por enquanto): aparece no mapa sem dono e os clientes lá ficam com a gestão até ser atribuída.

### 11.1 Divisão dos estados partidos (por mesorregião/microrregião IBGE) — confirmada

**São Paulo**
- Vermelho (Gustavo): São José do Rio Preto, Ribeirão Preto (Franca), **Campinas**, Vale do Paraíba Paulista (S. J. dos Campos, Taubaté).
- Laranja (João Rafael): Araçatuba, Presidente Prudente, Marília, Assis, Bauru, Araraquara, Piracicaba, Itapetininga, Macro Metropolitana, Metropolitana de São Paulo, Litoral Sul.

**Paraná** — **de Maringá para baixo = Roxo**, sem ilhas. *Implementação atual:* todo município cujo ponto central está no paralelo de Maringá ou ao sul dele vai para o Roxo (inclui Curitiba e Ponta Grossa); ao norte fica com o João Rafael. A linha pode ser inclinada ajustando municípios na tela Territórios.
- Laranja (João Rafael): Noroeste (Paranavaí), Norte Central **exceto Maringá** (Londrina, Apucarana, Arapongas…), Norte Pioneiro, Centro Oriental (Ponta Grossa), Metropolitana de Curitiba.
- Roxo (vago): **Maringá e região**, Centro Ocidental (Campo Mourão, Goioerê), Oeste (Cascavel, Foz do Iguaçu), Sudoeste, Centro-Sul (Guarapuava), Sudeste.
- Regra: o Roxo precisa ser **uma área contínua**. Na Fase 2 a divisa será ajustada **município a município** ao longo dessa diagonal para ligar Maringá ao resto do Roxo, e o resultado é validado no mapa antes de valer.

Depois de pronto, qualquer município pode ser movido de território pelo editor (com histórico).

### 11.1b Como os territórios são calculados (implementado)
- Base: malha municipal do IBGE (tabela `municipios_ibge`, 3.569 municípios dos 10 estados), carregada direto no banco a partir de GeoJSON público (tbrugz/geodata-br) e da API de localidades do IBGE (micro/mesorregião).
- Cada município tem um `territorio_id`. O contorno do território (`territorios.geom`) é a união dos seus municípios, simplificada (~1 km), sem buracos nem ilhotas minúsculas.
- Cliente → território/vendedor: pelo município onde o ponto cai. Vendedor definido à mão no cadastro não é sobrescrito.
- Ajustes: tela **Territórios** (admin) move mesorregiões, microrregiões ou municípios e recalcula tudo.
- Funções de carga (`privado.carregar_geometrias_uf`, `privado.carregar_hierarquia_uf`, `privado.atribuir_municipios_padrao`, `privado.recalcular_contornos`) ficam em `supabase/migrations/`.

### 11.2 Território vago
- O território Roxo nasce **sem vendedor**: clientes ficam visíveis para gestão/admin e podem ser atribuídos a um vendedor provisório.
- Quando houver contratação, basta vincular o vendedor ao território.

### 11.3 Nota técnica
- As malhas oficiais (estados, mesorregiões, municípios) vêm do IBGE. O endereço do IBGE está bloqueado na rede deste ambiente de desenvolvimento; as malhas serão obtidas por pacote npm ou liberando o endereço do IBGE no ambiente, na Fase 2.

---

## 9. Lembretes para cobrar do usuário
- **MODO OFFLINE (Fase 6):** o usuário pediu para ser cobrado, mais adiante, de implementar o modo offline (cache dos clientes do território + fila de registros sincronizada). Cobrar ao concluir a Fase 3 ou 4, antes do go-live.
