"use client";

export function ImprimirBotao() {
  return (
    <button type="button" onClick={() => window.print()} className="rounded-lg bg-brand-blue px-4 py-2 text-sm font-medium text-white hover:opacity-90">
      Imprimir / Salvar PDF
    </button>
  );
}
