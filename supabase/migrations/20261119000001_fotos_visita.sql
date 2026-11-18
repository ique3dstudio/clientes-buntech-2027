-- Fase 6: fotos nas interações (visitas) — bucket privado + coluna com o caminho do arquivo
alter table public.interacoes add column if not exists foto_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('visitas', 'visitas', false, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

-- Caminho: <cliente_id>/<arquivo>. Só quem pode ver/editar o cliente acessa a foto.
create policy "visitas_ler" on storage.objects for select to authenticated
  using (bucket_id = 'visitas' and privado.pode_ver_cliente_id(((storage.foldername(name))[1])::uuid));
create policy "visitas_enviar" on storage.objects for insert to authenticated
  with check (bucket_id = 'visitas' and privado.meu_papel() <> 'leitura' and privado.pode_ver_cliente_id(((storage.foldername(name))[1])::uuid));
