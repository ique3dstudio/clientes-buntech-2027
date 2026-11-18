import type { Metadata } from "next";
import { Suspense } from "react";
import { getUsuario } from "@/lib/auth";
import { Cabecalho } from "@/components/Cabecalho";
import { Carregando } from "@/components/Carregando";
import { AguardandoAprovacao } from "@/components/AguardandoAprovacao";
import { FunilKanban } from "./FunilKanban";

export const metadata: Metadata = { title: "Funil" };

export default function FunilPage() {
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
    <div className="flex h-screen flex-col">
      <Cabecalho usuario={usuario} />
      <FunilKanban podeEditar={usuario.papel !== "leitura"} />
    </div>
  );
}
