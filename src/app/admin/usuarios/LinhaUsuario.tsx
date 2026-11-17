"use client";

import { useActionState } from "react";
import { atualizarPerfil, type ResultadoAcao } from "./actions";
import { PAPEIS, ROTULO_PAPEL, type Papel } from "@/lib/papeis";

type Props = {
  perfil: { id: string; nome: string; email: string | null; papel: Papel; vendedor_id: string | null };
  vendedores: { id: string; nome: string }[];
  souEu: boolean;
};

export function LinhaUsuario({ perfil, vendedores, souEu }: Props) {
  const [estado, acao, pendente] = useActionState<ResultadoAcao, FormData>(atualizarPerfil, null);
  const sel =
    "rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/30";

  return (
    <form action={acao} className="grid items-center gap-3 px-4 py-3 sm:grid-cols-[1fr_200px_200px_120px]">
      <input type="hidden" name="id" value={perfil.id} />
      <div className="min-w-0">
        <p className="truncate font-medium">
          {perfil.nome}
          {souEu && <span className="ml-2 text-xs font-normal text-slate-400">(você)</span>}
        </p>
        <p className="truncate text-sm text-slate-500">{perfil.email}</p>
      </div>
      <select name="papel" defaultValue={perfil.papel} className={sel} aria-label="Papel">
        {PAPEIS.map((p) => (
          <option key={p} value={p}>
            {ROTULO_PAPEL[p]}
          </option>
        ))}
      </select>
      <select name="vendedor_id" defaultValue={perfil.vendedor_id ?? ""} className={sel} aria-label="Vendedor vinculado">
        <option value="">— sem vínculo —</option>
        {vendedores.map((v) => (
          <option key={v.id} value={v.id}>
            {v.nome}
          </option>
        ))}
      </select>
      <div className="flex items-center gap-2">
        <button
          disabled={pendente}
          className="rounded-md bg-brand-blue px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-blue-dark disabled:opacity-60"
        >
          {pendente ? "…" : "Salvar"}
        </button>
        {estado && (
          <span className={`text-xs ${estado.ok ? "text-teal-700" : "text-red-600"}`} role="status">
            {estado.mensagem}
          </span>
        )}
      </div>
    </form>
  );
}
