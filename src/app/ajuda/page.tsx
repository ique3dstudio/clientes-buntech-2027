import type { Metadata } from "next";
import { Suspense } from "react";
import { getUsuario } from "@/lib/auth";
import { Cabecalho } from "@/components/Cabecalho";
import { Carregando } from "@/components/Carregando";
import { AguardandoAprovacao } from "@/components/AguardandoAprovacao";

export const metadata: Metadata = { title: "Ajuda e treinamento" };

export default function AjudaPage() {
  return (
    <Suspense fallback={<Carregando />}>
      <Conteudo />
    </Suspense>
  );
}

const PASSOS: { titulo: string; itens: string[] }[] = [
  {
    titulo: "1. Primeiro acesso",
    itens: [
      "Entre com o e-mail e a senha. Marque “Mantenha-me conectado” no seu celular. Esqueceu a senha? Use “Esqueci a minha senha”.",
      "Novos usuários ficam “aguardando aprovação” até o administrador liberar e definir o perfil.",
      "No celular, abra o app no navegador e use “Adicionar à tela inicial” para instalar. Abra uma vez com internet para baixar seus clientes para uso sem sinal.",
    ],
  },
  {
    titulo: "2. Mapa",
    itens: [
      "Cada ponto é a unidade de produção/tratamento da empresa — nunca revenda ou filial. Verde = cliente, azul = prospect, cinza = perdido.",
      "As linhas tracejadas coloridas são os territórios de cada vendedor. Fora delas é “área livre”.",
      "Use os filtros (frente, status, território, vendedor) e toque em um ponto para abrir o resumo; “Abrir ficha” mostra tudo do cliente.",
      "Pontos “aproximados” estão no centro da cidade. Corrija arrastando o pino em Editar cliente.",
    ],
  },
  {
    titulo: "3. Ficha do cliente e novo cadastro",
    itens: [
      "Em Novo cliente, digite o CNPJ: o app preenche razão social, endereço e contatos pela internet. Confira o local da unidade de produção e ajuste o pino se precisar.",
      "Na ficha: contatos, unidades, produtos/frentes, histórico de contatos, vendas e pedidos.",
      "Registre toda conversa em “Histórico de contatos”. Visita? Use “Registrar visita”: GPS, foto, anotação e data de retorno.",
    ],
  },
  {
    titulo: "4. Funil, tarefas e rotas",
    itens: [
      "Funil: arraste o cartão entre as etapas conforme a negociação avança. Ao perder, informe o motivo.",
      "Tarefas: lista do dia e atrasadas; conclua com um toque.",
      "Rotas: escolha clientes (ou “perto de mim”), monte a sequência e abra no Google Maps ou Waze.",
    ],
  },
  {
    titulo: "5. Sem sinal (campo)",
    itens: [
      "Sem internet, aparece a faixa amarela. Toque em “Abrir clientes salvos” para buscar o cliente e registrar visita, ligação ou anotação, com foto e GPS.",
      "Tudo fica guardado no aparelho e é enviado sozinho quando o sinal volta (faixa verde). Não precisa fazer nada.",
      "Mapa, ficha completa e painéis exigem internet.",
    ],
  },
  {
    titulo: "6. Painel e relatório (gestão)",
    itens: [
      "Painel: cobertura por território, funil, faturamento, maiores clientes, atividade por vendedor e clientes em risco (6+ meses sem comprar).",
      "Relatório mensal: abra, clique em “Imprimir / Salvar PDF” e escolha “Salvar como PDF”. Use na reunião da diretoria.",
      "Exportar (Excel/CSV): só administrador, gerente, coordenador e vendedor. Representante externo e leitura não exportam.",
    ],
  },
  {
    titulo: "7. Administrador",
    itens: [
      "Usuários: aprove novos acessos e defina o perfil (administrador, gerente, coordenador, vendedor, externo, leitura) e o vendedor ligado.",
      "Territórios: defina o responsável de cada território e mova municípios entre territórios; os clientes são reatribuídos automaticamente.",
      "Importar: planilhas de clientes. Completar dados: busca CNPJ, site, e-mail e telefone na internet — sempre revise antes de confiar.",
      "Cuidado com LGPD: não compartilhe planilhas de clientes por mensageiros nem as guarde em repositórios.",
    ],
  },
];

async function Conteudo() {
  const usuario = await getUsuario();
  if (usuario.papel === "pendente") return <AguardandoAprovacao nome={usuario.nome} />;
  return (
    <>
      <Cabecalho usuario={usuario} />
      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
        <h1 className="text-xl font-semibold text-slate-900">Ajuda e treinamento</h1>
        <p className="mb-6 text-sm text-slate-500">Guia rápido do app de prospecção Buntech 2027.</p>
        <div className="space-y-4">
          {PASSOS.map((p) => (
            <section key={p.titulo} className="rounded-xl border border-slate-200 bg-white p-4">
              <h2 className="mb-2 text-sm font-semibold text-slate-900">{p.titulo}</h2>
              <ul className="list-disc space-y-1.5 pl-5 text-sm text-slate-700">
                {p.itens.map((i) => <li key={i}>{i}</li>)}
              </ul>
            </section>
          ))}
        </div>
      </main>
    </>
  );
}
