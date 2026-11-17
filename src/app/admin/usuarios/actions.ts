"use server";

import { revalidatePath } from "next/cache";
import { exigirAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PAPEIS, type Papel } from "@/lib/papeis";

export type ResultadoAcao = { ok: boolean; mensagem: string } | null;

export async function atualizarPerfil(_prev: ResultadoAcao, form: FormData): Promise<ResultadoAcao> {
  const admin = await exigirAdmin();
  const id = String(form.get("id") ?? "");
  const papel = String(form.get("papel") ?? "") as Papel;
  const vendedorId = String(form.get("vendedor_id") ?? "") || null;

  if (!PAPEIS.includes(papel)) return { ok: false, mensagem: "Papel inválido." };
  if ((papel === "vendedor" || papel === "externo") && !vendedorId)
    return { ok: false, mensagem: "Vincule um vendedor para este papel." };
  if (id === admin.id && papel !== "admin")
    return { ok: false, mensagem: "Você não pode remover o seu próprio acesso de administrador." };

  const supabase = await createClient();
  const { error } = await supabase.from("perfis").update({ papel, vendedor_id: vendedorId }).eq("id", id);
  if (error) return { ok: false, mensagem: error.message };

  revalidatePath("/admin/usuarios");
  return { ok: true, mensagem: "Salvo." };
}
