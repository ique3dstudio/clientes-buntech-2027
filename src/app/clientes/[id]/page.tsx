import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getUsuario } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Cabecalho } from "@/components/Cabecalho";
import { Carregando } from "@/components/Carregando";
import { AguardandoAprovacao } from "@/components/AguardandoAprovacao";
import { COR_FRENTE, COR_STATUS, ROTULO_STATUS, mesesSemComprar } from "@/lib/clientes";
import { brl, dataBr, dataHoraBr, linkWhatsapp, toneladas } from "@/lib/formato";
import { formatarDocumento } from "@/lib/documento";
import { resumoPorAno, resumoPorProduto, type Pedido, type VendaAnual } from "@/lib/vendas";
import { NovaInteracao } from "./NovaInteracao";

export const metadata: Metadata = { title: "Ficha do cliente" };

export default function FichaPage({ params }: PageProps<"/clientes/[id]">) {
  return (
    <Suspense fallback={<Carregando />}>
      <Ficha params={params} />
    </Suspense>
  );
}

const ROTULO_INTERACAO: Record<string, string> = {
  nota: "Anotação", ligacao: "Ligação", whatsapp: "WhatsApp", email: "E-mail", visita: "Visita", reuniao: "Reunião", amostra: "Amostra",
};

async function Ficha({ params }: { params: PageProps<"/clientes/[id]">["params"] }) {
  const { id } = await params;
  const usuario = await getUsuario();
  if (usuario.papel === "pendente") return <AguardandoAprovacao nome={usuario.nome} />;
  const supabase = await createClient();

  const { data: c } = await supabase
    .from("clientes")
    .select("*, funil_etapas(nome, cor), motivos_perda(nome), vendedores(nome), territorios(nome, cor)")
    .eq("id", id)
    .maybeSingle();
  if (!c) notFound();

  const [mapa, ct, un, pd, vd, it] = await Promise.all([
    supabase.from("clientes_mapa").select("lat, lng, frentes, ultima_compra").eq("id", id).single(),
    supabase.from("contatos").select("id, nome, cargo, telefone, email, principal").eq("cliente_id", id).order("principal", { ascending: false }),
    supabase.from("cliente_unidades").select("id, codigo_totvs, loja, razao_social, documento, cidade, uf, principal").eq("cliente_id", id).order("principal", { ascending: false }),
    supabase.from("pedidos").select("id, data, produto_nome, quantidade, unidade, valor_total, tipo").eq("cliente_id", id).order("data", { ascending: false }),
    supabase.from("vendas_anuais").select("ano, periodo, produto_nome, quantidade, faturamento").eq("cliente_id", id),
    supabase.from("interacoes").select("id, tipo, data, descricao, autor_nome").eq("cliente_id", id).order("data", { ascending: false }).limit(50),
  ]);

  const pedidos = (pd.data ?? []) as Pedido[];
  const vendas = (vd.data ?? []) as VendaAnual[];
  const anos = resumoPorAno(vendas, pedidos);
  const produtos = resumoPorProduto(vendas);
  const total = anos.reduce((s, a) => s + a.faturamento, 0);
  const totalT = anos.reduce((s, a) => s + a.toneladas, 0);
  const maxFat = Math.max(1, ...anos.map((a) => a.faturamento));
  const ultima = mapa.data?.ultima_compra ?? null;
  const meses = mesesSemComprar(ultima);
  const frentes: string[] = mapa.data?.frentes ?? [];
  const podeEditar = usuario.papel !== "leitura";
  const etapa = c.funil_etapas as { nome: string; cor: string } | null;
  const terr = c.territorios as { nome: string; cor: string } | null;

  return (
    <>
      <Cabecalho usuario={usuario} />
      <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 py-8 sm:px-6">
        {/* Cabeçalho */}
        <header className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <Link href="/mapa" className="text-sm text-brand-blue hover:underline">← Voltar ao mapa</Link>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight">{c.nome}</h1>
              {c.razao_social && <p className="text-sm text-slate-500">{c.razao_social}</p>}
              <p className="mt-1 text-sm text-slate-600">{[c.cidade, c.uf].filter(Boolean).join(" / ") || "Local não informado"}</p>
            </div>
            <div className="flex gap-2">
              {mapa.data?.lat != null && (
                <Link href={`/mapa?c=${id}`} className="rounded-lg px-3 py-2 text-sm font-medium text-brand-blue ring-1 ring-brand-blue/40 hover:bg-sky-50">Ver no mapa</Link>
              )}
              {podeEditar && (
                <Link href={`/clientes/${id}/editar`} className="rounded-lg bg-brand-blue px-3 py-2 text-sm font-semibold text-white hover:bg-brand-blue-dark">Editar</Link>
              )}
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full px-2.5 py-1 font-medium text-white" style={{ background: COR_STATUS[c.status as keyof typeof COR_STATUS] }}>{ROTULO_STATUS[c.status as keyof typeof ROTULO_STATUS]}</span>
            {etapa && <span className="rounded-full px-2.5 py-1 font-medium text-white" style={{ background: etapa.cor }}>{etapa.nome}</span>}
            {frentes.map((f) => (
              <span key={f} className="rounded-full px-2.5 py-1 font-medium text-white" style={{ background: f === "pastagens" ? COR_FRENTE.pastagens : COR_FRENTE["grandes-culturas"] }}>
                {f === "pastagens" ? "Pastagens" : "Grandes Culturas"}
              </span>
            ))}
            {c.porte && <span className="rounded-full bg-slate-100 px-2.5 py-1">{c.porte}</span>}
            {terr && <span className="rounded-full px-2.5 py-1 ring-1" style={{ color: terr.cor, borderColor: terr.cor }}>Território {terr.nome}</span>}
            {c.vendedores && <span className="rounded-full bg-slate-100 px-2.5 py-1">Vendedor: {(c.vendedores as { nome: string }).nome}</span>}
          </div>
          {c.status === "perdido" && c.motivos_perda && (
            <p className="mt-3 rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700">Motivo da perda: <strong>{(c.motivos_perda as { nome: string }).nome}</strong></p>
          )}
          {c.alerta_financeiro && <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 ring-1 ring-amber-200">⚠ {c.alerta_financeiro}</p>}
        </header>

        {/* Indicadores */}
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <Indicador t="Faturamento total" v={brl(total)} />
          <Indicador t="Volume total" v={toneladas(totalT)} />
          <Indicador t="Última compra" v={dataBr(ultima)} sub={meses != null ? `${meses} ${meses === 1 ? "mês" : "meses"} atrás` : undefined} alerta={meses != null && meses >= 6} />
          <Indicador t="Ritmo" v={c.ritmo_ton_mes != null ? `${c.ritmo_ton_mes} t/mês` : "—"} />
          <Indicador t="Potencial" v={c.potencial_ton_ano != null ? `${c.potencial_ton_ano} t/ano` : "—"} />
        </section>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            {/* Vendas por ano */}
            <Cartao titulo="Vendas por ano">
              {anos.length === 0 ? <Vazio texto="Sem vendas registradas." /> : (
                <>
                  <div className="flex items-end gap-4" role="img" aria-label="Faturamento por ano">
                    {anos.map((a) => (
                      <div key={a.ano} className="flex flex-1 flex-col items-center gap-1">
                        <span className="text-xs text-slate-500">{brl(a.faturamento)}</span>
                        <div className="w-full rounded-t-md bg-gradient-to-t from-brand-blue to-brand-teal" style={{ height: `${Math.max(4, (a.faturamento / maxFat) * 120)}px` }} />
                        <span className="text-sm font-medium">{a.ano}</span>
                        <span className="text-xs text-slate-400">{toneladas(a.toneladas)}</span>
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 text-xs text-slate-400">2026 = histórico de janeiro a julho + pedidos feitos depois.</p>
                </>
              )}
            </Cartao>

            {produtos.linhas.length > 0 && (
              <Cartao titulo="Produtos comprados (histórico)">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left text-xs text-slate-500">
                      <tr><th className="pb-2 pr-3">Produto</th>{produtos.anos.map((a) => <th key={a} className="pb-2 pr-3 text-right">{a}</th>)}<th className="pb-2 text-right">Total</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {produtos.linhas.map((l) => (
                        <tr key={l.produto}>
                          <td className="py-1.5 pr-3">{l.produto}</td>
                          {produtos.anos.map((a) => <td key={a} className="py-1.5 pr-3 text-right text-slate-600">{l.porAno[a] ? toneladas(l.porAno[a].qtd) : "—"}</td>)}
                          <td className="py-1.5 text-right font-medium">{brl(l.valor)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Cartao>
            )}

            <Cartao titulo={`Pedidos (${pedidos.length})`}>
              {pedidos.length === 0 ? <Vazio texto="Nenhum pedido registrado." /> : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left text-xs text-slate-500"><tr><th className="pb-2 pr-3">Data</th><th className="pb-2 pr-3">Produto</th><th className="pb-2 pr-3 text-right">Qtd</th><th className="pb-2 text-right">Valor</th></tr></thead>
                    <tbody className="divide-y divide-slate-100">
                      {pedidos.map((p, i) => (
                        <tr key={p.id ?? i}>
                          <td className="py-1.5 pr-3 whitespace-nowrap">{dataBr(p.data)}</td>
                          <td className="py-1.5 pr-3">{p.produto_nome}</td>
                          <td className="py-1.5 pr-3 text-right whitespace-nowrap">{p.quantidade} {p.unidade}</td>
                          <td className="py-1.5 text-right whitespace-nowrap">{brl(p.valor_total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Cartao>

            <Cartao titulo="Histórico de contatos">
              {podeEditar && <div className="mb-4"><NovaInteracao clienteId={id} autor={usuario.nome} /></div>}
              {(it.data ?? []).length === 0 ? <Vazio texto="Nenhum contato registrado ainda." /> : (
                <ol className="space-y-3 border-l-2 border-slate-200 pl-4">
                  {(it.data ?? []).map((i) => (
                    <li key={i.id}>
                      <p className="text-xs text-slate-500"><strong className="text-slate-700">{ROTULO_INTERACAO[i.tipo] ?? i.tipo}</strong> · {dataHoraBr(i.data)}{i.autor_nome ? ` · ${i.autor_nome}` : ""}</p>
                      <p className="whitespace-pre-line text-sm">{i.descricao}</p>
                    </li>
                  ))}
                </ol>
              )}
            </Cartao>
          </div>

          <div className="space-y-6">
            <Cartao titulo="Contatos">
              {(ct.data ?? []).length === 0 ? <Vazio texto="Nenhum contato cadastrado." /> : (
                <ul className="space-y-3 text-sm">
                  {(ct.data ?? []).map((p) => {
                    const zap = p.telefone ? linkWhatsapp(p.telefone) : null;
                    return (
                      <li key={p.id}>
                        <p className="font-medium">{p.nome ?? "—"}{p.cargo && <span className="font-normal text-slate-500"> · {p.cargo}</span>}</p>
                        {p.telefone && (
                          <p>
                            <a className="text-brand-blue hover:underline" href={`tel:${p.telefone.replace(/\D/g, "")}`}>{p.telefone}</a>
                            {zap && <a className="ml-2 text-xs text-teal-700 hover:underline" href={zap} target="_blank" rel="noreferrer">WhatsApp</a>}
                          </p>
                        )}
                        {p.email && <p><a className="text-brand-blue hover:underline" href={`mailto:${p.email}`}>{p.email}</a></p>}
                      </li>
                    );
                  })}
                </ul>
              )}
            </Cartao>

            <Cartao titulo="Dados do cliente">
              <dl className="space-y-2 text-sm">
                <Linha t="CNPJ/CPF" v={c.documento ? formatarDocumento(c.documento) : null} />
                <Linha t="Site" v={c.site} link={c.site ? (c.site.startsWith("http") ? c.site : `https://${c.site}`) : undefined} />
                <Linha t="E-mail" v={c.email} link={c.email ? `mailto:${c.email}` : undefined} />
                <Linha t="Telefone" v={c.telefone} />
                <Linha t="Endereço da unidade" v={c.endereco} />
                <Linha t="CEP" v={c.cep} />
                <Linha t="Equipamento" v={c.equipamento} />
                <Linha t="Condição de pagamento" v={c.condicao_pagamento} />
                <Linha t="Origem" v={c.origem} />
                <Linha t="Cadastrado em" v={dataBr(c.cadastrado_em)} />
                {c.localizacao_precisao === "cidade" && <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 ring-1 ring-amber-200">Local aproximado (centro da cidade). Edite para marcar a unidade de produção.</p>}
              </dl>
            </Cartao>

            {(un.data ?? []).length > 0 && (
              <Cartao titulo="Cadastros no TOTVS">
                <ul className="space-y-3 text-sm">
                  {(un.data ?? []).map((u) => (
                    <li key={u.id}>
                      <p className="font-medium">{u.razao_social ?? "—"}{u.principal && <span className="ml-2 rounded bg-teal-50 px-1.5 py-0.5 text-xs font-normal text-teal-800">principal</span>}</p>
                      <p className="text-slate-500">{[u.codigo_totvs && `Cód. ${u.codigo_totvs}`, u.loja && `Loja ${u.loja}`, u.documento && formatarDocumento(u.documento)].filter(Boolean).join(" · ")}</p>
                    </li>
                  ))}
                </ul>
              </Cartao>
            )}

            {c.observacoes && (
              <Cartao titulo="Observações"><p className="whitespace-pre-line text-sm text-slate-700">{c.observacoes}</p></Cartao>
            )}
          </div>
        </div>
      </main>
    </>
  );
}

function Indicador({ t, v, sub, alerta }: { t: string; v: string; sub?: string; alerta?: boolean }) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <p className="text-xs text-slate-500">{t}</p>
      <p className="mt-1 text-xl font-semibold">{v}</p>
      {sub && <p className={`text-xs ${alerta ? "text-amber-600" : "text-slate-400"}`}>{sub}</p>}
    </div>
  );
}

function Cartao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <h2 className="mb-3 text-base font-semibold">{titulo}</h2>
      {children}
    </section>
  );
}

const Vazio = ({ texto }: { texto: string }) => <p className="text-sm text-slate-400">{texto}</p>;

function Linha({ t, v, link }: { t: string; v: string | null | undefined; link?: string }) {
  if (!v) return null;
  return (
    <div>
      <dt className="text-xs text-slate-400">{t}</dt>
      <dd className="break-words">{link ? <a href={link} className="text-brand-blue hover:underline" target="_blank" rel="noreferrer">{v}</a> : v}</dd>
    </div>
  );
}
