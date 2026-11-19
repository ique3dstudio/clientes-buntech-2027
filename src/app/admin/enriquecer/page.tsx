import type { Metadata } from "next";
import { Suspense } from "react";
import { exigirAdmin } from "@/lib/auth";
import { Cabecalho } from "@/components/Cabecalho";
import { Carregando } from "@/components/Carregando";
import { EnriquecerEmLote } from "./EnriquecerEmLote";

export const metadata: Metadata = { title: "Enriquecer dados" };

export default function EnriquecerPage() {
  return (
    <Suspense fallback={<Carregando />}>
      <Conteudo />
    </Suspense>
  );
}

async function Conteudo() {
  const admin = await exigirAdmin();
  return (
    <>
      <Cabecalho usuario={admin} />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6">
        <h1 className="text-3xl"><span className="texto-marca">Completar dados pela internet</span></h1>
        <p className="mt-1 text-sm text-slate-500">
          Para cada cliente com dados faltando, o app pesquisa na internet e na Receita Federal e preenche <strong>somente os campos vazios</strong>:
          CNPJ (só se a Receita confirmar nome e cidade), razão social, site, e-mail, telefone e a posição exata no mapa pelo endereço.
          Nada que já esteja preenchido é alterado, e cada preenchimento fica registrado no histórico do cliente.
        </p>
        <EnriquecerEmLote />
      </main>
    </>
  );
}
