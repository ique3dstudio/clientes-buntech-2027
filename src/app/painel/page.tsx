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
            <h1 className="text-3xl"><span className="texto-marca">Painel</span></h1>
            <p className="text-sm text-slate-500">Atualizado em {dados.geradoEm}</p>
          </div>
          <Link href="/relatorio" className="rounded-full bg-gradient-to-r from-brand-blue to-brand-teal px-5 py-2.5 text-sm font-semibold text-white shadow-brand">
            Relatório mensal (PDF)
          </Link>
        </div>
        <BlocosPainel d={dados} animar />
      </main>
    </>
  );
}
