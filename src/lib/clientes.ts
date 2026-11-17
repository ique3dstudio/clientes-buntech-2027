export type ClienteMapa = {
  id: string;
  nome: string;
  razao_social: string | null;
  documento: string | null;
  cidade: string | null;
  uf: string | null;
  status: "prospect" | "carteira" | "perdido";
  etapa_id: number | null;
  vendedor_id: string | null;
  territorio_id: string | null;
  alerta_financeiro: string | null;
  porte: string | null;
  localizacao_precisao: "exata" | "cidade" | "manual";
  lat: number | null;
  lng: number | null;
  frentes: string[];
  ultima_compra: string | null;
};

export const ROTULO_STATUS = { carteira: "Cliente (carteira)", prospect: "Prospect", perdido: "Perdido" } as const;
export const COR_STATUS = { carteira: "#15803d", prospect: "#0891d1", perdido: "#94a3b8" } as const;
export const COR_FRENTE = { pastagens: "#16a34a", "grandes-culturas": "#d97706", ambas: "#0d9488", nenhuma: "#64748b" } as const;

export function corDaFrente(frentes: string[]) {
  const p = frentes.includes("pastagens");
  const g = frentes.includes("grandes-culturas");
  return p && g ? COR_FRENTE.ambas : p ? COR_FRENTE.pastagens : g ? COR_FRENTE["grandes-culturas"] : COR_FRENTE.nenhuma;
}

export function mesesSemComprar(ultima: string | null, hoje = new Date()) {
  if (!ultima) return null;
  const d = new Date(ultima);
  return Math.max(0, (hoje.getFullYear() - d.getFullYear()) * 12 + hoje.getMonth() - d.getMonth());
}
