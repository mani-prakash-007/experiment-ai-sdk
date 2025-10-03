-- Create documents table (current versions only)
CREATE TABLE documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  extra JSONB, -- Stores wordCount, estimatedReadTime, tags, category
  version_number INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create performance indexes for documents
CREATE INDEX idx_documents_user_id ON documents(user_id);
CREATE INDEX idx_documents_updated_at ON documents(updated_at DESC);
CREATE INDEX idx_documents_user_updated ON documents(user_id, updated_at DESC);
CREATE INDEX idx_documents_title ON documents(title);

-- Enable RLS on documents
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Documents RLS Policies
CREATE POLICY "Users can view own documents" ON documents
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own documents" ON documents
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own documents" ON documents
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own documents" ON documents
  FOR DELETE USING (auth.uid() = user_id);

-- Add helpful comments
COMMENT ON TABLE documents IS 'Stores current versions of user documents with automatic versioning';
COMMENT ON COLUMN documents.extra IS 'JSON object containing wordCount, estimatedReadTime, tags, category';
COMMENT ON COLUMN documents.version_number IS 'Current version number, incremented on each update';