/**
 * "Mantenha-me conectado": quando desmarcado, gravamos o cookie `bt_manter=0`
 * (cookie de sessão) e os cookies de login do Supabase passam a ser de sessão
 * também — fechou o navegador, saiu da conta.
 */
export const COOKIE_MANTER = "bt_manter";

type Opcoes = { maxAge?: number; expires?: Date; [k: string]: unknown };

export function ajustarOpcoes<T extends Opcoes>(opcoes: T, manterConectado: boolean): T {
  if (manterConectado) return opcoes;
  // maxAge 0 = remoção do cookie; precisa ser preservado
  if (opcoes.maxAge === 0) return opcoes;
  const resto = { ...opcoes };
  delete resto.maxAge;
  delete resto.expires;
  return resto;
}

export function manterConectado(valorCookie: string | undefined) {
  return valorCookie !== "0";
}
