import type { Metadata } from "next";
import { Suspense } from "react";
import { getUsuario } from "@/lib/auth";
import { Cabecalho } from "@/components/Cabecalho";
import { Carregando } from "@/components/Carregando";
import { AguardandoAprovacao } from "@/components/AguardandoAprovacao";
import { PlanejadorRota } from "./PlanejadorRota";

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
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-semibold tracking-tight">Perto de mim e rota de visitas</h1>
        <p className="mt-1 text-sm text-slate-500">
          Veja quem está por perto, marque as paradas e abra a rota no Google Maps ou no Waze. As distâncias são em linha reta; o aplicativo de mapas calcula o trajeto real.
        </p>
        <PlanejadorRota />
      </main>
    </>
  );
}
