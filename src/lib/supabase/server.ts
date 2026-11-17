import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { SUPABASE_KEY, SUPABASE_URL } from "./env";
import { COOKIE_MANTER, ajustarOpcoes, manterConectado } from "./sessao";

export async function createClient() {
  // Sempre em tempo de requisição: o cliente do Supabase usa Date.now() ao ler a sessão
  await connection();
  const cookieStore = await cookies();
  const manter = manterConectado(cookieStore.get(COOKIE_MANTER)?.value);
  return createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (toSet) => {
        try {
          toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, ajustarOpcoes(options, manter)));
        } catch {
          // Chamado de um Server Component: o proxy já renova a sessão.
        }
      },
    },
  });
}
