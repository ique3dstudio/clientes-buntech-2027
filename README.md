# Buntech Agro · Mapa de Clientes 2027

App oficial de prospecção de clientes da Buntech Agro: mapa do Brasil com clientes e prospects,
territórios dos vendedores com borda tracejada e gestão do funil comercial.

Planejamento completo em [`PLANO.md`](PLANO.md).

## Stack
- **Next.js 16** (App Router, Cache Components) + TypeScript + Tailwind CSS 4
- **Supabase**: Postgres + PostGIS, Auth e Row Level Security (permissões aplicadas no banco)
- **Vercel**: hospedagem

## Rodando localmente
```bash
cp .env.example .env.local   # preencha com a URL e a chave publicável do Supabase
npm install
npm run dev
```

## Variáveis de ambiente
| Variável | Para quê |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Conexão com o Supabase (obrigatórias) |
| `FIRECRAWL_API_KEY` | *(opcional, só servidor)* ativa o botão "Buscar site e contatos na internet" do cadastro de cliente |

## Scripts
| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run lint` | ESLint |
| `npm run typecheck` | Verificação de tipos |
| `npm test` | Testes (Vitest) |

## Banco de dados
As migrações ficam em `supabase/migrations/` e são aplicadas em ordem no projeto Supabase.

- **Perfis e permissões**: o primeiro usuário cadastrado vira **Administrador**; os demais entram como
  *Aguardando aprovação* e o admin libera em **Usuários**.
- Papéis: Administrador, Gerente, Vendedor, Representante externo, Somente leitura.
- Representante externo só enxerga clientes do próprio território.
- Toda alteração em clientes, territórios e perfis fica registrada na tabela `auditoria`.

## Dados sensíveis
Planilhas de clientes (`.xlsx`, `.csv`) **não** são versionadas (LGPD) — veja `.gitignore`.
