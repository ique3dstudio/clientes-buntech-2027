import type { Metadata } from "next";
import { Suspense } from "react";
import { getUsuario } from "@/lib/auth";
import { Cabecalho } from "@/components/Cabecalho";
import { Carregando } from "@/components/Carregando";
import { AguardandoAprovacao } from "@/components/AguardandoAprovacao";
import { ROTULO_PAPEL } from "@/lib/papeis";
import { EditorFoto } from "./EditorFoto";

export const metadata: Metadata = { title: "Meu perfil" };

export default function PerfilPage() {
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
      <main className="mx-auto w-full max-w-xl flex-1 px-4 py-8 sm:px-6">
        <h1 className="text-3xl"><span className="texto-marca">Meu perfil</span></h1>
        <section className="painel entrar mt-5 p-6 sm:p-8">
          <span aria-hidden className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand-blue to-brand-teal" />
          <EditorFoto userId={usuario.id} nome={usuario.nome} fotoUrl={usuario.fotoUrl} temFoto={usuario.fotoUrl !== null} />
          <dl className="mt-8 space-y-3 border-t border-slate-100 pt-5 text-sm">
            <div>
              <dt className="text-xs text-slate-400">Nome</dt>
              <dd className="text-slate-800">{usuario.nome}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-400">Código do vendedor</dt>
              <dd className="text-slate-800">{usuario.codigo ?? <span className="text-slate-400">Ainda não definido. Peça a um administrador.</span>}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-400">E-mail</dt>
              <dd className="break-words text-slate-800">{usuario.email}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-400">Perfil de acesso</dt>
              <dd className="text-slate-800">{ROTULO_PAPEL[usuario.papel]}</dd>
            </div>
          </dl>
        </section>
      </main>
    </>
  );
}
