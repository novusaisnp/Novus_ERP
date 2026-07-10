
-- Policies para buckets empresa-logos e empresa-certificados
CREATE POLICY "Authenticated read empresa-logos"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'empresa-logos');

CREATE POLICY "Authenticated write empresa-logos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'empresa-logos');

CREATE POLICY "Authenticated update empresa-logos"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'empresa-logos');

CREATE POLICY "Authenticated delete empresa-logos"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'empresa-logos');

CREATE POLICY "Authenticated read empresa-certificados"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'empresa-certificados');

CREATE POLICY "Authenticated write empresa-certificados"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'empresa-certificados');

CREATE POLICY "Authenticated update empresa-certificados"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'empresa-certificados');

CREATE POLICY "Authenticated delete empresa-certificados"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'empresa-certificados');
