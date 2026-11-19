-- Foto de perfil e código do vendedor (já aplicada no projeto onpqcbfnxqglzehhqxys)
alter table public.perfis add column if not exists foto_path text;
alter table public.perfis add column if not exists codigo_vendedor text;

-- Código do Gustavo Ique (feito antes de endurecer o gatilho, que roda sem usuário logado aqui)
update public.perfis set codigo_vendedor = '3281' where nome = 'Gustavo Ique' and codigo_vendedor is null;

-- Só administradores alteram papel, vendedor ou código do vendedor
create or replace function public.proteger_perfil()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if not privado.eh_admin() and (
       new.papel is distinct from old.papel
    or new.vendedor_id is distinct from old.vendedor_id
    or new.codigo_vendedor is distinct from old.codigo_vendedor
  ) then
    raise exception 'Somente administradores podem alterar papel, vendedor ou código';
  end if;
  return new;
end $function$;

-- Bucket privado das fotos de perfil (até 2 MB, imagens)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatares', 'avatares', false, 2097152, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

-- Quem está logado vê as fotos; cada pessoa só mexe na própria pasta (nome da pasta = id do usuário)
create policy avatares_ler on storage.objects for select to authenticated
  using (bucket_id = 'avatares');
create policy avatares_enviar on storage.objects for insert to authenticated
  with check (bucket_id = 'avatares' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy avatares_atualizar on storage.objects for update to authenticated
  using (bucket_id = 'avatares' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'avatares' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy avatares_apagar on storage.objects for delete to authenticated
  using (bucket_id = 'avatares' and (storage.foldername(name))[1] = (select auth.uid())::text);
