"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Map as MapaGL, GeoJSONSource } from "maplibre-gl";
import Link from "next/link";
import { BRASIL, criarMapa } from "@/lib/geo/maplibre";
import { createClient } from "@/lib/supabase/client";
import { normalizar } from "@/lib/texto";
import {
  COR_FRENTE, COR_STATUS, ROTULO_STATUS, corDaFrente, mesesSemComprar, type ClienteMapa,
} from "@/lib/clientes";

type Ficha = {
  id: string;
  contatos: { nome: string | null; telefone: string | null }[];
  pedidos: { data: string; produto_nome: string | null; quantidade: number | null; unidade: string | null; valor_total: number | null }[];
  cliente: { email: string | null; site: string | null; endereco: string | null; observacoes: string | null; equipamento: string | null } | null;
};

export function MapaClientes({ podeEditar }: { podeEditar: boolean }) {
  const container = useRef<HTMLDivElement>(null);
  const mapa = useRef<MapaGL | null>(null);
  // O mapa "pronto" é guardado como objeto (não booleano): com Cache Components a página pode ser
  // reexibida e o efeito recria o mapa — o estado antigo não pode valer para o mapa novo.
  const [mapaPronto, setMapaPronto] = useState<MapaGL | null>(null);
  const [clientes, setClientes] = useState<ClienteMapa[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [avisoMapa, setAvisoMapa] = useState<string | null>(null);
  const [selecionadoId, setSelecionadoId] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [frentes, setFrentes] = useState<Record<string, boolean>>({ pastagens: true, "grandes-culturas": true, nenhuma: true });
  const [status, setStatus] = useState<Record<string, boolean>>({ carteira: true, prospect: true, perdido: false });
  const [fichaCarregada, setFicha] = useState<Ficha | null>(null);
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
    })();
    return () => { vivo = false; };
  }, []);

  const visiveis = useMemo(() => {
    const t = normalizar(busca);
    return clientes.filter((c) => {
      if (c.lat == null || c.lng == null) return false;
      if (!status[c.status]) return false;
      const chaves = c.frentes.length ? c.frentes : ["nenhuma"];
      if (!chaves.some((f) => frentes[f])) return false;
      if (t && !normalizar(`${c.nome} ${c.cidade ?? ""} ${c.documento ?? ""} ${c.razao_social ?? ""}`).includes(t)) return false;
      return true;
    });
  }, [clientes, busca, frentes, status]);

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
        m.on("click", "pontos", (e) => { const id = e.features?.[0]?.properties?.id as string | undefined; if (id) setSelecionadoId(id); });
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

  const chip = (ativo: boolean, cor: string) =>
    `flex cursor-pointer select-none items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ring-1 transition ${ativo ? "bg-white text-slate-800 ring-slate-300" : "bg-slate-100 text-slate-400 ring-transparent"}` + (cor ? "" : "");

  return (
    <div className="relative flex min-h-0 flex-1">
      <div ref={container} className="h-full flex-1" />

      {/* Barra de filtros */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-col gap-2 p-3 sm:flex-row sm:items-start">
        <div className="pointer-events-auto w-full max-w-sm rounded-xl bg-white/95 p-3 shadow-lg ring-1 ring-slate-200 backdrop-blur">
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar cliente, cidade ou CNPJ…"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/30"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            {([["pastagens", "Pastagens", COR_FRENTE.pastagens], ["grandes-culturas", "Grandes Culturas", COR_FRENTE["grandes-culturas"]], ["nenhuma", "Sem frente", COR_FRENTE.nenhuma]] as const).map(([k, rotulo, cor]) => (
              <label key={k} className={chip(frentes[k], cor)}>
                <input type="checkbox" className="sr-only" checked={frentes[k]} onChange={(e) => setFrentes((s) => ({ ...s, [k]: e.target.checked }))} />
                <span className="size-3 rounded-full" style={{ background: cor }} />{rotulo}
              </label>
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {(["carteira", "prospect", "perdido"] as const).map((k) => (
              <label key={k} className={chip(status[k], COR_STATUS[k])}>
                <input type="checkbox" className="sr-only" checked={status[k]} onChange={(e) => setStatus((s) => ({ ...s, [k]: e.target.checked }))} />
                <span className="size-3 rounded-full ring-2 ring-white" style={{ background: "#fff", boxShadow: `0 0 0 2px ${COR_STATUS[k]}` }} />{ROTULO_STATUS[k]}
              </label>
            ))}
          </div>
          {podeEditar && (
            <Link href="/clientes/novo" className="mt-3 block rounded-lg bg-brand-blue px-3 py-2 text-center text-sm font-semibold text-white hover:bg-brand-blue-dark">
              + Novo cliente
            </Link>
          )}
          <p className="mt-3 text-xs text-slate-500">
            {visiveis.length} no mapa{semLocal > 0 && <> · {semLocal} sem localização</>}
          </p>
          {erro && <p className="mt-1 text-xs text-red-600">{erro}</p>}
          {avisoMapa && <p className="mt-1 text-xs text-amber-600">{avisoMapa}</p>}
          {clientes.length === 0 && !erro && (
            <p className="mt-2 text-xs text-slate-500">Nenhum cliente cadastrado ainda. Use <a className="text-brand-blue underline" href="/admin/importar">Importar</a> para carregar a planilha.</p>
          )}
        </div>
      </div>

      {/* Legenda */}
      <div className="pointer-events-none absolute bottom-6 left-3 z-10 hidden rounded-xl bg-white/95 p-3 text-xs shadow-lg ring-1 ring-slate-200 sm:block">
        <p className="font-semibold text-slate-700">Cor = frente · Borda = situação</p>
        <p className="mt-1 text-slate-500">Ponto claro = localizado só pela cidade</p>
      </div>

      {/* Ficha */}
      {selecionado && (
        <aside className="absolute inset-x-0 bottom-0 z-20 max-h-[65%] overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl ring-1 ring-slate-200 sm:inset-y-3 sm:right-3 sm:left-auto sm:max-h-none sm:w-96 sm:rounded-2xl">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="truncate text-lg font-semibold">{selecionado.nome}</h2>
              <p className="text-sm text-slate-500">{[selecionado.cidade, selecionado.uf].filter(Boolean).join(" / ") || "Local não informado"}</p>
            </div>
            <button onClick={() => setSelecionadoId(null)} className="rounded-md px-2 py-1 text-slate-400 hover:bg-slate-100" aria-label="Fechar">✕</button>
          </div>
          {podeEditar && (
            <Link href={`/clientes/${selecionado.id}/editar`} className="mt-3 inline-block rounded-lg px-3 py-1.5 text-sm font-medium text-brand-blue ring-1 ring-brand-blue/40 hover:bg-sky-50">
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
            <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 ring-1 ring-amber-200">⚠ {selecionado.alerta_financeiro}</p>
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
