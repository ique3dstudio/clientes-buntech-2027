"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { distanciaKm } from "@/lib/geo/municipios";
import { geocodificar } from "@/lib/geo/consultas";
import { formatarDocumento } from "@/lib/documento";
import { formatarTelefone } from "@/lib/enriquecimento";

type Alvo = {
  id: string; nome: string; razao_social: string | null; documento: string | null; site: string | null; email: string | null;
  telefone: string | null; endereco: string | null; cidade: string | null; uf: string | null; localizacao_precisao: string;
  lat: number | null; lng: number | null; municipio_ibge: string | null;
};
type Registro = { id: string; texto: string; tom: "ok" | "aviso" | "erro" };

const CONFIANCA_MINIMA_CNPJ = 1.0; // nome parecido (1.0) e/ou nome + UF/cidade

export function EnriquecerEmLote() {
  const [fila, setFila] = useState<Alvo[] | null>(null);
  const [rodando, setRodando] = useState(false);
  const [feitos, setFeitos] = useState(0);
  const [log, setLog] = useState<Registro[]>([]);
  const [semChave, setSemChave] = useState(false);
  const [total, setTotal] = useState({ cnpj: 0, site: 0, email: 0, telefone: 0, local: 0 });
  const parar = useRef(false);

  async function carregarFila() {
    const supabase = createClient();
    const todos: Alvo[] = [];
    for (let de = 0; ; de += 1000) {
      const { data } = await supabase
        .from("clientes_mapa")
        .select("id, nome, razao_social, documento, cidade, uf, localizacao_precisao, lat, lng")
        .neq("status", "perdido").order("id").range(de, de + 999);
      todos.push(...((data ?? []) as unknown as Alvo[]));
      if (!data || data.length < 1000) break;
    }
    // campos que não estão na view
    const ids = todos.map((t) => t.id);
    const extra = new Map<string, Pick<Alvo, "site" | "email" | "telefone" | "endereco" | "municipio_ibge">>();
    for (let i = 0; i < ids.length; i += 200) {
      const { data } = await supabase.from("clientes").select("id, site, email, telefone, endereco, municipio_ibge").in("id", ids.slice(i, i + 200));
      (data ?? []).forEach((d) => extra.set(d.id, d));
    }
    const completos = todos.map((t) => ({ ...t, ...(extra.get(t.id) ?? { site: null, email: null, telefone: null, endereco: null, municipio_ibge: null }) }));
    setFila(completos.filter((c) => !c.documento || !c.site || !c.email || !c.telefone || (c.localizacao_precisao === "cidade" && c.endereco)));
  }

  async function rodar() {
    if (!fila) return;
    setRodando(true); parar.current = false; setFeitos(0); setLog([]); setSemChave(false);
    const supabase = createClient();
    const adicionar = (r: Registro) => setLog((l) => [r, ...l].slice(0, 200));

    for (let i = 0; i < fila.length && !parar.current; i++) {
      const c = fila[i];
      const mudancas: Record<string, unknown> = {};
      const fontes: string[] = [];
      try {
        // 1) internet + Receita
        if (!semChave && (!c.documento || !c.site || !c.email || !c.telefone)) {
          const r = await fetch("/api/enriquecer", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nome: c.nome, razao_social: c.razao_social ?? "", cidade: c.cidade ?? "", uf: c.uf ?? "", documento: c.documento ?? "" }),
          });
          if (r.status === 501) { setSemChave(true); }
          else if (r.ok) {
            const j = await r.json();
            if (!c.site && j.sites?.[0]) { mudancas.site = j.sites[0].url; fontes.push("site"); }
            if (!c.email && j.emails?.[0]) { mudancas.email = j.emails[0]; fontes.push("e-mail"); }
            if (!c.telefone && j.telefones?.[0]) { mudancas.telefone = formatarTelefone(j.telefones[0]); fontes.push("telefone"); }
            if (!c.documento && j.cnpj && j.cnpj.confianca >= CONFIANCA_MINIMA_CNPJ) {
              mudancas.documento = j.cnpj.numero; fontes.push(`CNPJ ${formatarDocumento(j.cnpj.numero)} (${j.cnpj.razao_social}, situação ${j.cnpj.situacao})`);
              if (!c.razao_social && j.cnpj.razao_social) mudancas.razao_social = j.cnpj.razao_social;
              if (!c.telefone && !mudancas.telefone && j.cnpj.telefone) mudancas.telefone = formatarTelefone(j.cnpj.telefone);
              if (!c.email && !mudancas.email && j.cnpj.email) mudancas.email = String(j.cnpj.email).toLowerCase();
            }
          }
        }
        // 2) endereço → posição exata (só aceita se cair perto da cidade já registrada)
        if (c.localizacao_precisao === "cidade" && c.endereco && c.cidade && c.lat != null && c.lng != null) {
          const achados = await geocodificar([c.endereco, c.cidade, c.uf, "Brasil"].filter(Boolean).join(", "));
          const bom = achados.find((a) => distanciaKm(a.lat, a.lng, c.lat!, c.lng!) < 30);
          if (bom) { mudancas.localizacao = `SRID=4326;POINT(${bom.lng} ${bom.lat})`; mudancas.localizacao_precisao = "exata"; fontes.push("posição pelo endereço"); }
          await new Promise((res) => setTimeout(res, 1100)); // limite do serviço de endereços: 1 consulta por segundo
        }
        if (Object.keys(mudancas).length) {
          const { error } = await supabase.from("clientes").update(mudancas).eq("id", c.id);
          if (error) throw error;
          await supabase.from("interacoes").insert({ cliente_id: c.id, tipo: "nota", descricao: `Dados completados automaticamente pela internet: ${fontes.join("; ")}.`, autor_nome: "Enriquecimento automático" });
          setTotal((t) => ({ cnpj: t.cnpj + (mudancas.documento ? 1 : 0), site: t.site + (mudancas.site ? 1 : 0), email: t.email + (mudancas.email ? 1 : 0), telefone: t.telefone + (mudancas.telefone ? 1 : 0), local: t.local + (mudancas.localizacao ? 1 : 0) }));
          adicionar({ id: c.id, texto: `${c.nome}: ${fontes.join(" · ")}`, tom: "ok" });
        }
      } catch (e) {
        adicionar({ id: c.id, texto: `${c.nome}: ${e instanceof Error ? e.message : (e as { message?: string }).message ?? "falhou"}`, tom: "erro" });
      }
      setFeitos(i + 1);
    }
    setRodando(false);
  }

  return (
    <div className="mt-6 space-y-5">
      {!fila && (
        <button onClick={carregarFila} className="rounded-lg bg-brand-blue px-5 py-2.5 font-semibold text-white hover:bg-brand-blue-dark">
          Ver quantos clientes têm dados faltando
        </button>
      )}
      {fila && (
        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <p className="text-lg font-semibold">{fila.length} clientes com dados faltando</p>
          <p className="mt-1 text-sm text-slate-500">
            Sem CNPJ: {fila.filter((c) => !c.documento).length} · sem site: {fila.filter((c) => !c.site).length} · sem e-mail: {fila.filter((c) => !c.email).length} ·
            sem telefone: {fila.filter((c) => !c.telefone).length} · posição só pela cidade (com endereço): {fila.filter((c) => c.localizacao_precisao === "cidade" && c.endereco).length}
          </p>
          <div className="mt-4 flex items-center gap-3">
            {!rodando ? (
              <button onClick={rodar} disabled={!fila.length} className="rounded-lg bg-brand-blue px-5 py-2.5 font-semibold text-white hover:bg-brand-blue-dark disabled:opacity-40">
                Completar automaticamente
              </button>
            ) : (
              <button onClick={() => (parar.current = true)} className="rounded-lg px-5 py-2.5 font-medium text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50">Parar</button>
            )}
            {(rodando || feitos > 0) && <span className="text-sm text-slate-600">{feitos} de {fila.length}</span>}
          </div>
          {(rodando || feitos > 0) && (
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-gradient-to-r from-brand-blue to-brand-teal transition-all" style={{ width: `${(feitos / fila.length) * 100}%` }} /></div>
          )}
          {feitos > 0 && <p className="mt-3 text-sm text-slate-600">Preenchidos: {total.cnpj} CNPJ · {total.site} sites · {total.email} e-mails · {total.telefone} telefones · {total.local} posições exatas</p>}
          {semChave && <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 ring-1 ring-amber-200">A pesquisa na internet não está ativada (falta a chave FIRECRAWL_API_KEY na Vercel). Foi feito só o que não precisa dela: a posição exata pelo endereço.</p>}
        </div>
      )}
      {log.length > 0 && (
        <ul className="max-h-96 space-y-1 overflow-auto rounded-xl bg-white p-4 text-sm shadow-sm ring-1 ring-slate-200">
          {log.map((l, i) => <li key={l.id + i} className={l.tom === "erro" ? "text-red-600" : "text-slate-700"}>{l.tom === "ok" ? "✔ " : "✖ "}{l.texto}</li>)}
        </ul>
      )}
    </div>
  );
}
