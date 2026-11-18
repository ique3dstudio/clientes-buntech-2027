/** Consolida o histórico anual (vendas_anuais) com os pedidos recentes (pedidos). */
export type VendaAnual = { ano: number; periodo: string | null; produto_nome: string | null; quantidade: number | null; faturamento: number | null };
export type Pedido = { id?: string; data: string; produto_nome: string | null; quantidade: number | null; unidade: string | null; valor_total: number | null; tipo: string | null };

export type ResumoAno = { ano: number; faturamento: number; toneladas: number };

/** O histórico de 2026 vai até julho; só somamos pedidos de 2026 feitos depois disso, para não contar em dobro. */
export const CORTE_HISTORICO_2026 = "2026-07-31";

export function resumoPorAno(vendas: VendaAnual[], pedidos: Pedido[]): ResumoAno[] {
  const mapa = new Map<number, ResumoAno>();
  const ano = (a: number) => {
    if (!mapa.has(a)) mapa.set(a, { ano: a, faturamento: 0, toneladas: 0 });
    return mapa.get(a)!;
  };
  for (const v of vendas) {
    const r = ano(v.ano);
    r.faturamento += v.faturamento ?? 0;
    r.toneladas += v.quantidade ?? 0;
  }
  for (const p of pedidos) {
    const a = Number(p.data.slice(0, 4));
    if (a === 2026 && p.data <= CORTE_HISTORICO_2026) continue;
    if (a < 2026 && vendas.some((v) => v.ano === a)) continue; // ano já coberto pelo histórico
    const r = ano(a);
    r.faturamento += p.valor_total ?? 0;
    r.toneladas += p.unidade?.toUpperCase().startsWith("T") ? (p.quantidade ?? 0) : 0;
  }
  return [...mapa.values()].sort((a, b) => a.ano - b.ano);
}

export type LinhaProduto = { produto: string; porAno: Record<number, { qtd: number; valor: number }>; qtd: number; valor: number };

export function resumoPorProduto(vendas: VendaAnual[]): { anos: number[]; linhas: LinhaProduto[] } {
  const anos = [...new Set(vendas.map((v) => v.ano))].sort();
  const mapa = new Map<string, LinhaProduto>();
  for (const v of vendas) {
    const nome = v.produto_nome ?? "—";
    const l = mapa.get(nome) ?? { produto: nome, porAno: {}, qtd: 0, valor: 0 };
    const c = (l.porAno[v.ano] ??= { qtd: 0, valor: 0 });
    c.qtd += v.quantidade ?? 0; c.valor += v.faturamento ?? 0;
    l.qtd += v.quantidade ?? 0; l.valor += v.faturamento ?? 0;
    mapa.set(nome, l);
  }
  return { anos, linhas: [...mapa.values()].sort((a, b) => b.valor - a.valor) };
}
