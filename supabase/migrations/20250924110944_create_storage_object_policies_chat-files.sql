-- Storage Bucket Name : chat-files

-- Policy 1: Users can upload files to their own folder
CREATE POLICY "Users can upload their own files"
ON storage.objects
FOR INSERT
WITH CHECK (
  auth.uid()::text = (storage.foldername(name))[1]
  AND bucket_id = 'chat-files'
);

-- Policy 2: Users can view their own files
CREATE POLICY "Users can view their own files"
ON storage.objects
FOR SELECT
USING (
  auth.uid()::text = (storage.foldername(name))[1]
  AND bucket_id = 'chat-files'
);

-- Policy 3: Users can delete their own files
CREATE POLICY "Users can delete their own files"
ON storage.objects
FOR DELETE
USING (
  auth.uid()::text = (storage.foldername(name))[1]
  AND bucket_id = 'chat-files'
);

-- Policy 4: Users can update their own files
CREATE POLICY "Users can update their own files"
ON storage.objects
FOR UPDATE
USING (
  auth.uid()::text = (storage.foldername(name))[1]
  AND bucket_id = 'chat-files'
);
