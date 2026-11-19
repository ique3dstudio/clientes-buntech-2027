"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, MagnifyingGlassMinus, MagnifyingGlassPlus, Trash } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/Avatar";

const V = 260; // tamanho do círculo de ajuste, em px
const SAIDA = 512; // foto final: 512 x 512
const ZOOM_MAX = 4;

type Carregada = { img: HTMLImageElement; url: string; base: number };

/** Escolhe a foto, ajusta no círculo (arrastar + faixa de zoom) e grava o recorte quadrado de 512 px. */
export function EditorFoto({ userId, nome, fotoUrl, temFoto }: { userId: string; nome: string; fotoUrl: string | null; temFoto: boolean }) {
  const router = useRouter();
  const entrada = useRef<HTMLInputElement>(null);
  const arrasto = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const [foto, setFoto] = useState<Carregada | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  useEffect(() => () => { if (foto) URL.revokeObjectURL(foto.url); }, [foto]);

  const escala = foto ? foto.base * zoom : 1;
  const dw = foto ? foto.img.naturalWidth * escala : 0;
  const dh = foto ? foto.img.naturalHeight * escala : 0;

  // mantém a imagem cobrindo todo o círculo
  const limitar = (x: number, y: number, w: number, h: number) => ({
    x: Math.min(0, Math.max(V - w, x)),
    y: Math.min(0, Math.max(V - h, y)),
  });

  function escolher(e: React.ChangeEvent<HTMLInputElement>) {
    const arq = e.target.files?.[0];
    e.target.value = "";
    if (!arq) return;
    setErro(null); setOk(null);
    if (!/^image\/(jpeg|png|webp)$/.test(arq.type)) return setErro("Use uma imagem JPG, PNG ou WebP.");
    if (arq.size > 15 * 1024 * 1024) return setErro("A imagem é muito grande (máximo 15 MB).");
    const url = URL.createObjectURL(arq);
    const img = new Image();
    img.onload = () => {
      const base = Math.max(V / img.naturalWidth, V / img.naturalHeight);
      setFoto({ img, url, base });
      setZoom(1);
      setPos({ x: (V - img.naturalWidth * base) / 2, y: (V - img.naturalHeight * base) / 2 });
    };
    img.onerror = () => { URL.revokeObjectURL(url); setErro("Não consegui abrir essa imagem."); };
    img.src = url;
  }

  function mudarZoom(novo: number) {
    if (!foto) return;
    const z = Math.min(ZOOM_MAX, Math.max(1, novo));
    const antiga = foto.base * zoom;
    const nova = foto.base * z;
    // zoom em torno do centro do círculo
    const cx = (V / 2 - pos.x) / antiga;
    const cy = (V / 2 - pos.y) / antiga;
    setZoom(z);
    setPos(limitar(V / 2 - cx * nova, V / 2 - cy * nova, foto.img.naturalWidth * nova, foto.img.naturalHeight * nova));
  }

  function descer(e: React.PointerEvent<HTMLDivElement>) {
    if (!foto) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    arrasto.current = { x: e.clientX, y: e.clientY, ox: pos.x, oy: pos.y };
  }
  function mover(e: React.PointerEvent<HTMLDivElement>) {
    const a = arrasto.current;
    if (!a || !foto) return;
    setPos(limitar(a.ox + e.clientX - a.x, a.oy + e.clientY - a.y, dw, dh));
  }
  function soltar() { arrasto.current = null; }

  async function salvar() {
    if (!foto) return;
    setSalvando(true); setErro(null); setOk(null);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = SAIDA; canvas.height = SAIDA;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Seu navegador não conseguiu preparar a imagem.");
      ctx.imageSmoothingQuality = "high";
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, SAIDA, SAIDA);
      ctx.drawImage(foto.img, -pos.x / escala, -pos.y / escala, V / escala, V / escala, 0, 0, SAIDA, SAIDA);
      const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.9));
      if (!blob) throw new Error("Não consegui gerar a imagem.");

      const supabase = createClient();
      const { data: antes } = await supabase.from("perfis").select("foto_path").eq("id", userId).single();
      const caminho = `${userId}/${Date.now()}.jpg`;
      const { error: e1 } = await supabase.storage.from("avatares").upload(caminho, blob, { contentType: "image/jpeg" });
      if (e1) throw e1;
      const { error: e2 } = await supabase.from("perfis").update({ foto_path: caminho }).eq("id", userId);
      if (e2) throw e2;
      if (antes?.foto_path) await supabase.storage.from("avatares").remove([antes.foto_path]);
      setFoto(null);
      setOk("Foto atualizada.");
      router.refresh();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível salvar a foto.");
    } finally {
      setSalvando(false);
    }
  }

  async function remover() {
    setSalvando(true); setErro(null); setOk(null);
    try {
      const supabase = createClient();
      const { data: antes } = await supabase.from("perfis").select("foto_path").eq("id", userId).single();
      const { error } = await supabase.from("perfis").update({ foto_path: null }).eq("id", userId);
      if (error) throw error;
      if (antes?.foto_path) await supabase.storage.from("avatares").remove([antes.foto_path]);
      setOk("Foto removida.");
      router.refresh();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível remover a foto.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-5">
      {foto ? (
        <>
          <div
            role="img"
            aria-label="Área de ajuste da foto: arraste para reposicionar"
            onPointerDown={descer}
            onPointerMove={mover}
            onPointerUp={soltar}
            onPointerCancel={soltar}
            onWheel={(e) => mudarZoom(zoom - e.deltaY * 0.0015)}
            style={{ width: V, height: V, touchAction: "none" }}
            className="relative cursor-grab overflow-hidden rounded-full bg-slate-100 shadow-lg ring-4 ring-white active:cursor-grabbing"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={foto.url}
              alt=""
              draggable={false}
              style={{ width: dw, height: dh, transform: `translate(${pos.x}px, ${pos.y}px)` }}
              className="pointer-events-none absolute left-0 top-0 max-w-none select-none"
            />
            <span aria-hidden className="pointer-events-none absolute inset-0 rounded-full ring-1 ring-inset ring-black/10" />
          </div>

          <div className="flex w-full max-w-xs items-center gap-3 text-slate-500">
            <MagnifyingGlassMinus size={20} aria-hidden />
            <input
              type="range"
              min={1}
              max={ZOOM_MAX}
              step={0.01}
              value={zoom}
              onChange={(e) => mudarZoom(Number(e.target.value))}
              aria-label="Zoom da foto"
              className="h-2 w-full cursor-pointer accent-brand-blue"
            />
            <MagnifyingGlassPlus size={20} aria-hidden />
          </div>
          <p className="text-center text-xs text-slate-500">Arraste a foto para posicionar e use a faixa para aproximar.</p>

          <div className="flex flex-wrap justify-center gap-2">
            <button onClick={salvar} disabled={salvando} className="rounded-full bg-gradient-to-r from-brand-blue to-brand-teal px-6 py-2.5 text-sm font-semibold text-white shadow-brand disabled:opacity-60 disabled:shadow-none">
              {salvando ? "Salvando…" : "Salvar foto"}
            </button>
            <button onClick={() => setFoto(null)} disabled={salvando} className="rounded-full px-5 py-2.5 text-sm font-medium text-slate-600 ring-1 ring-slate-300 hover:bg-slate-50">
              Cancelar
            </button>
          </div>
        </>
      ) : (
        <>
          <Avatar nome={nome} fotoUrl={fotoUrl} className="size-40 text-5xl" />
          <div className="flex flex-wrap justify-center gap-2">
            <button onClick={() => entrada.current?.click()} disabled={salvando} className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-brand-blue to-brand-teal px-5 py-2.5 text-sm font-semibold text-white shadow-brand disabled:opacity-60">
              <Camera size={18} weight="bold" /> {temFoto ? "Trocar foto" : "Adicionar foto"}
            </button>
            {temFoto && (
              <button onClick={remover} disabled={salvando} className="inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium text-slate-600 ring-1 ring-slate-300 hover:bg-slate-50 disabled:opacity-60">
                <Trash size={18} /> Remover
              </button>
            )}
          </div>
        </>
      )}

      <input ref={entrada} type="file" accept="image/jpeg,image/png,image/webp" onChange={escolher} className="sr-only" aria-label="Escolher foto" tabIndex={-1} />
      {erro && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">{erro}</p>}
      {ok && <p role="status" className="rounded-lg bg-teal-50 px-3 py-2 text-sm text-teal-800 ring-1 ring-teal-200">{ok}</p>}
    </div>
  );
}
