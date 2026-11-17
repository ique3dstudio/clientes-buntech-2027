export const PAPEIS = ["pendente", "leitura", "externo", "vendedor", "gerente", "admin"] as const;
export type Papel = (typeof PAPEIS)[number];

export const ROTULO_PAPEL: Record<Papel, string> = {
  pendente: "Aguardando aprovação",
  leitura: "Somente leitura",
  externo: "Representante externo",
  vendedor: "Vendedor",
  gerente: "Gerente",
  admin: "Administrador",
};

export const DESCRICAO_PAPEL: Record<Papel, string> = {
  pendente: "Sem acesso até um administrador aprovar.",
  leitura: "Vê mapa e painéis, não edita.",
  externo: "Vê e edita só os clientes do próprio território.",
  vendedor: "Vê todos os clientes; edita os do próprio território.",
  gerente: "Vê e edita todos os clientes.",
  admin: "Acesso total, inclusive usuários e territórios.",
};
