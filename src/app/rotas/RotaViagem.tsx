"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { GeoJSONSource, Map as MapaGL } from "maplibre-gl";
import { ArrowsLeftRight, Crosshair, MapPin, Plus, X } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { criarMapa } from "@/lib/geo/maplibre";
import { carregarMunicipios, type IndiceMunicipios } from "@/lib/geo/municipios";
import { COR_STATUS, ROTULO_STATUS, type ClienteMapa } from "@/lib/clientes";
import { dataBr } from "@/lib/formato";
import { calcularRota, criarTrajeto, itensNoTrajeto, linkGoogleMapsViagem, linkWaze, posicaoNoTrajeto, type RotaCalculada } from "@/lib/rotas";

const MAX_INTERMEDIARIOS = 9; // limite do Google Maps

type Pt = { lat: number; lng: number; rotulo: string };
type Cliente = ClienteMapa & { lat: number; lng: number; ultimaVisita: string | null };

function horas(min: number | null) {
  if (min == null) return null;
  const h = Math.floor(min / 60);
  return h ? `${h} h ${String(min % 60).padStart(2, "0")} min` : `${min} min`;
}

function CampoCidade({ idx, valor, aoDigitar, aoEscolher, placeholder }: {
  idx: IndiceMunicipios | null; valor: string; aoDigitar: (t: string) => void; aoEscolher: (p: Pt) => void; placeholder: string;
}) {
  const [editando, setEditando] = useState(false);
  const sugestoes = idx && editando ? idx.buscar(valor, 6) : [];
  return (
    <div className="relative min-w-0 flex-1">
      <input
        value={valor}
        onChange={(e) => { aoDigitar(e.target.value); setEditando(true); }}
        onBlur={() => setTimeout(() => setEditando(false), 150)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm"
      />
      {sugestoes.length > 0 && (
        <ul className="absolute z-20 mt-1 w-full rounded-xl bg-white py-1 text-sm shadow-lg ring-1 ring-slate-200">
          {sugestoes.map((m) => (
            <li key={m.ibge}>
              <button type="button" className="block w-full px-3 py-2 text-left hover:bg-sky-50"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => { aoEscolher({ lat: m.lat, lng: m.lng, rotulo: `${m.nome}/${m.uf}` }); setEditando(false); }}>
                {m.nome} / {m.uf}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Mapa da viagem: linha da rota, clientes no corredor e paradas escolhidas. */
function MapaViagem({ rota, itens, marcados, origem, destino, aoAlternar }: {
  rota: RotaCalculada; itens: (Cliente & { kmDaRota: number })[]; marcados: string[]; origem: Pt; destino: Pt; aoAlternar: (id: string) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [mapa, setMapa] = useState<MapaGL | null>(null);
  const alternarRef = useRef(aoAlternar);
  useEffect(() => { alternarRef.current = aoAlternar; }, [aoAlternar]);

  useEffect(() => {
    let cancelado = false;
    let instancia: MapaGL | null = null;
    (async () => {
      if (!container.current) return;
      const { ml, mapa: m } = await criarMapa({ container: container.current, center: [-50, -15], zoom: 4, attributionControl: { compact: true } });
      if (cancelado) { m.remove(); return; }
      instancia = m;
      m.addControl(new ml.NavigationControl({ showCompass: false }), "bottom-right");
      m.on("load", () => {
        m.addSource("rota", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
        m.addLayer({ id: "rota-base", type: "line", source: "rota", layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": "#ffffff", "line-width": 9 } });
        m.addLayer({ id: "rota-linha", type: "line", source: "rota", layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": "#0b8fd0", "line-width": 5 } });
        m.addSource("clientes-rota", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
        m.addLayer({ id: "clientes-rota", type: "circle", source: "clientes-rota", paint: {
          "circle-color": ["get", "cor"], "circle-radius": ["case", ["==", ["get", "sel"], 1], 10, 6],
          "circle-stroke-width": ["case", ["==", ["get", "sel"], 1], 4, 2], "circle-stroke-color": ["case", ["==", ["get", "sel"], 1], "#0e1b2a", "#ffffff"],
        } });
        m.addSource("extremos", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
        m.addLayer({ id: "extremos", type: "circle", source: "extremos", paint: { "circle-radius": 9, "circle-color": ["get", "cor"], "circle-stroke-width": 3, "circle-stroke-color": "#ffffff" } });
        m.on("click", "clientes-rota", (e) => { const id = e.features?.[0]?.properties?.id as string | undefined; if (id) alternarRef.current(id); });
        m.on("mouseenter", "clientes-rota", () => (m.getCanvas().style.cursor = "pointer"));
        m.on("mouseleave", "clientes-rota", () => (m.getCanvas().style.cursor = ""));
        m.resize();
        setMapa(m);
      });
    })();
    return () => { cancelado = true; setMapa(null); instancia?.remove(); };
  }, []);

  // linha da rota + enquadramento
  useEffect(() => {
    if (!mapa) return;
    (mapa.getSource("rota") as GeoJSONSource).setData({ type: "Feature", geometry: { type: "LineString", coordinates: rota.linha }, properties: {} });
    (mapa.getSource("extremos") as GeoJSONSource).setData({ type: "FeatureCollection", features: [
      { type: "Feature", geometry: { type: "Point", coordinates: [origem.lng, origem.lat] }, properties: { cor: "#15803d" } },
      { type: "Feature", geometry: { type: "Point", coordinates: [destino.lng, destino.lat] }, properties: { cor: "#b91c1c" } },
    ] });
    const lngs = rota.linha.map((p) => p[0]);
    const lats = rota.linha.map((p) => p[1]);
    mapa.fitBounds([[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]], { padding: 50, duration: 600 });
  }, [mapa, rota, origem, destino]);

  // clientes no corredor
  useEffect(() => {
    if (!mapa) return;
    (mapa.getSource("clientes-rota") as GeoJSONSource).setData({
      type: "FeatureCollection",
      features: itens.map((c) => ({
        type: "Feature" as const, geometry: { type: "Point" as const, coordinates: [c.lng, c.lat] },
        properties: { id: c.id, cor: COR_STATUS[c.status], sel: marcados.includes(c.id) ? 1 : 0 },
      })),
    });
  }, [mapa, itens, marcados]);

  return <div ref={container} className="h-[22rem] w-full overflow-hidden rounded-2xl ring-1 ring-slate-200 sm:h-[30rem]" />;
}

export function RotaViagem() {
  const [clientes, setClientes] = useState<ClienteMapa[]>([]);
  const [visitas, setVisitas] = useState<Map<string, string>>(new Map());
  const [idx, setIdx] = useState<IndiceMunicipios | null>(null);
  const [origem, setOrigem] = useState<Pt | null>(null);
  const [destino, setDestino] = useState<Pt | null>(null);
  const [vias, setVias] = useState<Pt[]>([]);
  const [textoOrigem, setTextoOrigem] = useState("");
  const [textoDestino, setTextoDestino] = useState("");
  const [textoVia, setTextoVia] = useState("");
  const [largura, setLargura] = useState(30);
  const [status, setStatus] = useState({ prospect: true, carteira: true });
  const [frente, setFrente] = useState("");
  const [soNaoVisitados, setSoNaoVisitados] = useState(false);
  const [rota, setRota] = useState<RotaCalculada | null>(null);
  const [rotaDe, setRotaDe] = useState<{ origem: Pt; destino: Pt; vias: Pt[] } | null>(null);
  const [calculando, setCalculando] = useState(false);
  const [marcados, setMarcados] = useState<string[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
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
      (p) => { setOrigem({ lat: p.coords.latitude, lng: p.coords.longitude, rotulo: "Minha localização" }); setTextoOrigem("Minha localização"); setBuscandoGps(false); },
      () => { setBuscandoGps(false); setMsg("Não consegui pegar o GPS. Permita o acesso à localização ou escolha uma cidade."); },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }

  function inverter() {
    const [o, d, to, td] = [origem, destino, textoOrigem, textoDestino];
    setOrigem(d); setDestino(o); setTextoOrigem(td); setTextoDestino(to);
  }

  async function tracar() {
    if (!origem || !destino) return setMsg("Escolha a origem e o destino na lista de sugestões.");
    setMsg(null); setCalculando(true);
    const r = await calcularRota([origem, ...vias, destino]);
    setRota(r); setRotaDe({ origem, destino, vias }); setMarcados([]); setCalculando(false);
    if (r.aproximada) setMsg("Não consegui o trajeto por estrada agora. Mostrando a linha reta entre os pontos; o Google Maps calcula o caminho real.");
  }

  const trajeto = useMemo(() => (rota ? criarTrajeto(rota.linha) : null), [rota]);

  const candidatos: Cliente[] = useMemo(
    () => clientes
      .filter((c) => c.lat != null && c.lng != null && status[c.status as "prospect" | "carteira"] && (!frente || c.frentes.includes(frente)))
      .map((c) => ({ ...c, lat: c.lat!, lng: c.lng!, ultimaVisita: visitas.get(c.id) ?? null }))
      .filter((c) => !soNaoVisitados || !c.ultimaVisita),
    [clientes, visitas, status, frente, soNaoVisitados],
  );

  const naRota = useMemo(() => (trajeto ? itensNoTrajeto(trajeto, candidatos, largura) : []), [trajeto, candidatos, largura]);
  const nomesMarcados = useMemo(() => naRota.filter((i) => marcados.includes(i.id)), [naRota, marcados]);

  // paradas do Google Maps: cidades "passando por" + clientes marcados, na ordem da viagem
  const paradasMaps = useMemo(() => {
    if (!trajeto || !rotaDe) return [];
    const viasPos = rotaDe.vias.map((v) => ({ lat: v.lat, lng: v.lng, km: posicaoNoTrajeto(trajeto, v.lat, v.lng).kmNoTrajeto }));
    const clientesPos = nomesMarcados.map((c) => ({ lat: c.lat, lng: c.lng, km: c.kmNoTrajeto }));
    return [...viasPos, ...clientesPos].sort((a, b) => a.km - b.km);
  }, [trajeto, rotaDe, nomesMarcados]);

  const vagas = MAX_INTERMEDIARIOS - (rotaDe?.vias.length ?? 0);
  const link = rotaDe ? linkGoogleMapsViagem(rotaDe.origem, rotaDe.destino, paradasMaps) : null;

  function alternar(id: string) {
    setMsg(null);
    setMarcados((m) => {
      if (m.includes(id)) return m.filter((x) => x !== id);
      if (m.length >= vagas) { setMsg(`No máximo ${vagas} paradas de clientes nesta viagem (limite do Google Maps).`); return m; }
      return [...m, id];
    });
  }

  const chip = (ativo: boolean) => `cursor-pointer rounded-full px-3 py-1.5 text-xs font-medium ring-1 transition-colors ${ativo ? "bg-white text-slate-800 shadow-sm ring-slate-300" : "bg-slate-100 text-slate-400 ring-transparent"}`;

  return (
    <div className="mt-6 space-y-5">
      <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-green-100 text-green-700" title="Origem"><MapPin size={18} weight="fill" /></span>
            <CampoCidade idx={idx} valor={textoOrigem} aoDigitar={(t) => { setTextoOrigem(t); setOrigem(null); }} aoEscolher={(p) => { setOrigem(p); setTextoOrigem(p.rotulo); }} placeholder="Origem (cidade)" />
            <button type="button" onClick={usarGps} disabled={buscandoGps} aria-label="Usar minha localização como origem" title="Usar minha localização" className="grid size-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-50">
              <Crosshair size={20} />
            </button>
          </div>
          <button type="button" onClick={inverter} aria-label="Inverter origem e destino" className="self-center rounded-full p-2 text-slate-500 hover:bg-slate-100"><ArrowsLeftRight size={20} /></button>
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-red-100 text-red-700" title="Destino"><MapPin size={18} weight="fill" /></span>
            <CampoCidade idx={idx} valor={textoDestino} aoDigitar={(t) => { setTextoDestino(t); setDestino(null); }} aoEscolher={(p) => { setDestino(p); setTextoDestino(p.rotulo); }} placeholder="Destino (cidade)" />
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-slate-500">Passando por:</span>
          {vias.map((v, i) => (
            <span key={`${v.rotulo}-${i}`} className="inline-flex items-center gap-1 rounded-full bg-slate-100 py-1 pl-3 pr-1.5 text-xs font-medium text-slate-700">
              {v.rotulo}
              <button type="button" onClick={() => setVias((l) => l.filter((_, j) => j !== i))} aria-label={`Tirar ${v.rotulo}`} className="rounded-full p-0.5 hover:bg-slate-200"><X size={12} /></button>
            </span>
          ))}
          {vias.length < 3 && (
            <div className="flex w-56 items-center gap-1">
              <CampoCidade idx={idx} valor={textoVia} aoDigitar={setTextoVia} aoEscolher={(p) => { setVias((l) => [...l, p]); setTextoVia(""); }} placeholder="Adicionar cidade no caminho" />
              <Plus size={16} className="text-slate-400" aria-hidden />
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-3 text-sm">
          <label className="flex items-center gap-2">Corredor: <strong>{largura} km</strong> de cada lado
            <input type="range" min={5} max={100} step={5} value={largura} onChange={(e) => setLargura(Number(e.target.value))} className="accent-brand-blue" />
          </label>
          <label className={chip(status.prospect)}><input type="checkbox" className="sr-only" checked={status.prospect} onChange={(e) => setStatus((s) => ({ ...s, prospect: e.target.checked }))} />Prospects</label>
          <label className={chip(status.carteira)}><input type="checkbox" className="sr-only" checked={status.carteira} onChange={(e) => setStatus((s) => ({ ...s, carteira: e.target.checked }))} />Clientes</label>
          <select value={frente} onChange={(e) => setFrente(e.target.value)} aria-label="Frente" className="rounded-xl border border-slate-200 bg-white px-3 text-sm">
            <option value="">Todas as frentes</option><option value="pastagens">Pastagens</option><option value="grandes-culturas">Grandes Culturas</option>
          </select>
          <label className={chip(soNaoVisitados)}><input type="checkbox" className="sr-only" checked={soNaoVisitados} onChange={(e) => setSoNaoVisitados(e.target.checked)} />Só nunca visitados</label>
          <button type="button" onClick={tracar} disabled={calculando || !origem || !destino} className="ml-auto rounded-xl bg-brand-blue px-5 py-2.5 font-semibold text-white hover:bg-brand-blue-dark disabled:opacity-40">
            {calculando ? "Traçando…" : "Traçar rota"}
          </button>
        </div>
        {msg && <p className="mt-3 text-sm text-amber-700">{msg}</p>}
      </section>

      {rota && rotaDe && (
        <>
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <h2 className="text-xl">{rotaDe.origem.rotulo} → {rotaDe.destino.rotulo}</h2>
            <p className="text-sm text-slate-600">
              {rota.km.toFixed(0)} km{horas(rota.minutos) ? ` · cerca de ${horas(rota.minutos)}` : " em linha reta"} ·{" "}
              <strong>{naRota.length}</strong> {naRota.length === 1 ? "cliente" : "clientes"} até {largura} km da rota
            </p>
          </div>
          <MapaViagem rota={rota} itens={naRota} marcados={marcados} origem={rotaDe.origem} destino={rotaDe.destino} aoAlternar={alternar} />

          <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
            <section className="min-w-0 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Na sua rota, na ordem da viagem ({naRota.length})</h3>
              {naRota.length === 0 ? <p className="mt-3 text-sm text-slate-400">Ninguém neste corredor com esses filtros. Aumente o corredor ou ajuste os filtros.</p> : (
                <ul className="mt-2 divide-y divide-slate-100">
                  {naRota.slice(0, 100).map((c) => (
                    <li key={c.id} className="entrar flex items-start gap-3 py-2.5">
                      <input type="checkbox" checked={marcados.includes(c.id)} onChange={() => alternar(c.id)} className="mt-1 size-4 accent-brand-blue" aria-label={`Parar em ${c.nome}`} />
                      <div className="min-w-0 flex-1 text-sm">
                        <Link href={`/clientes/${c.id}`} className="font-medium hover:text-brand-blue hover:underline">{c.nome}</Link>
                        <p className="text-xs text-slate-500">
                          {[c.cidade, c.uf].filter(Boolean).join("/")} · {ROTULO_STATUS[c.status]}
                          {c.localizacao_precisao === "cidade" && " · local aproximado"}
                        </p>
                        <p className="text-xs text-slate-400">{c.ultimaVisita ? `Última visita: ${dataBr(c.ultimaVisita)}` : "Nunca visitado"}</p>
                      </div>
                      <span className="whitespace-nowrap text-right text-xs text-slate-500">
                        <span className="block text-sm font-medium text-slate-700">km {c.kmNoTrajeto.toFixed(0)}</span>a {c.kmDaRota.toFixed(0)} km da rota
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              {naRota.length > 100 && <p className="mt-2 text-xs text-slate-400">Mostrando os 100 primeiros da viagem. Diminua o corredor para ver menos.</p>}
            </section>

            <aside className="h-fit rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 lg:sticky lg:top-20">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Paradas ({nomesMarcados.length}/{vagas})</h3>
              {nomesMarcados.length === 0 ? <p className="mt-3 text-sm text-slate-400">Marque os clientes em que você vai parar, na lista ou tocando no ponto do mapa. Eles entram na ordem da viagem.</p> : (
                <ol className="mt-3 space-y-2 text-sm">
                  <li className="text-slate-500">Saída: {rotaDe.origem.rotulo}</li>
                  {nomesMarcados.map((p, i) => (
                    <li key={p.id}>
                      <span className="mr-2 inline-grid size-5 place-items-center rounded-full bg-brand-blue text-xs font-semibold text-white">{i + 1}</span>
                      {p.nome}<span className="text-slate-400"> · {p.cidade}</span>
                    </li>
                  ))}
                  <li className="text-slate-500">Chegada: {rotaDe.destino.rotulo}</li>
                </ol>
              )}
              <div className="mt-4 flex flex-col gap-2">
                <a href={link ?? "#"} target="_blank" rel="noreferrer" className="rounded-xl bg-brand-blue px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-brand-blue-dark">Abrir a viagem no Google Maps</a>
                <a href={linkWaze(nomesMarcados[0] ?? rotaDe.destino)} target="_blank" rel="noreferrer" className="rounded-xl px-4 py-2 text-center text-sm font-medium text-brand-blue ring-1 ring-brand-blue/40 hover:bg-sky-50">
                  {nomesMarcados[0] ? "Ir para a 1ª parada no Waze" : "Ir para o destino no Waze"}
                </a>
                {marcados.length > 0 && <button type="button" onClick={() => setMarcados([])} className="text-xs text-slate-500 underline">Limpar paradas</button>}
              </div>
            </aside>
          </div>
        </>
      )}
    </div>
  );
}
