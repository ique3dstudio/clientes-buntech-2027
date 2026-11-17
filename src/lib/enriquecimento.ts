/** Funções puras para tratar resultados de pesquisa na internet (usadas por /api/enriquecer). */
import { normalizar } from "@/lib/texto";

const DIRETORIOS = [
  "cnpj.biz", "cnpja.com", "cnpj.info", "econodata", "casadosdados", "empresascnpj", "consultasocio", "cnpj.services", "informecadastral",
  "linkedin.", "facebook.", "instagram.", "youtube.", "twitter.", "x.com", "tiktok.", "google.", "bing.", "mapquest", "glassdoor", "indeed.",
  "jusbrasil", "solutudo", "telelistas", "apontador", "guiamais", "serasa", "reclameaqui", "wikipedia", "gov.br", "mercadolivre", "olx.",
  "tripadvisor", "waze.", "yelp.", "cylex", "empresaqui", "listamais", "brasilapi", "receita", "escavador", "transparencia", "opencnpj",
];

export function dominio(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, "").toLowerCase(); } catch { return ""; }
}

export function ehDiretorio(url: string): boolean {
  const d = dominio(url);
  return !d || DIRETORIOS.some((x) => d.includes(x));
}

/** Palavras do nome que ajudam a reconhecer o site da empresa. */
function palavrasChave(nome: string): string[] {
  const ignorar = new Set(["ltda", "eireli", "sementes", "semente", "agro", "agricola", "comercio", "industria", "servicos", "epp", "de", "da", "do", "dos", "das", "me", "sa"]);
  return normalizar(nome).split(" ").filter((p) => p.length >= 4 && !ignorar.has(p));
}

export type ResultadoBusca = { url: string; title?: string; description?: string };

/** Escolhe os sites com mais cara de ser da própria empresa (sem diretórios/redes sociais). */
export function escolherSites(resultados: ResultadoBusca[], nomes: string[], max = 3): { url: string; titulo: string; pontos: number }[] {
  const chaves = [...new Set(nomes.flatMap(palavrasChave))];
  return resultados
    .filter((r) => r.url && !ehDiretorio(r.url))
    .map((r) => {
      const d = normalizar(dominio(r.url));
      const texto = normalizar(`${r.title ?? ""} ${r.description ?? ""}`);
      let pontos = 0;
      for (const c of chaves) {
        if (d.replace(/ /g, "").includes(c)) pontos += 3;
        if (texto.includes(c)) pontos += 1;
      }
      return { url: new URL(r.url).origin, titulo: r.title ?? dominio(r.url), pontos };
    })
    .filter((r, i, arr) => arr.findIndex((x) => x.url === r.url) === i)
    .filter((r) => r.pontos > 0)
    .sort((a, b) => b.pontos - a.pontos)
    .slice(0, max);
}

export function extrairEmails(texto: string): string[] {
  const achados = texto.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g) ?? [];
  const lixo = /\.(png|jpe?g|gif|svg|webp|css|js)$|sentry|wixpress|example\.|seudominio|@2x|schema\.org|domain\.com/i;
  return [...new Set(achados.map((e) => e.toLowerCase()).filter((e) => !lixo.test(e)))].slice(0, 6);
}

export function extrairTelefones(texto: string): string[] {
  const achados = texto.match(/\(?\b\d{2}\)?[\s.-]?9?\d{4}[\s.-]?\d{4}\b/g) ?? [];
  const limpos = achados.map((t) => t.replace(/\D/g, "")).filter((d) => d.length === 10 || d.length === 11);
  return [...new Set(limpos)].slice(0, 6);
}

export function formatarTelefone(valor: string): string {
  const d = valor.replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, "");
  if (d.length === 11) return d.replace(/^(\d{2})(\d{5})(\d{4})$/, "($1) $2-$3");
  if (d.length === 10) return d.replace(/^(\d{2})(\d{4})(\d{4})$/, "($1) $2-$3");
  return valor;
}
