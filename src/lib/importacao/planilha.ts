/**
 * Converte a planilha da carteira (abas Clientes, 2º Cadastro, Contatos,
 * Histórico de vendas, Pedidos) nos registros do banco.
 * Função pura: recebe as linhas já lidas e devolve o que será gravado + relatório.
 */
import { normalizar } from "@/lib/texto";
import { somenteDigitos } from "@/lib/documento";
import { IndiceMunicipios, UFS } from "@/lib/geo/municipios";

export type Linha = Record<string, unknown>;
export type Abas = Record<string, Linha[]>;

export type ClienteImport = {
  id: string;
  nome: string;
  razao_social: string | null;
  documento: string | null;
  site: string | null;
  email: string | null;
  telefone: string | null;
  cep: string | null;
  frentes: string[] | null; // null = deduzir pelos produtos comprados; [] = nenhuma frente
  endereco: string | null;
  cidade: string | null;
  uf: string | null;
  municipio_ibge: string | null;
  lat: number | null;
  lng: number | null;
  localizacao_precisao: "exata" | "cidade";
  status: "prospect" | "carteira" | "perdido";
  etapa: string | null; // slug
  motivo_perda: string | null; // nome
  porte: string | null;
  equipamento: string | null;
  potencial_ton_ano: number | null;
  ritmo_ton_mes: number | null;
  alerta_financeiro: string | null;
  condicao_pagamento: string | null;
  observacoes: string | null;
  origem: string;
  cadastrado_em: string;
};
export type UnidadeImport = {
  cliente_id: string; codigo_totvs: string | null; loja: string | null; razao_social: string | null;
  documento: string | null; cidade: string | null; uf: string | null; principal: boolean;
};
export type ContatoImport = { cliente_id: string; nome: string | null; cargo: string | null; telefone: string | null; email: string | null };
export type PedidoImport = {
  cliente_id: string; data: string; produto_nome: string | null; quantidade: number | null;
  unidade: string; valor_total: number | null; tipo: string | null;
};
export type VendaImport = {
  cliente_id: string; produto_nome: string | null; ano: number; periodo: string | null;
  quantidade: number; faturamento: number; origem: string | null;
};

export type Relatorio = {
  semLocalizacao: string[];
  localizacaoPelaCidade: string[];
  documentoInvalido: string[];
  documentoDuplicado: string[];
  criadosDoHistorico: string[];
  naoEncontrados: string[];
  jaCadastrados: string[];
};

export type Importacao = {
  clientes: ClienteImport[];
  unidades: UnidadeImport[];
  contatos: ContatoImport[];
  pedidos: PedidoImport[];
  vendas: VendaImport[];
  relatorio: Relatorio;
};

const ETAPA: Record<string, string> = {
  "lead frio": "lead-frio", lead: "lead", qualificado: "qualificado",
  "validacao industrial mercado": "validacao", "fechado ganha": "fechado", recorrente: "recorrente",
};
const PORTE: Record<string, string> = { pequeno: "Pequeno", medio: "Médio", grande: "Grande" };
/** Nomes alternativos usados em outras abas para o mesmo cliente */
const ALIAS: Record<string, string> = {
  "maykel humberto": "ouro do cerrado sementes",
  "lpc sementes": "da terra", // LPC Sementes é a mesma empresa que Da Terra
};

/** Cidade informada pelo usuário para clientes que vêm sem cidade/endereço na planilha */
const CIDADE_MANUAL: Record<string, [string, string]> = {
  "sementes bravante": ["Monte Santo de Minas", "MG"],
};

export function txt(v: unknown): string | null {
  if (v == null) return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const s = String(v).trim();
  return s || null;
}

export function num(v: unknown): number | null {
  if (v == null || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  let s = String(v).replace(/[^0-9,.-]/g, "");
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  const n = Number(s);
  return s && Number.isFinite(n) ? n : null;
}

export function data(v: unknown): string | null {
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v.toISOString().slice(0, 10);
  return null;
}

/** "Corinto - Mg" → ["Corinto", "MG"] */
export function separarCidade(v: unknown): [string, string | null] {
  const t = String(v ?? "").replace(/\(.*?\)/g, "").trim();
  const m = t.match(/^(.*?)\s*[-–,]\s*([A-Za-z]{2})\.?$/);
  if (m && (UFS as readonly string[]).includes(m[2].toUpperCase())) return [m[1].trim(), m[2].toUpperCase()];
  return [t, null];
}

function cidadeDoEndereco(end: unknown, idx: IndiceMunicipios): [string | null, string | null] {
  const re = /([A-Za-zÀ-ú.' ]{3,40}?)\s*[-–,]\s*([A-Z]{2})\b/g;
  for (const m of String(end ?? "").matchAll(re)) {
    const c = m[1].replace(/^[\s.,-]+|[\s.,-]+$/g, "");
    const uf = m[2];
    if ((UFS as readonly string[]).includes(uf) && idx.achar(c, uf)) return [c, uf];
  }
  return [null, null];
}

export type Existente = { nome: string; documento: string | null };

/** "pastagens;grandes-culturas" → ["pastagens","grandes-culturas"]; "nenhuma" → []; vazio → null */
export function lerFrentes(v: unknown): string[] | null {
  const t = normalizar(v);
  if (!t) return null;
  if (t === "nenhuma" || t === "sem frente") return [];
  const out: string[] = [];
  if (/pasta|forrag/.test(t)) out.push("pastagens");
  if (/grand|soja|milho|grao/.test(t)) out.push("grandes-culturas");
  return out;
}

export function montarImportacao(
  abas: Abas, idx: IndiceMunicipios, novoId: () => string, hoje: string, existentes: Existente[] = [],
): Importacao {
  const rel: Relatorio = {
    semLocalizacao: [], localizacaoPelaCidade: [], documentoInvalido: [], documentoDuplicado: [],
    criadosDoHistorico: [], naoEncontrados: [], jaCadastrados: [],
  };
  const nomesExistentes = new Set(existentes.map((e) => normalizar(e.nome)));
  const docsExistentes = new Set(existentes.map((e) => e.documento).filter(Boolean) as string[]);
  const out: Importacao = { clientes: [], unidades: [], contatos: [], pedidos: [], vendas: [], relatorio: rel };
  const ids = new Map<string, string>();
  const docs = new Set<string>();
  const nomes = new Set<string>();
  const origem = `Planilha importada em ${hoje.split("-").reverse().join("/")}`;

  const clienteId = (nome: unknown) => {
    const n = normalizar(nome);
    return ids.get(ALIAS[n] ?? n);
  };

  for (const r of abas["Clientes"] ?? []) {
    const nome = txt(r["Cliente"]);
    if (!nome) continue;
    const docLinha = somenteDigitos(txt(r["CNPJ/CPF"]) ?? "");
    if (nomesExistentes.has(normalizar(nome)) || (docLinha && docsExistentes.has(docLinha))) {
      rel.jaCadastrados.push(nome);
      continue;
    }
    const id = novoId();
    ids.set(normalizar(nome), id);
    nomes.add(nome);

    let lat = num(r["Latitude"]);
    let lng = num(r["Longitude"]);
    if (lat == null || lng == null) lat = lng = null;
    let [cidade, uf] = separarCidade(r["Cidade"]);
    if (!cidade) [cidade, uf] = cidadeDoEndereco(r["Endereço"], idx) as [string, string | null];
    if (!cidade && CIDADE_MANUAL[normalizar(nome)]) [cidade, uf] = CIDADE_MANUAL[normalizar(nome)];
    let mun = cidade ? idx.achar(cidade, uf, lat, lng) : null;
    if (!mun && lat != null && lng != null) mun = idx.maisProximo(lat, lng);
    let precisao: "exata" | "cidade" = "exata";
    if (lat == null && mun) {
      lat = mun.lat; lng = mun.lng; precisao = "cidade";
      rel.localizacaoPelaCidade.push(`${nome} (${mun.nome}/${mun.uf})`);
    }
    if (lat == null) rel.semLocalizacao.push(nome);

    const docBruto = txt(r["CNPJ/CPF"]);
    let doc: string | null = somenteDigitos(docBruto ?? "") || null;
    let obs = txt(r["Observações"]);
    if (doc && doc.length !== 11 && doc.length !== 14) { rel.documentoInvalido.push(`${nome}: ${docBruto}`); doc = null; }
    if (doc && docs.has(doc)) {
      rel.documentoDuplicado.push(`${nome}: ${docBruto}`);
      obs = (obs ? obs + "\n" : "") + `CNPJ/CPF ${docBruto} também consta em outro cliente.`;
      doc = null;
    }
    if (doc) docs.add(doc);

    const perdido = String(r["Situação"] ?? "").trim().toLowerCase().startsWith("perd");
    const etapa = ETAPA[normalizar(r["Funil"])] ?? null;
    const comprou = data(r["Última compra (geral)"]) || data(r["Data última compra"]);
    const status = perdido ? "perdido" : etapa === "fechado" || etapa === "recorrente" || comprou ? "carteira" : "prospect";
    const visitado = txt(r["Visitado"]);
    if (visitado) obs = (obs ? obs + "\n" : "") + `Visitado (planilha): ${visitado}`;

    out.clientes.push({
      id, nome, razao_social: txt(r["Razão social"]), documento: doc, site: txt(r["Site"]), email: txt(r["E-mail"]),
      telefone: txt(r["Telefone"]), cep: txt(r["CEP"]), frentes: lerFrentes(r["Frentes"]),
      endereco: txt(r["Endereço"]), cidade: mun?.nome ?? (cidade || null), uf: mun?.uf ?? uf,
      municipio_ibge: mun?.ibge ?? null, lat, lng, localizacao_precisao: precisao, status, etapa,
      motivo_perda: txt(r["Motivo (Perdidos)"]), porte: PORTE[normalizar(r["Porte"])] ?? null,
      equipamento: txt(r["Equipamento"]), potencial_ton_ano: num(r["Potencial estimado (ton/ano)"]),
      ritmo_ton_mes: num(r["Ritmo (Ton/Mês)"]), alerta_financeiro: txt(r["Alerta financeiro"]),
      condicao_pagamento: txt(r["Condição de pagamento"]), observacoes: obs, origem: txt(r["Origem"]) ?? origem,
      cadastrado_em: data(r["Cadastrado em"]) ?? hoje,
    });

    if (txt(r["Código"]) || txt(r["Razão social"]) || docBruto) {
      out.unidades.push({
        cliente_id: id, codigo_totvs: txt(r["Código"]), loja: txt(r["Loja"]), razao_social: txt(r["Razão social"]),
        documento: somenteDigitos(docBruto ?? "") || null, cidade: mun?.nome ?? null, uf: mun?.uf ?? null, principal: true,
      });
    }

    const dUlt = data(r["Data última compra"]) ?? data(r["Última compra (geral)"]);
    const prodUlt = txt(r["Último produto"]);
    if (dUlt && prodUlt) {
      out.pedidos.push({
        cliente_id: id, data: dUlt, produto_nome: prodUlt, quantidade: num(r["Quantidade do último pedido"]),
        unidade: "TN", valor_total: num(r["Valor do último pedido"]), tipo: "Último pedido (planilha)",
      });
    }
  }

  // clientes que só aparecem no histórico de vendas
  for (const r of abas["Histórico de vendas"] ?? []) {
    const nome = txt(r["Cliente"]);
    if (!nome || clienteId(nome)) continue;
    const id = novoId();
    ids.set(normalizar(nome), id);
    rel.criadosDoHistorico.push(nome);
    rel.semLocalizacao.push(nome);
    out.clientes.push({
      id, nome, razao_social: null, documento: null, site: null, email: null, telefone: null, cep: null, frentes: null, endereco: null, cidade: null, uf: null,
      municipio_ibge: null, lat: null, lng: null, localizacao_precisao: "exata", status: "carteira", etapa: "recorrente",
      motivo_perda: null, porte: null, equipamento: null, potencial_ton_ano: null, ritmo_ton_mes: null,
      alerta_financeiro: null, condicao_pagamento: null,
      observacoes: "Cliente encontrado só no histórico de vendas: completar cidade, CNPJ e localização.",
      origem: `${origem} (aba Histórico de vendas)`, cadastrado_em: hoje,
    });
  }

  const naoAchado = (n: unknown) => rel.naoEncontrados.includes(String(n)) || rel.naoEncontrados.push(String(n));

  for (const r of abas["2º Cadastro"] ?? []) {
    const id = clienteId(r["Cliente"]);
    if (!id) { naoAchado(r["Cliente"]); continue; }
    const principal = normalizar(r["É o principal?"]) === "sim";
    if (principal) out.unidades.forEach((u) => { if (u.cliente_id === id) u.principal = false; });
    const [cidade, uf] = separarCidade(r["Cidade"]);
    out.unidades.push({
      cliente_id: id, codigo_totvs: txt(r["Código"]), loja: txt(r["Loja"]), razao_social: txt(r["Razão social"]),
      documento: somenteDigitos(txt(r["CNPJ/CPF"]) ?? "") || null, cidade: cidade || null, uf, principal,
    });
    const c = out.clientes.find((x) => x.id === id)!;
    c.email ??= txt(r["E-mail"]);
    c.site ??= txt(r["Site"]);
    c.porte ??= PORTE[normalizar(r["Porte"])] ?? null;
    c.equipamento ??= txt(r["Equipamento"]);
    c.ritmo_ton_mes ??= num(r["Ritmo (Ton/Mês)"]);
    c.potencial_ton_ano ??= num(r["Potencial estimado (ton/ano)"]);
    c.condicao_pagamento ??= txt(r["Condição de pagamento"]);
  }

  for (const r of abas["Contatos"] ?? []) {
    const id = clienteId(r["Cliente"]);
    if (!id) { naoAchado(r["Cliente"]); continue; }
    out.contatos.push({ cliente_id: id, nome: txt(r["Responsável"]), cargo: txt(r["Cargo"]), telefone: txt(r["Telefone"]), email: txt(r["E-mail"]) });
  }

  const anos: [number, string, string, string | null][] = [
    [2023, "Qtd 2023", "Faturamento 2023", null],
    [2024, "Qtd 2024", "Faturamento 2024", null],
    [2025, "Qtd 2025", "Faturamento 2025", null],
    [2026, "Qtd 2026 (jan-jul)", "Faturamento 2026 (jan-jul)", "jan-jul"],
  ];
  for (const r of abas["Histórico de vendas"] ?? []) {
    const id = clienteId(r["Cliente"]);
    if (!id) { naoAchado(r["Cliente"]); continue; }
    for (const [ano, qc, fc, periodo] of anos) {
      const q = num(r[qc]) ?? 0;
      const f = num(r[fc]) ?? 0;
      if (q || f) out.vendas.push({ cliente_id: id, produto_nome: txt(r["Produto"]), ano, periodo, quantidade: q, faturamento: f, origem: txt(r["Origem"]) });
    }
  }

  for (const r of abas["Pedidos"] ?? []) {
    const id = clienteId(r["Cliente"]);
    const d = data(r["Data"]);
    if (!id) { naoAchado(r["Cliente"]); continue; }
    if (!d) continue;
    const prod = txt(r["Produto"]);
    // remove o "último pedido" equivalente vindo da aba Clientes
    out.pedidos = out.pedidos.filter(
      (p) => !(p.cliente_id === id && p.data === d && p.produto_nome === prod && p.tipo === "Último pedido (planilha)"),
    );
    out.pedidos.push({
      cliente_id: id, data: d, produto_nome: prod, quantidade: num(r["Quantidade"]),
      unidade: txt(r["Unidade"]) ?? "TN", valor_total: num(r["Valor total"]), tipo: txt(r["Tipo de pedido"]),
    });
  }

  return out;
}
