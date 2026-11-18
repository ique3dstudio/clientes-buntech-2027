"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { carregarMunicipios, distanciaKm, type IndiceMunicipios, type Municipio } from "@/lib/geo/municipios";
import { mesesSemComprar, ROTULO_STATUS, type ClienteMapa } from "@/lib/clientes";
import { dataBr } from "@/lib/formato";
import { distanciaTotalKm, linkGoogleMaps, linkWaze, ordenarRota } from "@/lib/rotas";

const MAX_PARADAS = 10; // Google Maps: origem + até 9 intermediárias + destino

type Origem = { lat: number; lng: number; rotulo: string };
type Item = ClienteMapa & { km: number; ultimaVisita: string | null };

export function PlanejadorRota() {
  const [origem, setOrigem] = useState<Origem | null>(null);
  const [clientes, setClientes] = useState<ClienteMapa[]>([]);
  const [visitas, setVisitas] = useState<Map<string, string>>(new Map());
  const [idx, setIdx] = useState<IndiceMunicipios | null>(null);
  const [raio, setRaio] = useState(100);
  const [status, setStatus] = useState({ prospect: true, carteira: true });
  const [frente, setFrente] = useState("");
  const [soNaoVisitados, setSoNaoVisitados] = useState(false);
  const [marcados, setMarcados] = useState<string[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [cidadeTxt, setCidadeTxt] = useState("");
  const [sugestoes, setSugestoes] = useState<Municipio[]>([]);
  const [buscandoGps, setBuscandoGps] = useState(false);

  useEffect(() => {
    let vivo = true;
    (async () => {
      const supabase = createClient();
      const todos: ClienteMapa[] = [];
      for (let de = 0; ; de += 1000) {
        const { data } = await supabase.from("clientes_mapa").select("id, nome, cidade, uf, status, etapa_id, vendedor_id, lat, lng, frentes, ultima_compra, alerta_financeiro, localizacao_precisao, razao_social, documento, territorio_id, porte").neq("status", "perdido").order("id").range(de, de + 999);
        todos.push(...((data ?? []) as ClienteMapa[]));
        if (!data || data.length < 1000) break;
      }
      const { data: vs } = await supabase.from("interacoes").select("cliente_id, data").eq("tipo", "visita").order("data", { ascending: false }).limit(5000);
      const ultimas = new Map<string, string>();
      (vs ?? []).forEach((v) => { if (!ultimas.has(v.cliente_id)) ultimas.set(v.cliente_id, v.data); });
      const municipios = await carregarMunicipios();
      if (!vivo) return;
      setClientes(todos); setVisitas(ultimas); setIdx(municipios);
    })();
    return () => { vivo = false; };
  }, []);

  function usarGps() {
    setBuscandoGps(true); setMsg(null);
    if (!navigator.geolocation) { setBuscandoGps(false); return setMsg("Este aparelho não informa a localização. Escolha uma cidade."); }
    navigator.geolocation.getCurrentPosition(
      (p) => { setOrigem({ lat: p.coords.latitude, lng: p.coords.longitude, rotulo: "Minha localização" }); setBuscandoGps(false); setMarcados([]); },
      () => { setBuscandoGps(false); setMsg("Não consegui pegar o GPS. Permita o acesso à localização ou escolha uma cidade."); },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }

  const itens: Item[] = useMemo(() => {
    if (!origem) return [];
    return clientes
      .filter((c) => c.lat != null && c.lng != null && status[c.status as "prospect" | "carteira"] && (!frente || c.frentes.includes(frente)))
      .map((c) => ({ ...c, km: distanciaKm(origem.lat, origem.lng, c.lat!, c.lng!), ultimaVisita: visitas.get(c.id) ?? null }))
      .filter((c) => c.km <= raio && (!soNaoVisitados || !c.ultimaVisita))
      .sort((a, b) => a.km - b.km);
  }, [origem, clientes, visitas, raio, status, frente, soNaoVisitados]);

  const paradas = useMemo(() => {
    if (!origem) return [];
    const escolhidos = itens.filter((i) => marcados.includes(i.id)).map((i) => ({ id: i.id, nome: i.nome, lat: i.lat!, lng: i.lng!, cidade: i.cidade }));
    return ordenarRota(origem, escolhidos);
  }, [itens, marcados, origem]);

  const kmTotal = origem ? distanciaTotalKm(origem, paradas) : 0;
  const link = origem ? linkGoogleMaps(origem, paradas) : null;

  function alternar(id: string) {
    setMsg(null);
    setMarcados((m) => {
      if (m.includes(id)) return m.filter((x) => x !== id);
      if (m.length >= MAX_PARADAS) { setMsg(`No máximo ${MAX_PARADAS} paradas por rota (limite do Google Maps).`); return m; }
      return [...m, id];
    });
  }

  const chip = (ativo: boolean) => `cursor-pointer rounded-full px-3 py-1 text-xs font-medium ring-1 ${ativo ? "bg-white text-slate-800 ring-slate-300" : "bg-slate-100 text-slate-400 ring-transparent"}`;

  return (
    <div className="mt-6 space-y-5">
      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={usarGps} disabled={buscandoGps} className="rounded-lg bg-brand-blue px-4 py-2 text-sm font-semibold text-white hover:bg-brand-blue-dark disabled:opacity-50">
            {buscandoGps ? "Buscando GPS…" : "📍 Usar minha localização"}
          </button>
          <span className="text-sm text-slate-400">ou</span>
          <div className="relative min-w-0 flex-1 sm:max-w-xs">
            <input value={cidadeTxt} onChange={(e) => { setCidadeTxt(e.target.value); setSugestoes(idx ? idx.buscar(e.target.value, 6) : []); }} placeholder="Partir de uma cidade…" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-blue" />
            {sugestoes.length > 0 && (
              <ul className="absolute z-20 mt-1 w-full rounded-lg bg-white py-1 text-sm shadow-lg ring-1 ring-slate-200">
                {sugestoes.map((m) => (
                  <li key={m.ibge}><button className="block w-full px-3 py-1.5 text-left hover:bg-sky-50" onClick={() => { setOrigem({ lat: m.lat, lng: m.lng, rotulo: `${m.nome}/${m.uf}` }); setCidadeTxt(`${m.nome}/${m.uf}`); setSugestoes([]); setMarcados([]); }}>{m.nome} / {m.uf}</button></li>
                ))}
              </ul>
            )}
          </div>
        </div>
        {origem && (
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            <span className="text-slate-600">Partindo de <strong>{origem.rotulo}</strong></span>
            <label className="flex items-center gap-2">Raio: <strong>{raio} km</strong>
              <input type="range" min={10} max={500} step={10} value={raio} onChange={(e) => setRaio(Number(e.target.value))} className="accent-brand-blue" />
            </label>
            <label className={chip(status.prospect)}><input type="checkbox" className="sr-only" checked={status.prospect} onChange={(e) => setStatus((s) => ({ ...s, prospect: e.target.checked }))} />Prospects</label>
            <label className={chip(status.carteira)}><input type="checkbox" className="sr-only" checked={status.carteira} onChange={(e) => setStatus((s) => ({ ...s, carteira: e.target.checked }))} />Clientes</label>
            <select value={frente} onChange={(e) => setFrente(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1 text-sm">
              <option value="">Todas as frentes</option><option value="pastagens">Pastagens</option><option value="grandes-culturas">Grandes Culturas</option>
            </select>
            <label className={chip(soNaoVisitados)}><input type="checkbox" className="sr-only" checked={soNaoVisitados} onChange={(e) => setSoNaoVisitados(e.target.checked)} />Só nunca visitados</label>
          </div>
        )}
        {msg && <p className="mt-3 text-sm text-amber-700">{msg}</p>}
      </section>

      {origem && (
        <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
          <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Perto de você ({itens.length})</h2>
            {itens.length === 0 ? <p className="mt-3 text-sm text-slate-400">Ninguém neste raio com esses filtros. Aumente o raio ou ajuste os filtros.</p> : (
              <ul className="mt-2 divide-y divide-slate-100">
                {itens.slice(0, 80).map((c) => {
                  const marcado = marcados.includes(c.id);
                  const meses = mesesSemComprar(c.ultima_compra);
                  return (
                    <li key={c.id} className="flex items-start gap-3 py-2.5">
                      <input type="checkbox" checked={marcado} onChange={() => alternar(c.id)} className="mt-1 size-4 accent-brand-blue" aria-label={`Incluir ${c.nome} na rota`} />
                      <div className="min-w-0 flex-1 text-sm">
                        <Link href={`/clientes/${c.id}`} className="font-medium hover:text-brand-blue hover:underline">{c.nome}</Link>
                        <p className="text-xs text-slate-500">
                          {[c.cidade, c.uf].filter(Boolean).join("/")} · {ROTULO_STATUS[c.status]}
                          {meses != null && ` · última compra há ${meses} m`}
                          {c.localizacao_precisao === "cidade" && " · local aproximado"}
                        </p>
                        <p className="text-xs text-slate-400">{c.ultimaVisita ? `Última visita: ${dataBr(c.ultimaVisita)}` : "Nunca visitado"}</p>
                      </div>
                      <span className="whitespace-nowrap text-sm font-medium text-slate-600">{c.km.toFixed(0)} km</span>
                    </li>
                  );
                })}
              </ul>
            )}
            {itens.length > 80 && <p className="mt-2 text-xs text-slate-400">Mostrando os 80 mais próximos.</p>}
          </section>

          <aside className="h-fit rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 lg:sticky lg:top-20">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Rota ({paradas.length}/{MAX_PARADAS})</h2>
            {paradas.length === 0 ? <p className="mt-3 text-sm text-slate-400">Marque as paradas na lista. A ordem é montada pela mais próxima.</p> : (
              <>
                <ol className="mt-3 space-y-2 text-sm">
                  <li className="text-slate-500">🏁 {origem.rotulo}</li>
                  {paradas.map((p, i) => <li key={p.id}><span className="mr-2 inline-grid size-5 place-items-center rounded-full bg-brand-blue text-xs font-semibold text-white">{i + 1}</span>{p.nome}<span className="text-slate-400"> · {p.cidade}</span></li>)}
                </ol>
                <p className="mt-3 text-xs text-slate-500">≈ {kmTotal.toFixed(0)} km em linha reta</p>
                <div className="mt-4 flex flex-col gap-2">
                  <a href={link ?? "#"} target="_blank" rel="noreferrer" className="rounded-lg bg-brand-blue px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-brand-blue-dark">Abrir no Google Maps</a>
                  <a href={linkWaze(paradas[0])} target="_blank" rel="noreferrer" className="rounded-lg px-4 py-2 text-center text-sm font-medium text-brand-blue ring-1 ring-brand-blue/40 hover:bg-sky-50">Ir para a 1ª parada no Waze</a>
                  <button onClick={() => setMarcados([])} className="text-xs text-slate-500 underline">Limpar rota</button>
                </div>
              </>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
