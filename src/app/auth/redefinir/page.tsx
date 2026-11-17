"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "@/components/Logo";

export default function RedefinirSenha() {
  const router = useRouter();
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setCarregando(true);
    setErro(null);
    const { error } = await createClient().auth.updateUser({ password: senha });
    setCarregando(false);
    if (error) return setErro(error.message);
    router.replace("/");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <form onSubmit={salvar} className="w-full max-w-sm space-y-4">
        <Logo className="mx-auto h-auto w-56" />
        <h1 className="pt-4 text-xl font-semibold">Criar nova senha</h1>
        <input
          type="password"
          minLength={6}
          required
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          autoComplete="new-password"
          placeholder="Nova senha (mín. 6 caracteres)"
          className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/30"
        />
        {erro && <p className="text-sm text-red-600">{erro}</p>}
        <button
          disabled={carregando}
          className="w-full rounded-lg bg-brand-blue px-4 py-2.5 font-semibold text-white hover:bg-brand-blue-dark disabled:opacity-60"
        >
          {carregando ? "Salvando…" : "Salvar senha"}
        </button>
      </form>
    </main>
  );
}
