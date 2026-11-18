import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getUsuario } from "@/lib/auth";
import { Cabecalho } from "@/components/Cabecalho";
import { Carregando } from "@/components/Carregando";
import { ExportarClientes } from "./ExportarClientes";

export const metadata: Metadata = { title: "Exportar" };

export default function ExportarPage() {
  return (
    <Suspense fallback={<Carregando />}>
      <Conteudo />
    </Suspense>
  );
}

async function Conteudo() {
  const usuario = await getUsuario();
  // representante externo e somente leitura não exportam (regra do plano)
  if (!["admin", "gerente", "vendedor"].includes(usuario.papel)) redirect("/");
  return (
    <>
      <Cabecalho usuario={usuario} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-semibold tracking-tight">Exportar clientes</h1>
        <p className="mt-1 text-sm text-slate-500">Baixe a lista em Excel ou CSV, já com os filtros aplicados. Os dados são de clientes e contêm contatos: use com cuidado (LGPD).</p>
        <ExportarClientes />
      </main>
    </>
  );
}
