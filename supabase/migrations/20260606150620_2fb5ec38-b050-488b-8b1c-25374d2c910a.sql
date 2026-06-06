
CREATE POLICY "Academy staff can upload resources"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'resources'
  AND EXISTS (
    SELECT 1 FROM public.academy_user_roles r
    WHERE r.user_id = auth.uid()
      AND r.role IN ('instructor','academy_admin','super_admin')
  )
);

CREATE POLICY "Academy staff can update resources"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'resources'
  AND EXISTS (
    SELECT 1 FROM public.academy_user_roles r
    WHERE r.user_id = auth.uid()
      AND r.role IN ('instructor','academy_admin','super_admin')
  )
);

CREATE POLICY "Academy staff can delete resources"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'resources'
  AND EXISTS (
    SELECT 1 FROM public.academy_user_roles r
    WHERE r.user_id = auth.uid()
      AND r.role IN ('instructor','academy_admin','super_admin')
  )
);
