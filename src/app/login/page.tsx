import type { Metadata } from "next";
import { Logo } from "@/components/Logo";
import { FormLogin } from "./FormLogin";

export const metadata: Metadata = { title: "Entrar" };

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh flex-col lg:flex-row">
      {/* Painel da marca */}
      <section className="relative flex flex-1 flex-col items-center justify-center overflow-hidden bg-white px-6 py-10 sm:px-8 lg:py-0">
        <span aria-hidden className="pointer-events-none absolute -left-24 -top-24 size-96 rounded-full bg-brand-blue/10 blur-3xl" />
        <span aria-hidden className="pointer-events-none absolute -bottom-32 -right-16 size-96 rounded-full bg-brand-teal/10 blur-3xl" />
        <div className="relative flex w-full max-w-xl flex-col items-center">
          <Logo priority className="h-auto w-full max-w-[18rem] sm:max-w-md lg:max-w-xl" />
          <p className="mt-6 max-w-md text-center font-[family-name:var(--font-display)] text-xl font-medium tracking-tight text-slate-700 sm:mt-8 sm:text-2xl">
            Mapa oficial de clientes e prospecção <span className="text-brand-blue">2027</span>
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2.5 text-sm">
            <span className="rounded-full bg-green-50 px-3.5 py-1.5 font-medium text-green-700 ring-1 ring-green-200">Pastagens e forrageiras</span>
            <span className="rounded-full bg-amber-50 px-3.5 py-1.5 font-medium text-amber-700 ring-1 ring-amber-200">Grandes culturas: soja e milho</span>
          </div>
        </div>
        <div className="absolute inset-x-0 bottom-0 h-1.5 bg-gradient-to-r from-brand-blue to-brand-teal" />
      </section>

      {/* Formulário */}
      <section className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6">
        <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-lg ring-1 ring-slate-200 sm:p-9">
          <FormLogin />
        </div>
      </section>
    </main>
  );
}
