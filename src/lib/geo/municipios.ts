import { normalizar } from "@/lib/texto";

/** [codigo_ibge, nome, uf, lat, lng] — fonte: kelvins/municipios-brasileiros (MIT), centroides IBGE */
export type MunicipioBruto = [string, string, string, number, number];
export type Municipio = { ibge: string; nome: string; uf: string; lat: number; lng: number };

export const UFS = [
  "AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO", "MA", "MG", "MS", "MT", "PA", "PB",
  "PE", "PI", "PR", "RJ", "RN", "RO", "RR", "RS", "SC", "SE", "SP", "TO",
] as const;

export class IndiceMunicipios {
  readonly todos: Municipio[];
  private porNome = new Map<string, Municipio[]>();

  constructor(brutos: MunicipioBruto[]) {
    this.todos = brutos.map(([ibge, nome, uf, lat, lng]) => ({ ibge, nome, uf, lat, lng }));
    for (const m of this.todos) {
      const k = normalizar(m.nome);
      this.porNome.set(k, [...(this.porNome.get(k) ?? []), m]);
    }
  }

  /** Busca por nome (+UF opcional); se houver homônimos, desempata pela coordenada. */
  achar(cidade: string, uf?: string | null, lat?: number | null, lng?: number | null): Municipio | null {
    let c = this.porNome.get(normalizar(cidade)) ?? [];
    if (uf) {
      const mesmaUf = c.filter((m) => m.uf === uf);
      if (mesmaUf.length) c = mesmaUf;
    }
    if (c.length > 1 && lat != null && lng != null) {
      c = [...c].sort((a, b) => distancia(lat, lng, a.lat, a.lng) - distancia(lat, lng, b.lat, b.lng));
    }
    return c[0] ?? null;
  }

  maisProximo(lat: number, lng: number): Municipio {
    let melhor = this.todos[0];
    let d = Infinity;
    for (const m of this.todos) {
      const dm = distancia(lat, lng, m.lat, m.lng);
      if (dm < d) [d, melhor] = [dm, m];
    }
    return melhor;
  }

  /** Sugestões para autocompletar (prefixo do nome) */
  buscar(termo: string, limite = 8): Municipio[] {
    const t = normalizar(termo);
    if (t.length < 2) return [];
    const out: Municipio[] = [];
    for (const m of this.todos) {
      if (normalizar(m.nome).startsWith(t)) out.push(m);
      if (out.length >= limite) break;
    }
    return out;
  }
}

/** Distância aproximada em graus (suficiente para comparar proximidade). */
export function distancia(lat1: number, lng1: number, lat2: number, lng2: number) {
  return Math.hypot(lat1 - lat2, (lng1 - lng2) * Math.cos((lat1 * Math.PI) / 180));
}

/** Distância em km (haversine) */
export function distanciaKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const r = (x: number) => (x * Math.PI) / 180;
  const a = Math.sin(r(lat2 - lat1) / 2) ** 2 + Math.cos(r(lat1)) * Math.cos(r(lat2)) * Math.sin(r(lng2 - lng1) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

let cache: Promise<IndiceMunicipios> | null = null;
/** Carrega a base de municípios (navegador). */
export function carregarMunicipios(): Promise<IndiceMunicipios> {
  cache ??= fetch("/data/municipios.json")
    .then((r) => r.json() as Promise<MunicipioBruto[]>)
    .then((b) => new IndiceMunicipios(b));
  return cache;
}
