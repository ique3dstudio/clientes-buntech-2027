/** Normaliza texto para comparação: sem acento, minúsculo, só letras/números. */
export function normalizar(s: unknown): string {
  return String(s ?? "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
