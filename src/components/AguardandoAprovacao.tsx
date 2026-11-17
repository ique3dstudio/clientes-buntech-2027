import { sair } from "@/app/actions";
import { Logo } from "@/components/Logo";

export function AguardandoAprovacao({ nome }: { nome: string }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-white px-6 text-center">
      <Logo className="h-auto w-full max-w-md" />
      <h1 className="mt-10 text-2xl font-semibold">Olá, {nome}!</h1>
      <p className="mt-2 max-w-md text-slate-600">
        Seu cadastro foi recebido e está <strong>aguardando aprovação</strong> de um administrador. Assim que
        liberado, você terá acesso ao mapa de clientes.
      </p>
      <form action={sair} className="mt-8">
        <button className="rounded-lg px-4 py-2 text-sm text-slate-500 ring-1 ring-slate-300 hover:bg-slate-50">Sair</button>
      </form>
    </main>
  );
}
