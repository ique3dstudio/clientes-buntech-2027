export function Carregando({ texto = "Carregando…" }: { texto?: string }) {
  return (
    <div className="flex flex-1 items-center justify-center py-24 text-slate-400" role="status">
      <span className="mr-3 size-5 animate-spin rounded-full border-2 border-slate-300 border-t-brand-blue" />
      {texto}
    </div>
  );
}
