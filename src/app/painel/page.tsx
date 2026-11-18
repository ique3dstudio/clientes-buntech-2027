import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getUsuario } from "@/lib/auth";
import { carregarPainel } from "@/lib/painel-dados";
import { Cabecalho } from "@/components/Cabecalho";
import { Carregando } from "@/components/Carregando";
import { AguardandoAprovacao } from "@/components/AguardandoAprovacao";
import { BlocosPainel } from "@/components/PainelBlocos";

export const metadata: Metadata = { title: "Painel" };

export default function PainelPage() {
  return (
    <Suspense fallback={<Carregando />}>
      <Conteudo />
    </Suspense>
  );
}

async function Conteudo() {
  const usuario = await getUsuario();
  if (usuario.papel === "pendente") return <AguardandoAprovacao nome={usuario.nome} />;
  const dados = await carregarPainel();
  return (
    <>
      <Cabecalho usuario={usuario} />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Painel</h1>
            <p className="text-sm text-slate-500">Atualizado em {dados.geradoEm}</p>
          </div>
          <Link href="/relatorio" className="rounded-lg bg-brand-blue px-4 py-2 text-sm font-medium text-white hover:opacity-90">
            Relatório mensal (PDF)
          </Link>
        </div>
        <BlocosPainel d={dados} />
      </main>
    </>
  );
}
