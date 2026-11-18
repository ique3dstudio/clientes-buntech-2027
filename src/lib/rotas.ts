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
