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
- Território = **polígono desenhado à mão** no mapa pelo admin (vértices editáveis, vários polígonos por vendedor, com encaixe opcional nas divisas de UF/município do IBGE para não sobrar fresta). A base IBGE fica como camada de referência.
- Editor visual (admin): desenhar, editar vértices, dividir/unir, atribuir vendedor.
- Detecção de **sobreposição e buracos** (áreas sem dono) com alerta.
- Histórico de alterações de território (quem mudou, quando) — importante para comissão/auditoria.
- Cliente é atribuído automaticamente ao vendedor do território onde cai (com possibilidade de exceção manual).
- Resumo por território: nº de clientes, prospects, % cobertura, faturamento potencial.

### 3.3 Cadastro de clientes (campos iniciais; o resto incluímos depois)
- Identificação: razão social, nome fantasia, **CNPJ** (validado, único), inscrição estadual, **site**.
- Local: endereço, **cidade, UF**, CEP, **coordenadas** (geocodificação automática + ajuste arrastando o pino).
- Comercial: frente(s), status, estágio do funil, vendedor responsável, origem do lead.
- Contatos: múltiplas pessoas (nome, cargo, telefone/WhatsApp, e-mail).
- Técnico/potencial (a definir com você): volume de sementes beneficiadas/ano, culturas/forrageiras trabalhadas, concorrente atual.
- Anexos, tags, observações.
- Preenchimento automático via CNPJ (razão social, endereço, CNAE, situação cadastral) usando API pública (BrasilAPI).

### 3.4 Prospecção e funil
- Funil configurável: *Prospect → Contato feito → Reunião/Visita → Amostra/Teste → Proposta → Cliente ativo* (+ Perdido com motivo).
- **Registro de interações**: ligação, WhatsApp, e-mail, visita (com check-in por GPS), amostra enviada.
- **Tarefas e lembretes** (retornar em X dias), com agenda do dia por vendedor.
- Linha do tempo por cliente.
- **Planejador de rota**: selecionar clientes/prospects da região → ordem sugerida de visitas → abrir no Google Maps/Waze.
- "Prospects perto de mim": lista de sementeiras não visitadas em raio de X km da minha posição.

### 3.5 Importação e fontes de prospects
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

## 8. Decisões tomadas

| # | Tema | Decisão |
|---|---|---|
| 1 | Territórios | **Desenhados à mão** (polígonos livres), não por estado/município. O editor de desenho passa a ser prioridade da Fase 2; a base IBGE vira só camada de referência opcional. |
| 2 | Vendedores | **5 vendedores**, cada um com cor própria no tracejado. |
| 3 | Dados existentes | Já existe planilha de clientes → importação (Fase 4) será desenhada sobre as colunas reais dela. **Preciso receber a planilha.** |
| 4 | Usuários | Equipe interna + **1 representante externo** (perfil "Externo": vê/edita só o próprio território, sem exportar). |
| 5 | Marca | Logo recebido em `public/brand/logo-buntech-agro.png`. Paleta: azul `#0891D1` e verde-água `#17A89A`. **Logo grande** na tela de login e na tela inicial/cabeçalho do mapa, além de ícone do app (PWA). |
| 6 | Infra | Começar nos planos gratuitos (Vercel + Supabase). |
| 7 | Offline | Fora do início; fica na Fase 6. Ver lembrete abaixo. |

### Ainda em aberto
- Confirmar se existe sementeira que compra as duas frentes (o plano assume que sim).
- Idioma: assumido 100% português (BR).
- Integração futura com ERP/CRM (HubSpot, Apollo etc.).

---

## 9. Lembretes para cobrar do usuário
- **MODO OFFLINE (Fase 6):** o usuário pediu para ser cobrado, mais adiante, de implementar o modo offline (cache dos clientes do território + fila de registros sincronizada). Cobrar ao concluir a Fase 3 ou 4, antes do go-live.
- Enviar a planilha de clientes atual (para a Fase 4, mas ajuda a definir os campos já na Fase 1).
