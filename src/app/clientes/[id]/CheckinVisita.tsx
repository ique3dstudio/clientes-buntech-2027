"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { distanciaKm } from "@/lib/geo/municipios";

type Props = { clienteId: string; autor: string; lat: number | null; lng: number | null };

export function CheckinVisita({ clienteId, autor, lat, lng }: Props) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [nota, setNota] = useState("");
  const [retorno, setRetorno] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  function localizar() {
    setBuscando(true); setErro(null); setAviso(null);
    if (!navigator.geolocation) { setBuscando(false); return setErro("Este aparelho não informa a localização."); }
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const atual = { lat: p.coords.latitude, lng: p.coords.longitude };
        setPos(atual); setBuscando(false);
        if (lat != null && lng != null) {
          const km = distanciaKm(atual.lat, atual.lng, lat, lng);
          setAviso(km <= 1 ? `Você está a ${(km * 1000).toFixed(0)} m do ponto do cliente. ✔` : `Você está a ${km.toFixed(1)} km do ponto do cliente no mapa.${km > 5 ? " Confira se o ponto está na unidade de produção." : ""}`);
        }
      },
      () => { setBuscando(false); setErro("Não consegui pegar a localização. Permita o acesso no navegador e tente de novo — ou registre sem GPS."); },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }

  async function salvar(comGps: boolean) {
    setSalvando(true); setErro(null);
    const supabase = createClient();
    const { error } = await supabase.from("interacoes").insert({
      cliente_id: clienteId, tipo: "visita", descricao: nota.trim() || "Visita realizada.", autor_nome: autor,
      localizacao: comGps && pos ? `SRID=4326;POINT(${pos.lng} ${pos.lat})` : null,
    });
    if (error) { setSalvando(false); return setErro(error.message); }
    if (retorno) await supabase.from("tarefas").insert({ cliente_id: clienteId, titulo: "Retornar ao cliente após a visita", vencimento: retorno });
    setSalvando(false); setAberto(false); setNota(""); setRetorno(""); setPos(null); setAviso(null);
    router.refresh();
  }

  if (!aberto) return <button onClick={() => setAberto(true)} className="rounded-lg bg-teal-600 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-700">📍 Registrar visita</button>;

  return (
    <div className="w-full rounded-xl bg-teal-50 p-4 ring-1 ring-teal-200 sm:w-96">
      <p className="text-sm font-semibold text-teal-900">Registrar visita</p>
      <button onClick={localizar} disabled={buscando} className="mt-2 rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-teal-800 ring-1 ring-teal-300 hover:bg-teal-100 disabled:opacity-50">
        {buscando ? "Buscando GPS…" : pos ? "Atualizar localização" : "Fazer check-in com GPS"}
      </button>
      {aviso && <p className="mt-2 text-xs text-teal-900">{aviso}</p>}
      <textarea value={nota} onChange={(e) => setNota(e.target.value)} rows={3} placeholder="Como foi? Com quem falou, o que ficou combinado…" className="mt-3 w-full rounded-lg border border-teal-300 bg-white px-3 py-2 text-sm outline-none" />
      <label className="mt-2 block text-xs text-teal-900">Lembrar de retornar em
        <input type="date" value={retorno} onChange={(e) => setRetorno(e.target.value)} className="ml-2 rounded border border-teal-300 bg-white px-2 py-1 text-sm" />
      </label>
      {erro && <p className="mt-2 text-xs text-red-600">{erro}</p>}
      <div className="mt-3 flex gap-2">
        <button onClick={() => salvar(true)} disabled={salvando || !pos} className="rounded-lg bg-teal-600 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-40">Salvar com GPS</button>
        <button onClick={() => salvar(false)} disabled={salvando} className="rounded-lg px-3 py-1.5 text-sm text-teal-800 ring-1 ring-teal-300 hover:bg-teal-100">Salvar sem GPS</button>
        <button onClick={() => setAberto(false)} className="px-2 text-sm text-slate-500">Cancelar</button>
      </div>
    </div>
  );
}
