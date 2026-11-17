import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { escolherSites, extrairEmails, extrairTelefones, type ResultadoBusca } from "@/lib/enriquecimento";

/**
 * Sugere site, e-mails e telefones de um cliente a partir de uma pesquisa na internet (Firecrawl).
 * Precisa da variável FIRECRAWL_API_KEY no servidor; sem ela devolve 501.
 * Tudo volta como SUGESTÃO — quem decide é o usuário no formulário.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ erro: "nao_autenticado" }, { status: 401 });
  const { data: perfil } = await supabase.from("perfis").select("papel").eq("id", auth.user.id).single();
  if (!perfil || perfil.papel === "pendente" || perfil.papel === "leitura") return NextResponse.json({ erro: "sem_permissao" }, { status: 403 });

  const chave = process.env.FIRECRAWL_API_KEY;
  if (!chave) return NextResponse.json({ erro: "nao_configurado" }, { status: 501 });

  const corpo = (await req.json().catch(() => ({}))) as { nome?: string; razao_social?: string; cidade?: string; uf?: string };
  const nome = (corpo.nome ?? "").trim();
  if (!nome && !corpo.razao_social) return NextResponse.json({ erro: "informe_nome" }, { status: 400 });

  const cab = { "Content-Type": "application/json", Authorization: `Bearer ${chave}` };
  const consulta = [nome || corpo.razao_social, corpo.cidade, corpo.uf, "sementes"].filter(Boolean).join(" ");

  try {
    const rb = await fetch("https://api.firecrawl.dev/v2/search", {
      method: "POST", headers: cab, body: JSON.stringify({ query: consulta, limit: 8, country: "BR" }), signal: AbortSignal.timeout(25000),
    });
    if (!rb.ok) return NextResponse.json({ erro: "busca_falhou", detalhe: rb.status }, { status: 502 });
    const jb = (await rb.json()) as { data?: { web?: ResultadoBusca[] } | ResultadoBusca[] };
    const lista: ResultadoBusca[] = Array.isArray(jb.data) ? jb.data : (jb.data?.web ?? []);

    const sites = escolherSites(lista, [nome, corpo.razao_social ?? ""]);
    const emails = new Set<string>();
    const telefones = new Set<string>();
    // lê a página inicial do melhor candidato e a página de contato, se existir
    if (sites[0]) {
      for (const caminho of ["", "/contato"]) {
        try {
          const rs = await fetch("https://api.firecrawl.dev/v2/scrape", {
            method: "POST", headers: cab, signal: AbortSignal.timeout(25000),
            body: JSON.stringify({ url: sites[0].url + caminho, formats: ["markdown"], onlyMainContent: false }),
          });
          if (!rs.ok) continue;
          const js = (await rs.json()) as { data?: { markdown?: string } };
          const md = js.data?.markdown ?? "";
          extrairEmails(md).forEach((e) => emails.add(e));
          extrairTelefones(md).forEach((t) => telefones.add(t));
        } catch { /* página opcional */ }
      }
    }
    return NextResponse.json({ sites, emails: [...emails].slice(0, 6), telefones: [...telefones].slice(0, 6) });
  } catch {
    return NextResponse.json({ erro: "indisponivel" }, { status: 502 });
  }
}
