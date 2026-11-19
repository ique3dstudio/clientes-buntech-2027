import type { Metadata } from "next";
import { podeEscrever } from "@/lib/papeis";
import { Suspense } from "react";
import { getUsuario } from "@/lib/auth";
import { Cabecalho } from "@/components/Cabecalho";
import { Carregando } from "@/components/Carregando";
import { AguardandoAprovacao } from "@/components/AguardandoAprovacao";
import { ListaTarefas } from "./ListaTarefas";

export const metadata: Metadata = { title: "Tarefas" };

export default function TarefasPage() {
  return (
    <Suspense fallback={<Carregando />}>
      <Conteudo />
    </Suspense>
  );
}

async function Conteudo() {
  const usuario = await getUsuario();
  if (usuario.papel === "pendente") return <AguardandoAprovacao nome={usuario.nome} />;
  return (
    <>
      <Cabecalho usuario={usuario} />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-semibold tracking-tight">Minhas tarefas</h1>
        <p className="mt-1 text-sm text-slate-500">Lembretes de retorno, visitas e envio de amostras. Só você vê as suas tarefas.</p>
        <ListaTarefas userId={usuario.id} podeCriar={podeEscrever(usuario.papel)} />
      </main>
    </>
  );
}
