import type { SupabaseClient } from "@supabase/supabase-js";
import { idb } from "./db";

export type ItemFila = {
  id: string; // também é o id da interação no banco: reenviar nunca duplica
  criadoEm: string;
  clienteId: string;
  clienteNome?: string;
  tipo: string;
  descricao: string;
  autor: string;
  gps: { lat: number; lng: number } | null;
  retorno: string | null;
  foto: Blob | null;
  tentativas: number;
  erro?: string;
};

export type NovoRegistro = Omit<ItemFila, "id" | "criadoEm" | "tentativas" | "erro">;

export const EVENTO_FILA = "buntech:fila";
const avisar = () => window.dispatchEvent(new Event(EVENTO_FILA));

export const contarFila = async () => (await idb.todos<ItemFila>("fila")).length;
export const listarFila = () => idb.todos<ItemFila>("fila");

/** Erro de rede (sem sinal) — diferente de erro de regra do banco. */
export function ehErroDeRede(e: unknown) {
  const msg = String((e as { message?: string })?.message ?? e).toLowerCase();
  return !navigator.onLine || msg.includes("failed to fetch") || msg.includes("network") || msg.includes("load failed") || msg.includes("fetch");
}

async function enviar(supabase: SupabaseClient, item: ItemFila) {
  let foto_path: string | null = null;
  if (item.foto) {
    const ext = item.foto.type === "image/png" ? "png" : item.foto.type === "image/webp" ? "webp" : "jpg";
    foto_path = `${item.clienteId}/${item.id}.${ext}`;
    const { error } = await supabase.storage.from("visitas").upload(foto_path, item.foto, { contentType: item.foto.type, upsert: true });
    if (error) throw error;
  }
  const { error } = await supabase.from("interacoes").insert({
    id: item.id, cliente_id: item.clienteId, tipo: item.tipo, descricao: item.descricao, autor_nome: item.autor,
    data: item.criadoEm, foto_path,
    localizacao: item.gps ? `SRID=4326;POINT(${item.gps.lng} ${item.gps.lat})` : null,
  });
  if (error && error.code !== "23505") throw error; // 23505 = já foi enviado antes
  if (item.retorno && !error) {
    await supabase.from("tarefas").insert({ cliente_id: item.clienteId, titulo: "Retornar ao cliente após a visita", vencimento: item.retorno });
  }
}

/** Tenta enviar na hora; se estiver sem sinal, guarda na fila e devolve "fila". */
export async function registrar(supabase: SupabaseClient, novo: NovoRegistro): Promise<"enviado" | "fila"> {
  const item: ItemFila = { ...novo, id: crypto.randomUUID(), criadoEm: new Date().toISOString(), tentativas: 0 };
  if (navigator.onLine) {
    try {
      await enviar(supabase, item);
      return "enviado";
    } catch (e) {
      if (!ehErroDeRede(e)) throw e;
    }
  }
  await idb.gravar("fila", item);
  avisar();
  return "fila";
}

let enviando = false;
/** Envia tudo que está na fila. Devolve quantos foram enviados. */
export async function sincronizarFila(supabase: SupabaseClient) {
  if (enviando || !navigator.onLine) return 0;
  enviando = true;
  let ok = 0;
  try {
    const itens = (await listarFila()).sort((a, b) => a.criadoEm.localeCompare(b.criadoEm));
    for (const item of itens) {
      try {
        await enviar(supabase, item);
        await idb.apagar("fila", item.id);
        ok++;
      } catch (e) {
        if (ehErroDeRede(e)) break;
        await idb.gravar("fila", { ...item, tentativas: item.tentativas + 1, erro: String((e as { message?: string })?.message ?? e) });
      }
    }
  } finally {
    enviando = false;
    avisar();
  }
  return ok;
}
