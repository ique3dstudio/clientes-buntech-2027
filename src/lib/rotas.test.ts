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
