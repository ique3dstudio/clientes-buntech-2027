"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

/** Foto da visita: só busca o link (válido por 10 min) quando a pessoa pede para ver. */
export function FotoVisita({ caminho }: { caminho: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [erro, setErro] = useState(false);

  async function abrir() {
    const { data, error } = await createClient().storage.from("visitas").createSignedUrl(caminho, 600);
    if (error || !data) return setErro(true);
    setUrl(data.signedUrl);
  }

  if (erro) return <p className="text-xs text-red-600">Não consegui abrir a foto.</p>;
  if (!url) return <button onClick={abrir} className="mt-1 text-xs text-brand-blue underline">📷 Ver foto</button>;
  // eslint-disable-next-line @next/next/no-img-element
  return <a href={url} target="_blank" rel="noreferrer"><img src={url} alt="Foto da visita" className="mt-2 max-h-56 rounded-lg border border-slate-200" /></a>;
}
