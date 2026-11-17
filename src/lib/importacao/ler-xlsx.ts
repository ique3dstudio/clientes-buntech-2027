import type { Abas, Linha } from "./planilha";

/** Lê um .xlsx (ArrayBuffer) e devolve as linhas de cada aba, usando a 1ª linha como cabeçalho. */
export async function lerXlsx(buffer: ArrayBuffer): Promise<Abas> {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  const abas: Abas = {};
  wb.eachSheet((ws) => {
    const cab: string[] = [];
    const linhas: Linha[] = [];
    ws.eachRow({ includeEmpty: false }, (row, n) => {
      const valores = row.values as unknown[]; // índice 1-based
      if (n === 1) {
        valores.forEach((v, i) => (cab[i] = String(v ?? "").trim()));
        return;
      }
      const l: Linha = {};
      cab.forEach((h, i) => {
        if (!h) return;
        l[h] = valorCelula(valores[i]);
      });
      if (Object.values(l).some((v) => v != null && v !== "")) linhas.push(l);
    });
    abas[ws.name.trim()] = linhas;
  });
  return abas;
}

function valorCelula(v: unknown): unknown {
  if (v && typeof v === "object" && !(v instanceof Date)) {
    const o = v as Record<string, unknown>;
    if ("result" in o) return o.result; // fórmula
    if ("text" in o) return o.text; // hyperlink
    if (Array.isArray(o.richText)) return (o.richText as { text: string }[]).map((t) => t.text).join("");
  }
  return v;
}
