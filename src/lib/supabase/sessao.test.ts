import { describe, expect, it } from "vitest";
import { ajustarOpcoes, manterConectado } from "./sessao";

describe("manter conectado", () => {
  it("lê a preferência", () => {
    expect(manterConectado(undefined)).toBe(true);
    expect(manterConectado("0")).toBe(false);
  });
  it("mantém validade quando marcado", () => {
    expect(ajustarOpcoes({ path: "/", maxAge: 100 }, true)).toEqual({ path: "/", maxAge: 100 });
  });
  it("vira cookie de sessão quando desmarcado", () => {
    expect(ajustarOpcoes({ path: "/", maxAge: 100, expires: new Date() }, false)).toEqual({ path: "/" });
  });
  it("preserva remoção de cookie", () => {
    expect(ajustarOpcoes({ path: "/", maxAge: 0 }, false)).toEqual({ path: "/", maxAge: 0 });
  });
});
