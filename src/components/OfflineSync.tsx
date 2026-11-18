"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { createClient } from "@/lib/supabase/client";
import { idb } from "@/lib/offline/db";
import { EVENTO_FILA, contarFila, sincronizarFila } from "@/lib/offline/fila";
import { CLAVE_ATUALIZADO, atualizarCopiaLocal } from "@/lib/offline/copia";

const assinarRede = (cb: () => void) => {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => { window.removeEventListener("online", cb); window.removeEventListener("offline", cb); };
};

/** Registra o service worker, envia a fila quando volta o sinal, mantém a cópia local dos clientes e mostra o aviso de conexão. */
export function OfflineSync() {
  const online = useSyncExternalStore(assinarRede, () => navigator.onLine, () => true);
  const [pendentes, setPendentes] = useState(0);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

  useEffect(() => {
    const supabase = createClient();
    let vivo = true;
    const atualizarContagem = () => { contarFila().then((n) => vivo && setPendentes(n)).catch(() => {}); };
    async function rodar() {
      if (!navigator.onLine) return atualizarContagem();
      const { data } = await supabase.auth.getSession();
      if (!data.session) { await idb.substituir("clientes", []).catch(() => {}); return; } // saiu da conta: apaga a cópia local
      const uid = data.session.user.id;
      const { data: perfil } = await supabase.from("perfis").select("nome").eq("id", uid).maybeSingle();
      await idb.gravar("meta", { chave: "autor", valor: perfil?.nome || data.session.user.email || "" }).catch(() => {});
      const enviados = await sincronizarFila(supabase);
      if (vivo && enviados) setMsg(`${enviados} registro(s) feito(s) sem sinal foram enviados.`);
      atualizarContagem();
      const ultima = await idb.obter<{ chave: string; valor: number }>("meta", CLAVE_ATUALIZADO).catch(() => undefined);
      if (!ultima || Date.now() - ultima.valor > 6 * 3600_000) await atualizarCopiaLocal(supabase).catch(() => {});
    }
    rodar();
    window.addEventListener("online", rodar);
    window.addEventListener(EVENTO_FILA, atualizarContagem);
    return () => { vivo = false; window.removeEventListener("online", rodar); window.removeEventListener(EVENTO_FILA, atualizarContagem); };
  }, []);

  if (online && !pendentes && !msg) return null;
  return (
    <div role="status" className={`fixed inset-x-0 bottom-0 z-50 px-4 py-2 text-center text-sm font-medium print:hidden ${online ? "bg-emerald-600 text-white" : "bg-amber-500 text-amber-950"}`}>
      {!online
        ? `Sem sinal — o app continua funcionando. ${pendentes ? `${pendentes} registro(s) aguardando envio.` : ""} `
        : pendentes
          ? `Enviando ${pendentes} registro(s)…`
          : msg}
      {!online && <a href="/offline" className="underline">Abrir clientes salvos</a>}
      {online && msg && !pendentes && <button onClick={() => setMsg(null)} className="ml-3 underline">ok</button>}
    </div>
  );
}
