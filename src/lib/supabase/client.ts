import { createBrowserClient } from "@supabase/ssr";
import { parse, serialize } from "cookie";
import { SUPABASE_KEY, SUPABASE_URL } from "./env";
import { COOKIE_MANTER, ajustarOpcoes, manterConectado } from "./sessao";

export function createClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll: () =>
        Object.entries(parse(document.cookie)).map(([name, value]) => ({ name, value: value ?? "" })),
      setAll: (toSet) => {
        const manter = manterConectado(parse(document.cookie)[COOKIE_MANTER]);
        toSet.forEach(({ name, value, options }) => {
          document.cookie = serialize(name, value, ajustarOpcoes(options, manter));
        });
      },
    },
  });
}

/** Grava a preferência antes do login. */
export function definirManterConectado(manter: boolean) {
  document.cookie = manter
    ? serialize(COOKIE_MANTER, "", { path: "/", maxAge: 0 })
    : serialize(COOKIE_MANTER, "0", { path: "/", sameSite: "lax" });
}
