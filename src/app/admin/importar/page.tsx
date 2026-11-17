import type { Metadata } from "next";
import { Suspense } from "react";
import { exigirAdmin } from "@/lib/auth";
import { Cabecalho } from "@/components/Cabecalho";
import { Carregando } from "@/components/Carregando";
import { ImportarPlanilha } from "./ImportarPlanilha";

export const metadata: Metadata = { title: "Importar planilha" };

export default function ImportarPage() {
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
        <h1 className="text-2xl font-semibold tracking-tight">Importar planilha de clientes</h1>
        <p className="mt-1 text-sm text-slate-500">
          Envie a planilha da carteira (.xlsx). O arquivo é lido no seu navegador e nada é gravado até você confirmar.
        </p>
        <ImportarPlanilha />
      </main>
    </>
  );
}
