"use client";

import { useState } from "react";
import { PlanejadorRota } from "./PlanejadorRota";
import { RotaViagem } from "./RotaViagem";

const ABAS = [
  { id: "viagem", rotulo: "Viagem: origem e destino" },
  { id: "perto", rotulo: "Perto de mim" },
] as const;

export function Rotas() {
  const [aba, setAba] = useState<(typeof ABAS)[number]["id"]>("viagem");
  return (
    <div className="mt-5">
      <div role="tablist" className="inline-flex rounded-full bg-slate-200/60 p-1">
        {ABAS.map((a) => (
          <button key={a.id} role="tab" aria-selected={aba === a.id} onClick={() => setAba(a.id)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${aba === a.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}>
            {a.rotulo}
          </button>
        ))}
      </div>
      {aba === "viagem" ? <RotaViagem /> : <PlanejadorRota />}
    </div>
  );
}
