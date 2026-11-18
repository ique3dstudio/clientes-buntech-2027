"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { normalizar } from "@/lib/texto";
import { COR_FRENTE, type ClienteMapa } from "@/lib/clientes";

type Etapa = { id: number; slug: string; nome: string; cor: string; ganho: boolean };
type Motivo = { id: number; nome: string };
type Vendedor = { id: string; nome: string };

const POR_COLUNA = 30;

export function FunilKanban({ podeEditar }: { podeEditar: boolean }) {
  const [etapas, setEtapas] = useState<Etapa[]>([]);
  const [motivos, setMotivos] = useState<Motivo[]>([]);
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [clientes, setClientes] = useState<ClienteMapa[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState("");
  const [vendedor, setVendedor] = useState("");
  const [frente, setFrente] = useState("");
  const [mostrar, setMostrar] = useState<Record<string, number>>({});
  const [arrastando, setArrastando] = useState<string | null>(null);
  const [sobre, setSobre] = useState<string | null>(null);
  const [pedindoMotivo, setPedindoMotivo] = useState<{ id: string; nome: string } | null>(null);
  const [motivoEscolhido, setMotivoEscolhido] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    (async () => {
      const supabase = createClient();
      const [e, m, v] = await Promise.all([
        supabase.from("funil_etapas").select("id, slug, nome, cor, ganho").order("ordem"),
        supabase.from("motivos_perda").select("id, nome").eq("ativo", true).order("id"),
        supabase.from("vendedores").select("id, nome").eq("ativo", true).order("nome"),
      ]);
      const todos: ClienteMapa[] = [];
      for (let de = 0; ; de += 1000) {
        const { data } = await supabase.from("clientes_mapa").select("id, nome, razao_social, documento, cidade, uf, status, etapa_id, vendedor_id, territorio_id, alerta_financeiro, porte, localizacao_precisao, lat, lng, frentes, ultima_compra").order("id").range(de, de + 999);
        todos.push(...((data ?? []) as ClienteMapa[]));
        if (!data || data.length < 1000) break;
      }
      if (!vivo) return;
      setEtapas((e.data ?? []) as Etapa[]); setMotivos(m.data ?? []); setVendedores(v.data ?? []); setClientes(todos); setCarregando(false);
    })();
    return () => { vivo = false; };
  }, []);

  const nomeVendedor = useMemo(() => new Map(vendedores.map((v) => [v.id, v.nome])), [vendedores]);

  const filtrados = useMemo(() => {
    const t = normalizar(busca);
    return clientes.filter((c) => {
      if (vendedor && c.vendedor_id !== vendedor) return false;
      if (frente && !c.frentes.includes(frente)) return false;
      if (t && !normalizar(`${c.nome} ${c.cidade ?? ""}`).includes(t)) return false;
      return true;
    });
  }, [clientes, busca, vendedor, frente]);

  const colunas = useMemo(() => {
    const mapa = new Map<string, ClienteMapa[]>();
    for (const c of filtrados) {
      const chave = c.status === "perdido" ? "perdido" : c.etapa_id ? String(c.etapa_id) : "sem";
      mapa.set(chave, [...(mapa.get(chave) ?? []), c]);
    }
    return mapa;
  }, [filtrados]);

  async function mover(id: string, destino: string, motivoId?: number) {
    if (!podeEditar) return;
    const c = clientes.find((x) => x.id === id);
    if (!c) return;
    setErro(null);
    const supabase = createClient();
    let patch: Record<string, unknown>;
    let rotuloDestino: string;
    if (destino === "perdido") {
      patch = { status: "perdido", motivo_perda_id: motivoId ?? null };
      rotuloDestino = "Perdido";
    } else {
      const etapa = etapas.find((x) => String(x.id) === destino);
      if (!etapa) return;
      patch = { etapa_id: etapa.id, motivo_perda_id: null, status: etapa.ganho ? "carteira" : c.status === "perdido" ? "prospect" : c.status };
      rotuloDestino = etapa.nome;
    }
    const anterior = clientes;
    setClientes((l) => l.map((x) => (x.id === id ? { ...x, ...(patch as Partial<ClienteMapa>) } : x)));
    const { error } = await supabase.from("clientes").update(patch).eq("id", id);
    if (error) { setClientes(anterior); return setErro(error.message); }
    const origem = c.status === "perdido" ? "Perdido" : etapas.find((x) => x.id === c.etapa_id)?.nome ?? "Sem etapa";
    await supabase.from("interacoes").insert({ cliente_id: id, tipo: "nota", descricao: `Funil: ${origem} → ${rotuloDestino}`, autor_nome: "Funil" });
  }

  function soltar(destino: string) {
    const id = arrastando;
    setArrastando(null); setSobre(null);
    if (!id) return;
    const c = clientes.find((x) => x.id === id);
    const atual = c?.status === "perdido" ? "perdido" : c?.etapa_id ? String(c.etapa_id) : "sem";
    if (atual === destino) return;
    if (destino === "perdido") { setPedindoMotivo({ id, nome: c?.nome ?? "" }); setMotivoEscolhido(""); return; }
    void mover(id, destino);
  }

  if (carregando) return <p className="p-8 text-slate-500" role="status">Carregando o funil…</p>;

  const colunasVisiveis: { chave: string; nome: string; cor: string }[] = [
    ...(colunas.has("sem") ? [{ chave: "sem", nome: "Sem etapa", cor: "#cbd5e1" }] : []),
    ...etapas.map((e) => ({ chave: String(e.id), nome: e.nome, cor: e.cor })),
    { chave: "perdido", nome: "Perdido", cor: "#64748b" },
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-col gap-3 px-4 pb-1 pt-4 sm:flex-row sm:flex-wrap sm:items-center sm:px-6">
        <div className="mr-auto">
          <h1 className="text-2xl">Funil de vendas</h1>
          <p className="text-sm text-slate-500">
            {filtrados.length} clientes{!podeEditar && " · somente leitura"}
            {erro && <span className="ml-2 text-red-600">{erro}</span>}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar cliente ou cidade" aria-label="Buscar" className="col-span-2 rounded-xl border border-slate-200 bg-white px-3.5 text-sm sm:w-60" />
          <select value={vendedor} onChange={(e) => setVendedor(e.target.value)} aria-label="Vendedor" className="rounded-xl border border-slate-200 bg-white px-3 text-sm">
            <option value="">Todos os vendedores</option>
            {vendedores.map((v) => <option key={v.id} value={v.id}>{v.nome}</option>)}
          </select>
          <select value={frente} onChange={(e) => setFrente(e.target.value)} aria-label="Frente" className="rounded-xl border border-slate-200 bg-white px-3 text-sm">
            <option value="">Todas as frentes</option>
            <option value="pastagens">Pastagens</option>
            <option value="grandes-culturas">Grandes Culturas</option>
          </select>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 pb-4 pt-3 sm:snap-none sm:px-6">
        {colunasVisiveis.map((col, n) => {
          const lista = colunas.get(col.chave) ?? [];
          const limite = mostrar[col.chave] ?? POR_COLUNA;
          return (
            <section
              key={col.chave}
              style={{ "--i": n } as React.CSSProperties}
              onDragOver={(e) => { if (podeEditar) { e.preventDefault(); setSobre(col.chave); } }}
              onDragLeave={() => setSobre((s) => (s === col.chave ? null : s))}
              onDrop={() => soltar(col.chave)}
              className={`entrar flex w-[82vw] max-w-80 shrink-0 snap-start flex-col rounded-2xl p-1.5 ring-1 transition-[background-color,box-shadow] duration-200 sm:w-72 ${sobre === col.chave ? "bg-brand-blue/10 ring-2 ring-brand-blue" : "bg-slate-200/50 ring-slate-200"}`}
            >
              <header className="flex items-center gap-2 px-2.5 pb-2 pt-2">
                <span aria-hidden className="size-2.5 rounded-full" style={{ background: col.cor }} />
                <h2 className="text-sm">{col.nome}</h2>
                <span className="ml-auto rounded-full bg-white px-2 py-0.5 text-xs font-semibold tabular-nums text-slate-600">{lista.length}</span>
              </header>
              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-0.5 pb-1">
                {lista.slice(0, limite).map((c) => (
                  <article
                    key={c.id}
                    draggable={podeEditar}
                    onDragStart={() => setArrastando(c.id)}
                    onDragEnd={() => { setArrastando(null); setSobre(null); }}
                    className={`elevar rounded-xl bg-white p-3 text-sm shadow-sm ring-1 ring-slate-200 ${podeEditar ? "cursor-grab active:cursor-grabbing" : ""} ${arrastando === c.id ? "scale-[0.97] opacity-40" : ""}`}
                  >
                    <Link href={`/clientes/${c.id}`} className="font-semibold leading-snug hover:text-brand-blue">{c.nome}</Link>
                    <p className="mt-0.5 text-xs text-slate-500">{[c.cidade, c.uf].filter(Boolean).join(" / ") || "Sem cidade"}</p>
                    <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[11px] font-medium">
                      {c.frentes.map((f) => <span key={f} className="rounded-full px-2 py-0.5 text-white" style={{ background: f === "pastagens" ? COR_FRENTE.pastagens : COR_FRENTE["grandes-culturas"] }}>{f === "pastagens" ? "Pastagens" : "Grandes Culturas"}</span>)}
                      {c.vendedor_id && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">{nomeVendedor.get(c.vendedor_id) ?? ""}</span>}
                    </div>
                    {podeEditar && (
                      <select
                        aria-label="Mover para"
                        value=""
                        onChange={(e) => { const d = e.target.value; if (!d) return; if (d === "perdido") { setPedindoMotivo({ id: c.id, nome: c.nome }); setMotivoEscolhido(""); } else void mover(c.id, d); }}
                        className="mt-2.5 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 text-xs text-slate-600"
                      >
                        <option value="">Mover para…</option>
                        {colunasVisiveis.filter((x) => x.chave !== col.chave && x.chave !== "sem").map((x) => <option key={x.chave} value={x.chave}>{x.nome}</option>)}
                      </select>
                    )}
                  </article>
                ))}
                {lista.length > limite && (
                  <button onClick={() => setMostrar((m) => ({ ...m, [col.chave]: limite + POR_COLUNA }))} className="w-full rounded-xl py-2.5 text-xs font-semibold text-brand-blue hover:bg-white/70">
                    Mostrar mais ({lista.length - limite})
                  </button>
                )}
                {lista.length === 0 && <p className="rounded-xl border border-dashed border-slate-300 px-2 py-8 text-center text-xs text-slate-400">Nenhum cliente aqui</p>}
              </div>
            </section>
          );
        })}
      </div>

      {pedindoMotivo && (
        <div className="fundo fixed inset-0 z-50 grid place-items-center bg-brand-ink/40 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
          <div className="pop w-full max-w-sm rounded-3xl bg-white p-6 shadow-lg">
            <h3 className="text-lg">Marcar como perdido</h3>
            <p className="mt-1 text-sm text-slate-500">{pedindoMotivo.nome}</p>
            <select value={motivoEscolhido} onChange={(e) => setMotivoEscolhido(e.target.value)} className="mt-4 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm">
              <option value="">Motivo da perda…</option>
              {motivos.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
            </select>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setPedindoMotivo(null)} className="rounded-xl px-4 py-2.5 text-sm font-medium text-slate-600 ring-1 ring-slate-300 hover:bg-slate-50">Cancelar</button>
              <button disabled={!motivoEscolhido} onClick={() => { void mover(pedindoMotivo.id, "perdido", Number(motivoEscolhido)); setPedindoMotivo(null); }}
                className="rounded-xl bg-brand-blue px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-blue-dark disabled:opacity-40">Confirmar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
