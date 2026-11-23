"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { carregarMunicipios, UFS, type IndiceMunicipios, type Municipio } from "@/lib/geo/municipios";
import { consultarCnpj, geocodificar, type ResultadoGeocodificacao } from "@/lib/geo/consultas";
import { documentoValido, formatarDocumento, somenteDigitos } from "@/lib/documento";
import { formatarTelefone } from "@/lib/enriquecimento";
import { SeletorPonto, type Ponto } from "@/components/SeletorPonto";
import type { Papel } from "@/lib/papeis";

type Opcao = { id: number; nome: string };
type Form = {
  nome: string; razao_social: string; documento: string; site: string; email: string; telefone: string;
  endereco: string; cep: string; cidade: string; uf: string; municipio_ibge: string;
  status: "prospect" | "carteira" | "perdido"; etapa_id: string; motivo_perda_id: string; vendedor_id: string;
  porte: string; trata_sementes: string; equipamento: string; potencial_ton_ano: string; ritmo_ton_mes: string;
  alerta_financeiro: string; condicao_pagamento: string; observacoes: string;
};
type ContatoForm = { nome: string; cargo: string; telefone: string; email: string };
type Sugestoes = { sites: { url: string; titulo: string }[]; emails: string[]; telefones: string[] };
const CONTATO_VAZIO: ContatoForm = { nome: "", cargo: "", telefone: "", email: "" };

const VAZIO: Form = {
  nome: "", razao_social: "", documento: "", site: "", email: "", telefone: "", endereco: "", cep: "", cidade: "", uf: "",
  municipio_ibge: "", status: "prospect", etapa_id: "", motivo_perda_id: "", vendedor_id: "", porte: "", trata_sementes: "", equipamento: "",
  potencial_ton_ano: "", ritmo_ton_mes: "", alerta_financeiro: "", condicao_pagamento: "", observacoes: "",
};

const campo =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm shadow-sm outline-none focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/15";

const nulo = (s: string) => (s.trim() === "" ? null : s.trim());
const numero = (s: string) => (s.trim() === "" ? null : Number(s.replace(",", ".")));

export function ClienteForm({ clienteId, papel, vendedorId }: { clienteId?: string; papel: Papel; vendedorId: string | null }) {
  const router = useRouter();
  const gestao = papel === "admin";
  const [f, setF] = useState<Form>(VAZIO);
  const [frentes, setFrentes] = useState<Set<string>>(new Set(["pastagens"]));
  const [ponto, setPonto] = useState<Ponto | null>(null);
  const [precisao, setPrecisao] = useState<"exata" | "cidade" | "manual">("exata");
  const [vendedorOriginal, setVendedorOriginal] = useState("");
  const [carregando, setCarregando] = useState(Boolean(clienteId));
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [etapas, setEtapas] = useState<Opcao[]>([]);
  const [motivos, setMotivos] = useState<Opcao[]>([]);
  const [listaFrentes, setListaFrentes] = useState<{ slug: string; nome: string }[]>([]);
  const [vendedores, setVendedores] = useState<{ id: string; nome: string }[]>([]);
  const [idx, setIdx] = useState<IndiceMunicipios | null>(null);
  const [sugestoes, setSugestoes] = useState<Municipio[]>([]);
  const [consultando, setConsultando] = useState(false);
  const [achados, setAchados] = useState<ResultadoGeocodificacao[]>([]);
  const [contatos, setContatos] = useState<ContatoForm[]>([]);
  const [buscandoWeb, setBuscandoWeb] = useState(false);
  const [sugestoes_web, setSugestoesWeb] = useState<Sugestoes | null>(null);
  const [localSugerido, setLocalSugerido] = useState<string | null>(null);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((s) => ({ ...s, [k]: v }));

  useEffect(() => {
    let vivo = true;
    (async () => {
      const supabase = createClient();
      const [e, m, fr, v, municipios] = await Promise.all([
        supabase.from("funil_etapas").select("id, nome").order("ordem"),
        supabase.from("motivos_perda").select("id, nome").eq("ativo", true).order("id"),
        supabase.from("frentes").select("slug, nome").order("ordem"),
        supabase.from("vendedores").select("id, nome").eq("ativo", true).order("nome"),
        carregarMunicipios(),
      ]);
      if (!vivo) return;
      setEtapas(e.data ?? []); setMotivos(m.data ?? []); setListaFrentes(fr.data ?? []); setVendedores(v.data ?? []); setIdx(municipios);
      if (!clienteId) return;
      const [c, mapa, ct] = await Promise.all([
        supabase.from("clientes").select("*").eq("id", clienteId).single(),
        supabase.from("clientes_mapa").select("lat, lng, frentes").eq("id", clienteId).single(),
        supabase.from("contatos").select("nome, cargo, telefone, email").eq("cliente_id", clienteId).order("principal", { ascending: false }),
      ]);
      if (!vivo) return;
      if (c.error || !c.data) { setErro("Cliente não encontrado ou sem permissão de acesso."); setCarregando(false); return; }
      const d = c.data;
      const s = (x: unknown) => (x == null ? "" : String(x));
      setF({
        nome: s(d.nome), razao_social: s(d.razao_social), documento: d.documento ? formatarDocumento(d.documento) : "",
        site: s(d.site), email: s(d.email), telefone: s(d.telefone), endereco: s(d.endereco), cep: s(d.cep), cidade: s(d.cidade),
        uf: s(d.uf).trim(), municipio_ibge: s(d.municipio_ibge), status: d.status, etapa_id: s(d.etapa_id), motivo_perda_id: s(d.motivo_perda_id),
        vendedor_id: s(d.vendedor_id), porte: s(d.porte), trata_sementes: s(d.trata_sementes), equipamento: s(d.equipamento), potencial_ton_ano: s(d.potencial_ton_ano),
        ritmo_ton_mes: s(d.ritmo_ton_mes), alerta_financeiro: s(d.alerta_financeiro), condicao_pagamento: s(d.condicao_pagamento),
        observacoes: s(d.observacoes),
      });
      setContatos((ct.data ?? []).map((x) => ({ nome: x.nome ?? "", cargo: x.cargo ?? "", telefone: x.telefone ?? "", email: x.email ?? "" })));
      setVendedorOriginal(s(d.vendedor_id));
      setPrecisao(d.localizacao_precisao);
      if (mapa.data?.lat != null && mapa.data.lng != null) setPonto({ lat: mapa.data.lat, lng: mapa.data.lng });
      setFrentes(new Set(mapa.data?.frentes ?? []));
      setCarregando(false);
    })();
    return () => { vivo = false; };
  }, [clienteId]);

  const docDigitos = somenteDigitos(f.documento);
  const docOk = docDigitos === "" || documentoValido(docDigitos);
  const podeConsultarCnpj = docDigitos.length === 14 && documentoValido(docDigitos);

  const sugestoesCidade = useMemo(() => (idx ? idx.buscar(f.cidade, 8).filter((m) => !f.uf || m.uf === f.uf) : []), [idx, f.cidade, f.uf]);

  function escolherMunicipio(m: Municipio) {
    setF((s) => ({ ...s, cidade: m.nome, uf: m.uf, municipio_ibge: m.ibge }));
    setSugestoes([]);
    if (!ponto) { setPonto({ lat: m.lat, lng: m.lng }); setPrecisao("cidade"); }
  }

  async function buscarCnpj() {
    setConsultando(true); setErro(null); setAviso(null);
    try {
      const d = await consultarCnpj(docDigitos);
      if (!d) { setAviso("CNPJ não encontrado na Receita Federal."); return; }
      const tel = d.telefone ? formatarTelefone(d.telefone) : "";
      const mun = d.cidade && idx ? idx.achar(d.cidade, d.uf) : null;
      setF((s) => ({
        ...s,
        razao_social: s.razao_social || d.razao_social || "",
        nome: s.nome || d.nome_fantasia || d.razao_social || "",
        email: s.email || d.email?.toLowerCase() || "",
        telefone: s.telefone || tel,
        cep: s.cep || d.cep || "",
        endereco: s.endereco || d.endereco || "",
        cidade: s.cidade || mun?.nome || d.cidade || "",
        uf: s.uf || mun?.uf || d.uf || "",
        municipio_ibge: s.municipio_ibge || mun?.ibge || "",
      }));
      if (d.responsavel || tel) {
        setContatos((lista) =>
          lista.some((c) => c.nome || c.telefone) ? lista : [{ nome: d.responsavel?.nome ?? "", cargo: d.responsavel?.cargo ?? "", telefone: tel, email: "" }, ...lista],
        );
      }
      // posiciona o pino pelo endereço da Receita (só se ainda não há ponto)
      let posicionou = false;
      if (!ponto) {
        try {
          const consulta = [d.endereco, d.cidade, d.uf, "Brasil"].filter(Boolean).join(", ");
          const r = (await geocodificar(consulta))[0] ?? (d.cep ? (await geocodificar(`${d.cep}, Brasil`))[0] : undefined);
          if (r) { setPonto({ lat: r.lat, lng: r.lng }); setPrecisao("exata"); posicionou = true; }
          else if (mun) { setPonto({ lat: mun.lat, lng: mun.lng }); setPrecisao("cidade"); posicionou = true; }
        } catch { if (mun) { setPonto({ lat: mun.lat, lng: mun.lng }); setPrecisao("cidade"); posicionou = true; } }
      }
      setLocalSugerido(`${d.endereco ?? ""} — ${d.cidade ?? ""}/${d.uf ?? ""}`);
      setAviso(
        `Dados preenchidos pela Receita${d.situacao ? ` (situação cadastral: ${d.situacao})` : ""}${posicionou ? " e o ponto foi posicionado pelo endereço" : ""}. ` +
          "Atenção: o endereço da Receita é o cadastrado no CNPJ (pode ser a matriz ou escritório). Confira se é a unidade de produção e, se não for, ajuste o endereço e o pino.",
      );
    } catch (e) { setErro(e instanceof Error ? e.message : String(e)); }
    finally { setConsultando(false); }
  }

  async function buscarNaInternet() {
    setBuscandoWeb(true); setErro(null); setSugestoesWeb(null);
    try {
      const r = await fetch("/api/enriquecer", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: f.nome, razao_social: f.razao_social, cidade: f.cidade, uf: f.uf }),
      });
      if (r.status === 501) throw new Error("A busca na internet ainda não foi ativada neste app (falta configurar a chave FIRECRAWL_API_KEY na Vercel).");
      const j = await r.json();
      if (!r.ok) throw new Error("Não foi possível pesquisar agora. Tente de novo em instantes.");
      if (!j.sites.length && !j.emails.length && !j.telefones.length) setAviso("A pesquisa não encontrou site ou contatos com confiança. Preencha manualmente.");
      setSugestoesWeb(j as Sugestoes);
    } catch (e) { setErro(e instanceof Error ? e.message : String(e)); }
    finally { setBuscandoWeb(false); }
  }

  async function buscarEndereco() {
    setConsultando(true); setErro(null); setAchados([]);
    try {
      const consulta = [f.endereco, f.cidade, f.uf, "Brasil"].filter(Boolean).join(", ");
      const r = await geocodificar(consulta);
      if (!r.length) setAviso("Endereço não encontrado. Tente só a cidade ou marque o ponto manualmente no mapa.");
      else setAchados(r);
    } catch (e) { setErro(e instanceof Error ? e.message : String(e)); }
    finally { setConsultando(false); }
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (!f.nome.trim()) return setErro("Informe o nome do cliente.");
    if (!docOk) return setErro("CNPJ/CPF inválido.");
    if (f.status === "perdido" && !f.motivo_perda_id) return setErro("Informe o motivo da perda.");
    setSalvando(true);
    const supabase = createClient();
    const vendedorMudou = gestao && f.vendedor_id !== vendedorOriginal;
    const base = {
      nome: f.nome.trim(), razao_social: nulo(f.razao_social), documento: docDigitos || null, site: nulo(f.site), email: nulo(f.email),
      telefone: nulo(f.telefone), endereco: nulo(f.endereco), cep: nulo(f.cep), cidade: nulo(f.cidade), uf: nulo(f.uf),
      municipio_ibge: nulo(f.municipio_ibge), status: f.status, etapa_id: f.etapa_id ? Number(f.etapa_id) : null,
      motivo_perda_id: f.status === "perdido" && f.motivo_perda_id ? Number(f.motivo_perda_id) : null,
      porte: nulo(f.porte), trata_sementes: nulo(f.trata_sementes), equipamento: nulo(f.equipamento), potencial_ton_ano: numero(f.potencial_ton_ano),
      ritmo_ton_mes: numero(f.ritmo_ton_mes), alerta_financeiro: nulo(f.alerta_financeiro),
      condicao_pagamento: nulo(f.condicao_pagamento), observacoes: nulo(f.observacoes),
      localizacao: ponto ? `SRID=4326;POINT(${ponto.lng} ${ponto.lat})` : null,
      localizacao_precisao: precisao, localizacao_manual: precisao === "manual",
      ...(gestao ? { vendedor_id: f.vendedor_id || null } : {}),
      ...(vendedorMudou ? { vendedor_manual: Boolean(f.vendedor_id) } : {}),
      // vendedor/externo cadastrando: o cliente já nasce no nome dele (senão ele não o enxergaria)
      ...(!gestao && !clienteId ? { vendedor_id: vendedorId, vendedor_manual: true } : {}),
    };
    try {
      let id = clienteId;
      if (id) {
        const { error } = await supabase.from("clientes").update(base).eq("id", id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("clientes").insert({ ...base, origem: "Cadastro manual" }).select("id").single();
        if (error) throw error;
        id = data.id as string;
      }
      // contatos: regrava a lista (o primeiro é o principal)
      await supabase.from("contatos").delete().eq("cliente_id", id);
      const lista = contatos.filter((c) => c.nome.trim() || c.telefone.trim() || c.email.trim());
      if (lista.length) {
        const { error } = await supabase.from("contatos").insert(
          lista.map((c, i) => ({ cliente_id: id!, nome: nulo(c.nome), cargo: nulo(c.cargo), telefone: nulo(c.telefone), email: nulo(c.email), principal: i === 0 })),
        );
        if (error) throw error;
      }
      // frentes: regrava as escolhidas como definidas à mão
      const { data: fr } = await supabase.from("frentes").select("id, slug");
      await supabase.from("cliente_frentes").delete().eq("cliente_id", id);
      const linhas = (fr ?? []).filter((x) => frentes.has(x.slug)).map((x) => ({ cliente_id: id!, frente_id: x.id, manual: true }));
      if (linhas.length) {
        const { error } = await supabase.from("cliente_frentes").insert(linhas);
        if (error) throw error;
      }
      router.push(clienteId ? `/clientes/${clienteId}` : `/clientes/${id}`);
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : (err as { message?: string }).message ?? String(err);
      setErro(/clientes_documento_uniq|duplicate key/i.test(msg) ? "Já existe um cliente com este CNPJ/CPF." : msg);
      setSalvando(false);
    }
  }

  if (carregando) return <p className="py-10 text-slate-500">Carregando…</p>;

  const rotulo = (t: string, extra?: string) => (
    <span className="mb-1 block text-sm font-medium text-slate-700">{t}{extra && <span className="ml-1 font-normal text-slate-400">{extra}</span>}</span>
  );

  return (
    <form onSubmit={salvar} className="mt-6 space-y-8">
      <Secao titulo="Identificação">
        <label className="block sm:col-span-2">{rotulo("Nome do cliente *")}<input className={campo} value={f.nome} onChange={(e) => set("nome", e.target.value)} required /></label>
        <div>
          <label>{rotulo("CNPJ / CPF")}
            <div className="flex gap-2">
              <input className={`${campo} ${docOk ? "" : "border-red-400"}`} value={f.documento} inputMode="numeric"
                onChange={(e) => set("documento", e.target.value)} onBlur={() => docDigitos && docOk && set("documento", formatarDocumento(docDigitos))} />
              <button type="button" disabled={!podeConsultarCnpj || consultando} onClick={buscarCnpj}
                className="shrink-0 rounded-lg px-3 text-sm font-medium text-brand-blue ring-1 ring-brand-blue/40 hover:bg-sky-50 disabled:opacity-40">
                Buscar CNPJ
              </button>
            </div>
          </label>
          {!docOk && <p className="mt-1 text-xs text-red-600">Número inválido.</p>}
        </div>
        <label className="block">{rotulo("Razão social")}<input className={campo} value={f.razao_social} onChange={(e) => set("razao_social", e.target.value)} /></label>
        <label className="block">{rotulo("Site")}<input className={campo} value={f.site} onChange={(e) => set("site", e.target.value)} placeholder="https://" /></label>
        <label className="block">{rotulo("E-mail")}<input type="email" className={campo} value={f.email} onChange={(e) => set("email", e.target.value)} /></label>
        <label className="block">{rotulo("Telefone")}<input className={campo} value={f.telefone} onChange={(e) => set("telefone", e.target.value)} /></label>
        <div className="sm:col-span-2">
          <button type="button" onClick={buscarNaInternet} disabled={buscandoWeb || !(f.nome || f.razao_social)}
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-brand-blue ring-1 ring-brand-blue/40 hover:bg-sky-50 disabled:opacity-40">
            {buscandoWeb ? "Pesquisando na internet…" : "Buscar site e contatos na internet"}
          </button>
          {sugestoes_web && (
            <div className="mt-2 space-y-2 rounded-lg bg-slate-50 p-3 text-sm ring-1 ring-slate-200">
              <p className="text-xs text-slate-500">Sugestões da internet — confira antes de usar.</p>
              {sugestoes_web.sites.map((x) => (
                <p key={x.url}>Site: <button type="button" className="text-brand-blue underline" onClick={() => set("site", x.url)}>{x.url}</button> <span className="text-slate-400">{x.titulo}</span></p>
              ))}
              {sugestoes_web.emails.length > 0 && (
                <p>E-mails: {sugestoes_web.emails.map((e) => <button key={e} type="button" className="mr-2 text-brand-blue underline" onClick={() => set("email", e)}>{e}</button>)}</p>
              )}
              {sugestoes_web.telefones.length > 0 && (
                <p>Telefones: {sugestoes_web.telefones.map((t) => (
                  <button key={t} type="button" className="mr-2 text-brand-blue underline"
                    onClick={() => (f.telefone ? setContatos((l) => [...l, { ...CONTATO_VAZIO, telefone: formatarTelefone(t) }]) : set("telefone", formatarTelefone(t)))}>
                    {formatarTelefone(t)}
                  </button>
                ))}</p>
              )}
            </div>
          )}
        </div>
      </Secao>

      <Secao titulo="Pessoas de contato" descricao="Quem atende pelo telefone: nome, cargo e telefone. O primeiro é o contato principal.">
        <div className="space-y-3 sm:col-span-2">
          {contatos.length === 0 && <p className="text-sm text-slate-400">Nenhum contato cadastrado.</p>}
          {contatos.map((c, i) => (
            <div key={i} className="grid gap-2 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200 sm:grid-cols-[1.2fr_1fr_1fr_1.2fr_auto]">
              <input className={campo} placeholder="Nome" value={c.nome} onChange={(e) => setContatos((l) => l.map((x, j) => (j === i ? { ...x, nome: e.target.value } : x)))} />
              <input className={campo} placeholder="Cargo" value={c.cargo} onChange={(e) => setContatos((l) => l.map((x, j) => (j === i ? { ...x, cargo: e.target.value } : x)))} />
              <input className={campo} placeholder="Telefone" value={c.telefone} onChange={(e) => setContatos((l) => l.map((x, j) => (j === i ? { ...x, telefone: e.target.value } : x)))} />
              <input className={campo} placeholder="E-mail" value={c.email} onChange={(e) => setContatos((l) => l.map((x, j) => (j === i ? { ...x, email: e.target.value } : x)))} />
              <button type="button" onClick={() => setContatos((l) => l.filter((_, j) => j !== i))} className="rounded-lg px-2 text-slate-400 hover:bg-slate-100" aria-label="Remover contato">✕</button>
            </div>
          ))}
          <button type="button" onClick={() => setContatos((l) => [...l, { ...CONTATO_VAZIO }])} className="text-sm font-medium text-brand-blue hover:underline">+ Adicionar contato</button>
        </div>
      </Secao>

      <Secao titulo="Unidade de produção" descricao="Informe sempre o local onde o cliente produz/trata/beneficia as sementes — nunca revenda, loja ou filial comercial.">
        <label className="block sm:col-span-2">{rotulo("Endereço da unidade")}<input className={campo} value={f.endereco} onChange={(e) => set("endereco", e.target.value)} placeholder="Rua, número, bairro / rodovia e km" /></label>
        <div className="relative">
          <label>{rotulo("Cidade")}
            <input className={campo} value={f.cidade} autoComplete="off"
              onChange={(e) => { set("cidade", e.target.value); setSugestoes([]); }}
              onFocus={() => setSugestoes(sugestoesCidade)} onKeyUp={() => setSugestoes(sugestoesCidade)} />
          </label>
          {sugestoes.length > 0 && (
            <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg bg-white py-1 text-sm shadow-lg ring-1 ring-slate-200">
              {sugestoes.map((m) => (
                <li key={m.ibge}><button type="button" onClick={() => escolherMunicipio(m)} className="block w-full px-3 py-1.5 text-left hover:bg-sky-50">{m.nome} / {m.uf}</button></li>
              ))}
            </ul>
          )}
        </div>
        <label className="block">{rotulo("UF")}
          <select className={campo} value={f.uf} onChange={(e) => set("uf", e.target.value)}>
            <option value="" />{UFS.map((u) => <option key={u}>{u}</option>)}
          </select>
        </label>
        <label className="block">{rotulo("CEP")}<input className={campo} value={f.cep} onChange={(e) => set("cep", e.target.value)} /></label>

        <div className="sm:col-span-2">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <button type="button" onClick={buscarEndereco} disabled={consultando || !(f.endereco || f.cidade)}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-brand-blue ring-1 ring-brand-blue/40 hover:bg-sky-50 disabled:opacity-40">
              Localizar endereço no mapa
            </button>
            <span className="text-xs text-slate-500">ou clique no mapa / arraste o pino até a unidade de produção</span>
            {ponto && <button type="button" onClick={() => { setPonto(null); setPrecisao("exata"); }} className="ml-auto text-xs text-slate-500 underline">Remover ponto</button>}
          </div>
          {achados.length > 0 && (
            <ul className="mb-2 space-y-1 rounded-lg bg-slate-50 p-2 text-sm ring-1 ring-slate-200">
              {achados.map((a, i) => (
                <li key={i}><button type="button" className="text-left hover:underline" onClick={() => { setPonto({ lat: a.lat, lng: a.lng }); setPrecisao("manual"); setAchados([]); }}>{a.descricao}</button></li>
              ))}
            </ul>
          )}
          {localSugerido && <p className="mb-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 ring-1 ring-amber-200">Local sugerido pelo cadastro da Receita: {localSugerido}. Confirme se é a unidade de produção.</p>}
          <SeletorPonto ponto={ponto} aoMudar={(p) => { setPonto(p); setPrecisao("manual"); }} />
          <p className="mt-1 text-xs text-slate-500">
            {ponto ? (precisao === "cidade" ? "Ponto aproximado (centro da cidade) — ajuste para a unidade." : "Ponto definido.") : "Sem ponto: o cliente não aparece no mapa."}
          </p>
        </div>
      </Secao>

      <Secao titulo="Comercial">
        <div className="sm:col-span-2">
          {rotulo("Frentes")}
          <div className="flex flex-wrap gap-4 text-sm">
            {listaFrentes.map((fr) => (
              <label key={fr.slug} className="flex cursor-pointer items-center gap-2">
                <input type="checkbox" className="size-4 accent-brand-blue" checked={frentes.has(fr.slug)}
                  onChange={(e) => setFrentes((s) => { const n = new Set(s); if (e.target.checked) n.add(fr.slug); else n.delete(fr.slug); return n; })} />
                {fr.nome}
              </label>
            ))}
          </div>
        </div>
        <label className="block">{rotulo("Situação")}
          <select className={campo} value={f.status} onChange={(e) => set("status", e.target.value as Form["status"])}>
            <option value="prospect">Prospect</option><option value="carteira">Cliente (carteira)</option><option value="perdido">Perdido</option>
          </select>
        </label>
        <label className="block">{rotulo("Etapa do funil")}
          <select className={campo} value={f.etapa_id} onChange={(e) => set("etapa_id", e.target.value)}>
            <option value="" />{etapas.map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}
          </select>
        </label>
        {f.status === "perdido" && (
          <label className="block sm:col-span-2">{rotulo("Motivo da perda *")}
            <select className={campo} value={f.motivo_perda_id} onChange={(e) => set("motivo_perda_id", e.target.value)}>
              <option value="" />{motivos.map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}
            </select>
          </label>
        )}
        {gestao && (
          <label className="block sm:col-span-2">{rotulo("Vendedor", "(vazio = automático pelo território)")}
            <select className={campo} value={f.vendedor_id} onChange={(e) => set("vendedor_id", e.target.value)}>
              <option value="" />{vendedores.map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}
            </select>
          </label>
        )}
        <label className="block">{rotulo("Porte")}
          <select className={campo} value={f.porte} onChange={(e) => set("porte", e.target.value)}>
            <option value="" /><option>Pequeno</option><option>Médio</option><option>Grande</option>
          </select>
        </label>
        <label className="block">{rotulo("Trata sementes?")}
          <select className={campo} value={f.trata_sementes} onChange={(e) => set("trata_sementes", e.target.value)}>
            <option value="">Ainda não perguntei</option><option value="sim">Sim</option><option value="nao">Não</option>
          </select>
        </label>
        <label className="block">{rotulo("Equipamento")}<input className={campo} value={f.equipamento} onChange={(e) => set("equipamento", e.target.value)} placeholder="Betoneira, Coater…" /></label>
        <label className="block">{rotulo("Potencial", "(ton/ano)")}<input className={campo} inputMode="decimal" value={f.potencial_ton_ano} onChange={(e) => set("potencial_ton_ano", e.target.value)} /></label>
        <label className="block">{rotulo("Ritmo", "(ton/mês)")}<input className={campo} inputMode="decimal" value={f.ritmo_ton_mes} onChange={(e) => set("ritmo_ton_mes", e.target.value)} /></label>
        <label className="block">{rotulo("Condição de pagamento")}<input className={campo} value={f.condicao_pagamento} onChange={(e) => set("condicao_pagamento", e.target.value)} /></label>
        <label className="block">{rotulo("Alerta financeiro")}<input className={campo} value={f.alerta_financeiro} onChange={(e) => set("alerta_financeiro", e.target.value)} /></label>
        <label className="block sm:col-span-2">{rotulo("Observações")}<textarea rows={4} className={campo} value={f.observacoes} onChange={(e) => set("observacoes", e.target.value)} /></label>
      </Secao>

      {erro && <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">{erro}</p>}
      {aviso && <p role="status" className="rounded-lg bg-sky-50 px-4 py-3 text-sm text-sky-900 ring-1 ring-sky-200">{aviso}</p>}

      <div className="sticky bottom-[calc(var(--nav-b)+env(safe-area-inset-bottom))] z-20 -mx-4 flex gap-3 border-t border-slate-200/70 bg-white/80 px-4 py-3 backdrop-blur-2xl backdrop-saturate-150 sm:mx-0 sm:rounded-2xl sm:ring-1 sm:ring-white/70 sm:shadow-lg">
        <button disabled={salvando} className="rounded-full bg-gradient-to-r from-brand-blue to-brand-teal shadow-brand px-5 py-2.5 font-semibold text-white disabled:opacity-60">
          {salvando ? "Salvando…" : clienteId ? "Salvar alterações" : "Cadastrar cliente"}
        </button>
        <button type="button" onClick={() => router.back()} className="rounded-full px-5 py-2.5 text-slate-600 ring-1 ring-slate-300 hover:bg-slate-50">Cancelar</button>
      </div>
    </form>
  );
}

function Secao({ titulo, descricao, children }: { titulo: string; descricao?: string; children: React.ReactNode }) {
  return (
    <section className="painel entrar !overflow-visible p-5 sm:p-6">
      <h2 className="flex items-center gap-2 text-base font-semibold">
        <span aria-hidden className="h-4 w-1 rounded-full bg-gradient-to-b from-brand-blue to-brand-teal" />
        {titulo}
      </h2>
      {descricao && <p className="mt-1 rounded-lg bg-sky-50 px-3 py-2 text-sm text-sky-900 ring-1 ring-sky-200">{descricao}</p>}
      <div className="mt-4 grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}
