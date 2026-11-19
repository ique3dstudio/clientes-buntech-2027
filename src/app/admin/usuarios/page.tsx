import type { Metadata } from "next";
import { Suspense } from "react";
import { exigirAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Cabecalho } from "@/components/Cabecalho";
import { Carregando } from "@/components/Carregando";
import { DESCRICAO_PAPEL, PAPEIS, ROTULO_PAPEL, type Papel } from "@/lib/papeis";
import { LinhaUsuario } from "./LinhaUsuario";

export const metadata: Metadata = { title: "Usuários" };

export default function UsuariosPage() {
  return (
    <Suspense fallback={<Carregando />}>
      <Usuarios />
    </Suspense>
  );
}

async function Usuarios() {
  const admin = await exigirAdmin();
  const supabase = await createClient();
  const [{ data: perfis }, { data: vendedores }] = await Promise.all([
    supabase.from("perfis").select("id, nome, email, papel, vendedor_id, codigo_vendedor, created_at").order("created_at"),
    supabase.from("vendedores").select("id, nome").eq("ativo", true).order("nome"),
  ]);

  const pendentes = (perfis ?? []).filter((p) => p.papel === "pendente");
  const ativos = (perfis ?? []).filter((p) => p.papel !== "pendente");

  const bloco = (titulo: string, lista: typeof ativos, destaque = false) => (
    <section className="mt-6">
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
        {titulo} ({lista.length})
      </h2>
      <div
        className={`divide-y divide-slate-100 overflow-hidden rounded-xl bg-white shadow-sm ring-1 ${destaque ? "ring-amber-300" : "ring-slate-200"}`}
      >
        {lista.length === 0 && <p className="px-4 py-6 text-sm text-slate-400">Nenhum.</p>}
        {lista.map((p) => (
          <LinhaUsuario
            key={p.id}
            perfil={{ ...p, papel: p.papel as Papel }}
            vendedores={vendedores ?? []}
            souEu={p.id === admin.id}
          />
        ))}
      </div>
    </section>
  );

  return (
    <>
      <Cabecalho usuario={admin} />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">
        <h1 className="text-3xl"><span className="texto-marca">Usuários e permissões</span></h1>
        <p className="mt-1 text-sm text-slate-500">
          Novos cadastros chegam como “Aguardando aprovação”. Defina o papel e, para vendedores, o vínculo com o
          vendedor do território.
        </p>

        {pendentes.length > 0 && bloco("Aguardando aprovação", pendentes, true)}
        {bloco("Com acesso", ativos)}

        <details className="mt-8 painel p-4 text-sm">
          <summary className="cursor-pointer font-medium">O que cada papel pode fazer</summary>
          <dl className="mt-3 grid gap-2 sm:grid-cols-2">
            {PAPEIS.map((p) => (
              <div key={p}>
                <dt className="font-medium">{ROTULO_PAPEL[p]}</dt>
                <dd className="text-slate-500">{DESCRICAO_PAPEL[p]}</dd>
              </div>
            ))}
          </dl>
        </details>
      </main>
    </>
  );
}
