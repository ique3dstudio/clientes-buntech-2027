import type { Metadata } from "next";
import { Suspense } from "react";
import { exigirAdmin } from "@/lib/auth";
import { Cabecalho } from "@/components/Cabecalho";
import { Carregando } from "@/components/Carregando";
import { EditorTerritorios } from "./EditorTerritorios";

export const metadata: Metadata = { title: "Territórios" };

export default function TerritoriosPage() {
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
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">
        <h1 className="text-3xl"><span className="texto-marca">Territórios dos vendedores</span></h1>
        <p className="mt-1 text-sm text-slate-500">
          Cada território é formado por municípios do IBGE. Mova regiões inteiras (mesorregião ou microrregião) ou
          municípios avulsos; o contorno tracejado no mapa e o vendedor de cada cliente são recalculados na hora.
        </p>
        <EditorTerritorios />
      </main>
    </>
  );
}
