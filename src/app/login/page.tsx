import type { Metadata } from "next";
import { Logo } from "@/components/Logo";
import { FormLogin } from "./FormLogin";

export const metadata: Metadata = { title: "Entrar" };

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh flex-col lg:flex-row">
      {/* Painel da marca */}
      <section className="hero-brand flex flex-1 flex-col items-center justify-center px-6 py-12 text-white sm:px-8 lg:py-0">
        <span aria-hidden className="pontos pointer-events-none absolute inset-0" />
        <div className="relative flex w-full max-w-xl flex-col items-start">
          <div className="entrar rounded-3xl bg-white p-5 shadow-lg sm:p-6">
            <Logo priority className="h-auto w-44 sm:w-56" />
          </div>
          <p
            style={{ "--i": 1 } as React.CSSProperties}
            className="entrar mt-8 max-w-lg font-[family-name:var(--font-display)] text-3xl font-semibold leading-[1.1] tracking-tight sm:text-4xl lg:text-5xl"
          >
            Mapa oficial de clientes e prospecção{" "}
            <span className="bg-gradient-to-r from-sky-300 to-teal-300 bg-clip-text text-transparent">2027</span>
          </p>
          <div style={{ "--i": 2 } as React.CSSProperties} className="entrar mt-6 flex flex-wrap gap-2.5 text-sm">
            <span className="flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 font-medium text-white ring-1 ring-white/25 backdrop-blur">
              <span aria-hidden className="size-2.5 rounded-full bg-green-400" />
              Pastagens e forrageiras
            </span>
            <span className="flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 font-medium text-white ring-1 ring-white/25 backdrop-blur">
              <span aria-hidden className="size-2.5 rounded-full bg-amber-400" />
              Grandes culturas: soja e milho
            </span>
          </div>
        </div>
      </section>

      {/* Formulário */}
      <section className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6">
        <div
          style={{ "--i": 1 } as React.CSSProperties}
          className="entrar relative w-full max-w-md overflow-hidden rounded-3xl bg-white/85 p-6 shadow-lg ring-1 ring-white/70 backdrop-blur-2xl sm:p-9"
        >
          <span aria-hidden className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand-blue to-brand-teal" />
          <FormLogin />
        </div>
      </section>
    </main>
  );
}
