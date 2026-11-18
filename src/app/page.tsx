import Link from "next/link";
import { Suspense } from "react";
import { getUsuario } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Cabecalho } from "@/components/Cabecalho";
import { Carregando } from "@/components/Carregando";
import { AguardandoAprovacao } from "@/components/AguardandoAprovacao";
import { ContadorAnimado } from "@/components/ContadorAnimado";
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
  const maiorTerritorio = Math.max(1, ...(territorios ?? []).map((t) => t.clientes));
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
        <section className="hero-brand entrar rounded-[2rem] p-6 text-white shadow-lg sm:p-10">
          <span aria-hidden className="pontos pointer-events-none absolute inset-0" />
          <p className="relative text-sm font-medium capitalize text-white/70">{dataExtensa}</p>
          <h1 className="relative mt-2 max-w-2xl text-4xl leading-[1.05] sm:text-6xl">Olá, {primeiro}</h1>
          <p className="relative mt-3 max-w-lg text-base text-white/80 sm:text-lg">
            <strong className="font-semibold text-white"><ContadorAnimado valor={totalClientes ?? 0} /></strong> cadastros em {territorios?.length ?? 0} territórios, prontos para prospectar.
          </p>
          <div className="relative mt-7 flex flex-wrap gap-3">
            <Link href="/mapa" className="seta-avanca inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-brand-ink shadow-lg hover:bg-brand-ink hover:text-white">
              Abrir o mapa <ArrowRight size={18} weight="bold" className="seta" />
            </Link>
            <Link href="/funil" className="inline-flex items-center gap-2 rounded-full bg-white/10 px-6 py-3 text-sm font-semibold text-white ring-1 ring-white/30 hover:bg-white/20">
              Ver o funil
            </Link>
          </div>
        </section>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {atalhos.map((a, n) => (
            <Link key={a.href} href={a.href} style={{ "--i": n + 1 } as React.CSSProperties} className="entrar cartao group flex items-start gap-3.5 p-4">
              <span className={`grid size-11 shrink-0 place-items-center rounded-xl transition-transform duration-300 ${a.destaque ? "bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-md" : "icone-marca"}`}>
                <a.icone size={22} weight="duotone" />
              </span>
              <span className="min-w-0">
                <span className="block font-semibold text-slate-900">{a.titulo}</span>
                <span className="block text-sm text-slate-500">{a.texto}</span>
              </span>
            </Link>
          ))}
        </div>

        <section className="mt-10">
          <h2 className="text-2xl"><span className="texto-marca">Territórios</span></h2>
          <p className="mt-1 text-sm text-slate-500">No mapa, cada território aparece com a linha tracejada na cor abaixo.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(territorios ?? []).map((t, n) => (
              <article key={t.id} style={{ "--i": n + 4 } as React.CSSProperties} className="entrar cartao p-5">
                <span aria-hidden className="pointer-events-none absolute -right-10 -top-10 size-32 rounded-full opacity-20 blur-2xl" style={{ background: t.cor }} />
                <div className="relative flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="flex items-center gap-2 truncate text-base">
                      <span aria-hidden className="size-2.5 shrink-0 rounded-full" style={{ background: t.cor }} />
                      {t.nome}
                    </h3>
                    <p className="mt-0.5 text-sm text-slate-600">
                      {t.vendedor ?? <span className="text-slate-400">Sem vendedor</span>}
                      {t.externo && <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">externo</span>}
                    </p>
                  </div>
                  <p className="shrink-0 text-right">
                    <span className="block font-[family-name:var(--font-display)] text-3xl font-bold leading-none"><ContadorAnimado valor={t.clientes} /></span>
                    <span className="text-xs text-slate-500">{t.clientes === 1 ? "cliente" : "clientes"}</span>
                  </p>
                </div>
                <div aria-hidden className="relative mt-4 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div className="barra-cresce h-full rounded-full" style={{ "--i": n, width: `${Math.max(4, Math.round((t.clientes / maiorTerritorio) * 100))}%`, background: t.cor } as React.CSSProperties} />
                </div>
                <p className="relative mt-3 text-xs leading-relaxed text-slate-500">
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
