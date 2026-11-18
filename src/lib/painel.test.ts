import { describe, expect, it } from "vitest";
import type { ClienteMapa } from "./clientes";
import { clientesEmRisco, faturamentoPorAno, resumoAtividade, resumoFunil, resumoSituacao, resumoTerritorios, topClientes } from "./painel";

const c = (o: Partial<ClienteMapa>): ClienteMapa => ({
  id: "x", nome: "X", razao_social: null, documento: null, cidade: null, uf: null, status: "prospect", etapa_id: null, vendedor_id: null, territorio_id: null,
  alerta_financeiro: null, porte: null, localizacao_precisao: "exata", lat: -19, lng: -47, frentes: [], ultima_compra: null, ...o,
});

describe("painel", () => {
  const lista = [
    c({ id: "1", status: "carteira", territorio_id: "t1", etapa_id: 5, ultima_compra: "2026-01-10" }),
    c({ id: "2", status: "prospect", territorio_id: "t1", etapa_id: 1, lat: null, lng: null }),
    c({ id: "3", status: "perdido", territorio_id: null }),
    c({ id: "4", status: "prospect", territorio_id: "t2", localizacao_precisao: "cidade" }),
  ];
  it("resume situação e localização", () => {
    expect(resumoSituacao(lista)).toEqual({ total: 4, carteira: 1, prospect: 2, perdido: 1, semLocal: 1, aproximado: 1 });
  });
  it("monta o funil com sem etapa e perdido", () => {
    const f = resumoFunil(lista, [{ id: 1, nome: "Lead Frio", cor: "#000", ordem: 1 }, { id: 5, nome: "Fechado", cor: "#111", ordem: 5 }]);
    expect(f.map((x) => [x.nome, x.n])).toEqual([["Sem etapa", 1], ["Lead Frio", 1], ["Fechado", 1], ["Perdido", 1]]);
  });
  it("calcula cobertura por território", () => {
    const t = resumoTerritorios(lista, [{ id: "t1", nome: "T1", cor: "#f00", vendedor: "A" }, { id: "t2", nome: "T2", cor: "#0f0", vendedor: null }], new Set(["1"]));
    const t1 = t.find((x) => x.id === "t1")!;
    expect(t1).toMatchObject({ clientes: 2, carteira: 1, prospects: 1, visitados: 1, cobertura: 50 });
    expect(t.find((x) => x.id === null)).toMatchObject({ clientes: 1, perdidos: 1 });
  });
  it("lista clientes em risco", () => {
    const r = clientesEmRisco(lista, 6, new Date("2026-11-18"));
    expect(r).toHaveLength(1);
    expect(r[0].meses).toBe(10);
  });
  it("conta atividade ignorando anotações", () => {
    const a = resumoAtividade(
      [
        { tipo: "visita", data: "2026-11-10", autor_nome: "Ana" }, { tipo: "ligacao", data: "2026-11-11", autor_nome: "Ana" },
        { tipo: "nota", data: "2026-11-11", autor_nome: "Ana" }, { tipo: "visita", data: "2026-09-01", autor_nome: "Ana" },
      ],
      "2026-11-01",
    );
    expect(a).toEqual([{ quem: "Ana", visitas: 1, ligacoes: 1, mensagens: 0, reunioes: 0, amostras: 0, total: 2 }]);
  });
  it("soma faturamento sem contar em dobro e ranqueia", () => {
    const vendas = [{ cliente_id: "1", ano: 2025, faturamento: 1000, quantidade: 10 }, { cliente_id: "1", ano: 2026, faturamento: 500, quantidade: 5 }];
    const pedidos = [
      { cliente_id: "1", data: "2026-07-01", valor_total: 999, quantidade: 1, unidade: "TN" },
      { cliente_id: "2", data: "2026-09-01", valor_total: 3000, quantidade: 3, unidade: "TN" },
    ];
    expect(faturamentoPorAno(vendas, pedidos).find((x) => x.ano === 2026)).toEqual({ ano: 2026, faturamento: 3500, toneladas: 8 });
    expect(topClientes(vendas, pedidos, new Map([["1", "A"], ["2", "B"]]))[0]).toEqual({ id: "2", nome: "B", valor: 3000 });
  });
});
