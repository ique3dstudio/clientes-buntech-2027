import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Papel } from "@/lib/papeis";

export type Usuario = {
  id: string;
  email: string;
  nome: string;
  papel: Papel;
  vendedorId: string | null;
};

/** Data Access Layer: usuário logado + perfil. Redireciona para /login se não houver sessão. */
export async function getUsuario(): Promise<Usuario> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");

  const { data: perfil } = await supabase
    .from("perfis")
    .select("nome, papel, vendedor_id")
    .eq("id", data.user.id)
    .single();

  return {
    id: data.user.id,
    email: data.user.email ?? "",
    nome: perfil?.nome || data.user.email || "",
    papel: (perfil?.papel as Papel) ?? "pendente",
    vendedorId: perfil?.vendedor_id ?? null,
  };
}

export async function exigirAdmin(): Promise<Usuario> {
  const u = await getUsuario();
  if (u.papel !== "admin") redirect("/");
  return u;
}
