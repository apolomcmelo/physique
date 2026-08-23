-- ============================================================
-- 003 – Storage RLS policies for 'exams' and 'photos' buckets
-- ============================================================
-- storage.objects has RLS enabled by default with NO policies configured,
-- so every insert/select/update/delete is denied ("new row violates
-- row-level security policy"). These policies scope access to the
-- authenticated user's own folder, matching the {user_id}/... path
-- convention used by the app for both buckets.

-- exams bucket
CREATE POLICY "exams_insert_own" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'exams' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "exams_select_own" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'exams' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "exams_update_own" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'exams' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'exams' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "exams_delete_own" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'exams' AND (storage.foldername(name))[1] = auth.uid()::text);

-- photos bucket (body progress photos)
CREATE POLICY "photos_insert_own" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "photos_select_own" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "photos_update_own" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'photos' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "photos_delete_own" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'photos' AND (storage.foldername(name))[1] = auth.uid()::text);