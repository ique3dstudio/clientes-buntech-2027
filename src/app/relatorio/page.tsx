import type { Metadata } from "next";
import { Suspense } from "react";
import { getUsuario } from "@/lib/auth";
import { carregarPainel } from "@/lib/painel-dados";
import { Cabecalho } from "@/components/Cabecalho";
import { Carregando } from "@/components/Carregando";
import { AguardandoAprovacao } from "@/components/AguardandoAprovacao";
import { Logo } from "@/components/Logo";
import { BlocosPainel } from "@/components/PainelBlocos";
import { ImprimirBotao } from "./ImprimirBotao";

export const metadata: Metadata = { title: "Relatório mensal" };

export default function RelatorioPage() {
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
  const mes = new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric", timeZone: "America/Sao_Paulo" });
  return (
    <>
      <div className="print:hidden">
        <Cabecalho usuario={usuario} />
      </div>
      <main className="mx-auto max-w-5xl px-4 py-6 print:max-w-none print:p-0">
        <div className="mb-5 flex items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <Logo className="h-10 w-auto" />
          <div className="text-right">
            <h1 className="text-lg font-semibold capitalize text-slate-900">Relatório mensal — {mes}</h1>
            <p className="text-xs text-slate-500">Prospecção 2027 · gerado em {dados.geradoEm}</p>
          </div>
        </div>
        <div className="mb-4 print:hidden">
          <ImprimirBotao />
          <span className="ml-3 text-xs text-slate-500">Na janela de impressão, escolha “Salvar como PDF”.</span>
        </div>
        <BlocosPainel d={dados} links={false} />
      </main>
    </>
  );
}
