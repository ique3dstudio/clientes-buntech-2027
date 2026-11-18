"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { registrar } from "@/lib/offline/fila";

const TIPOS = [
  ["nota", "Anotação"], ["ligacao", "Ligação"], ["whatsapp", "WhatsApp"], ["email", "E-mail"],
  ["visita", "Visita"], ["reuniao", "Reunião"], ["amostra", "Amostra enviada"],
] as const;

export function NovaInteracao({ clienteId, autor }: { clienteId: string; autor: string }) {
  const router = useRouter();
  const [tipo, setTipo] = useState<string>("nota");
  const [texto, setTexto] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!texto.trim()) return;
    setSalvando(true); setErro(null);
    try {
      const r = await registrar(createClient(), { clienteId, tipo, descricao: texto.trim(), autor, gps: null, retorno: null, foto: null });
      setTexto("");
      if (r === "fila") setErro("Sem sinal: guardado no aparelho, será enviado quando voltar.");
      else router.refresh();
    } catch (e) {
      setErro((e as Error).message);
    }
    setSalvando(false);
  }

  const campo = "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/30";
  return (
    <form onSubmit={salvar} className="space-y-2">
      <div className="flex gap-2">
        <select value={tipo} onChange={(e) => setTipo(e.target.value)} className={campo}>
          {TIPOS.map(([v, r]) => <option key={v} value={v}>{r}</option>)}
        </select>
        <input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="O que aconteceu? (ex.: conversei com o dono, pediu amostra)" className={`${campo} flex-1`} />
        <button disabled={salvando || !texto.trim()} className="rounded-lg bg-brand-blue px-4 py-2 text-sm font-semibold text-white hover:bg-brand-blue-dark disabled:opacity-40">
          {salvando ? "…" : "Registrar"}
        </button>
      </div>
      {erro && <p className="text-sm text-red-600">{erro}</p>}
    </form>
  );
}
