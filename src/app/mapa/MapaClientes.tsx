"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Map as MapaGL, GeoJSONSource } from "maplibre-gl";
import Link from "next/link";
import { MagnifyingGlass, Warning, X } from "@phosphor-icons/react";
import { BRASIL, criarMapa } from "@/lib/geo/maplibre";
import { createClient } from "@/lib/supabase/client";
import { normalizar } from "@/lib/texto";
import { carregarMunicipios, type Municipio } from "@/lib/geo/municipios";
import { circuloGeoJSON, linkBuscaSementeiras } from "@/lib/buscasementeiras";
import {
  COR_FRENTE, COR_STATUS, ROTULO_STATUS, corDaFrente, mesesSemComprar, type ClienteMapa,
} from "@/lib/clientes";

type Territorio = { id: string; nome: string; cor: string; vendedor: string | null; vendedor_id: string | null; geometria: GeoJSON.MultiPolygon; rotulo: GeoJSON.Point };

type Ficha = {
  id: string;
  contatos: { nome: string | null; telefone: string | null }[];
  pedidos: { data: string; produto_nome: string | null; quantidade: number | null; unidade: string | null; valor_total: number | null }[];
  cliente: { email: string | null; site: string | null; endereco: string | null; observacoes: string | null; equipamento: string | null } | null;
};

export function MapaClientes({ podeEditar, selecionadoInicial }: { podeEditar: boolean; selecionadoInicial?: string }) {
  const container = useRef<HTMLDivElement>(null);
  const mapa = useRef<MapaGL | null>(null);
  // O mapa "pronto" é guardado como objeto (não booleano): com Cache Components a página pode ser
  // reexibida e o efeito recria o mapa — o estado antigo não pode valer para o mapa novo.
  const [mapaPronto, setMapaPronto] = useState<MapaGL | null>(null);
  const [clientes, setClientes] = useState<ClienteMapa[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [avisoMapa, setAvisoMapa] = useState<string | null>(null);
  const [selecionadoId, setSelecionadoId] = useState<string | null>(selecionadoInicial ?? null);
  const [busca, setBusca] = useState("");
  const [frentes, setFrentes] = useState<Record<string, boolean>>({ pastagens: true, "grandes-culturas": true, nenhuma: true });
  const [status, setStatus] = useState<Record<string, boolean>>({ carteira: true, prospect: true, perdido: false });
  const [territorios, setTerritorios] = useState<Territorio[]>([]);
  const [mostrarTerritorios, setMostrarTerritorios] = useState(true);
  const [vendedorFiltro, setVendedorFiltro] = useState("");
  const [fichaCarregada, setFicha] = useState<Ficha | null>(null);
  // "Buscar sementeiras na região": escolhe um ponto no mapa e abre o buscasementeiras
  const [escolhendoLocal, setEscolhendoLocal] = useState(false);
  const [local, setLocal] = useState<{ lat: number; lng: number; mun: Municipio } | null>(null);
  const [raioBusca, setRaioBusca] = useState(70);
  const escolhendoRef = useRef(false);
  const ficha = fichaCarregada?.id === selecionadoId ? fichaCarregada : null;

  // 1) dados
  useEffect(() => {
    let vivo = true;
    (async () => {
      const supabase = createClient();
      const todos: ClienteMapa[] = [];
      for (let de = 0; ; de += 1000) {
        const { data, error } = await supabase.from("clientes_mapa").select("*").range(de, de + 999);
        if (error) { if (vivo) setErro(error.message); return; }
        todos.push(...(data as ClienteMapa[]));
        if (data.length < 1000) break;
      }
      if (vivo) setClientes(todos);
      const { data: terr } = await supabase.from("territorios_geojson").select("id, nome, cor, vendedor, vendedor_id, geometria, rotulo").order("ordem");
      if (vivo && terr) setTerritorios(terr as unknown as Territorio[]);
    })();
    return () => { vivo = false; };
  }, []);

  const visiveis = useMemo(() => {
    const t = normalizar(busca);
    return clientes.filter((c) => {
      if (c.lat == null || c.lng == null) return false;
      if (!status[c.status]) return false;
      if (vendedorFiltro && c.vendedor_id !== vendedorFiltro) return false;
      const chaves = c.frentes.length ? c.frentes : ["nenhuma"];
      if (!chaves.some((f) => frentes[f])) return false;
      if (t && !normalizar(`${c.nome} ${c.cidade ?? ""} ${c.documento ?? ""} ${c.razao_social ?? ""}`).includes(t)) return false;
      return true;
    });
  }, [clientes, busca, frentes, status, vendedorFiltro]);

  const semLocal = clientes.filter((c) => c.lat == null).length;
  const selecionado = clientes.find((c) => c.id === selecionadoId) ?? null;

  // 2) mapa
  useEffect(() => {
    let cancelado = false;
    let instancia: MapaGL | null = null;
    (async () => {
      if (!container.current) return;
      const { ml, mapa: m, reserva } = await criarMapa({
        container: container.current, bounds: BRASIL, fitBoundsOptions: { padding: 30 }, attributionControl: { compact: true },
      });
      if (cancelado) { m.remove(); return; }
      if (reserva) setAvisoMapa("Mapa base reserva (OpenStreetMap) em uso.");
      instancia = m;
      mapa.current = m;
      m.addControl(new ml.NavigationControl({ showCompass: false }), "bottom-right");
      m.addControl(new ml.GeolocateControl({ trackUserLocation: false }), "bottom-right");
      m.on("error", (e) => {
        const msg = e.error?.message ?? "erro desconhecido";
        if (!/(AJAXError|Failed to fetch|NetworkError|Load failed)/i.test(msg)) setAvisoMapa(`Mapa: ${msg}`);
      });
      m.on("load", () => {
        m.addSource("territorios", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
        m.addSource("territorios-rotulos", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
        m.addLayer({ id: "territorios-fundo", type: "fill", source: "territorios", paint: { "fill-color": ["get", "cor"], "fill-opacity": 0.09 } });
        m.addLayer({ id: "territorios-borda-base", type: "line", source: "territorios", paint: { "line-color": "#ffffff", "line-width": 5, "line-opacity": 0.7 } });
        m.addLayer({ id: "territorios-borda", type: "line", source: "territorios", layout: { "line-cap": "butt", "line-join": "round" },
          paint: { "line-color": ["get", "cor"], "line-width": 3, "line-dasharray": [3, 2] } });
        if (m.getStyle().glyphs) {
          m.addLayer({ id: "territorios-rotulos", type: "symbol", source: "territorios-rotulos",
            layout: { "text-field": ["get", "rotulo"], "text-size": 13, "text-font": ["Noto Sans Bold"], "text-max-width": 9 },
            paint: { "text-color": ["get", "cor"], "text-halo-color": "#ffffff", "text-halo-width": 2 } });
        }
        m.addSource("clientes", { type: "geojson", data: { type: "FeatureCollection", features: [] }, cluster: true, clusterRadius: 45, clusterMaxZoom: 11 });
        m.addLayer({ id: "grupos", type: "circle", source: "clientes", filter: ["has", "point_count"], paint: {
          "circle-color": "#0891d1", "circle-opacity": 0.85, "circle-stroke-width": 3, "circle-stroke-color": "#ffffff",
          "circle-radius": ["step", ["get", "point_count"], 16, 10, 20, 30, 26],
        } });
        if (m.getStyle().glyphs) {
          m.addLayer({ id: "grupos-n", type: "symbol", source: "clientes", filter: ["has", "point_count"],
            layout: { "text-field": ["get", "point_count_abbreviated"], "text-size": 13, "text-font": ["Noto Sans Bold"] }, paint: { "text-color": "#fff" } });
        }
        m.addLayer({ id: "pontos", type: "circle", source: "clientes", filter: ["!", ["has", "point_count"]], paint: {
          "circle-color": ["get", "cor"], "circle-radius": ["case", ["==", ["get", "precisao"], "exata"], 8, 6],
          "circle-stroke-width": 3, "circle-stroke-color": ["get", "borda"],
          "circle-opacity": ["case", ["==", ["get", "precisao"], "exata"], 1, 0.55],
        } });
        m.addLayer({ id: "pontos-sel", type: "circle", source: "clientes", filter: ["==", ["get", "id"], ""],
          paint: { "circle-radius": 15, "circle-color": "rgba(0,0,0,0)", "circle-stroke-width": 3, "circle-stroke-color": "#0f172a" } });

        m.on("click", "grupos", async (e) => {
          const f = e.features?.[0]; if (!f) return;
          const src = m.getSource("clientes") as GeoJSONSource;
          const zoom = await src.getClusterExpansionZoom(f.properties.cluster_id as number);
          m.easeTo({ center: (f.geometry as unknown as { coordinates: [number, number] }).coordinates, zoom });
        });
        m.on("click", "pontos", (e) => { if (escolhendoRef.current) return; const id = e.features?.[0]?.properties?.id as string | undefined; if (id) setSelecionadoId(id); });
        for (const l of ["grupos", "pontos"]) {
          m.on("mouseenter", l, () => (m.getCanvas().style.cursor = "pointer"));
          m.on("mouseleave", l, () => (m.getCanvas().style.cursor = ""));
        }
        m.resize();
        m.fitBounds(BRASIL, { padding: 30, animate: false });
        setMapaPronto(m);
      });
    })();
    return () => { cancelado = true; setMapaPronto(null); instancia?.remove(); mapa.current = null; };
  }, []);

  // 3) pontos no mapa
  useEffect(() => {
    const m = mapaPronto;
    if (!m) return;
    const src = m.getSource("clientes") as GeoJSONSource | undefined;
    src?.setData({
      type: "FeatureCollection",
      features: visiveis.map((c) => ({
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: [c.lng!, c.lat!] },
        properties: { id: c.id, cor: corDaFrente(c.frentes), borda: COR_STATUS[c.status], precisao: c.localizacao_precisao },
      })),
    });
  }, [mapaPronto, visiveis]);

  // 3b) territórios no mapa
  useEffect(() => {
    const m = mapaPronto;
    if (!m || !m.getSource("territorios")) return;
    (m.getSource("territorios") as GeoJSONSource).setData({
      type: "FeatureCollection",
      features: territorios.map((t) => ({ type: "Feature" as const, geometry: t.geometria, properties: { id: t.id, cor: t.cor, nome: t.nome } })),
    });
    (m.getSource("territorios-rotulos") as GeoJSONSource).setData({
      type: "FeatureCollection",
      features: territorios.map((t) => ({ type: "Feature" as const, geometry: t.rotulo, properties: { cor: t.cor, rotulo: `${t.nome}\n${t.vendedor ?? "Sem vendedor"}` } })),
    });
  }, [mapaPronto, territorios]);

  useEffect(() => {
    const m = mapaPronto;
    if (!m) return;
    for (const id of ["territorios-fundo", "territorios-borda-base", "territorios-borda", "territorios-rotulos"]) {
      if (m.getLayer(id)) m.setLayoutProperty(id, "visibility", mostrarTerritorios ? "visible" : "none");
    }
  }, [mapaPronto, mostrarTerritorios]);

  // 3c) buscar sementeiras na região: clique escolhe o local; o círculo mostra o raio
  useEffect(() => { escolhendoRef.current = escolhendoLocal; }, [escolhendoLocal]);
  useEffect(() => {
    const m = mapaPronto;
    if (!m || !escolhendoLocal) return;
    m.getCanvas().style.cursor = "crosshair";
    let vivo = true;
    const aoClicar = async (e: { lngLat: { lat: number; lng: number } }) => {
      const { lat, lng } = e.lngLat;
      const idx = await carregarMunicipios();
      if (!vivo) return;
      setLocal({ lat, lng, mun: idx.maisProximo(lat, lng) });
      setEscolhendoLocal(false);
    };
    m.on("click", aoClicar);
    return () => { vivo = false; m.off("click", aoClicar); m.getCanvas().style.cursor = ""; };
  }, [mapaPronto, escolhendoLocal]);

  useEffect(() => {
    const m = mapaPronto;
    if (!m) return;
    if (!m.getSource("busca-raio")) {
      m.addSource("busca-raio", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      m.addLayer({ id: "busca-raio-fundo", type: "fill", source: "busca-raio", paint: { "fill-color": "#0b8fd0", "fill-opacity": 0.08 } });
      m.addLayer({ id: "busca-raio-borda", type: "line", source: "busca-raio", paint: { "line-color": "#0b8fd0", "line-width": 2.5, "line-dasharray": [2, 2] } });
      m.addSource("busca-centro", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      m.addLayer({ id: "busca-centro", type: "circle", source: "busca-centro", paint: { "circle-radius": 8, "circle-color": "#0b8fd0", "circle-stroke-width": 3, "circle-stroke-color": "#ffffff" } });
    }
    const raio = m.getSource("busca-raio") as GeoJSONSource;
    const centro = m.getSource("busca-centro") as GeoJSONSource;
    if (!local) {
      raio.setData({ type: "FeatureCollection", features: [] });
      centro.setData({ type: "FeatureCollection", features: [] });
      return;
    }
    raio.setData({ type: "Feature", geometry: circuloGeoJSON(local.lat, local.lng, raioBusca), properties: {} });
    centro.setData({ type: "Feature", geometry: { type: "Point", coordinates: [local.lng, local.lat] }, properties: {} });
  }, [mapaPronto, local, raioBusca]);

  // 4) seleção + ficha
  useEffect(() => {
    const m = mapaPronto;
    if (m?.getLayer("pontos-sel")) m.setFilter("pontos-sel", ["==", ["get", "id"], selecionadoId ?? ""]);
    if (!selecionadoId) return;
    const c = clientes.find((x) => x.id === selecionadoId);
    if (c?.lat != null && c.lng != null && m) m.easeTo({ center: [c.lng, c.lat], zoom: Math.max(m.getZoom(), 9) });
    let vivo = true;
    const supabase = createClient();
    Promise.all([
      supabase.from("contatos").select("nome, telefone").eq("cliente_id", selecionadoId),
      supabase.from("pedidos").select("data, produto_nome, quantidade, unidade, valor_total").eq("cliente_id", selecionadoId).order("data", { ascending: false }).limit(5),
      supabase.from("clientes").select("email, site, endereco, observacoes, equipamento").eq("id", selecionadoId).single(),
    ]).then(([ct, pd, cl]) => {
      if (vivo) setFicha({ id: selecionadoId, contatos: ct.data ?? [], pedidos: pd.data ?? [], cliente: cl.data });
    });
    return () => { vivo = false; };
  }, [selecionadoId, mapaPronto, clientes]);

  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  const chip = (ativo: boolean) =>
    `flex cursor-pointer select-none items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium ring-1 transition-[background-color,color,box-shadow] duration-200 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-blue ${ativo ? "bg-white text-slate-800 shadow-sm ring-slate-300" : "bg-slate-100 text-slate-400 ring-transparent"}`;

  return (
    <div className="relative flex min-h-0 flex-1">
      <div ref={container} className="h-full flex-1" />

      {/* Barra de filtros */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-col gap-2 p-3 sm:flex-row sm:items-start">
        <div className="vidro pointer-events-auto entrar w-full max-w-sm rounded-2xl bg-white/90 p-3 shadow-lg ring-1 ring-slate-200/80 backdrop-blur-xl">
          <div className="flex gap-2">
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar cliente, cidade ou CNPJ"
              aria-label="Buscar"
              className="w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3.5 text-sm"
            />
            <button type="button" onClick={() => setFiltrosAbertos((v) => !v)} aria-expanded={filtrosAbertos} className="shrink-0 rounded-xl bg-slate-100 px-3.5 text-sm font-medium text-slate-700 hover:bg-slate-200 sm:hidden">
              Filtros
            </button>
          </div>
          <div className={`${filtrosAbertos ? "block" : "hidden"} sm:block`}>
          <div className="mt-3 flex flex-wrap gap-2">
            {([["pastagens", "Pastagens", COR_FRENTE.pastagens], ["grandes-culturas", "Grandes Culturas", COR_FRENTE["grandes-culturas"]], ["nenhuma", "Sem frente", COR_FRENTE.nenhuma]] as const).map(([k, rotulo, cor]) => (
              <label key={k} className={chip(frentes[k])}>
                <input type="checkbox" className="sr-only" checked={frentes[k]} onChange={(e) => setFrentes((s) => ({ ...s, [k]: e.target.checked }))} />
                <span className="size-3 rounded-full" style={{ background: cor }} />{rotulo}
              </label>
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {(["carteira", "prospect", "perdido"] as const).map((k) => (
              <label key={k} className={chip(status[k])}>
                <input type="checkbox" className="sr-only" checked={status[k]} onChange={(e) => setStatus((s) => ({ ...s, [k]: e.target.checked }))} />
                <span className="size-3 rounded-full ring-2 ring-white" style={{ background: "#fff", boxShadow: `0 0 0 2px ${COR_STATUS[k]}` }} />{ROTULO_STATUS[k]}
              </label>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
            <label className="flex cursor-pointer items-center gap-2 text-slate-700">
              <input type="checkbox" className="size-4 accent-brand-blue" checked={mostrarTerritorios} onChange={(e) => setMostrarTerritorios(e.target.checked)} />
              Territórios
            </label>
            <select value={vendedorFiltro} onChange={(e) => setVendedorFiltro(e.target.value)} className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2 text-xs">
              <option value="">Todos os vendedores</option>
              {territorios.filter((t) => t.vendedor_id).map((t) => <option key={t.id} value={t.vendedor_id!}>{t.vendedor}</option>)}
            </select>
          </div>
          {podeEditar && (
            <Link href="/clientes/novo" className="mt-3 block rounded-xl bg-brand-blue px-3 py-2.5 text-center text-sm font-semibold text-white hover:bg-brand-blue-dark">
              + Novo cliente
            </Link>
          )}
          </div>
          <p className="mt-3 text-xs text-slate-500">
            <span className="font-semibold tabular-nums text-slate-700">{visiveis.length}</span> no mapa{semLocal > 0 && <> · {semLocal} sem localização</>}
          </p>
          <div className="mt-3 border-t border-slate-200 pt-3">
            {!escolhendoLocal && !local && (
              <button type="button" onClick={() => setEscolhendoLocal(true)} className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-100 px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-200">
                <MagnifyingGlass size={18} /> Buscar sementeiras na região
              </button>
            )}
            {escolhendoLocal && (
              <div className="rounded-xl bg-brand-blue/10 p-3 text-sm text-slate-700">
                <p className="font-medium">Toque no mapa no lugar que você quer pesquisar.</p>
                <button type="button" onClick={() => setEscolhendoLocal(false)} className="mt-1 text-xs text-slate-500 underline">Cancelar</button>
              </div>
            )}
            {local && (
              <div className="space-y-2 rounded-xl bg-brand-blue/10 p-3 text-sm">
                <p>Perto de <strong>{local.mun.nome}/{local.mun.uf}</strong></p>
                <label className="block text-xs text-slate-600">Raio: <strong>{raioBusca} km</strong>
                  <input type="range" min={10} max={200} step={5} value={raioBusca} onChange={(e) => setRaioBusca(Number(e.target.value))} className="mt-1 w-full accent-brand-blue" />
                </label>
                <a href={linkBuscaSementeiras(local.mun.nome, local.mun.uf, raioBusca)} target="_blank" rel="noreferrer" className="block rounded-xl bg-brand-blue px-3 py-2.5 text-center font-semibold text-white hover:bg-brand-blue-dark">
                  Abrir busca de sementeiras
                </a>
                <div className="flex justify-between text-xs">
                  <button type="button" onClick={() => setEscolhendoLocal(true)} className="text-brand-blue underline">Escolher outro local</button>
                  <button type="button" onClick={() => setLocal(null)} className="text-slate-500 underline">Limpar</button>
                </div>
              </div>
            )}
          </div>
          {erro && <p className="mt-1 text-xs text-red-600">{erro}</p>}
          {avisoMapa && <p className="mt-1 text-xs text-amber-600">{avisoMapa}</p>}
          {clientes.length === 0 && !erro && (
            <p className="mt-2 text-xs text-slate-500">Nenhum cliente cadastrado ainda. Use <a className="text-brand-blue underline" href="/admin/importar">Importar</a> para carregar a planilha.</p>
          )}
        </div>
      </div>

      {/* Legenda */}
      <div className="vidro pointer-events-none absolute bottom-6 left-3 z-10 hidden rounded-2xl bg-white/90 p-3.5 text-xs shadow-lg ring-1 ring-slate-200/80 backdrop-blur-xl sm:block">
        <p className="font-semibold text-slate-700">Cor = frente · Borda = situação</p>
        <p className="mt-1 text-slate-500">Ponto claro = localizado só pela cidade</p>
        {territorios.length > 0 && (
          <ul className="mt-2 space-y-1">
            {territorios.map((t) => (
              <li key={t.id} className="flex items-center gap-2">
                <span className="inline-block w-6 border-t-[3px] border-dashed" style={{ borderColor: t.cor }} />
                <span>{t.nome} · {t.vendedor ?? "sem vendedor"}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Ficha */}
      {selecionado && (
        <aside key={selecionado.id} className="folha-sobe absolute inset-x-0 bottom-0 z-20 max-h-[68%] overflow-y-auto overscroll-contain rounded-t-3xl bg-white p-5 shadow-lg ring-1 ring-slate-200 sm:inset-y-3 sm:right-3 sm:left-auto sm:max-h-none sm:w-96 sm:rounded-3xl">
          <div className="mx-auto -mt-1 mb-3 h-1.5 w-10 rounded-full bg-slate-200 sm:hidden" />
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="truncate text-xl">{selecionado.nome}</h2>
              <p className="text-sm text-slate-500">{[selecionado.cidade, selecionado.uf].filter(Boolean).join(" / ") || "Local não informado"}</p>
            </div>
            <button onClick={() => setSelecionadoId(null)} className="grid size-9 shrink-0 place-items-center rounded-full text-slate-500 hover:bg-slate-100" aria-label="Fechar"><X size={20} /></button>
          </div>
          <Link href={`/clientes/${selecionado.id}`} className="mt-3 mr-2 inline-block rounded-xl bg-brand-blue px-4 py-2 text-sm font-semibold text-white hover:bg-brand-blue-dark">
            Ficha completa
          </Link>
          {podeEditar && (
            <Link href={`/clientes/${selecionado.id}/editar`} className="mt-3 inline-block rounded-xl px-4 py-2 text-sm font-medium text-brand-blue ring-1 ring-brand-blue/40 hover:bg-sky-50">
              Editar cliente
            </Link>
          )}
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full px-2.5 py-1 font-medium text-white" style={{ background: COR_STATUS[selecionado.status] }}>{ROTULO_STATUS[selecionado.status]}</span>
            {selecionado.frentes.map((f) => (
              <span key={f} className="rounded-full px-2.5 py-1 font-medium text-white" style={{ background: f === "pastagens" ? COR_FRENTE.pastagens : COR_FRENTE["grandes-culturas"] }}>
                {f === "pastagens" ? "Pastagens" : "Grandes Culturas"}
              </span>
            ))}
            {selecionado.porte && <span className="rounded-full bg-slate-100 px-2.5 py-1">{selecionado.porte}</span>}
          </div>
          {selecionado.alerta_financeiro && (
            <p className="mt-3 flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800 ring-1 ring-amber-200"><Warning size={18} className="mt-0.5 shrink-0" />{selecionado.alerta_financeiro}</p>
          )}
          <dl className="mt-4 space-y-2 text-sm">
            {selecionado.razao_social && <Linha t="Razão social" v={selecionado.razao_social} />}
            {selecionado.documento && <Linha t="CNPJ/CPF" v={selecionado.documento} />}
            {selecionado.ultima_compra && (
              <Linha t="Última compra" v={`${new Date(selecionado.ultima_compra + "T12:00").toLocaleDateString("pt-BR")} (${mesesSemComprar(selecionado.ultima_compra)} meses atrás)`} />
            )}
            {ficha?.cliente?.equipamento && <Linha t="Equipamento" v={ficha.cliente.equipamento} />}
            {ficha?.cliente?.endereco && <Linha t="Endereço" v={ficha.cliente.endereco} />}
            {ficha?.cliente?.email && <Linha t="E-mail" v={ficha.cliente.email} />}
            {ficha?.cliente?.site && <Linha t="Site" v={ficha.cliente.site} />}
          </dl>
          {ficha?.contatos && ficha.contatos.length > 0 && (
            <section className="mt-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Contatos</h3>
              <ul className="mt-1 space-y-1 text-sm">
                {ficha.contatos.map((c, i) => <li key={i}>{c.nome ?? "—"} · {c.telefone ?? "—"}</li>)}
              </ul>
            </section>
          )}
          {ficha?.pedidos && ficha.pedidos.length > 0 && (
            <section className="mt-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Últimos pedidos</h3>
              <ul className="mt-1 space-y-1 text-sm">
                {ficha.pedidos.map((p, i) => (
                  <li key={i}>{new Date(p.data + "T12:00").toLocaleDateString("pt-BR")} · {p.produto_nome} · {p.quantidade} {p.unidade}</li>
                ))}
              </ul>
            </section>
          )}
          {ficha?.cliente?.observacoes && (
            <section className="mt-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Observações</h3>
              <p className="mt-1 whitespace-pre-line text-sm text-slate-700">{ficha.cliente.observacoes}</p>
            </section>
          )}
        </aside>
      )}
    </div>
  );
}

function Linha({ t, v }: { t: string; v: string }) {
  return (
    <div>
      <dt className="text-xs text-slate-400">{t}</dt>
      <dd className="break-words text-slate-800">{v}</dd>
    </div>
  );
}
