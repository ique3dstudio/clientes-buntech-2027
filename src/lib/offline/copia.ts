import type { SupabaseClient } from "@supabase/supabase-js";
import { idb } from "./db";

export const CLAVE_ATUALIZADO = "clientes_atualizado";

export type ClienteLocal = {
  id: string; nome: string; cidade: string | null; uf: string | null; status: "prospect" | "carteira" | "perdido";
  lat: number | null; lng: number | null; ultima_compra: string | null;
};

/** Baixa os clientes que o usuário pode ver (o banco já filtra por papel/território) e guarda no aparelho. */
export async function atualizarCopiaLocal(supabase: SupabaseClient) {
  const todos: ClienteLocal[] = [];
  for (let de = 0; ; de += 1000) {
    const { data, error } = await supabase.from("clientes_mapa").select("id, nome, cidade, uf, status, lat, lng, ultima_compra").order("id").range(de, de + 999);
    if (error) throw error;
    todos.push(...(data as ClienteLocal[]));
    if (data.length < 1000) break;
  }
  await idb.substituir("clientes", todos);
  await idb.gravar("meta", { chave: CLAVE_ATUALIZADO, valor: Date.now() });
  return todos.length;
}
