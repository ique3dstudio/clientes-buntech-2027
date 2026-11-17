import type { Metadata } from "next";
import { Suspense } from "react";
import { getUsuario } from "@/lib/auth";
import { Cabecalho } from "@/components/Cabecalho";
import { Carregando } from "@/components/Carregando";
import { AguardandoAprovacao } from "@/components/AguardandoAprovacao";
import { MapaClientes } from "./MapaClientes";

export const metadata: Metadata = { title: "Mapa" };

export default function MapaPage() {
  return (
    <Suspense fallback={<Carregando />}>
      <Mapa />
    </Suspense>
  );
}

async function Mapa() {
  const usuario = await getUsuario();
  if (usuario.papel === "pendente") return <AguardandoAprovacao nome={usuario.nome} />;
  return (
    <div className="flex h-screen flex-col">
      <Cabecalho usuario={usuario} />
      <MapaClientes podeEditar={usuario.papel !== "leitura"} />
    </div>
  );
}
