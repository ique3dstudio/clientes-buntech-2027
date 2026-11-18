import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { ClienteMapa } from "@/lib/clientes";
import {
  clientesEmRisco, faturamentoPorAno, resumoAtividade, resumoFunil, resumoSituacao, resumoTerritorios, topClientes,
  type Atividade, type EtapaRef, type PedidoRec, type TerritorioRef, type VendaAno,
} from "@/lib/painel";

async function todas<T>(consulta: (de: number, ate: number) => PromiseLike<{ data: T[] | null }>): Promise<T[]> {
  const saida: T[] = [];
  for (let de = 0; ; de += 1000) {
    const { data } = await consulta(de, de + 999);
    saida.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return saida;
}

/** Carrega e resume tudo o que o painel e o relatório mensal mostram. */
export async function carregarPainel() {
  const supabase = await createClient();
  const hoje = new Date();
  const hojeIso = hoje.toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
  const desde30 = new Date(hoje.getTime() - 30 * 86400000).toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });

  const [clientes, visitas, atividades, vendas, pedidos, etapasR, terrR, tarefasR] = await Promise.all([
    todas<ClienteMapa>((a, b) => supabase.from("clientes_mapa").select("*").order("id").range(a, b)),
    todas<{ cliente_id: string }>((a, b) => supabase.from("interacoes").select("cliente_id").eq("tipo", "visita").order("id").range(a, b)),
    todas<Atividade>((a, b) => supabase.from("interacoes").select("tipo, data, autor_nome").gte("data", desde30).order("id").range(a, b)),
    todas<VendaAno>((a, b) => supabase.from("vendas_anuais").select("cliente_id, ano, faturamento, quantidade").order("id").range(a, b)),
    todas<PedidoRec>((a, b) => supabase.from("pedidos").select("cliente_id, data, valor_total, quantidade, unidade").order("id").range(a, b)),
    supabase.from("funil_etapas").select("id, nome, cor, ordem").order("ordem").returns<EtapaRef[]>(),
    supabase.from("territorios_resumo").select("id, nome, cor, vendedor").order("ordem").returns<TerritorioRef[]>(),
    supabase.from("tarefas").select("id", { count: "exact", head: true }).is("concluida_em", null).lt("vencimento", hojeIso),
  ]);

  const nomes = new Map(clientes.map((c) => [c.id, c.nome]));
  return {
    geradoEm: hoje.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }),
    situacao: resumoSituacao(clientes),
    funil: resumoFunil(clientes, etapasR.data ?? []),
    territorios: resumoTerritorios(clientes, terrR.data ?? [], new Set(visitas.map((v) => v.cliente_id))),
    risco: clientesEmRisco(clientes, 6, hoje),
    atividade: resumoAtividade(atividades, desde30),
    faturamento: faturamentoPorAno(vendas, pedidos),
    top: topClientes(vendas, pedidos, nomes, 10),
    tarefasAtrasadas: tarefasR.count ?? 0,
  };
}

export type DadosPainel = Awaited<ReturnType<typeof carregarPainel>>;
