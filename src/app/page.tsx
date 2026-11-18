import Link from "next/link";
import { Suspense } from "react";
import { getUsuario } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Cabecalho } from "@/components/Cabecalho";
import { Carregando } from "@/components/Carregando";
import { AguardandoAprovacao } from "@/components/AguardandoAprovacao";
import { ArrowRight, ChartBar, CheckSquareOffset, FunnelSimple, Path } from "@phosphor-icons/react/ssr";

export default function Home() {
  return (
    <Suspense fallback={<Carregando />}>
      <Inicio />
    </Suspense>
  );
}

type Territorio = {
  id: string;
  nome: string;
  cor: string;
  vendedor: string | null;
  externo: boolean | null;
  municipios: number;
  ufs: string[] | null;
  clientes: number;
};

async function Inicio() {
  const usuario = await getUsuario();
  if (usuario.papel === "pendente") return <AguardandoAprovacao nome={usuario.nome} />;

  const supabase = await createClient();
  const hoje = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" }); // AAAA-MM-DD no horário de Brasília
  const [{ data: territorios }, { count: totalClientes }, { count: tarefasHoje }] = await Promise.all([
    supabase
      .from("territorios_resumo")
      .select("id, nome, cor, vendedor, externo, municipios, ufs, clientes")
      .order("ordem")
      .returns<Territorio[]>(),
    supabase.from("clientes").select("id", { count: "exact", head: true }),
    supabase.from("tarefas").select("id", { count: "exact", head: true }).eq("responsavel_id", usuario.id).is("concluida_em", null).lte("vencimento", hoje),
  ]);

  const primeiro = usuario.nome.split(" ")[0];
  const dataExtensa = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", timeZone: "America/Sao_Paulo" });
  const atalhos = [
    { href: "/tarefas", titulo: "Tarefas", texto: `${tarefasHoje ?? 0} para hoje ou atrasadas`, icone: CheckSquareOffset, destaque: (tarefasHoje ?? 0) > 0 },
    { href: "/funil", titulo: "Funil de vendas", texto: "Arraste os clientes entre as etapas", icone: FunnelSimple, destaque: false },
    { href: "/rotas", titulo: "Perto de mim", texto: "Monte a rota de visitas do dia", icone: Path, destaque: false },
    { href: "/painel", titulo: "Painel", texto: "Cobertura, faturamento e atividade", icone: ChartBar, destaque: false },
  ];

  return (
    <>
      <Cabecalho usuario={usuario} />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-10">
        <header className="mb-6 sm:mb-8">
          <p className="text-sm font-medium capitalize text-slate-500">{dataExtensa}</p>
          <h1 className="mt-1 text-3xl sm:text-4xl">Olá, {primeiro}</h1>
          <p className="mt-1.5 text-slate-600">
            {totalClientes ?? 0} cadastros em {territorios?.length ?? 0} territórios.
          </p>
        </header>

        <Link
          href="/mapa"
          className="group relative flex items-center justify-between gap-4 overflow-hidden rounded-3xl bg-brand-ink p-6 text-white shadow-lg sm:p-8"
        >
          <span aria-hidden className="pointer-events-none absolute -right-16 -top-24 size-72 rounded-full bg-brand-blue/40 blur-3xl" />
          <span aria-hidden className="pointer-events-none absolute -bottom-24 right-40 size-60 rounded-full bg-brand-teal/30 blur-3xl" />
          <span className="relative">
            <span className="block font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight sm:text-2xl">Abrir o mapa de clientes</span>
            <span className="mt-1 block max-w-md text-sm text-white/70">Clientes, prospects e territórios, com filtros por frente e situação.</span>
          </span>
          <span className="relative grid size-12 shrink-0 place-items-center rounded-full bg-white/12 ring-1 ring-white/20 transition-transform duration-500 [transition-timing-function:var(--ease-suave)] group-hover:translate-x-1">
            <ArrowRight size={22} />
          </span>
        </Link>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {atalhos.map((a) => (
            <Link key={a.href} href={a.href} className="group flex items-start gap-3.5 rounded-2xl bg-white p-4 ring-1 ring-slate-200 transition-[box-shadow,transform] duration-300 [transition-timing-function:var(--ease-suave)] hover:-translate-y-0.5 hover:shadow-md">
              <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${a.destaque ? "bg-amber-100 text-amber-700" : "bg-brand-blue/10 text-brand-blue"}`}>
                <a.icone size={22} />
              </span>
              <span className="min-w-0">
                <span className="block font-semibold text-slate-900">{a.titulo}</span>
                <span className="block text-sm text-slate-500">{a.texto}</span>
              </span>
            </Link>
          ))}
        </div>

        <section className="mt-10">
          <h2 className="text-xl">Territórios</h2>
          <p className="mt-1 text-sm text-slate-500">No mapa, cada território aparece com a linha tracejada na cor abaixo.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {territorios?.map((t) => (
              <article key={t.id} className="relative overflow-hidden rounded-2xl bg-white p-5 ring-1 ring-slate-200">
                <span aria-hidden className="absolute inset-y-0 left-0 w-1.5" style={{ background: t.cor }} />
                <div className="flex items-start justify-between gap-3 pl-1.5">
                  <div className="min-w-0">
                    <h3 className="truncate text-base">{t.nome}</h3>
                    <p className="mt-0.5 text-sm text-slate-600">
                      {t.vendedor ?? <span className="text-slate-400">Sem vendedor</span>}
                      {t.externo && <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">externo</span>}
                    </p>
                  </div>
                  <p className="shrink-0 text-right">
                    <span className="block font-[family-name:var(--font-display)] text-2xl font-bold leading-none tabular-nums">{t.clientes}</span>
                    <span className="text-xs text-slate-500">{t.clientes === 1 ? "cliente" : "clientes"}</span>
                  </p>
                </div>
                <p className="mt-3 pl-1.5 text-xs leading-relaxed text-slate-500">
                  {(t.ufs ?? []).join(", ")} &middot; {t.municipios} municípios
                </p>
              </article>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
