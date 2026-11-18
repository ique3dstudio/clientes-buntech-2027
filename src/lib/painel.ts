import { mesesSemComprar, type ClienteMapa } from "@/lib/clientes";

export type EtapaRef = { id: number; nome: string; cor: string; ordem: number };
export type TerritorioRef = { id: string; nome: string; cor: string; vendedor: string | null };
export type Visita = { cliente_id: string; data: string };
export type Atividade = { tipo: string; data: string; autor_nome: string | null };
export type VendaAno = { cliente_id: string; ano: number; faturamento: number | null; quantidade: number | null };
export type PedidoRec = { cliente_id: string; data: string; valor_total: number | null; quantidade: number | null; unidade: string | null };

export function resumoSituacao(clientes: ClienteMapa[]) {
  const r = { total: clientes.length, carteira: 0, prospect: 0, perdido: 0, semLocal: 0, aproximado: 0 };
  for (const c of clientes) {
    r[c.status] += 1;
    if (c.lat == null) r.semLocal += 1;
    else if (c.localizacao_precisao === "cidade") r.aproximado += 1;
  }
  return r;
}

export function resumoFunil(clientes: ClienteMapa[], etapas: EtapaRef[]) {
  const por = new Map<number | "sem" | "perdido", number>();
  for (const c of clientes) {
    const k = c.status === "perdido" ? "perdido" : c.etapa_id ?? "sem";
    por.set(k, (por.get(k) ?? 0) + 1);
  }
  const linhas = [...etapas].sort((a, b) => a.ordem - b.ordem).map((e) => ({ chave: String(e.id), nome: e.nome, cor: e.cor, n: por.get(e.id) ?? 0 }));
  const sem = por.get("sem") ?? 0;
  if (sem) linhas.unshift({ chave: "sem", nome: "Sem etapa", cor: "#cbd5e1", n: sem });
  linhas.push({ chave: "perdido", nome: "Perdido", cor: "#64748b", n: por.get("perdido") ?? 0 });
  return linhas;
}

export type LinhaTerritorio = { id: string | null; nome: string; cor: string; vendedor: string | null; clientes: number; carteira: number; prospects: number; perdidos: number; visitados: number; cobertura: number };

/** Cobertura = % dos clientes ativos (carteira + prospects) com pelo menos uma visita registrada. */
export function resumoTerritorios(clientes: ClienteMapa[], territorios: TerritorioRef[], visitados: Set<string>): LinhaTerritorio[] {
  const linhas = new Map<string | null, LinhaTerritorio>();
  for (const t of territorios) linhas.set(t.id, { id: t.id, nome: t.nome, cor: t.cor, vendedor: t.vendedor, clientes: 0, carteira: 0, prospects: 0, perdidos: 0, visitados: 0, cobertura: 0 });
  linhas.set(null, { id: null, nome: "Fora dos territórios", cor: "#94a3b8", vendedor: null, clientes: 0, carteira: 0, prospects: 0, perdidos: 0, visitados: 0, cobertura: 0 });
  for (const c of clientes) {
    const l = linhas.get(linhas.has(c.territorio_id) ? c.territorio_id : null)!;
    l.clientes += 1;
    if (c.status === "carteira") l.carteira += 1;
    else if (c.status === "prospect") l.prospects += 1;
    else l.perdidos += 1;
    if (c.status !== "perdido" && visitados.has(c.id)) l.visitados += 1;
  }
  for (const l of linhas.values()) {
    const ativos = l.carteira + l.prospects;
    l.cobertura = ativos ? Math.round((l.visitados / ativos) * 100) : 0;
  }
  return [...linhas.values()].filter((l) => l.id !== null || l.clientes > 0);
}

/** Clientes da carteira sem comprar há `meses` ou mais (ou nunca compraram, se tiverem sido marcados como carteira). */
export function clientesEmRisco(clientes: ClienteMapa[], meses = 6, hoje = new Date()) {
  return clientes
    .filter((c) => c.status === "carteira")
    .map((c) => ({ c, m: mesesSemComprar(c.ultima_compra, hoje) }))
    .filter((x) => x.m != null && x.m >= meses)
    .sort((a, b) => (b.m ?? 0) - (a.m ?? 0))
    .map((x) => ({ id: x.c.id, nome: x.c.nome, cidade: x.c.cidade, uf: x.c.uf, meses: x.m as number }));
}

export type LinhaAtividade = { quem: string; visitas: number; ligacoes: number; mensagens: number; reunioes: number; amostras: number; total: number };

/** Conta contatos registrados por pessoa (anotações automáticas do sistema não entram). */
export function resumoAtividade(itens: Atividade[], desde: string): LinhaAtividade[] {
  const por = new Map<string, LinhaAtividade>();
  for (const i of itens) {
    if (i.data < desde || i.tipo === "nota") continue;
    const quem = i.autor_nome ?? "—";
    const l = por.get(quem) ?? { quem, visitas: 0, ligacoes: 0, mensagens: 0, reunioes: 0, amostras: 0, total: 0 };
    if (i.tipo === "visita") l.visitas++;
    else if (i.tipo === "ligacao") l.ligacoes++;
    else if (i.tipo === "whatsapp" || i.tipo === "email") l.mensagens++;
    else if (i.tipo === "reuniao") l.reunioes++;
    else if (i.tipo === "amostra") l.amostras++;
    l.total++;
    por.set(quem, l);
  }
  return [...por.values()].sort((a, b) => b.total - a.total);
}

/** Faturamento por ano: histórico anual + pedidos recentes (2026 só após julho, para não contar em dobro). */
export function faturamentoPorAno(vendas: VendaAno[], pedidos: PedidoRec[]) {
  const mapa = new Map<number, { ano: number; faturamento: number; toneladas: number }>();
  const get = (a: number) => mapa.get(a) ?? (mapa.set(a, { ano: a, faturamento: 0, toneladas: 0 }), mapa.get(a)!);
  const anosHist = new Set(vendas.map((v) => v.ano));
  for (const v of vendas) { const r = get(v.ano); r.faturamento += v.faturamento ?? 0; r.toneladas += v.quantidade ?? 0; }
  for (const p of pedidos) {
    const a = Number(p.data.slice(0, 4));
    if (a === 2026 && p.data <= "2026-07-31") continue;
    if (a < 2026 && anosHist.has(a)) continue;
    const r = get(a); r.faturamento += p.valor_total ?? 0; r.toneladas += p.unidade?.toUpperCase().startsWith("T") ? (p.quantidade ?? 0) : 0;
  }
  return [...mapa.values()].sort((a, b) => a.ano - b.ano);
}

export function topClientes(vendas: VendaAno[], pedidos: PedidoRec[], nomes: Map<string, string>, n = 10) {
  const total = new Map<string, number>();
  const anosHist = new Set(vendas.map((v) => v.ano));
  for (const v of vendas) total.set(v.cliente_id, (total.get(v.cliente_id) ?? 0) + (v.faturamento ?? 0));
  for (const p of pedidos) {
    const a = Number(p.data.slice(0, 4));
    if (a === 2026 && p.data <= "2026-07-31") continue;
    if (a < 2026 && anosHist.has(a)) continue;
    total.set(p.cliente_id, (total.get(p.cliente_id) ?? 0) + (p.valor_total ?? 0));
  }
  return [...total.entries()].filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).slice(0, n).map(([id, valor]) => ({ id, nome: nomes.get(id) ?? "—", valor }));
}
