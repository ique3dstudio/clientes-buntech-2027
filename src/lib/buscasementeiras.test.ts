import { describe, expect, it } from "vitest";
import { circuloGeoJSON, linkBuscaSementeiras } from "./buscasementeiras";
import { distanciaKm } from "./geo/municipios";

describe("buscasementeiras", () => {
  it("monta o link com cidade, UF, raio e busca automática", () => {
    const l = linkBuscaSementeiras("São José do Rio Preto", "SP", 70.4, "https://exemplo.streamlit.app");
    expect(l).toBe("https://exemplo.streamlit.app/?uf=SP&cidade=S%C3%A3o+Jos%C3%A9+do+Rio+Preto&raio=70&buscar=1");
  });
  it("desenha um círculo com o raio pedido", () => {
    const c = circuloGeoJSON(-19.75, -47.93, 50);
    const [lng, lat] = c.coordinates[0][10];
    expect(distanciaKm(-19.75, -47.93, lat, lng)).toBeGreaterThan(49);
    expect(distanciaKm(-19.75, -47.93, lat, lng)).toBeLessThan(51);
    expect(c.coordinates[0][0]).toEqual(c.coordinates[0][72]);
  });
});
