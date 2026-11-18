import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_KEY, SUPABASE_URL } from "@/lib/supabase/env";
import { COOKIE_MANTER, ajustarOpcoes, manterConectado } from "@/lib/supabase/sessao";

const ROTAS_PUBLICAS = ["/login", "/auth"];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const manter = manterConectado(request.cookies.get(COOKIE_MANTER)?.value);

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (toSet, headers) => {
        toSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, ajustarOpcoes(options, manter)));
        Object.entries(headers ?? {}).forEach(([k, v]) => response.headers.set(k, v));
      },
    },
  });

  // Renova a sessão e faz a checagem otimista de login
  const { data } = await supabase.auth.getClaims();
  const logado = Boolean(data?.claims);
  const publica = ROTAS_PUBLICAS.some((r) => request.nextUrl.pathname.startsWith(r));

  if (!logado && !publica) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|brand/|maplibre/|data/|icon|apple-icon|manifest.webmanifest|favicon.ico|sw.js|offline).*)"],
};
