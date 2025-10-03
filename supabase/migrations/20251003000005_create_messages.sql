-- Create messages table with enhanced document referencing
CREATE TABLE messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  document JSONB, -- Enhanced document metadata: {doc_id, doc_title, doc_version, reference_type, created_at}
  file_data JSONB, -- File metadata: {fileName, storagePath, metadata}
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for pagination and filtering
CREATE INDEX idx_messages_session_id ON messages(session_id);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX idx_messages_session_created ON messages(session_id, created_at DESC);

-- Create indexes on document JSONB for better performance
CREATE INDEX idx_messages_document_doc_id ON messages ((document->>'doc_id'));
CREATE INDEX idx_messages_document_reference_type ON messages ((document->>'reference_type'));
CREATE INDEX idx_messages_document_gin ON messages USING GIN (document);

-- Enable RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view messages from own sessions" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM chat_sessions
      WHERE chat_sessions.id = messages.session_id
      AND chat_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert messages to own sessions" ON messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM chat_sessions
      WHERE chat_sessions.id = messages.session_id
      AND chat_sessions.user_id = auth.uid()
    )
    AND (
      document IS NULL OR
      document->>'doc_id' IS NULL OR
      EXISTS (
        SELECT 1 FROM documents
        WHERE documents.id::text = messages.document->>'doc_id'
        AND documents.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update messages in own sessions"
ON messages
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM chat_sessions
    WHERE chat_sessions.id = messages.session_id
    AND chat_sessions.user_id = auth.uid()
  )
);

-- Function to update session timestamp when messages are added
CREATE OR REPLACE FUNCTION update_session_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE chat_sessions
  SET updated_at = NOW()
  WHERE id = NEW.session_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER update_session_on_message_insert
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_session_timestamp();

-- Add helpful comments
COMMENT ON TABLE messages IS 'Chat messages with enhanced document and file referencing';
COMMENT ON COLUMN messages.document IS 'JSONB object containing document metadata: doc_id, doc_title, doc_version, reference_type, created_at';
COMMENT ON COLUMN messages.file_data IS 'JSONB object containing file metadata: fileName, storagePath, metadata';
COMMENT ON COLUMN messages.role IS 'Message sender: user or assistant';