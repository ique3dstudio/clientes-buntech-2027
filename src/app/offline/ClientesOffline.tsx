"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { idb } from "@/lib/offline/db";
import { CLAVE_ATUALIZADO, type ClienteLocal } from "@/lib/offline/copia";
import { EVENTO_FILA, listarFila, registrar, type ItemFila } from "@/lib/offline/fila";
import { distanciaKm } from "@/lib/geo/municipios";
import { normalizar } from "@/lib/texto";
import { reduzirFoto } from "@/lib/offline/foto";

const TIPOS = [["visita", "Visita"], ["ligacao", "Ligação"], ["whatsapp", "WhatsApp"], ["reuniao", "Reunião"], ["amostra", "Amostra"], ["nota", "Anotação"]] as const;

export function ClientesOffline() {
  const [clientes, setClientes] = useState<ClienteLocal[] | null>(null);
  const [atualizado, setAtualizado] = useState<number | null>(null);
  const [fila, setFila] = useState<ItemFila[]>([]);
  const [busca, setBusca] = useState("");
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null);
  const [aberto, setAberto] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    const carregar = async () => {
      const [c, m, f] = await Promise.all([idb.todos<ClienteLocal>("clientes"), idb.obter<{ valor: number }>("meta", CLAVE_ATUALIZADO), listarFila()]);
      if (!vivo) return;
      setClientes(c); setAtualizado(m?.valor ?? null); setFila(f);
    };
    carregar().catch(() => vivo && setClientes([]));
    window.addEventListener(EVENTO_FILA, carregar);
    return () => { vivo = false; window.removeEventListener(EVENTO_FILA, carregar); };
  }, []);

  function perto() {
    navigator.geolocation?.getCurrentPosition((p) => setPos({ lat: p.coords.latitude, lng: p.coords.longitude }), () => alert("Não consegui pegar a localização."), { enableHighAccuracy: true, timeout: 15000 });
  }

  const lista = useMemo(() => {
    const q = normalizar(busca);
    let r = (clientes ?? []).filter((c) => c.status !== "perdido" && (!q || normalizar(`${c.nome} ${c.cidade ?? ""}`).includes(q)));
    if (pos) {
      const d = (c: ClienteLocal) => (c.lat == null || c.lng == null ? 1e9 : distanciaKm(pos.lat, pos.lng, c.lat, c.lng));
      r = [...r].sort((a, b) => d(a) - d(b));
    } else r = [...r].sort((a, b) => a.nome.localeCompare(b.nome));
    return r.slice(0, 50).map((c) => ({ c, km: pos && c.lat != null && c.lng != null ? distanciaKm(pos.lat, pos.lng, c.lat, c.lng) : null }));
  }, [clientes, busca, pos]);

  if (clientes == null) return <p className="text-sm text-slate-500">Carregando…</p>;
  if (clientes.length === 0)
    return <p className="rounded-lg bg-amber-50 p-4 text-sm text-amber-900">Ainda não há clientes salvos neste aparelho. Abra o app uma vez com internet (e entre na sua conta) para baixar a lista.</p>;

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar cliente ou cidade" className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <button onClick={perto} className="rounded-lg bg-white px-3 py-2 text-sm ring-1 ring-slate-300">📍 Perto de mim</button>
      </div>
      <p className="text-xs text-slate-500">
        {clientes.length} clientes salvos{atualizado ? ` · atualizado em ${new Date(atualizado).toLocaleString("pt-BR")}` : ""}
        {fila.length > 0 && <strong className="ml-2 text-amber-700">{fila.length} registro(s) aguardando envio</strong>}
      </p>
      <ul className="space-y-2">
        {lista.map(({ c, km }) => (
          <li key={c.id} className="rounded-xl border border-slate-200 bg-white p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium text-slate-900">{c.nome}</p>
                <p className="text-xs text-slate-500">{c.cidade ? `${c.cidade}/${c.uf}` : "—"} · {c.status === "carteira" ? "Cliente" : "Prospect"}{km != null && ` · ${km.toFixed(1)} km`}</p>
              </div>
              <button onClick={() => setAberto(aberto === c.id ? null : c.id)} className="shrink-0 rounded-lg bg-teal-600 px-3 py-1.5 text-sm font-semibold text-white">Registrar</button>
            </div>
            {aberto === c.id && <Formulario cliente={c} aoSalvar={() => setAberto(null)} />}
          </li>
        ))}
      </ul>
      <Link href="/" className="inline-block text-sm text-brand-blue underline">Voltar ao app</Link>
    </div>
  );
}

function Formulario({ cliente, aoSalvar }: { cliente: ClienteLocal; aoSalvar: () => void }) {
  const [tipo, setTipo] = useState<string>("visita");
  const [texto, setTexto] = useState("");
  const [foto, setFoto] = useState<File | null>(null);
  const [gps, setGps] = useState<{ lat: number; lng: number } | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [resultado, setResultado] = useState<string | null>(null);

  async function salvar() {
    setSalvando(true);
    try {
      const supabase = createClient();
      const autor = (await idb.obter<{ valor: string }>("meta", "autor"))?.valor || "App (offline)";
      const r = await registrar(supabase, {
        clienteId: cliente.id, clienteNome: cliente.nome, tipo, descricao: texto.trim() || (tipo === "visita" ? "Visita realizada." : "—"),
        autor, gps, retorno: null, foto: foto ? await reduzirFoto(foto) : null,
      });
      setResultado(r === "fila" ? "Guardado no aparelho. Será enviado quando o sinal voltar." : "Registrado!");
      setTimeout(aoSalvar, 1500);
    } catch (e) {
      setResultado(`Erro: ${(e as Error).message}`);
      setSalvando(false);
    }
  }

  return (
    <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
      <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm">
        {TIPOS.map(([v, r]) => <option key={v} value={v}>{r}</option>)}
      </select>
      <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={3} placeholder="Como foi? Com quem falou, o que ficou combinado…" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <label className="cursor-pointer rounded-lg bg-white px-3 py-1.5 ring-1 ring-slate-300">
          📷 {foto ? "Trocar foto" : "Tirar foto"}
          <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => setFoto(e.target.files?.[0] ?? null)} />
        </label>
        <button type="button" onClick={() => navigator.geolocation?.getCurrentPosition((p) => setGps({ lat: p.coords.latitude, lng: p.coords.longitude }), () => alert("Sem GPS agora."), { enableHighAccuracy: true, timeout: 15000 })} className="rounded-lg bg-white px-3 py-1.5 ring-1 ring-slate-300">
          {gps ? "✔ GPS salvo" : "Check-in com GPS"}
        </button>
        {foto && <span className="text-xs text-slate-500">{foto.name}</span>}
      </div>
      {resultado && <p className="text-sm text-slate-700">{resultado}</p>}
      <button onClick={salvar} disabled={salvando} className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">{salvando ? "Salvando…" : "Salvar"}</button>
    </div>
  );
}
