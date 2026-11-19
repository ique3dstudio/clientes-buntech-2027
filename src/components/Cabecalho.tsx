"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ChartBar, DotsThreeOutline, DownloadSimple, FunnelSimple, House, Lifebuoy, MapPinArea, MapTrifold, Path, SignOut, 
  UploadSimple, UsersThree, X, Sparkle, CheckSquareOffset, UserCircle, type Icon,
} from "@phosphor-icons/react";
import { sair } from "@/app/actions";
import { Logo } from "@/components/Logo";
import { Avatar } from "@/components/Avatar";
import { ROTULO_PAPEL, podeExportarDados } from "@/lib/papeis";
import type { Usuario } from "@/lib/auth";

type Item = { href: string; rotulo: string; icone: Icon };

export function Cabecalho({ usuario }: { usuario: Usuario }) {
  const caminho = usePathname();
  const [aberto, setAberto] = useState(false);
  const podeExportar = podeExportarDados(usuario.papel);
  const admin = usuario.papel === "admin";

  const principais: Item[] = [
    { href: "/mapa", rotulo: "Mapa", icone: MapTrifold },
    { href: "/funil", rotulo: "Funil", icone: FunnelSimple },
    { href: "/tarefas", rotulo: "Tarefas", icone: CheckSquareOffset },
    { href: "/rotas", rotulo: "Rotas", icone: Path },
  ];
  const secundarios: Item[] = [
    { href: "/", rotulo: "Início", icone: House },
    { href: "/painel", rotulo: "Painel", icone: ChartBar },
    ...(podeExportar ? [{ href: "/exportar", rotulo: "Exportar", icone: DownloadSimple }] : []),
    { href: "/ajuda", rotulo: "Ajuda", icone: Lifebuoy },
    { href: "/perfil", rotulo: "Meu perfil", icone: UserCircle },
  ];
  const administracao: Item[] = admin
    ? [
        { href: "/admin/territorios", rotulo: "Territórios", icone: MapPinArea },
        { href: "/admin/enriquecer", rotulo: "Completar dados", icone: Sparkle },
        { href: "/admin/importar", rotulo: "Importar", icone: UploadSimple },
        { href: "/admin/usuarios", rotulo: "Usuários", icone: UsersThree },
      ]
    : [];

  const ativo = (href: string) => (href === "/" ? caminho === "/" : caminho === href || caminho.startsWith(href + "/"));
  const noMenuMais = [...secundarios, ...administracao].some((i) => ativo(i.href));

  useEffect(() => {
    if (!aberto) return;
    const fechar = (e: KeyboardEvent) => e.key === "Escape" && setAberto(false);
    window.addEventListener("keydown", fechar);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", fechar); document.body.style.overflow = ""; };
  }, [aberto]);

  const legenda = (
    <>
      {usuario.codigo && <span className="font-semibold text-brand-blue-dark">Cód. {usuario.codigo}</span>}
      {usuario.codigo && " · "}
      {ROTULO_PAPEL[usuario.papel]}
    </>
  );

  const linkTopo = (i: Item) => (
    <Link
      key={i.href}
      href={i.href}
      aria-current={ativo(i.href) ? "page" : undefined}
      className={`relative rounded-full px-3.5 py-2 text-sm font-medium transition-[color,background-color,box-shadow] duration-300 ${
        ativo(i.href) ? "bg-gradient-to-r from-brand-blue to-brand-teal text-white shadow-brand" : "text-slate-600 hover:bg-brand-blue/10 hover:text-brand-blue-dark"
      }`}
    >
      {i.rotulo}
    </Link>
  );

  return (
    <>
      <header className="vidro sticky top-0 z-30 border-b border-slate-200/60 bg-white/75 shadow-[0_1px_0_rgb(11_143_208/0.08)] backdrop-blur-2xl backdrop-saturate-150 print:hidden">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4 sm:h-[4.25rem] sm:px-6">
          <Link href="/" className="shrink-0" aria-label="Início">
            <Logo priority className="h-8 w-auto sm:h-9" />
          </Link>

          <nav className="ml-4 hidden items-center gap-1 lg:flex" aria-label="Principal">
            {[...principais, ...secundarios.filter((i) => i.href !== "/ajuda" && i.href !== "/perfil")].map(linkTopo)}
            {admin && (
              <details className="group relative">
                <summary className="flex cursor-pointer list-none items-center gap-1 rounded-full px-3.5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-900/5 hover:text-slate-900 [&::-webkit-details-marker]:hidden">
                  Administração
                </summary>
                <div className="absolute left-0 top-full z-40 mt-2 w-56 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-lg">
                  {administracao.map((i) => (
                    <Link key={i.href} href={i.href} className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm ${ativo(i.href) ? "bg-slate-100 font-medium" : "text-slate-700 hover:bg-slate-50"}`}>
                      <i.icone size={18} /> {i.rotulo}
                    </Link>
                  ))}
                </div>
              </details>
            )}
          </nav>

          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <Link href="/ajuda" className="hidden rounded-full p-2 text-slate-500 hover:bg-slate-900/5 hover:text-slate-900 lg:block" aria-label="Ajuda">
              <Lifebuoy size={20} />
            </Link>
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold leading-tight text-slate-900">{usuario.nome}</p>
              <p className="text-xs text-slate-500">{legenda}</p>
            </div>
            <Link href="/perfil" aria-label="Meu perfil e foto" className="rounded-full transition-transform duration-300 [transition-timing-function:var(--ease-out)] hover:scale-105">
              <Avatar nome={usuario.nome} fotoUrl={usuario.fotoUrl} className="size-9 text-sm" />
            </Link>
            <form action={sair} className="hidden sm:block">
              <button className="flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-900/5 hover:text-slate-900" aria-label="Sair">
                <SignOut size={18} /> <span className="hidden xl:inline">Sair</span>
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Barra inferior (celular e tablet) */}
      <nav aria-label="Principal" className="vidro fixed inset-x-0 bottom-0 z-30 border-t border-slate-200/70 bg-white/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden print:hidden">
        <ul className="mx-auto grid h-[4.25rem] max-w-xl grid-cols-5">
          {principais.map((i) => (
            <li key={i.href}>
              <Link href={i.href} aria-current={ativo(i.href) ? "page" : undefined} className={`flex h-full flex-col items-center justify-center gap-0.5 text-[0.6875rem] font-medium transition-colors ${ativo(i.href) ? "text-brand-blue" : "text-slate-500"}`}>
                <span className={`grid h-7 w-12 place-items-center rounded-full transition-[background-color,transform] duration-300 [transition-timing-function:var(--ease-out)] ${ativo(i.href) ? "scale-105 bg-brand-blue/15" : ""}`}>
                  <i.icone size={22} weight={ativo(i.href) ? "fill" : "regular"} />
                </span>
                {i.rotulo}
              </Link>
            </li>
          ))}
          <li>
            <button onClick={() => setAberto(true)} aria-haspopup="dialog" className={`flex h-full w-full flex-col items-center justify-center gap-0.5 text-[0.6875rem] font-medium ${noMenuMais ? "text-brand-blue" : "text-slate-500"}`}>
              <span className={`grid h-7 w-12 place-items-center rounded-full ${noMenuMais ? "bg-brand-blue/12" : ""}`}>
                <DotsThreeOutline size={22} weight={noMenuMais ? "fill" : "regular"} />
              </span>
              Mais
            </button>
          </li>
        </ul>
      </nav>

      {aberto && (
        <div className="fixed inset-0 z-40 lg:hidden print:hidden" role="dialog" aria-modal="true" aria-label="Mais opções">
          <button className="absolute inset-0 bg-brand-ink/40 backdrop-blur-sm" onClick={() => setAberto(false)} aria-label="Fechar" />
          <div className="absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-3xl bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-lg [animation:subir_0.35s_var(--ease-suave)]">
            <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-slate-200" />
            <div className="mb-4 flex items-center gap-3">
              <Link href="/perfil" onClick={() => setAberto(false)} aria-label="Meu perfil e foto">
                <Avatar nome={usuario.nome} fotoUrl={usuario.fotoUrl} className="size-11 text-base" />
              </Link>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-slate-900">{usuario.nome}</p>
                <p className="text-sm text-slate-500">{legenda}</p>
              </div>
              <button onClick={() => setAberto(false)} className="rounded-full p-2 text-slate-500 hover:bg-slate-100" aria-label="Fechar"><X size={22} /></button>
            </div>
            <Grade titulo="Geral" itens={secundarios} ativo={ativo} fechar={() => setAberto(false)} />
            {administracao.length > 0 && <Grade titulo="Administração" itens={administracao} ativo={ativo} fechar={() => setAberto(false)} />}
            <form action={sair} className="mt-4">
              <button className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-100 py-3 font-medium text-slate-700 hover:bg-slate-200">
                <SignOut size={20} /> Sair da conta
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function Grade({ titulo, itens, ativo, fechar }: { titulo: string; itens: Item[]; ativo: (h: string) => boolean; fechar: () => void }) {
  return (
    <div className="mb-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{titulo}</p>
      <div className="grid grid-cols-3 gap-2.5">
        {itens.map((i) => (
          <Link key={i.href} href={i.href} onClick={fechar} className={`flex flex-col items-center gap-1.5 rounded-2xl p-3 text-center text-xs font-medium ${ativo(i.href) ? "bg-brand-blue/10 text-brand-blue" : "bg-slate-50 text-slate-700 hover:bg-slate-100"}`}>
            <i.icone size={24} weight={ativo(i.href) ? "fill" : "regular"} />
            {i.rotulo}
          </Link>
        ))}
      </div>
    </div>
  );
}
