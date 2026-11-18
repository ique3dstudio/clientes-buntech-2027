import type { Metadata } from "next";
import { Logo } from "@/components/Logo";
import { ClientesOffline } from "./ClientesOffline";

export const metadata: Metadata = { title: "Clientes salvos (offline)" };

export default function OfflinePage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-6">
      <Logo className="mb-4 h-9 w-auto" />
      <h1 className="text-lg font-semibold text-slate-900">Clientes salvos neste aparelho</h1>
      <p className="mb-4 text-sm text-slate-500">Funciona sem sinal. Os registros ficam guardados e são enviados sozinhos quando o sinal voltar.</p>
      <ClientesOffline />
    </main>
  );
}
