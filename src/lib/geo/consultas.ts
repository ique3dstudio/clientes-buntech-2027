/** Consultas públicas feitas direto do navegador (sem chave de API). */

export type DadosCnpj = {
  razao_social: string | null;
  nome_fantasia: string | null;
  endereco: string | null;
  cidade: string | null;
  uf: string | null;
  cep: string | null;
  telefone: string | null;
  email: string | null;
  situacao: string | null;
  /** Administrador/sócio indicado na Receita — sugestão de pessoa de contato */
  responsavel: { nome: string; cargo: string | null } | null;
};

/** Receita Federal via BrasilAPI. Devolve null se o CNPJ não for encontrado. */
export async function consultarCnpj(cnpj: string): Promise<DadosCnpj | null> {
  const r = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
  if (r.status === 404) return null;
  if (!r.ok) throw new Error("Consulta de CNPJ indisponível no momento.");
  const d = (await r.json()) as Record<string, string | number | null>;
  const s = (k: string) => (d[k] == null || d[k] === "" ? null : String(d[k]).trim());
  const rua = [s("descricao_tipo_de_logradouro"), s("logradouro")].filter(Boolean).join(" ");
  const endereco = [rua, s("numero"), s("complemento"), s("bairro")].filter(Boolean).join(", ") || null;
  const qsa = (Array.isArray(d.qsa) ? d.qsa : []) as unknown as { nome_socio?: string; qualificacao_socio?: string }[];
  const chefe = qsa.find((q) => /administrador|diretor|presidente/i.test(q.qualificacao_socio ?? "")) ?? qsa[0];
  const nomeProprio = (t: string) => t.toLowerCase().replace(/(^|\s)(\p{L})/gu, (_, a, b) => a + b.toUpperCase());
  return {
    responsavel: chefe?.nome_socio ? { nome: nomeProprio(chefe.nome_socio), cargo: chefe.qualificacao_socio ?? null } : null,
    razao_social: s("razao_social"),
    nome_fantasia: s("nome_fantasia"),
    endereco,
    cidade: s("municipio"),
    uf: s("uf"),
    cep: s("cep"),
    telefone: s("ddd_telefone_1"),
    email: s("email"),
    situacao: s("descricao_situacao_cadastral"),
  };
}

export type ResultadoGeocodificacao = { lat: number; lng: number; descricao: string };

/** Endereço → coordenadas (OpenStreetMap/Nominatim). Uso leve: apenas ao clicar no botão. */
export async function geocodificar(consulta: string): Promise<ResultadoGeocodificacao[]> {
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&countrycodes=br&limit=5&accept-language=pt-BR&q=${encodeURIComponent(consulta)}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error("Busca de endereço indisponível no momento.");
  const lista = (await r.json()) as { lat: string; lon: string; display_name: string }[];
  return lista.map((x) => ({ lat: Number(x.lat), lng: Number(x.lon), descricao: x.display_name }));
}
