"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { UFS } from "@/lib/geo/municipios";
import { normalizar } from "@/lib/texto";

type Territorio = { id: string; nome: string; cor: string; vendedor_id: string | null; vendedor: string | null; municipios: number; clientes: number };
type Municipio = { codigo: string; nome: string; uf: string; microrregiao: string | null; mesorregiao: string | null; territorio_id: string | null };
type Nivel = "mesorregiao" | "microrregiao" | "municipio";

type Dados = { territorios: Territorio[]; vendedores: { id: string; nome: string }[]; municipios: Municipio[] };

async function buscarDados(): Promise<Dados> {
  const supabase = createClient();
  const [t, v] = await Promise.all([
    supabase.from("territorios_resumo").select("id, nome, cor, vendedor_id, vendedor, municipios, clientes").order("ordem"),
    supabase.from("vendedores").select("id, nome").eq("ativo", true).order("nome"),
  ]);
  // municípios em páginas de 1000 (sem a geometria)
  const municipios: Municipio[] = [];
  for (let de = 0; ; de += 1000) {
    const { data } = await supabase.from("municipios_ibge").select("codigo, nome, uf, microrregiao, mesorregiao, territorio_id").order("codigo").range(de, de + 999);
    municipios.push(...((data ?? []) as Municipio[]));
    if (!data || data.length < 1000) break;
  }
  return { territorios: (t.data ?? []) as Territorio[], vendedores: v.data ?? [], municipios };
}

const sel = "rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/30";

export function EditorTerritorios() {
  const [territorios, setTerritorios] = useState<Territorio[]>([]);
  const [municipios, setMunicipios] = useState<Municipio[]>([]);
  const [vendedores, setVendedores] = useState<{ id: string; nome: string }[]>([]);
  const [uf, setUf] = useState("PR");
  const [nivel, setNivel] = useState<Nivel>("mesorregiao");
  const [busca, setBusca] = useState("");
  const [destino, setDestino] = useState<Record<string, string>>({});
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);

  const aplicar = useCallback((d: Dados) => {
    setTerritorios(d.territorios); setVendedores(d.vendedores); setMunicipios(d.municipios);
  }, []);
  const carregar = useCallback(async () => aplicar(await buscarDados()), [aplicar]);

  useEffect(() => {
    let vivo = true;
    buscarDados().then((d) => { if (vivo) aplicar(d); });
    return () => { vivo = false; };
  }, [aplicar]);

  const nomeTerritorio = useMemo(() => new Map(territorios.map((t) => [t.id, t])), [territorios]);
  const ufsDisponiveis = useMemo(() => UFS.filter((u) => municipios.some((m) => m.uf === u)), [municipios]);

  const grupos = useMemo(() => {
    const doUf = municipios.filter((m) => m.uf === uf);
    const mapa = new Map<string, Municipio[]>();
    for (const m of doUf) {
      const chave = nivel === "mesorregiao" ? m.mesorregiao : nivel === "microrregiao" ? m.microrregiao : m.nome;
      if (!chave) continue;
      mapa.set(chave, [...(mapa.get(chave) ?? []), m]);
    }
    const termo = normalizar(busca);
    return [...mapa.entries()]
      .filter(([nome]) => !termo || normalizar(nome).includes(termo))
      .sort(([a], [b]) => a.localeCompare(b, "pt-BR"));
  }, [municipios, uf, nivel, busca]);

  async function mover(chave: string, itens: Municipio[]) {
    const alvo = destino[chave];
    if (!alvo) return;
    setOcupado(chave); setMsg(null);
    const { error } = await createClient().rpc("mover_municipios", { codigos: itens.map((m) => m.codigo), territorio: alvo });
    setOcupado(null);
    if (error) return setMsg({ ok: false, texto: error.message });
    setMsg({ ok: true, texto: `${chave}: ${itens.length} município(s) movido(s) para ${nomeTerritorio.get(alvo)?.nome}. Contornos e vendedores recalculados.` });
    setDestino((d) => ({ ...d, [chave]: "" }));
    await carregar();
  }

  async function definirVendedor(territorio: string, vendedor: string) {
    setOcupado(territorio); setMsg(null);
    const { error } = await createClient().rpc("definir_vendedor_territorio", { territorio, vendedor: vendedor || null });
    setOcupado(null);
    if (error) return setMsg({ ok: false, texto: error.message });
    setMsg({ ok: true, texto: "Vendedor do território atualizado; clientes reatribuídos." });
    await carregar();
  }

  return (
    <div className="mt-6 space-y-8">
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {territorios.map((t) => (
          <article key={t.id} className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200" style={{ borderLeft: `4px dashed ${t.cor}` }}>
            <h2 className="font-semibold">{t.nome}</h2>
            <p className="text-xs text-slate-500">{t.municipios} municípios · {t.clientes} clientes</p>
            <label className="mt-3 block text-xs text-slate-500">Vendedor
              <select className={`${sel} mt-1 w-full`} value={t.vendedor_id ?? ""} disabled={ocupado === t.id} onChange={(e) => definirVendedor(t.id, e.target.value)}>
                <option value="">— sem vendedor —</option>
                {vendedores.map((v) => <option key={v.id} value={v.id}>{v.nome}</option>)}
              </select>
            </label>
          </article>
        ))}
      </section>

      {msg && <p role="status" className={`rounded-lg px-4 py-3 text-sm ring-1 ${msg.ok ? "bg-teal-50 text-teal-900 ring-teal-200" : "bg-red-50 text-red-700 ring-red-200"}`}>{msg.texto}</p>}

      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-base font-semibold">Mover áreas entre territórios</h2>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <label className="text-sm">Estado{" "}
            <select className={sel} value={uf} onChange={(e) => setUf(e.target.value)}>{ufsDisponiveis.map((u) => <option key={u}>{u}</option>)}</select>
          </label>
          <label className="text-sm">Por{" "}
            <select className={sel} value={nivel} onChange={(e) => setNivel(e.target.value as Nivel)}>
              <option value="mesorregiao">Mesorregião</option><option value="microrregiao">Microrregião</option><option value="municipio">Município</option>
            </select>
          </label>
          <input className={`${sel} flex-1`} placeholder="Filtrar pelo nome…" value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>

        <ul className="mt-4 divide-y divide-slate-100">
          {grupos.length === 0 && <li className="py-6 text-sm text-slate-400">Nada encontrado.</li>}
          {grupos.map(([chave, itens]) => {
            const contagem = new Map<string, number>();
            itens.forEach((m) => contagem.set(m.territorio_id ?? "", (contagem.get(m.territorio_id ?? "") ?? 0) + 1));
            return (
              <li key={chave} className="grid items-center gap-2 py-2.5 sm:grid-cols-[1fr_auto]">
                <div className="min-w-0">
                  <p className="truncate font-medium">{chave} <span className="font-normal text-slate-400">({itens.length})</span></p>
                  <p className="mt-0.5 flex flex-wrap gap-1.5 text-xs">
                    {[...contagem.entries()].map(([id, n]) => {
                      const t = nomeTerritorio.get(id);
                      return (
                        <span key={id} className="rounded-full px-2 py-0.5 text-white" style={{ background: t?.cor ?? "#94a3b8" }}>
                          {t?.nome ?? "Sem território"}{contagem.size > 1 ? ` · ${n}` : ""}
                        </span>
                      );
                    })}
                  </p>
                </div>
                <div className="flex gap-2">
                  <select className={sel} value={destino[chave] ?? ""} onChange={(e) => setDestino((d) => ({ ...d, [chave]: e.target.value }))}>
                    <option value="">Mover para…</option>
                    {territorios.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
                  </select>
                  <button onClick={() => mover(chave, itens)} disabled={!destino[chave] || ocupado === chave}
                    className="rounded-md bg-brand-blue px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-blue-dark disabled:opacity-40">
                    {ocupado === chave ? "…" : "Mover"}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
