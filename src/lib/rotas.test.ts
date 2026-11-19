import { describe, expect, it } from "vitest";
import { distanciaTotalKm, linkGoogleMaps, ordenarRota } from "./rotas";

const origem = { lat: -19.75, lng: -47.93 }; // Uberaba
const uberlandia = { id: "a", lat: -18.92, lng: -48.28 };
const araxa = { id: "b", lat: -19.59, lng: -46.94 };
const sacramento = { id: "c", lat: -19.86, lng: -47.45 };

describe("rotas", () => {
  it("segue sempre a parada mais próxima", () => {
    const r = ordenarRota(origem, [uberlandia, araxa, sacramento]);
    expect(r.map((p) => p.id)).toEqual(["c", "b", "a"]);
  });
  it("soma as distâncias", () => {
    const total = distanciaTotalKm(origem, [sacramento, araxa]);
    expect(total).toBeGreaterThan(80);
    expect(total).toBeLessThan(140);
  });
  it("monta o link do Google Maps com paradas intermediárias", () => {
    const url = linkGoogleMaps(origem, [sacramento, araxa, uberlandia])!;
    expect(url).toContain("origin=-19.750000%2C-47.930000");
    expect(url).toContain("destination=-18.920000%2C-48.280000");
    expect(decodeURIComponent(url)).toContain("waypoints=-19.860000,-47.450000|-19.590000,-46.940000");
    expect(linkGoogleMaps(origem, [])).toBeNull();
  });
});

import { criarTrajeto, itensNoTrajeto, linkGoogleMapsViagem, posicaoNoTrajeto } from "./rotas";

describe("viagem", () => {
  // linha reta de oeste para leste no equador: 0°→2° (≈ 222 km)
  const t = criarTrajeto([[0, 0], [1, 0], [2, 0]]);
  it("mede o trajeto", () => {
    expect(t.totalKm).toBeGreaterThan(220);
    expect(t.totalKm).toBeLessThan(224);
  });
  it("acha a posição e o desvio de um ponto", () => {
    const p = posicaoNoTrajeto(t, 0.1, 1);
    expect(p.kmDaRota).toBeGreaterThan(10);
    expect(p.kmDaRota).toBeLessThan(12);
    expect(p.kmNoTrajeto).toBeGreaterThan(110);
    expect(p.kmNoTrajeto).toBeLessThan(112);
  });
  it("filtra pelo corredor e ordena pela viagem", () => {
    const r = itensNoTrajeto(t, [{ id: "a", lat: 0.05, lng: 1.5 }, { id: "b", lat: 0.05, lng: 0.5 }, { id: "longe", lat: 3, lng: 1 }], 20);
    expect(r.map((x) => x.id)).toEqual(["b", "a"]);
  });
  it("monta o link da viagem com paradas", () => {
    const l = linkGoogleMapsViagem({ lat: 1, lng: 2 }, { lat: 3, lng: 4 }, [{ lat: 2, lng: 3 }]);
    expect(l).toContain("origin=1.000000%2C2.000000");
    expect(l).toContain("waypoints=2.000000%2C3.000000");
  });
});
