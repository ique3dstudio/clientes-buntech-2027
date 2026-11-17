"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef } from "react";
import type { Map as MapaGL, Marker } from "maplibre-gl";
import { BRASIL, criarMapa } from "@/lib/geo/maplibre";

export type Ponto = { lat: number; lng: number };

/**
 * Mini mapa para marcar o local: clique no mapa ou arraste o pino.
 * `ponto` controla o pino; `aoMudar` é chamado só quando o usuário mexe.
 */
export function SeletorPonto({ ponto, aoMudar, zoom = 12 }: { ponto: Ponto | null; aoMudar: (p: Ponto) => void; zoom?: number }) {
  const container = useRef<HTMLDivElement>(null);
  const mapa = useRef<MapaGL | null>(null);
  const pino = useRef<Marker | null>(null);
  const ml = useRef<typeof import("maplibre-gl") | null>(null);
  const callback = useRef(aoMudar);
  const inicial = useRef(ponto);
  useEffect(() => { callback.current = aoMudar; });

  useEffect(() => {
    let cancelado = false;
    (async () => {
      if (!container.current) return;
      const ini = inicial.current;
      const { ml: lib, mapa: m } = await criarMapa(
        ini
          ? { container: container.current, center: [ini.lng, ini.lat], zoom, attributionControl: { compact: true } }
          : { container: container.current, bounds: BRASIL, fitBoundsOptions: { padding: 20 }, attributionControl: { compact: true } },
      );
      if (cancelado) { m.remove(); return; }
      ml.current = lib;
      mapa.current = m;
      m.addControl(new lib.NavigationControl({ showCompass: false }), "bottom-right");
      m.on("click", (e) => callback.current({ lat: e.lngLat.lat, lng: e.lngLat.lng }));
      colocarPino(ini, false);
    })();
    function colocarPino(p: Ponto | null, voar: boolean) {
      const m = mapa.current, lib = ml.current;
      if (!m || !lib) return;
      if (!p) { pino.current?.remove(); pino.current = null; return; }
      if (!pino.current) {
        pino.current = new lib.Marker({ draggable: true, color: "#0891d1" }).setLngLat([p.lng, p.lat]).addTo(m);
        pino.current.on("dragend", () => {
          const ll = pino.current!.getLngLat();
          callback.current({ lat: ll.lat, lng: ll.lng });
        });
      } else pino.current.setLngLat([p.lng, p.lat]);
      if (voar) m.easeTo({ center: [p.lng, p.lat], zoom: Math.max(m.getZoom(), zoom) });
    }
    (container.current as HTMLDivElement & { __pino?: typeof colocarPino }).__pino = colocarPino;
    return () => { cancelado = true; mapa.current?.remove(); mapa.current = null; pino.current = null; };
  }, [zoom]);

  // sincroniza o pino com o valor do formulário
  useEffect(() => {
    const el = container.current as (HTMLDivElement & { __pino?: (p: Ponto | null, voar: boolean) => void }) | null;
    el?.__pino?.(ponto, true);
  }, [ponto]);

  return <div ref={container} className="h-72 w-full overflow-hidden rounded-xl ring-1 ring-slate-300" />;
}
