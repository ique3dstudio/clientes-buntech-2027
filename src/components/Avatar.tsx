/** Foto de perfil redonda; sem foto, mostra as iniciais no degradê da marca. */
export function Avatar({ nome, fotoUrl, className = "size-9 text-sm" }: { nome: string; fotoUrl: string | null; className?: string }) {
  const iniciais = nome.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join("") || "?";
  if (fotoUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={fotoUrl} alt="" className={`shrink-0 rounded-full object-cover shadow-sm ring-2 ring-white ${className}`} />;
  }
  return (
    <span aria-hidden className={`grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-blue to-brand-teal font-bold text-white shadow-sm ${className}`}>
      {iniciais}
    </span>
  );
}
