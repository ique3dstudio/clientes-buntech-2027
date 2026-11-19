import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getUsuario } from "@/lib/auth";
import { Cabecalho } from "@/components/Cabecalho";
import { Carregando } from "@/components/Carregando";
import { ClienteForm } from "../../ClienteForm";

export const metadata: Metadata = { title: "Editar cliente" };

export default function EditarClientePage({ params }: PageProps<"/clientes/[id]/editar">) {
  return (
    <Suspense fallback={<Carregando />}>
      <Conteudo params={params} />
    </Suspense>
  );
}

async function Conteudo({ params }: { params: PageProps<"/clientes/[id]/editar">["params"] }) {
  const { id } = await params;
  const usuario = await getUsuario();
  if (usuario.papel === "pendente" || usuario.papel === "leitura") redirect("/mapa");
  return (
    <>
      <Cabecalho usuario={usuario} />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6">
        <h1 className="text-3xl"><span className="texto-marca">Editar cliente</span></h1>
        <ClienteForm clienteId={id} papel={usuario.papel} vendedorId={usuario.vendedorId} />
      </main>
    </>
  );
}
