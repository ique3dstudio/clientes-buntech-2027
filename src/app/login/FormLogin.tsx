"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Modo = "entrar" | "cadastrar" | "recuperar";

const TITULO: Record<Modo, string> = {
  entrar: "Entrar",
  cadastrar: "Criar acesso",
  recuperar: "Recuperar senha",
};

function traduzErro(msg: string) {
  if (/invalid login credentials/i.test(msg)) return "E-mail ou senha incorretos.";
  if (/email not confirmed/i.test(msg)) return "Confirme seu e-mail pelo link que enviamos antes de entrar.";
  if (/already registered/i.test(msg)) return "Este e-mail já tem cadastro. Use \"Entrar\".";
  if (/password should be at least/i.test(msg)) return "A senha precisa ter pelo menos 6 caracteres.";
  if (/rate limit/i.test(msg)) return "Muitas tentativas. Aguarde alguns minutos e tente de novo.";
  return msg;
}

export function FormLogin() {
  const router = useRouter();
  const [modo, setModo] = useState<Modo>("entrar");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setAviso(null);
    setCarregando(true);
    const supabase = createClient();
    const origem = window.location.origin;
    try {
      if (modo === "entrar") {
        const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
        if (error) throw error;
        router.replace("/");
        router.refresh();
        return;
      }
      if (modo === "cadastrar") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password: senha,
          options: { data: { nome }, emailRedirectTo: `${origem}/auth/callback` },
        });
        if (error) throw error;
        if (data.session) {
          router.replace("/");
          router.refresh();
          return;
        }
        setAviso("Cadastro feito! Enviamos um link de confirmação para o seu e-mail.");
        setModo("entrar");
      }
      if (modo === "recuperar") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${origem}/auth/callback?next=/auth/redefinir`,
        });
        if (error) throw error;
        setAviso("Se o e-mail estiver cadastrado, você receberá um link para criar nova senha.");
        setModo("entrar");
      }
    } catch (err) {
      setErro(traduzErro(err instanceof Error ? err.message : String(err)));
    } finally {
      setCarregando(false);
    }
  }

  const campo =
    "w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-slate-900 shadow-sm outline-none transition focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/30";

  return (
    <div className="w-full max-w-sm">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{TITULO[modo]}</h1>
      <p className="mt-1 text-sm text-slate-500">
        {modo === "cadastrar"
          ? "Após o cadastro, um administrador libera o seu acesso."
          : "Use seu e-mail corporativo."}
      </p>

      <form onSubmit={enviar} className="mt-8 space-y-4">
        {modo === "cadastrar" && (
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Nome</span>
            <input className={campo} value={nome} onChange={(e) => setNome(e.target.value)} required autoComplete="name" />
          </label>
        )}
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">E-mail</span>
          <input
            className={campo}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </label>
        {modo !== "recuperar" && (
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Senha</span>
            <input
              className={campo}
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
              minLength={6}
              autoComplete={modo === "cadastrar" ? "new-password" : "current-password"}
            />
          </label>
        )}

        {erro && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">{erro}</p>}
        {aviso && <p role="status" className="rounded-lg bg-teal-50 px-3 py-2 text-sm text-teal-800 ring-1 ring-teal-200">{aviso}</p>}

        <button
          type="submit"
          disabled={carregando}
          className="w-full rounded-lg bg-brand-blue px-4 py-2.5 font-semibold text-white shadow-sm transition hover:bg-brand-blue-dark disabled:opacity-60"
        >
          {carregando ? "Aguarde…" : modo === "entrar" ? "Entrar" : modo === "cadastrar" ? "Criar acesso" : "Enviar link"}
        </button>
      </form>

      <div className="mt-6 flex flex-col gap-2 text-sm">
        {modo !== "entrar" && (
          <button type="button" onClick={() => setModo("entrar")} className="text-left text-brand-blue hover:underline">
            ← Voltar para entrar
          </button>
        )}
        {modo === "entrar" && (
          <>
            <button type="button" onClick={() => setModo("cadastrar")} className="text-left text-brand-blue hover:underline">
              Primeiro acesso? Criar cadastro
            </button>
            <button type="button" onClick={() => setModo("recuperar")} className="text-left text-slate-500 hover:underline">
              Esqueci minha senha
            </button>
          </>
        )}
      </div>
    </div>
  );
}
