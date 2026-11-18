"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatarDocumento } from "@/lib/documento";

type Linha = {
  id: string; nome: string; razao_social: string | null; documento: string | null; cidade: string | null; uf: string | null; telefone: string | null;
  email: string | null; site: string | null; endereco: string | null; cep: string | null; status: string; origem: string | null;
  etapa_id: number | null; vendedor_id: string | null; territorio_id: string | null; frentes: string[]; ultima_compra: string | null; porte: string | null;
};
type Ref = { id: string | number; nome: string };

const COLUNAS: [string, (l: Linha, ref: { etapa: Map<string | number, string>; vend: Map<string | number, string>; terr: Map<string | number, string> }) => string | number | null][] = [
  ["Cliente", (l) => l.nome], ["Razão social", (l) => l.razao_social], ["CNPJ/CPF", (l) => (l.documento ? formatarDocumento(l.documento) : null)],
  ["Cidade", (l) => l.cidade], ["UF", (l) => l.uf], ["Endereço", (l) => l.endereco], ["CEP", (l) => l.cep], ["Telefone", (l) => l.telefone], ["E-mail", (l) => l.email], ["Site", (l) => l.site],
  ["Situação", (l) => ({ carteira: "Cliente", prospect: "Prospect", perdido: "Perdido" }[l.status] ?? l.status)],
  ["Etapa do funil", (l, r) => (l.etapa_id ? r.etapa.get(l.etapa_id) ?? null : null)],
  ["Frentes", (l) => l.frentes.map((f) => (f === "pastagens" ? "Pastagens" : "Grandes Culturas")).join(" + ") || null],
  ["Porte", (l) => l.porte], ["Vendedor", (l, r) => (l.vendedor_id ? r.vend.get(l.vendedor_id) ?? null : null)],
  ["Território", (l, r) => (l.territorio_id ? r.terr.get(l.territorio_id) ?? null : null)], ["Última compra", (l) => l.ultima_compra], ["Origem", (l) => l.origem],
];

export function ExportarClientes() {
  const [dados, setDados] = useState<Linha[]>([]);
  const [etapas, setEtapas] = useState<Ref[]>([]); const [vendedores, setVendedores] = useState<Ref[]>([]); const [territorios, setTerritorios] = useState<Ref[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [status, setStatus] = useState(""); const [frente, setFrente] = useState(""); const [vendedor, setVendedor] = useState(""); const [territorio, setTerritorio] = useState(""); const [uf, setUf] = useState("");
  const [gerando, setGerando] = useState(false);

  useEffect(() => {
    let vivo = true;
    (async () => {
      const supabase = createClient();
      const [e, v, t] = await Promise.all([
        supabase.from("funil_etapas").select("id, nome"), supabase.from("vendedores").select("id, nome"), supabase.from("territorios").select("id, nome"),
      ]);
      const mapa = new Map<string, Pick<Linha, "frentes" | "ultima_compra">>();
      const todos: Linha[] = [];
      for (let de = 0; ; de += 1000) {
        const { data } = await supabase.from("clientes").select("id, nome, razao_social, documento, cidade, uf, telefone, email, site, endereco, cep, status, origem, etapa_id, vendedor_id, territorio_id, porte").order("id").range(de, de + 999);
        todos.push(...((data ?? []) as unknown as Linha[]));
        if (!data || data.length < 1000) break;
      }
      for (let de = 0; ; de += 1000) {
        const { data } = await supabase.from("clientes_mapa").select("id, frentes, ultima_compra").order("id").range(de, de + 999);
        (data ?? []).forEach((m) => mapa.set(m.id, { frentes: m.frentes ?? [], ultima_compra: m.ultima_compra }));
        if (!data || data.length < 1000) break;
      }
      if (!vivo) return;
      setDados(todos.map((l) => ({ ...l, frentes: mapa.get(l.id)?.frentes ?? [], ultima_compra: mapa.get(l.id)?.ultima_compra ?? null })));
      setEtapas((e.data ?? []) as Ref[]); setVendedores((v.data ?? []) as Ref[]); setTerritorios((t.data ?? []) as Ref[]); setCarregando(false);
    })();
    return () => { vivo = false; };
  }, []);

  const ref = useMemo(() => ({ etapa: new Map(etapas.map((x) => [x.id, x.nome])), vend: new Map(vendedores.map((x) => [x.id, x.nome])), terr: new Map(territorios.map((x) => [x.id, x.nome])) }), [etapas, vendedores, territorios]);
  const ufs = useMemo(() => [...new Set(dados.map((d) => d.uf).filter(Boolean) as string[])].sort(), [dados]);
  const filtrados = useMemo(() => dados.filter((d) =>
    (!status || d.status === status) && (!frente || (frente === "nenhuma" ? d.frentes.length === 0 : d.frentes.includes(frente))) &&
    (!vendedor || (vendedor === "nenhum" ? !d.vendedor_id : d.vendedor_id === vendedor)) && (!territorio || d.territorio_id === territorio) && (!uf || d.uf === uf),
  ), [dados, status, frente, vendedor, territorio, uf]);

  const matriz = () => [COLUNAS.map(([t]) => t), ...filtrados.map((l) => COLUNAS.map(([, f]) => f(l, ref)))];
  const hoje = new Date().toLocaleDateString("sv-SE");

  function baixar(blob: Blob, nome: string) {
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = nome; a.click(); URL.revokeObjectURL(a.href);
  }
  function csv() {
    const esc = (v: unknown) => { const s = v == null ? "" : String(v); return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    baixar(new Blob(["﻿" + matriz().map((l) => l.map(esc).join(";")).join("\r\n")], { type: "text/csv;charset=utf-8" }), `clientes-buntech-${hoje}.csv`);
  }
  async function xlsx() {
    setGerando(true);
    const ExcelJS = (await import("exceljs")).default;
    const wb = new ExcelJS.Workbook(); const ws = wb.addWorksheet("Clientes");
    const m = matriz(); ws.addRows(m);
    ws.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0891D1" } };
    ws.views = [{ state: "frozen", ySplit: 1 }]; ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: COLUNAS.length } };
    ws.columns.forEach((c, i) => { c.width = [34, 34, 20, 20, 5, 36, 11, 16, 30, 30, 12, 18, 22, 10, 16, 24, 12, 28][i] ?? 16; });
    const buf = await wb.xlsx.writeBuffer();
    baixar(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), `clientes-buntech-${hoje}.xlsx`);
    setGerando(false);
  }

  const sel = "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm";
  if (carregando) return <p className="mt-8 text-slate-500">Carregando…</p>;
  return (
    <div className="mt-6 space-y-5 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <div className="grid gap-3 sm:grid-cols-2">
        <select className={sel} value={status} onChange={(e) => setStatus(e.target.value)}><option value="">Todas as situações</option><option value="carteira">Clientes</option><option value="prospect">Prospects</option><option value="perdido">Perdidos</option></select>
        <select className={sel} value={frente} onChange={(e) => setFrente(e.target.value)}><option value="">Todas as frentes</option><option value="pastagens">Pastagens</option><option value="grandes-culturas">Grandes Culturas</option><option value="nenhuma">Sem frente</option></select>
        <select className={sel} value={vendedor} onChange={(e) => setVendedor(e.target.value)}><option value="">Todos os vendedores</option><option value="nenhum">Sem vendedor</option>{vendedores.map((v) => <option key={v.id} value={v.id}>{v.nome}</option>)}</select>
        <select className={sel} value={territorio} onChange={(e) => setTerritorio(e.target.value)}><option value="">Todos os territórios</option>{territorios.map((v) => <option key={v.id} value={v.id}>{v.nome}</option>)}</select>
        <select className={sel} value={uf} onChange={(e) => setUf(e.target.value)}><option value="">Todos os estados</option>{ufs.map((u) => <option key={u}>{u}</option>)}</select>
      </div>
      <p className="text-sm text-slate-600"><strong>{filtrados.length}</strong> de {dados.length} clientes serão exportados.</p>
      <div className="flex gap-3">
        <button onClick={xlsx} disabled={gerando || !filtrados.length} className="rounded-lg bg-brand-blue px-5 py-2.5 font-semibold text-white hover:bg-brand-blue-dark disabled:opacity-40">{gerando ? "Gerando…" : "Baixar Excel (.xlsx)"}</button>
        <button onClick={csv} disabled={!filtrados.length} className="rounded-lg px-5 py-2.5 font-medium text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50 disabled:opacity-40">Baixar CSV</button>
      </div>
    </div>
  );
}
