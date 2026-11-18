import Link from "next/link";
import { sair } from "@/app/actions";
import { Logo } from "@/components/Logo";
import { ROTULO_PAPEL } from "@/lib/papeis";
import type { Usuario } from "@/lib/auth";

export function Cabecalho({ usuario }: { usuario: Usuario }) {
  const iniciais = usuario.nome
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6">
        <Link href="/" className="shrink-0" aria-label="Início">
          <Logo priority className="h-9 w-auto" />
        </Link>
        <nav className="hidden items-center gap-1 text-sm font-medium text-slate-600 sm:flex">
          <Link href="/" className="rounded-md px-3 py-2 hover:bg-slate-100 hover:text-slate-900">
            Início
          </Link>
          <Link href="/mapa" className="rounded-md px-3 py-2 hover:bg-slate-100 hover:text-slate-900">
            Mapa
          </Link>
          {usuario.papel === "admin" && (
            <>
              <Link href="/admin/territorios" className="rounded-md px-3 py-2 hover:bg-slate-100 hover:text-slate-900">
                Territórios
              </Link>
              <Link href="/admin/enriquecer" className="rounded-md px-3 py-2 hover:bg-slate-100 hover:text-slate-900">
                Completar dados
              </Link>
              <Link href="/admin/importar" className="rounded-md px-3 py-2 hover:bg-slate-100 hover:text-slate-900">
                Importar
              </Link>
              <Link href="/admin/usuarios" className="rounded-md px-3 py-2 hover:bg-slate-100 hover:text-slate-900">
                Usuários
              </Link>
            </>
          )}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium leading-tight text-slate-900">{usuario.nome}</p>
            <p className="text-xs text-slate-500">{ROTULO_PAPEL[usuario.papel]}</p>
          </div>
          <span className="grid size-9 place-items-center rounded-full bg-gradient-to-br from-brand-blue to-brand-teal text-sm font-semibold text-white">
            {iniciais || "?"}
          </span>
          <form action={sair}>
            <button className="rounded-md px-2.5 py-1.5 text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-900">
              Sair
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
