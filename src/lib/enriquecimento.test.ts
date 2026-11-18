import { describe, expect, it } from "vitest";
import { ehDiretorio, escolherSites, extrairCnpjs, extrairEmails, extrairTelefones, formatarTelefone, similaridade } from "./enriquecimento";

describe("enriquecimento", () => {
  it("reconhece diretórios e redes sociais", () => {
    expect(ehDiretorio("https://www.cnpj.biz/12345")).toBe(true);
    expect(ehDiretorio("https://pt-br.facebook.com/agrosol")).toBe(true);
    expect(ehDiretorio("https://www.agrosolsementes.com.br/")).toBe(false);
  });
  it("escolhe o site que parece da empresa", () => {
    const r = escolherSites(
      [
        { url: "https://www.cnpj.biz/agrosol", title: "Agrosol CNPJ" },
        { url: "https://www.agrosolsementes.com.br/contato", title: "Agrosol Sementes - Goiânia" },
        { url: "https://outraempresa.com.br/", title: "Outra" },
      ],
      ["Agrosol Sementes Ltda"],
    );
    expect(r).toHaveLength(1);
    expect(r[0].url).toBe("https://www.agrosolsementes.com.br");
  });
  it("extrai e-mails sem lixo", () => {
    expect(extrairEmails("fale: Contato@Agrosol.com.br, logo@2x.png, x@sentry.io")).toEqual(["contato@agrosol.com.br"]);
  });
  it("extrai e formata telefones", () => {
    expect(extrairTelefones("Ligue (62) 3291-4451 ou 62 99999-1234")).toEqual(["6232914451", "62999991234"]);
    expect(formatarTelefone("6232914451")).toBe("(62) 3291-4451");
    expect(formatarTelefone("62999991234")).toBe("(62) 99999-1234");
    expect(formatarTelefone("5562999991234")).toBe("(62) 99999-1234");
  });
  it("extrai só CNPJs válidos", () => {
    expect(extrairCnpjs("Agrosol CNPJ 11.222.333/0001-81 e 11.222.333/0001-82")).toEqual(["11222333000181"]);
  });
  it("mede a semelhança de nomes ignorando palavras genéricas", () => {
    expect(similaridade("Sementes Agrosol", "AGRO SOL LTDA")).toBe(0); // palavras coladas × separadas
    expect(similaridade("Sementes Pastotech", "PASTOTECH SEMENTES LTDA")).toBe(1);
    expect(similaridade("Sementes Cajueiro", "Fazenda Cajueiro Agropecuária Ltda")).toBe(1);
    expect(similaridade("Sementes Boi Gordo", "Sementes Safrasul Ltda")).toBe(0);
  });
});
