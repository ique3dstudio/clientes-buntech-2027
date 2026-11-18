"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { dataBr } from "@/lib/formato";

type Tarefa = { id: string; titulo: string; vencimento: string | null; concluida_em: string | null; cliente_id: string | null; clientes: { nome: string } | null };
type Opcao = { id: string; nome: string };

const hojeIso = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);

export function ListaTarefas({ userId, podeCriar }: { userId: string; podeCriar: boolean }) {
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [clientes, setClientes] = useState<Opcao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [titulo, setTitulo] = useState("");
  const [vencimento, setVencimento] = useState(hojeIso());
  const [clienteTxt, setClienteTxt] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [versao, setVersao] = useState(0);

  useEffect(() => {
    let vivo = true;
    (async () => {
      const supabase = createClient();
      const [t, c] = await Promise.all([
        supabase.from("tarefas").select("id, titulo, vencimento, concluida_em, cliente_id, clientes(nome)").eq("responsavel_id", userId).order("vencimento", { nullsFirst: false }),
        clientes.length ? Promise.resolve({ data: null }) : supabase.from("clientes").select("id, nome").order("nome").limit(2000),
      ]);
      if (!vivo) return;
      setTarefas((t.data ?? []) as unknown as Tarefa[]);
      if (c.data) setClientes(c.data as Opcao[]);
      setCarregando(false);
    })();
    return () => { vivo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, versao]);

  const hoje = hojeIso();
  const grupos = useMemo(() => {
    const abertas = tarefas.filter((t) => !t.concluida_em);
    return {
      atrasadas: abertas.filter((t) => t.vencimento && t.vencimento < hoje),
      hoje: abertas.filter((t) => t.vencimento === hoje),
      proximas: abertas.filter((t) => t.vencimento && t.vencimento > hoje),
      semData: abertas.filter((t) => !t.vencimento),
      concluidas: tarefas.filter((t) => t.concluida_em).sort((a, b) => (b.concluida_em! > a.concluida_em! ? 1 : -1)).slice(0, 10),
    };
  }, [tarefas, hoje]);

  async function criar(e: React.FormEvent) {
    e.preventDefault();
    if (!titulo.trim()) return;
    setErro(null);
    const cliente = clienteTxt ? clientes.find((c) => c.nome.toLowerCase() === clienteTxt.trim().toLowerCase()) : null;
    if (clienteTxt && !cliente) return setErro("Escolha um cliente da lista (ou deixe em branco).");
    const { error } = await createClient().from("tarefas").insert({ titulo: titulo.trim(), vencimento: vencimento || null, cliente_id: cliente?.id ?? null });
    if (error) return setErro(error.message);
    setTitulo(""); setClienteTxt(""); setVersao((v) => v + 1);
  }

  async function alternar(t: Tarefa) {
    const { error } = await createClient().from("tarefas").update({ concluida_em: t.concluida_em ? null : new Date().toISOString() }).eq("id", t.id);
    if (error) return setErro(error.message);
    setVersao((v) => v + 1);
  }

  async function excluir(t: Tarefa) {
    const { error } = await createClient().from("tarefas").delete().eq("id", t.id);
    if (error) return setErro(error.message);
    setVersao((v) => v + 1);
  }

  const linha = (t: Tarefa, tom?: string) => (
    <li key={t.id} className="flex items-start gap-3 py-2.5">
      <input type="checkbox" checked={Boolean(t.concluida_em)} onChange={() => alternar(t)} className="mt-1 size-4 accent-brand-blue" aria-label="Concluir" />
      <div className="min-w-0 flex-1">
        <p className={`text-sm ${t.concluida_em ? "text-slate-400 line-through" : "text-slate-800"}`}>{t.titulo}</p>
        <p className="text-xs text-slate-500">
          {t.clientes && <Link href={`/clientes/${t.cliente_id}`} className="text-brand-blue hover:underline">{t.clientes.nome}</Link>}
          {t.clientes && t.vencimento && " · "}
          {t.vencimento && <span className={tom}>{dataBr(t.vencimento)}</span>}
        </p>
      </div>
      <button onClick={() => excluir(t)} className="text-xs text-slate-400 hover:text-red-600" aria-label="Excluir tarefa">Excluir</button>
    </li>
  );

  const bloco = (nome: string, lista: Tarefa[], tom?: string, vazio?: string) => (
    <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{nome} ({lista.length})</h2>
      {lista.length === 0 ? <p className="mt-2 text-sm text-slate-400">{vazio ?? "Nada por aqui."}</p> : <ul className="mt-1 divide-y divide-slate-100">{lista.map((t) => linha(t, tom))}</ul>}
    </section>
  );

  if (carregando) return <p className="mt-8 text-slate-500">Carregando…</p>;

  return (
    <div className="mt-6 space-y-5">
      {podeCriar && (
        <form onSubmit={criar} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <div className="grid gap-3 sm:grid-cols-[1fr_160px]">
            <input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Nova tarefa (ex.: ligar para o dono, levar amostra)" className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-blue" />
            <input type="date" value={vencimento} onChange={(e) => setVencimento(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div className="mt-3 flex flex-wrap gap-3">
            <input list="clientes-lista" value={clienteTxt} onChange={(e) => setClienteTxt(e.target.value)} placeholder="Cliente (opcional)" className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-blue" />
            <datalist id="clientes-lista">{clientes.map((c) => <option key={c.id} value={c.nome} />)}</datalist>
            <button disabled={!titulo.trim()} className="rounded-lg bg-brand-blue px-5 py-2 text-sm font-semibold text-white hover:bg-brand-blue-dark disabled:opacity-40">Adicionar</button>
          </div>
          {erro && <p className="mt-2 text-sm text-red-600">{erro}</p>}
        </form>
      )}
      {bloco("Atrasadas", grupos.atrasadas, "font-medium text-red-600", "Nenhuma atrasada. 👏")}
      {bloco("Hoje", grupos.hoje, "font-medium text-brand-blue", "Nada marcado para hoje.")}
      {bloco("Próximas", grupos.proximas)}
      {grupos.semData.length > 0 && bloco("Sem data", grupos.semData)}
      {grupos.concluidas.length > 0 && bloco("Concluídas recentemente", grupos.concluidas)}
    </div>
  );
}
