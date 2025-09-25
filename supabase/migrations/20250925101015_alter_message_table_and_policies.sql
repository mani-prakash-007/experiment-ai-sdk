-- 1. Drop the old document column (if it exists)
ALTER TABLE messages
DROP COLUMN IF EXISTS document;

-- 2. Add the new document_id column referencing documents table
ALTER TABLE messages
ADD COLUMN document_id UUID REFERENCES documents(id) ON DELETE SET NULL;

-- 3. Create an index on the new column for faster lookups
CREATE INDEX idx_messages_document_id ON messages(document_id);

-- 4. Update RLS policy to handle document ownership
DROP POLICY IF EXISTS "Users can insert messages to own sessions" ON messages;

CREATE POLICY "Users can insert messages to own sessions" ON messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM chat_sessions
      WHERE chat_sessions.id = messages.session_id
      AND chat_sessions.user_id = auth.uid()
    )
    AND (
      document_id IS NULL OR
      EXISTS (
        SELECT 1 FROM documents
        WHERE documents.id = messages.document_id
        AND documents.user_id = auth.uid()
      )
    )
  );

-- 5. Add a comment for clarity
COMMENT ON COLUMN messages.document_id IS 'References the latest version of a document. Replaces the old document column.';
