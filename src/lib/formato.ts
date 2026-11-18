export const brl = (v: number | null | undefined) =>
  v == null ? "—" : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export const toneladas = (v: number | null | undefined) =>
  v == null ? "—" : `${v.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} t`;

/** "2026-09-23" → "23/09/2026" (sem passar por fuso horário) */
export const dataBr = (iso: string | null | undefined) => {
  if (!iso) return "—";
  const [a, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${a}`;
};

export const dataHoraBr = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

export const soDigitos = (s: string) => s.replace(/\D/g, "");

export const linkWhatsapp = (tel: string) => {
  const d = soDigitos(tel);
  return d.length >= 10 ? `https://wa.me/${d.startsWith("55") ? d : "55" + d}` : null;
};
