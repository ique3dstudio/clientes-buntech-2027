import type { Metadata } from "next";
import { podeEscrever } from "@/lib/papeis";
import { Suspense } from "react";
import { getUsuario } from "@/lib/auth";
import { Cabecalho } from "@/components/Cabecalho";
import { Carregando } from "@/components/Carregando";
import { AguardandoAprovacao } from "@/components/AguardandoAprovacao";
import { MapaClientes } from "./MapaClientes";

export const metadata: Metadata = { title: "Mapa" };

export default function MapaPage({ searchParams }: PageProps<"/mapa">) {
  return (
    <Suspense fallback={<Carregando />}>
      <Mapa searchParams={searchParams} />
    </Suspense>
  );
}

async function Mapa({ searchParams }: { searchParams: PageProps<"/mapa">["searchParams"] }) {
  const { c } = await searchParams;
  const usuario = await getUsuario();
  if (usuario.papel === "pendente") return <AguardandoAprovacao nome={usuario.nome} />;
  return (
    <div className="tela-cheia flex flex-col">
      <Cabecalho usuario={usuario} />
      <MapaClientes podeEditar={podeEscrever(usuario.papel)} selecionadoInicial={typeof c === "string" ? c : undefined} />
    </div>
  );
}
