alter table public.clientes add column if not exists trata_sementes text check (trata_sementes in ('sim','nao'));
comment on column public.clientes.trata_sementes is 'Resposta do cliente no contato: trata sementes? null = ainda não perguntado';
update public.clientes set trata_sementes='sim' where trata_sementes is null and observacoes like '%TSI/tratamento confirmado%';
