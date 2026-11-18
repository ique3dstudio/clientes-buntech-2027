import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { normalizar } from "@/lib/texto";
import { escolherSites, extrairCnpjs, extrairEmails, extrairTelefones, similaridade, type ResultadoBusca } from "@/lib/enriquecimento";

/**
 * Pesquisa na internet (Firecrawl) por site, e-mails, telefones e CNPJ de um cliente.
 * O CNPJ só é devolvido se a Receita Federal (BrasilAPI) confirmar um cadastro parecido (nome + UF/cidade).
 * Tudo volta como SUGESTÃO com nível de confiança — quem grava é a tela de enriquecimento.
 * Precisa de FIRECRAWL_API_KEY no servidor; sem ela devolve 501.
 */
type Corpo = { nome?: string; razao_social?: string; cidade?: string; uf?: string; documento?: string };
type Cnpj = { numero: string; razao_social: string | null; nome_fantasia: string | null; municipio: string | null; uf: string | null; situacao: string | null; telefone: string | null; email: string | null; confianca: number };

async function consultarReceita(numero: string): Promise<Omit<Cnpj, "confianca"> | null> {
  try {
    const r = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${numero}`, { signal: AbortSignal.timeout(15000) });
    if (!r.ok) return null;
    const d = (await r.json()) as Record<string, string | null>;
    return {
      numero, razao_social: d.razao_social ?? null, nome_fantasia: d.nome_fantasia || null, municipio: d.municipio ?? null, uf: d.uf ?? null,
      situacao: d.descricao_situacao_cadastral ?? null, telefone: d.ddd_telefone_1 || null, email: d.email || null,
    };
  } catch { return null; }
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ erro: "nao_autenticado" }, { status: 401 });
  const { data: perfil } = await supabase.from("perfis").select("papel").eq("id", auth.user.id).single();
  if (!perfil || perfil.papel === "pendente" || perfil.papel === "leitura") return NextResponse.json({ erro: "sem_permissao" }, { status: 403 });

  const chave = process.env.FIRECRAWL_API_KEY;
  if (!chave) return NextResponse.json({ erro: "nao_configurado" }, { status: 501 });

  const corpo = (await req.json().catch(() => ({}))) as Corpo;
  const nome = (corpo.nome ?? "").trim();
  const razao = (corpo.razao_social ?? "").trim();
  if (!nome && !razao) return NextResponse.json({ erro: "informe_nome" }, { status: 400 });

  const cab = { "Content-Type": "application/json", Authorization: `Bearer ${chave}` };
  const buscar = async (query: string): Promise<ResultadoBusca[]> => {
    const rb = await fetch("https://api.firecrawl.dev/v2/search", {
      method: "POST", headers: cab, body: JSON.stringify({ query, limit: 8, country: "BR" }), signal: AbortSignal.timeout(25000),
    });
    if (!rb.ok) throw new Error(`busca ${rb.status}`);
    const jb = (await rb.json()) as { data?: { web?: ResultadoBusca[] } | ResultadoBusca[] };
    return Array.isArray(jb.data) ? jb.data : (jb.data?.web ?? []);
  };

  try {
    const base = [nome || razao, corpo.cidade, corpo.uf].filter(Boolean).join(" ");
    const lista = await buscar(`${base} sementes`);
    const sites = escolherSites(lista, [nome, razao]);

    const emails = new Set<string>();
    const telefones = new Set<string>();
    if (sites[0]) {
      for (const caminho of ["", "/contato"]) {
        try {
          const rs = await fetch("https://api.firecrawl.dev/v2/scrape", {
            method: "POST", headers: cab, signal: AbortSignal.timeout(25000),
            body: JSON.stringify({ url: sites[0].url + caminho, formats: ["markdown"], onlyMainContent: false }),
          });
          if (!rs.ok) continue;
          const md = ((await rs.json()) as { data?: { markdown?: string } }).data?.markdown ?? "";
          extrairEmails(md).forEach((e) => emails.add(e));
          extrairTelefones(md).forEach((t) => telefones.add(t));
        } catch { /* página opcional */ }
      }
    }

    // CNPJ: procura em páginas de cadastro e confirma na Receita
    let cnpj: Cnpj | null = null;
    if (!corpo.documento) {
      const achados = await buscar(`${razao || nome} ${corpo.cidade ?? ""} ${corpo.uf ?? ""} CNPJ`);
      const candidatos = [...new Set(achados.flatMap((a) => extrairCnpjs(`${a.title ?? ""} ${a.description ?? ""} ${a.url}`)))].slice(0, 4);
      for (const numero of candidatos) {
        const rc = await consultarReceita(numero);
        if (!rc) continue;
        const nomeSim = Math.max(similaridade(nome, rc.razao_social ?? ""), similaridade(nome, rc.nome_fantasia ?? ""), razao ? similaridade(razao, rc.razao_social ?? "") : 0);
        const confianca = nomeSim + (corpo.uf && rc.uf === corpo.uf ? 0.25 : 0) + (corpo.cidade && rc.municipio && normalizar(rc.municipio) === normalizar(corpo.cidade) ? 0.25 : 0);
        if (nomeSim > 0 && (!cnpj || confianca > cnpj.confianca)) cnpj = { ...rc, confianca };
      }
    }
    return NextResponse.json({ sites, emails: [...emails].slice(0, 6), telefones: [...telefones].slice(0, 6), cnpj });
  } catch {
    return NextResponse.json({ erro: "indisponivel" }, { status: 502 });
  }
}
