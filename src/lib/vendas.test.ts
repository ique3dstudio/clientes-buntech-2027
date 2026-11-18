import { describe, expect, it } from "vitest";
import { resumoPorAno, resumoPorProduto } from "./vendas";

const vendas = [
  { ano: 2025, periodo: null, produto_nome: "A", quantidade: 10, faturamento: 1000 },
  { ano: 2026, periodo: "jan-jul", produto_nome: "A", quantidade: 5, faturamento: 600 },
  { ano: 2026, periodo: "jan-jul", produto_nome: "B", quantidade: 1, faturamento: 100 },
];

describe("vendas", () => {
  it("soma histórico e pedidos recentes sem contar em dobro", () => {
    const r = resumoPorAno(vendas, [
      { data: "2026-07-23", produto_nome: "A", quantidade: 3, unidade: "TN", valor_total: 300, tipo: null }, // dentro do histórico
      { data: "2026-09-11", produto_nome: "A", quantidade: 51, unidade: "TN", valor_total: 30090, tipo: null },
    ]);
    expect(r.find((x) => x.ano === 2025)).toEqual({ ano: 2025, faturamento: 1000, toneladas: 10 });
    expect(r.find((x) => x.ano === 2026)).toEqual({ ano: 2026, faturamento: 600 + 100 + 30090, toneladas: 6 + 51 });
  });
  it("agrupa por produto e ano", () => {
    const { anos, linhas } = resumoPorProduto(vendas);
    expect(anos).toEqual([2025, 2026]);
    expect(linhas[0].produto).toBe("A");
    expect(linhas[0].valor).toBe(1600);
  });
});
