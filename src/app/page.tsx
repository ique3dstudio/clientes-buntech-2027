import Link from "next/link";
import { Suspense } from "react";
import { getUsuario } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Cabecalho } from "@/components/Cabecalho";
import { Carregando } from "@/components/Carregando";
import { AguardandoAprovacao } from "@/components/AguardandoAprovacao";
import { Logo } from "@/components/Logo";

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
  vendedores: { nome: string; externo: boolean } | null;
  territorio_areas: { tipo: string; uf: string; nome: string }[];
};

async function Inicio() {
  const usuario = await getUsuario();
  if (usuario.papel === "pendente") return <AguardandoAprovacao nome={usuario.nome} />;

  const supabase = await createClient();
  const [{ data: territorios }, { count: totalClientes }] = await Promise.all([
    supabase
      .from("territorios")
      .select("id, nome, cor, vendedores(nome, externo), territorio_areas(tipo, uf, nome)")
      .order("ordem")
      .returns<Territorio[]>(),
    supabase.from("clientes").select("id", { count: "exact", head: true }),
  ]);

  return (
    <>
      <Cabecalho usuario={usuario} />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">
        <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
          <div className="flex flex-col items-center gap-6 px-6 py-10 sm:flex-row sm:px-10">
            <Logo className="h-auto w-64 shrink-0 sm:w-80" />
            <div className="text-center sm:text-left">
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Bem-vindo, {usuario.nome.split(" ")[0]}
              </h1>
              <p className="mt-2 text-slate-600">
                Mapa oficial de clientes e prospecção 2027. {totalClientes ?? 0} clientes cadastrados ·{" "}
                {territorios?.length ?? 0} territórios.
              </p>
            </div>
          </div>
          <div className="h-1.5 bg-gradient-to-r from-brand-blue to-brand-teal" />
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-semibold">Territórios</h2>
          <p className="text-sm text-slate-500">A linha tracejada de cada território aparecerá no mapa com a cor abaixo.</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {territorios?.map((t) => (
              <article
                key={t.id}
                className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200"
                style={{ borderLeft: `4px dashed ${t.cor}` }}
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold">{t.nome}</h3>
                  <span className="size-3 shrink-0 rounded-full" style={{ background: t.cor }} />
                </div>
                <p className="mt-1 text-sm">
                  {t.vendedores ? (
                    <>
                      {t.vendedores.nome}
                      {t.vendedores.externo && (
                        <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">externo</span>
                      )}
                    </>
                  ) : (
                    <span className="italic text-slate-400">Sem vendedor</span>
                  )}
                </p>
                <p className="mt-3 text-xs leading-relaxed text-slate-500">
                  {resumoAreas(t.territorio_areas)}
                </p>
              </article>
            ))}
          </div>
        </section>

        <Link
          href="/mapa"
          className="mt-8 flex items-center justify-between rounded-xl bg-gradient-to-r from-brand-blue to-brand-teal p-6 text-white shadow-sm transition hover:opacity-95"
        >
          <span>
            <span className="block text-lg font-semibold">Abrir o mapa de clientes</span>
            <span className="text-sm text-white/80">Clientes, prospects e filtros por frente e situação</span>
          </span>
          <span aria-hidden className="text-2xl">→</span>
        </Link>
      </main>
    </>
  );
}

function resumoAreas(areas: Territorio["territorio_areas"]) {
  const ufsInteiras = areas.filter((a) => a.tipo === "uf").map((a) => a.uf);
  const parciais = [...new Set(areas.filter((a) => a.tipo !== "uf").map((a) => a.uf))];
  const partes = [];
  if (ufsInteiras.length) partes.push(ufsInteiras.join(", "));
  if (parciais.length) partes.push(parciais.map((uf) => `parte de ${uf}`).join(", "));
  return partes.join(" + ");
}
