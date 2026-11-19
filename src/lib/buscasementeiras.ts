import { distanciaKm } from "@/lib/geo/municipios";

/** Endereço do site buscasementeiras (Streamlit). Pode ser trocado por NEXT_PUBLIC_BUSCASEMENTEIRAS_URL. */
export const URL_BUSCASEMENTEIRAS = (process.env.NEXT_PUBLIC_BUSCASEMENTEIRAS_URL ?? "https://buscasementeira.streamlit.app").replace(/\/$/, "");

/** Link que abre o buscasementeiras já com a cidade e o raio preenchidos e a busca rodando. */
export function linkBuscaSementeiras(cidade: string, uf: string, raioKm: number, base = URL_BUSCASEMENTEIRAS) {
  const p = new URLSearchParams({ uf, cidade, raio: String(Math.round(raioKm)), buscar: "1" });
  return `${base}/?${p.toString()}`;
}

/** Polígono (GeoJSON) de um círculo com `raioKm` ao redor do ponto, para desenhar no mapa. */
export function circuloGeoJSON(lat: number, lng: number, raioKm: number, passos = 72): GeoJSON.Polygon {
  const kmLat = 110.57;
  const kmLng = 111.32 * Math.cos((lat * Math.PI) / 180);
  const anel: [number, number][] = [];
  for (let i = 0; i <= passos; i++) {
    const a = (2 * Math.PI * i) / passos;
    anel.push([lng + (raioKm * Math.sin(a)) / kmLng, lat + (raioKm * Math.cos(a)) / kmLat]);
  }
  return { type: "Polygon", coordinates: [anel] };
}

export { distanciaKm };
