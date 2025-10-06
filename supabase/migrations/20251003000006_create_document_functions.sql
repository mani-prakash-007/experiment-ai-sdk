-- Enhanced document referencing functions and triggers
-- Provides automatic version management and smart document content fetching

-- Function to update message document reference when a new version is created
CREATE OR REPLACE FUNCTION update_message_document_reference()
RETURNS TRIGGER AS $$
BEGIN
  -- When a new version is created, update ALL messages that reference this document
  -- from 'latest' to 'versioned' (keeping their original version number)
  UPDATE messages 
  SET document = jsonb_set(document, '{reference_type}', '"versioned"')
  WHERE document->>'doc_id' = NEW.document_id::text
    AND document->>'reference_type' = 'latest';
    
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update message references when versions are created
CREATE TRIGGER update_message_document_reference_trigger
  AFTER INSERT ON document_versions
  FOR EACH ROW
  EXECUTE FUNCTION update_message_document_reference();

-- Helper function to get document reference info for a message
CREATE OR REPLACE FUNCTION get_document_info(message_id UUID)
RETURNS TABLE(
  doc_id UUID,
  doc_title TEXT,
  doc_version INTEGER,
  reference_type TEXT,
  is_latest BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (m.document->>'doc_id')::UUID as doc_id,
    m.document->>'doc_title' as doc_title,
    (m.document->>'doc_version')::INTEGER as doc_version,
    m.document->>'reference_type' as reference_type,
    (m.document->>'reference_type' = 'latest') as is_latest
  FROM messages m
  WHERE m.id = message_id
    AND m.document IS NOT NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to get actual document content based on reference type
CREATE OR REPLACE FUNCTION get_document_content(doc_id UUID, reference_type TEXT, doc_version INTEGER DEFAULT NULL)
RETURNS TABLE(
  id UUID,
  title TEXT,
  content TEXT,
  extra JSONB,
  version_number INTEGER,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  IF reference_type = 'latest' THEN
    -- Query from documents table for latest version
    RETURN QUERY
    SELECT d.id, d.title, d.content, d.extra, d.version_number, d.created_at, d.updated_at
    FROM documents d
    WHERE d.id = doc_id;
  ELSE
    -- Query from document_versions table for specific version
    RETURN QUERY
    SELECT 
      dv.document_id as id,
      dv.title,
      dv.content,
      dv.extra,
      dv.version_number,
      dv.created_at,
      dv.created_at as updated_at -- versions don't have updated_at
    FROM document_versions dv
    WHERE dv.document_id = doc_id 
      AND dv.version_number = doc_version;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to get all available versions for document selection by session
CREATE OR REPLACE FUNCTION get_all_document_versions_for_session(session_id UUID)
RETURNS TABLE(
  doc_id UUID,
  doc_title TEXT,
  doc_version INTEGER,
  reference_type TEXT,
  is_current BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  -- Get latest versions from documents table for documents referenced in this session
  SELECT DISTINCT
    d.id as doc_id,
    d.title as doc_title,
    d.version_number as doc_version,
    'latest'::TEXT as reference_type,
    true as is_current,
    d.updated_at as created_at
  FROM documents d
  JOIN messages m ON (m.document->>'doc_id')::UUID = d.id
  WHERE m.session_id = get_all_document_versions_for_session.session_id
    AND m.role = 'assistant'
    AND m.document IS NOT NULL
  
  UNION
  
  -- Get historical versions from document_versions table for documents referenced in this session
  SELECT DISTINCT
    dv.document_id as doc_id,
    dv.title as doc_title,
    dv.version_number as doc_version,
    'versioned'::TEXT as reference_type,
    false as is_current,
    dv.created_at
  FROM document_versions dv
  JOIN messages m ON (m.document->>'doc_id')::UUID = dv.document_id
  WHERE m.session_id = get_all_document_versions_for_session.session_id
    AND m.role = 'assistant'
    AND m.document IS NOT NULL
  
  ORDER BY doc_id, doc_version DESC;
END;
$$ LANGUAGE plpgsql;


-- Add helpful comments
COMMENT ON FUNCTION update_message_document_reference() IS 'Automatically updates ALL message document references from latest to versioned when new versions are created';
COMMENT ON FUNCTION get_document_info(UUID) IS 'Helper function to extract document metadata from message JSONB';
COMMENT ON FUNCTION get_document_content(UUID, TEXT, INTEGER) IS 'Fetches document content from appropriate table based on reference type (latest from documents, versioned from document_versions)';
COMMENT ON FUNCTION get_all_document_versions_for_session(UUID) IS 'Returns document versions for assistant role messages within a specific session only, including latest and historical versions with document titles for dropdown selection';