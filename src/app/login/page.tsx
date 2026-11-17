import type { Metadata } from "next";
import { Logo } from "@/components/Logo";
import { FormLogin } from "./FormLogin";

export const metadata: Metadata = { title: "Entrar" };

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col lg:flex-row">
      {/* Painel da marca */}
      <section className="relative flex flex-1 flex-col items-center justify-center overflow-hidden bg-white px-8 py-12 lg:py-0">
        <div className="absolute inset-x-0 bottom-0 h-2 bg-gradient-to-r from-brand-blue to-brand-teal" />
        <Logo priority className="h-auto w-full max-w-xl" />
        <p className="mt-8 max-w-md text-center text-lg text-slate-600">
          Mapa oficial de clientes e prospecção <span className="font-semibold text-brand-blue">2027</span>
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3 text-sm">
          <span className="rounded-full bg-green-50 px-3 py-1 font-medium text-green-700 ring-1 ring-green-200">
            Pastagens / Forrageiras
          </span>
          <span className="rounded-full bg-amber-50 px-3 py-1 font-medium text-amber-700 ring-1 ring-amber-200">
            Grandes Culturas · Soja/Milho
          </span>
        </div>
      </section>

      {/* Formulário */}
      <section className="flex flex-1 items-center justify-center bg-slate-50 px-6 py-12">
        <FormLogin />
      </section>
    </main>
  );
}
