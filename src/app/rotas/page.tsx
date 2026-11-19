import type { Metadata } from "next";
import { Suspense } from "react";
import { getUsuario } from "@/lib/auth";
import { Cabecalho } from "@/components/Cabecalho";
import { Carregando } from "@/components/Carregando";
import { AguardandoAprovacao } from "@/components/AguardandoAprovacao";
import { Rotas } from "./Rotas";

export const metadata: Metadata = { title: "Rotas" };

export default function RotasPage() {
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
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        <h1 className="text-2xl sm:text-3xl">Rotas de visita</h1>
        <p className="mt-1 text-sm text-slate-500">
          Trace a viagem de uma cidade a outra e veja quais clientes e prospects ficam no caminho, ou veja quem está por perto. A rota abre no Google Maps ou no Waze.
        </p>
        <Rotas />
      </main>
    </>
  );
}
