import type { Map as MapaGL, MapOptions, StyleSpecification } from "maplibre-gl";

const ESTILO = "https://tiles.openfreemap.org/styles/positron";

/** Plano B: mapa raster do OpenStreetMap, caso o estilo vetorial não carregue. */
const ESTILO_RESERVA: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      maxzoom: 19,
      attribution: "© Colaboradores do OpenStreetMap",
    },
  },
  layers: [{ id: "osm", type: "raster", source: "osm" }],
};

export const BRASIL: [number, number, number, number] = [-74, -34, -34, 5.5];

async function escolherEstilo(): Promise<{ estilo: string | StyleSpecification; reserva: boolean }> {
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 6000);
    const r = await fetch(ESTILO, { signal: ctl.signal });
    clearTimeout(t);
    return r.ok ? { estilo: ESTILO, reserva: false } : { estilo: ESTILO_RESERVA, reserva: true };
  } catch {
    return { estilo: ESTILO_RESERVA, reserva: true };
  }
}

/**
 * Cria um mapa MapLibre já configurado (worker servido de /public — veja
 * scripts/copiar-worker-mapa.mjs — e estilo reserva). Só no navegador.
 */
export async function criarMapa(opcoes: Omit<MapOptions, "style">) {
  const ml = await import("maplibre-gl");
  ml.setWorkerUrl(`${window.location.origin}/maplibre/maplibre-gl-worker.mjs`);
  const { estilo, reserva } = await escolherEstilo();
  const mapa: MapaGL = new ml.Map({ ...opcoes, style: estilo });
  return { ml, mapa, reserva };
}
