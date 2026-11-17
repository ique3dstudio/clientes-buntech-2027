import { describe, expect, it } from "vitest";
import { cnpjValido, cpfValido, documentoValido, formatarDocumento, somenteDigitos } from "./documento";

describe("documento", () => {
  it("valida CNPJ", () => {
    expect(cnpjValido("11.222.333/0001-81")).toBe(true);
    expect(cnpjValido("11.222.333/0001-82")).toBe(false);
    expect(cnpjValido("00.000.000/0000-00")).toBe(false);
  });
  it("valida CPF", () => {
    expect(cpfValido("529.982.247-25")).toBe(true);
    expect(cpfValido("529.982.247-24")).toBe(false);
    expect(cpfValido("111.111.111-11")).toBe(false);
  });
  it("aceita os dois formatos", () => {
    expect(documentoValido("11222333000181")).toBe(true);
    expect(documentoValido("52998224725")).toBe(true);
    expect(documentoValido("123")).toBe(false);
  });
  it("formata e limpa", () => {
    expect(formatarDocumento("11222333000181")).toBe("11.222.333/0001-81");
    expect(formatarDocumento("52998224725")).toBe("529.982.247-25");
    expect(somenteDigitos("11.222.333/0001-81")).toBe("11222333000181");
  });
});
