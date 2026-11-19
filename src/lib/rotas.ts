import { distanciaKm } from "@/lib/geo/municipios";

export type Ponto = { id: string; nome: string; lat: number; lng: number };

/** Ordena as paradas pelo vizinho mais próximo, partindo da origem. */
export function ordenarRota<T extends { lat: number; lng: number }>(origem: { lat: number; lng: number }, paradas: T[]): T[] {
  const restantes = [...paradas];
  const rota: T[] = [];
  let atual = origem;
  while (restantes.length) {
    let melhor = 0;
    let dMelhor = Infinity;
    restantes.forEach((p, i) => {
      const d = distanciaKm(atual.lat, atual.lng, p.lat, p.lng);
      if (d < dMelhor) [dMelhor, melhor] = [d, i];
    });
    const [prox] = restantes.splice(melhor, 1);
    rota.push(prox);
    atual = prox;
  }
  return rota;
}

/** Distância total (km, em linha reta) origem → paradas na ordem dada. */
export function distanciaTotalKm(origem: { lat: number; lng: number }, paradas: { lat: number; lng: number }[]): number {
  let total = 0;
  let atual = origem;
  for (const p of paradas) {
    total += distanciaKm(atual.lat, atual.lng, p.lat, p.lng);
    atual = p;
  }
  return total;
}

const ponto = (p: { lat: number; lng: number }) => `${p.lat.toFixed(6)},${p.lng.toFixed(6)}`;

/** Link do Google Maps com a rota (origem, paradas intermediárias e destino final). O Maps aceita até 9 paradas intermediárias. */
export function linkGoogleMaps(origem: { lat: number; lng: number }, paradas: { lat: number; lng: number }[]): string | null {
  if (!paradas.length) return null;
  const destino = paradas[paradas.length - 1];
  const meio = paradas.slice(0, -1);
  const params = new URLSearchParams({ api: "1", origin: ponto(origem), destination: ponto(destino), travelmode: "driving" });
  if (meio.length) params.set("waypoints", meio.map(ponto).join("|"));
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

export const linkWaze = (p: { lat: number; lng: number }) => `https://waze.com/ul?ll=${p.lat},${p.lng}&navigate=yes`;

// ---------------------------------------------------------------------------
// Viagem: clientes ao longo de um trajeto (origem → destino)
// ---------------------------------------------------------------------------

export type LngLat = [number, number];
export type Trajeto = { linha: LngLat[]; acumKm: number[]; totalKm: number };

/** Prepara a linha do trajeto (lng/lat) com a distância acumulada em cada ponto. */
export function criarTrajeto(linha: LngLat[]): Trajeto {
  const acumKm = [0];
  for (let i = 1; i < linha.length; i++) {
    acumKm.push(acumKm[i - 1] + distanciaKm(linha[i - 1][1], linha[i - 1][0], linha[i][1], linha[i][0]));
  }
  return { linha, acumKm, totalKm: acumKm[acumKm.length - 1] ?? 0 };
}

/**
 * Onde um ponto fica em relação ao trajeto: `kmDaRota` é a distância até a linha mais próxima e
 * `kmNoTrajeto` é quantos km da viagem já foram percorridos até esse ponto.
 */
export function posicaoNoTrajeto(t: Trajeto, lat: number, lng: number): { kmDaRota: number; kmNoTrajeto: number } {
  let melhor = Infinity;
  let km = 0;
  const kx = Math.cos((lat * Math.PI) / 180) * 111.32;
  const ky = 110.57;
  for (let i = 1; i < t.linha.length; i++) {
    const [ax, ay] = [t.linha[i - 1][0], t.linha[i - 1][1]];
    const [bx, by] = [t.linha[i][0], t.linha[i][1]];
    const dx = (bx - ax) * kx;
    const dy = (by - ay) * ky;
    const px = (lng - ax) * kx;
    const py = (lat - ay) * ky;
    const comp2 = dx * dx + dy * dy;
    const f = comp2 === 0 ? 0 : Math.max(0, Math.min(1, (px * dx + py * dy) / comp2));
    const d = Math.hypot(px - f * dx, py - f * dy);
    if (d < melhor) {
      melhor = d;
      km = t.acumKm[i - 1] + f * (t.acumKm[i] - t.acumKm[i - 1]);
    }
  }
  return { kmDaRota: melhor, kmNoTrajeto: km };
}

/** Itens a até `larguraKm` do trajeto, na ordem em que aparecem na viagem. */
export function itensNoTrajeto<T extends { lat: number; lng: number }>(t: Trajeto, itens: T[], larguraKm: number) {
  if (t.linha.length < 2) return [];
  return itens
    .map((i) => ({ ...i, ...posicaoNoTrajeto(t, i.lat, i.lng) }))
    .filter((i) => i.kmDaRota <= larguraKm)
    .sort((a, b) => a.kmNoTrajeto - b.kmNoTrajeto);
}

/** Link do Google Maps para a viagem: origem, paradas (já na ordem) e destino. Até 9 paradas. */
export function linkGoogleMapsViagem(
  origem: { lat: number; lng: number },
  destino: { lat: number; lng: number },
  paradas: { lat: number; lng: number }[],
): string {
  const params = new URLSearchParams({ api: "1", origin: ponto(origem), destination: ponto(destino), travelmode: "driving" });
  if (paradas.length) params.set("waypoints", paradas.slice(0, 9).map(ponto).join("|"));
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

export type RotaCalculada = { linha: LngLat[]; km: number; minutos: number | null; aproximada: boolean };

/**
 * Pede o trajeto de carro ao OSRM (servidor público, grátis). Se falhar, desenha a linha reta entre os
 * pontos e marca como aproximada.
 */
export async function calcularRota(pontos: { lat: number; lng: number }[]): Promise<RotaCalculada> {
  const reta = (): RotaCalculada => {
    const linha = pontos.map((p) => [p.lng, p.lat] as LngLat);
    return { linha, km: criarTrajeto(linha).totalKm, minutos: null, aproximada: true };
  };
  try {
    const coords = pontos.map((p) => `${p.lng.toFixed(5)},${p.lat.toFixed(5)}`).join(";");
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 20000);
    const r = await fetch(`https://router.project-osrm.org/route/v1/driving/${coords}?overview=simplified&geometries=geojson`, { signal: ctl.signal });
    clearTimeout(t);
    if (!r.ok) return reta();
    const j = (await r.json()) as { routes?: { geometry: { coordinates: LngLat[] }; distance: number; duration: number }[] };
    const rota = j.routes?.[0];
    if (!rota || rota.geometry.coordinates.length < 2) return reta();
    return { linha: rota.geometry.coordinates, km: rota.distance / 1000, minutos: Math.round(rota.duration / 60), aproximada: false };
  } catch {
    return reta();
  }
}
