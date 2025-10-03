-- Create document_versions table (historical versions)
CREATE TABLE document_versions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  extra JSONB,
  change_summary TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES auth.users(id)
);

-- Create performance indexes for document_versions
CREATE INDEX idx_document_versions_document_id ON document_versions(document_id);
CREATE INDEX idx_document_versions_created_at ON document_versions(created_at DESC);
CREATE INDEX idx_document_versions_doc_version ON document_versions(document_id, version_number DESC);
CREATE INDEX idx_document_versions_created_by ON document_versions(created_by);

-- Enable RLS on document_versions
ALTER TABLE document_versions ENABLE ROW LEVEL SECURITY;

-- Document versions RLS Policies
CREATE POLICY "Users can view versions of own documents" ON document_versions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM documents
      WHERE documents.id = document_versions.document_id
      AND documents.user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert versions" ON document_versions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM documents
      WHERE documents.id = document_versions.document_id
      AND documents.user_id = auth.uid()
    )
  );

-- Function to create new version when document is updated
CREATE OR REPLACE FUNCTION create_document_version()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create version if content actually changed
  IF OLD.title IS DISTINCT FROM NEW.title OR 
     OLD.content IS DISTINCT FROM NEW.content OR 
     OLD.extra IS DISTINCT FROM NEW.extra THEN
    
    -- Store old version in history
    INSERT INTO document_versions (
      document_id, 
      version_number, 
      title,
      content, 
      extra,
      change_summary,
      created_by
    )
    VALUES (
      OLD.id,
      OLD.version_number,
      OLD.title,
      OLD.content,
      OLD.extra,
      'Document updated',
      OLD.user_id
    );
    
    -- Increment version number for new version
    NEW.version_number = OLD.version_number + 1;
  END IF;
  
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic versioning
CREATE TRIGGER document_version_trigger
  BEFORE UPDATE ON documents
  FOR EACH ROW
  EXECUTE FUNCTION create_document_version();

-- Function to cleanup old versions (keeps last N versions)
CREATE OR REPLACE FUNCTION cleanup_old_versions(document_uuid UUID, keep_versions INTEGER DEFAULT 10)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM document_versions
  WHERE document_id = document_uuid
    AND version_number <= (
      SELECT version_number - keep_versions
      FROM documents
      WHERE id = document_uuid
    );
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Add helpful comments
COMMENT ON TABLE document_versions IS 'Stores historical versions of documents for audit trail';
COMMENT ON COLUMN document_versions.extra IS 'JSON object containing wordCount, estimatedReadTime, tags, category from that version';
COMMENT ON COLUMN document_versions.change_summary IS 'Brief description of what changed in this version';
COMMENT ON FUNCTION create_document_version() IS 'Automatically creates version history when documents are updated';
COMMENT ON FUNCTION cleanup_old_versions(UUID, INTEGER) IS 'Removes old document versions keeping only the latest N versions';