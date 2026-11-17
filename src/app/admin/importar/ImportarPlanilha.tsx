"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { carregarMunicipios } from "@/lib/geo/municipios";
import { lerXlsx } from "@/lib/importacao/ler-xlsx";
import { montarImportacao, type Importacao } from "@/lib/importacao/planilha";

type Fase = "inicio" | "lendo" | "previa" | "gravando" | "ok" | "erro";

function lotes<T>(lista: T[], n = 200): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < lista.length; i += n) out.push(lista.slice(i, i + n));
  return out;
}

export function ImportarPlanilha() {
  const [fase, setFase] = useState<Fase>("inicio");
  const [imp, setImp] = useState<Importacao | null>(null);
  const [mensagem, setMensagem] = useState("");
  const [progresso, setProgresso] = useState("");

  async function aoEscolher(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    setFase("lendo");
    try {
      const [abas, idx] = await Promise.all([arquivo.arrayBuffer().then(lerXlsx), carregarMunicipios()]);
      if (!abas["Clientes"]) throw new Error('A planilha precisa ter a aba "Clientes".');
      setImp(montarImportacao(abas, idx, () => crypto.randomUUID(), new Date().toISOString().slice(0, 10)));
      setFase("previa");
    } catch (err) {
      setMensagem(err instanceof Error ? err.message : String(err));
      setFase("erro");
    }
  }

  async function gravar() {
    if (!imp) return;
    setFase("gravando");
    const supabase = createClient();
    try {
      const falha = (etapa: string, error: { message: string } | null) => {
        if (error) throw new Error(`${etapa}: ${error.message}`);
      };
      setProgresso("Carregando cadastros de apoio…");
      const [{ data: etapas }, { data: motivos }, { data: produtos }] = await Promise.all([
        supabase.from("funil_etapas").select("id, slug"),
        supabase.from("motivos_perda").select("id, nome"),
        supabase.from("produtos").select("id, nome"),
      ]);
      const etapaId = new Map((etapas ?? []).map((x) => [x.slug, x.id]));
      const motivoId = new Map((motivos ?? []).map((x) => [x.nome, x.id]));
      const produtoId = new Map((produtos ?? []).map((x) => [x.nome, x.id]));

      setProgresso("Gravando clientes…");
      for (const l of lotes(imp.clientes)) {
        const linhas = l.map(({ lat, lng, etapa, motivo_perda, ...c }) => ({
          ...c,
          etapa_id: etapa ? etapaId.get(etapa) ?? null : null,
          motivo_perda_id: motivo_perda ? motivoId.get(motivo_perda) ?? null : null,
          localizacao: lat != null && lng != null ? `SRID=4326;POINT(${lng} ${lat})` : null,
        }));
        const { error } = await supabase.from("clientes").insert(linhas);
        falha("Clientes", error);
      }
      setProgresso("Gravando unidades, contatos e pedidos…");
      for (const l of lotes(imp.unidades)) falha("Unidades", (await supabase.from("cliente_unidades").insert(l)).error);
      for (const l of lotes(imp.contatos)) falha("Contatos", (await supabase.from("contatos").insert(l)).error);
      for (const l of lotes(imp.pedidos))
        falha("Pedidos", (await supabase.from("pedidos").insert(l.map((p) => ({ ...p, produto_id: p.produto_nome ? produtoId.get(p.produto_nome) ?? null : null })))).error);
      for (const l of lotes(imp.vendas))
        falha("Vendas", (await supabase.from("vendas_anuais").insert(l.map((v) => ({ ...v, produto_id: v.produto_nome ? produtoId.get(v.produto_nome) ?? null : null })))).error);

      setProgresso("Definindo frentes…");
      for (const c of imp.clientes) falha("Frentes", (await supabase.rpc("sugerir_frentes", { cid: c.id })).error);
      const { data: pastagens } = await supabase.from("frentes").select("id").eq("slug", "pastagens").single();
      const { data: comFrente } = await supabase.from("cliente_frentes").select("cliente_id").in("cliente_id", imp.clientes.map((c) => c.id));
      const tem = new Set((comFrente ?? []).map((x) => x.cliente_id));
      const semFrente = imp.clientes.filter((c) => !tem.has(c.id));
      for (const l of lotes(semFrente))
        falha("Frentes", (await supabase.from("cliente_frentes").insert(l.map((c) => ({ cliente_id: c.id, frente_id: pastagens!.id, manual: true })))).error);

      setFase("ok");
    } catch (err) {
      setMensagem(
        (err instanceof Error ? err.message : String(err)) +
          " — Se parte dos dados chegou a ser gravada, avise antes de tentar de novo para evitar duplicados.",
      );
      setFase("erro");
    }
  }

  if (fase === "ok")
    return (
      <div className="mt-8 rounded-xl bg-teal-50 p-6 ring-1 ring-teal-200">
        <p className="font-semibold text-teal-900">Importação concluída ✔</p>
        <p className="mt-1 text-sm text-teal-800">{imp?.clientes.length} clientes gravados.</p>
        <a href="/mapa" className="mt-4 inline-block rounded-lg bg-brand-blue px-4 py-2 text-sm font-semibold text-white hover:bg-brand-blue-dark">
          Ver no mapa
        </a>
      </div>
    );

  return (
    <div className="mt-8 space-y-6">
      {(fase === "inicio" || fase === "erro") && (
        <label className="flex cursor-pointer flex-col items-center rounded-xl border-2 border-dashed border-slate-300 bg-white p-10 text-center hover:border-brand-blue">
          <span className="font-medium">Escolher planilha (.xlsx)</span>
          <span className="mt-1 text-sm text-slate-500">Abas: Clientes, 2º Cadastro, Contatos, Histórico de vendas, Pedidos</span>
          <input type="file" accept=".xlsx" onChange={aoEscolher} className="sr-only" />
        </label>
      )}
      {fase === "lendo" && <p className="text-slate-500">Lendo planilha…</p>}
      {fase === "gravando" && <p className="text-slate-600">{progresso || "Gravando…"}</p>}
      {fase === "erro" && <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">{mensagem}</p>}

      {fase === "previa" && imp && (
        <>
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {[
              ["Clientes", imp.clientes.length], ["Unidades/CNPJs", imp.unidades.length], ["Contatos", imp.contatos.length],
              ["Pedidos", imp.pedidos.length], ["Vendas anuais", imp.vendas.length],
            ].map(([t, n]) => (
              <div key={t} className="rounded-xl bg-white p-4 text-center shadow-sm ring-1 ring-slate-200">
                <p className="text-2xl font-semibold text-brand-blue">{n}</p>
                <p className="text-xs text-slate-500">{t}</p>
              </div>
            ))}
          </section>

          <Aviso titulo="Localizados só pela cidade (ponto aproximado)" itens={imp.relatorio.localizacaoPelaCidade} />
          <Aviso titulo="Sem localização — não aparecem no mapa até você posicionar" itens={imp.relatorio.semLocalizacao} forte />
          <Aviso titulo="CNPJ/CPF repetido em outro cliente (não gravado neste)" itens={imp.relatorio.documentoDuplicado} />
          <Aviso titulo="CNPJ/CPF inválido (ignorado)" itens={imp.relatorio.documentoInvalido} />
          <Aviso titulo="Criados a partir do histórico de vendas" itens={imp.relatorio.criadosDoHistorico} />
          <Aviso titulo="Linhas de outras abas sem cliente correspondente" itens={imp.relatorio.naoEncontrados} forte />

          <div className="flex gap-3">
            <button onClick={gravar} className="rounded-lg bg-brand-blue px-5 py-2.5 font-semibold text-white hover:bg-brand-blue-dark">
              Confirmar e gravar {imp.clientes.length} clientes
            </button>
            <button onClick={() => { setImp(null); setFase("inicio"); }} className="rounded-lg px-4 py-2.5 text-slate-600 ring-1 ring-slate-300 hover:bg-slate-50">
              Cancelar
            </button>
          </div>
          <p className="text-xs text-slate-400">Importar a mesma planilha duas vezes duplica os clientes: use apenas na carga inicial.</p>
        </>
      )}
    </div>
  );
}

function Aviso({ titulo, itens, forte }: { titulo: string; itens: string[]; forte?: boolean }) {
  if (!itens.length) return null;
  return (
    <details className={`rounded-xl p-4 text-sm ring-1 ${forte ? "bg-amber-50 ring-amber-200" : "bg-white ring-slate-200"}`}>
      <summary className="cursor-pointer font-medium">{titulo} ({itens.length})</summary>
      <ul className="mt-2 list-disc space-y-0.5 pl-5 text-slate-600">{itens.map((i) => <li key={i}>{i}</li>)}</ul>
    </details>
  );
}
