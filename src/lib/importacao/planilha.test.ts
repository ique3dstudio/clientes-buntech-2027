import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { IndiceMunicipios, type MunicipioBruto } from "@/lib/geo/municipios";
import { montarImportacao, num, separarCidade } from "./planilha";
import { lerXlsx } from "./ler-xlsx";

const idx = new IndiceMunicipios(JSON.parse(readFileSync("public/data/municipios.json", "utf8")) as MunicipioBruto[]);
let n = 0;
const novoId = () => `id-${++n}`;

describe("utilitários", () => {
  it("separa cidade e UF", () => {
    expect(separarCidade("Corinto - Mg")).toEqual(["Corinto", "MG"]);
    expect(separarCidade("Uberaba")).toEqual(["Uberaba", null]);
    expect(separarCidade("Cosmorama (?)")).toEqual(["Cosmorama", null]);
  });
  it("converte números em texto", () => {
    expect(num("R$ 13.500,00")).toBe(13500);
    expect(num("18 TN")).toBe(18);
    expect(num("")).toBeNull();
  });
  it("encontra municípios com homônimos pela UF", () => {
    expect(idx.achar("Buritis", "MG")?.uf).toBe("MG");
    expect(idx.achar("Buritis", "RO")?.uf).toBe("RO");
  });
});

describe("montarImportacao", () => {
  it("monta clientes, contatos e pedidos de linhas simples", () => {
    const r = montarImportacao(
      {
        Clientes: [
          { Cliente: "Cliente A", Situação: "Carteira", Cidade: "Buritis - MG", Funil: "Lead", "CNPJ/CPF": "11.222.333/0001-81" },
          { Cliente: "Cliente B", Situação: "Perdidos", "Motivo (Perdidos)": "Não incrusta sementes", Latitude: -19.7, Longitude: -47.9, Cidade: "Uberaba" },
        ],
        Contatos: [{ Cliente: "Cliente A", Responsável: "João", Telefone: "38 9999-0000" }],
        Pedidos: [{ Cliente: "cliente a", Data: new Date("2026-09-01"), Produto: "SEEDGEL FR SACO 25KG", Quantidade: 10, Unidade: "TN", "Valor total": 5000 }],
      },
      idx, novoId, "2026-11-17",
    );
    expect(r.clientes).toHaveLength(2);
    const [a, b] = r.clientes;
    expect(a.documento).toBe("11222333000181");
    expect(a.localizacao_precisao).toBe("cidade");
    expect(a.status).toBe("prospect");
    expect(b.status).toBe("perdido");
    expect(b.uf).toBe("MG");
    expect(r.contatos[0].cliente_id).toBe(a.id);
    expect(r.pedidos[0].cliente_id).toBe(a.id);
  });
});

describe("cidade informada manualmente", () => {
  it("Sementes Bravante fica em Monte Santo de Minas", () => {
    const r = montarImportacao({ Clientes: [{ Cliente: "Sementes Bravante", Situação: "Perdidos" }] }, idx, novoId, "2026-11-17");
    expect(r.clientes[0].cidade).toBe("Monte Santo de Minas");
    expect(r.clientes[0].uf).toBe("MG");
    expect(r.clientes[0].localizacao_precisao).toBe("cidade");
    expect(r.relatorio.semLocalizacao).toEqual([]);
  });
});

describe("nomes alternativos", () => {
  it("junta LPC Sementes ao cliente Da Terra (histórico de vendas)", () => {
    const r = montarImportacao(
      {
        Clientes: [{ Cliente: "Da Terra", Situação: "Carteira", Cidade: "Governador Valadares - MG" }],
        "Histórico de vendas": [{ Cliente: "LPC Sementes", Produto: "SEEDGEL FR BIGBAG 1000KG", "Qtd 2025": 464, "Faturamento 2025": 348000 }],
      },
      idx, novoId, "2026-11-17",
    );
    expect(r.clientes).toHaveLength(1);
    expect(r.relatorio.criadosDoHistorico).toEqual([]);
    expect(r.vendas[0].cliente_id).toBe(r.clientes[0].id);
  });
});

// Teste com a planilha real, só se ela existir localmente (não é versionada — LGPD)
const real = process.env.PLANILHA_TESTE;
describe.skipIf(!real || !existsSync(real))("planilha real", () => {
  it("importa todas as abas sem perder clientes", async () => {
    const buf = readFileSync(real!);
    const abas = await lerXlsx(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer);
    const r = montarImportacao(abas, idx, novoId, "2026-11-17");
    console.log(JSON.stringify({ ...r.relatorio, clientes: r.clientes.length, unidades: r.unidades.length, contatos: r.contatos.length, pedidos: r.pedidos.length, vendas: r.vendas.length }, null, 1));
    expect(r.clientes.length).toBe(87);
    expect(r.relatorio.naoEncontrados).toEqual([]);
  });
});
