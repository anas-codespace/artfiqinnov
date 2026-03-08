
-- 1. Create the 'vault' bucket if it doesn't exist
insert into storage.buckets (id, name, public)
values ('vault', 'vault', true)
on conflict (id) do nothing;

-- 2. Policy: Allow anyone (including Guests) to VIEW files
create policy "Allow Public View"
on storage.objects for select
using ( bucket_id = 'vault' );

-- 3. Policy: Allow Authenticated users to UPLOAD files
create policy "Allow Authenticated Upload"
on storage.objects for insert
with check (
    bucket_id = 'vault' 
    AND auth.role() = 'authenticated'
);

-- 4. Policy: Allow only the Owner or CEO/MD to DELETE files
create policy "Founder and Owner Delete Access"
on storage.objects for delete
using (
    bucket_id = 'vault' AND (
        auth.uid() = owner OR 
        auth.email() = 'sulaiman.artfiqceo@gmail.com' OR 
        auth.email() = 'anas.md.artfiq@gmail.com'
    )
);
