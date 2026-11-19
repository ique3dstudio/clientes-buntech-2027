export const PAPEIS = ["pendente", "leitura", "externo", "vendedor", "coordenador", "gerente", "admin"] as const;
export type Papel = (typeof PAPEIS)[number];

export const ROTULO_PAPEL: Record<Papel, string> = {
  pendente: "Aguardando aprovação",
  leitura: "Somente leitura",
  externo: "Representante externo",
  vendedor: "Vendedor",
  coordenador: "Coordenador",
  gerente: "Gerente",
  admin: "Administrador",
};

export const DESCRICAO_PAPEL: Record<Papel, string> = {
  pendente: "Sem acesso até um administrador aprovar.",
  leitura: "Vê mapa e painéis, não edita.",
  externo: "Vê e edita só os clientes do próprio território.",
  vendedor: "Vê todos os clientes; edita os do próprio território.",
  coordenador: "Acompanha todos os clientes, painéis e relatórios.",
  gerente: "Acompanha todos os clientes, painéis e relatórios.",
  admin: "Acesso total, inclusive usuários e territórios.",
};

/** Papéis que criam e alteram dados. */
export function podeEscrever(papel: Papel): boolean {
  return papel === "admin" || papel === "vendedor" || papel === "externo";
}

/** Papéis que exportam planilhas. */
export function podeExportarDados(papel: Papel): boolean {
  return papel === "admin" || papel === "gerente" || papel === "coordenador" || papel === "vendedor";
}
