import Link from "next/link";
import type { DadosPainel } from "@/lib/painel-dados";

export const reais = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export function Kpi({ rotulo, valor, detalhe }: { rotulo: string; valor: string | number; detalhe?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{rotulo}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{valor}</p>
      {detalhe && <p className="mt-0.5 text-xs text-slate-500">{detalhe}</p>}
    </div>
  );
}

export function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="break-inside-avoid rounded-xl border border-slate-200 bg-white p-4">
      <h2 className="mb-3 text-sm font-semibold text-slate-900">{titulo}</h2>
      {children}
    </section>
  );
}

function Barra({ pct, cor }: { pct: number; cor: string }) {
  return (
    <div className="h-2.5 w-full rounded-full bg-slate-100">
      <div className="h-full rounded-full" style={{ width: `${Math.min(100, Math.max(0, pct))}%`, background: cor }} />
    </div>
  );
}

export function BlocosPainel({ d, links = true }: { d: DadosPainel; links?: boolean }) {
  const s = d.situacao;
  const maxFunil = Math.max(1, ...d.funil.map((f) => f.n));
  const maxFat = Math.max(1, ...d.faturamento.map((f) => f.faturamento));
  const maxTop = Math.max(1, ...d.top.map((t) => t.valor));
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Kpi rotulo="Cadastros" valor={s.total} />
        <Kpi rotulo="Clientes" valor={s.carteira} detalhe="na carteira" />
        <Kpi rotulo="Prospects" valor={s.prospect} />
        <Kpi rotulo="Perdidos" valor={s.perdido} />
        <Kpi rotulo="Sem localização" valor={s.semLocal} detalhe={`${s.aproximado} aproximados`} />
        <Kpi rotulo="Tarefas atrasadas" valor={d.tarefasAtrasadas} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Secao titulo="Funil de vendas">
          <ul className="space-y-2">
            {d.funil.map((f) => (
              <li key={f.chave} className="grid grid-cols-[8rem_1fr_3rem] items-center gap-3 text-sm">
                <span className="truncate text-slate-700">{f.nome}</span>
                <Barra pct={(f.n / maxFunil) * 100} cor={f.cor} />
                <span className="text-right tabular-nums text-slate-900">{f.n}</span>
              </li>
            ))}
          </ul>
        </Secao>

        <Secao titulo="Faturamento por ano">
          {d.faturamento.length === 0 ? (
            <p className="text-sm text-slate-500">Sem vendas registradas.</p>
          ) : (
            <ul className="space-y-2">
              {d.faturamento.map((f) => (
                <li key={f.ano} className="grid grid-cols-[3rem_1fr_7rem] items-center gap-3 text-sm">
                  <span className="text-slate-700">{f.ano}</span>
                  <Barra pct={(f.faturamento / maxFat) * 100} cor="#0891d1" />
                  <span className="text-right tabular-nums text-slate-900">{reais(f.faturamento)}</span>
                </li>
              ))}
            </ul>
          )}
        </Secao>
      </div>

      <Secao titulo="Cobertura por território (clientes e prospects com ao menos uma visita)">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="py-2 pr-3">Território</th>
                <th className="pr-3">Responsável</th>
                <th className="pr-3 text-right">Cadastros</th>
                <th className="pr-3 text-right">Clientes</th>
                <th className="pr-3 text-right">Prospects</th>
                <th className="pr-3 text-right">Visitados</th>
                <th className="w-40">Cobertura</th>
              </tr>
            </thead>
            <tbody>
              {d.territorios.map((t) => (
                <tr key={t.id ?? "fora"} className="border-b border-slate-100 last:border-0">
                  <td className="py-2 pr-3">
                    <span className="mr-2 inline-block size-2.5 rounded-full align-middle" style={{ background: t.cor }} />
                    {t.nome}
                  </td>
                  <td className="pr-3 text-slate-600">{t.vendedor ?? "—"}</td>
                  <td className="pr-3 text-right tabular-nums">{t.clientes}</td>
                  <td className="pr-3 text-right tabular-nums">{t.carteira}</td>
                  <td className="pr-3 text-right tabular-nums">{t.prospects}</td>
                  <td className="pr-3 text-right tabular-nums">{t.visitados}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <Barra pct={t.cobertura} cor={t.cor} />
                      <span className="w-9 text-right text-xs tabular-nums">{t.cobertura}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Secao>

      <div className="grid gap-4 lg:grid-cols-2">
        <Secao titulo="Maiores clientes (faturamento acumulado)">
          {d.top.length === 0 ? (
            <p className="text-sm text-slate-500">Sem vendas registradas.</p>
          ) : (
            <ul className="space-y-2">
              {d.top.map((t) => (
                <li key={t.id} className="grid grid-cols-[1fr_6rem] items-center gap-3 text-sm">
                  <div>
                    {links ? <Link href={`/clientes/${t.id}`} className="text-slate-800 hover:text-brand-blue">{t.nome}</Link> : <span>{t.nome}</span>}
                    <Barra pct={(t.valor / maxTop) * 100} cor="#15803d" />
                  </div>
                  <span className="text-right tabular-nums">{reais(t.valor)}</span>
                </li>
              ))}
            </ul>
          )}
        </Secao>

        <Secao titulo="Atividade dos últimos 30 dias">
          {d.atividade.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhum contato registrado no período.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="py-2">Pessoa</th>
                  <th className="text-right">Visitas</th>
                  <th className="text-right">Ligações</th>
                  <th className="text-right">Mensagens</th>
                  <th className="text-right">Reuniões</th>
                  <th className="text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {d.atividade.map((a) => (
                  <tr key={a.quem} className="border-b border-slate-100 last:border-0">
                    <td className="py-2">{a.quem}</td>
                    <td className="text-right tabular-nums">{a.visitas}</td>
                    <td className="text-right tabular-nums">{a.ligacoes}</td>
                    <td className="text-right tabular-nums">{a.mensagens}</td>
                    <td className="text-right tabular-nums">{a.reunioes}</td>
                    <td className="text-right font-medium tabular-nums">{a.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Secao>
      </div>

      <Secao titulo={`Clientes em risco: ${d.risco.length} sem comprar há 6 meses ou mais`}>
        {d.risco.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhum cliente da carteira nessa situação.</p>
        ) : (
          <ul className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
            {d.risco.slice(0, 20).map((r) => (
              <li key={r.id} className="flex justify-between gap-3 border-b border-slate-100 py-1">
                {links ? <Link href={`/clientes/${r.id}`} className="truncate hover:text-brand-blue">{r.nome}</Link> : <span className="truncate">{r.nome}</span>}
                <span className="shrink-0 text-slate-500">{r.cidade ? `${r.cidade}/${r.uf} · ` : ""}{r.meses} meses</span>
              </li>
            ))}
          </ul>
        )}
        {d.risco.length > 20 && <p className="mt-2 text-xs text-slate-500">Mostrando os 20 mais antigos de {d.risco.length}.</p>}
      </Secao>
    </div>
  );
}
