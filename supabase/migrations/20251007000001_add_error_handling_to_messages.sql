-- Add error handling fields to messages table
-- Migration: Add support for error handling and retry functionality

-- Add new columns for error handling
ALTER TABLE messages 
ADD COLUMN state TEXT DEFAULT 'success' CHECK (state IN ('pending', 'success', 'error', 'retrying')),
ADD COLUMN error JSONB, -- Error details: {message, type, retryCount, timestamp}
ADD COLUMN "originalRequest" JSONB; -- Original request data for retries: {input, model, uploadedFile, documentReference}

-- Add indexes for better query performance
CREATE INDEX idx_messages_state ON messages(state);
CREATE INDEX idx_messages_error_gin ON messages USING GIN (error);
CREATE INDEX idx_messages_originalRequest_gin ON messages USING GIN ("originalRequest");

-- Add comments for documentation
COMMENT ON COLUMN messages.state IS 'Message processing state: pending, success, error, retrying';
COMMENT ON COLUMN messages.error IS 'JSONB object containing error details: {message, type, retryCount, timestamp}';
COMMENT ON COLUMN messages."originalRequest" IS 'JSONB object containing original request data for retry functionality: {input, model, uploadedFile, documentReference}';

-- Update existing messages to have 'success' state (they completed successfully)
UPDATE messages SET state = 'success' WHERE state IS NULL;

-- Make state column NOT NULL now that all existing records have values
ALTER TABLE messages ALTER COLUMN state SET NOT NULL;

-- Create a function to automatically set state to 'pending' on insert if not specified
CREATE OR REPLACE FUNCTION set_default_message_state()
RETURNS TRIGGER AS $$
BEGIN
  -- If state is not provided, set to 'pending' for new messages
  IF NEW.state IS NULL THEN
    NEW.state = 'pending';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to set default state
CREATE TRIGGER set_message_state_on_insert
  BEFORE INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION set_default_message_state();

-- Add validation function for error JSONB structure
CREATE OR REPLACE FUNCTION validate_message_error()
RETURNS TRIGGER AS $$
BEGIN
  -- Validate error JSONB structure if present
  IF NEW.error IS NOT NULL THEN
    -- Check required fields exist
    IF NOT (NEW.error ? 'message' AND NEW.error ? 'type' AND NEW.error ? 'retryCount' AND NEW.error ? 'timestamp') THEN
      RAISE EXCEPTION 'Invalid error structure. Required fields: message, type, retryCount, timestamp';
    END IF;
    
    -- Validate error type
    IF NEW.error->>'type' NOT IN ('network', 'timeout', 'server', 'unknown') THEN
      RAISE EXCEPTION 'Invalid error type. Must be one of: network, timeout, server, unknown';
    END IF;
    
    -- Validate retryCount is a number
    IF NOT (NEW.error->>'retryCount' ~ '^[0-9]+$') THEN
      RAISE EXCEPTION 'Invalid retryCount. Must be a non-negative integer';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for error validation
CREATE TRIGGER validate_message_error_on_insert_update
  BEFORE INSERT OR UPDATE ON messages
  FOR EACH ROW
  EXECUTE FUNCTION validate_message_error();

-- Add constraint to ensure state consistency
ALTER TABLE messages ADD CONSTRAINT chk_error_state_consistency 
  CHECK (
    (state = 'error' AND error IS NOT NULL) OR 
    (state != 'error' AND (error IS NULL OR error IS NOT NULL))
  );

-- Add constraint for originalRequest consistency
ALTER TABLE messages ADD CONSTRAINT chk_original_request_on_retry
  CHECK (
    (state IN ('retrying', 'error') AND "originalRequest" IS NOT NULL) OR 
    (state NOT IN ('retrying', 'error'))
  );

-- Update RLS policies to handle new columns
-- The existing policies should work fine since they don't restrict specific columns

-- Create a view for easy querying of error messages
CREATE VIEW message_errors AS
SELECT 
  m.id,
  m.session_id,
  m.content,
  m.state,
  m.error->>'message' as error_message,
  m.error->>'type' as error_type,
  (m.error->>'retryCount')::int as retry_count,
  (m.error->>'timestamp')::timestamp as error_timestamp,
  m.created_at,
  cs.user_id,
  cs.title as session_title
FROM messages m
JOIN chat_sessions cs ON m.session_id = cs.id
WHERE m.state = 'error' AND m.error IS NOT NULL;

-- Enable RLS on the view
ALTER VIEW message_errors ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for the view
CREATE POLICY "Users can view their own message errors" ON message_errors
  FOR SELECT USING (user_id = auth.uid());

-- Add helpful indexes for common queries
CREATE INDEX idx_messages_session_state ON messages(session_id, state);
CREATE INDEX idx_messages_error_retry_count ON messages((error->>'retryCount')) WHERE error IS NOT NULL;
CREATE INDEX idx_messages_created_at_state ON messages(created_at DESC, state);

-- Partial indexes for better performance on specific queries
CREATE INDEX idx_messages_pending_state ON messages(session_id, created_at) WHERE state = 'pending';
CREATE INDEX idx_messages_error_state ON messages(session_id, created_at) WHERE state = 'error';
CREATE INDEX idx_messages_retrying_state ON messages(id) WHERE state = 'retrying';

-- Compound index for error analysis
CREATE INDEX idx_messages_error_type_retry ON messages((error->>'type'), (error->>'retryCount')::int) WHERE state = 'error';

-- Create function to cleanup stuck messages (messages stuck in pending/retrying state)
CREATE OR REPLACE FUNCTION cleanup_stuck_messages()
RETURNS INTEGER AS $$
DECLARE
  cleanup_count INTEGER;
BEGIN
  -- Find messages stuck in pending/retrying state for more than 10 minutes
  UPDATE messages 
  SET 
    state = 'error',
    error = jsonb_build_object(
      'message', 'Request timed out',
      'type', 'timeout',
      'retryCount', COALESCE((error->>'retryCount')::int, 0),
      'timestamp', NOW()::text
    )
  WHERE 
    state IN ('pending', 'retrying') 
    AND created_at < NOW() - INTERVAL '10 minutes'
    AND role = 'assistant';
    
  GET DIAGNOSTICS cleanup_count = ROW_COUNT;
  
  RETURN cleanup_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to get error statistics
CREATE OR REPLACE FUNCTION get_error_statistics(user_id_param UUID DEFAULT NULL)
RETURNS TABLE(
  error_type TEXT,
  error_count BIGINT,
  avg_retry_count NUMERIC,
  last_error_time TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.error->>'type' as error_type,
    COUNT(*) as error_count,
    AVG((m.error->>'retryCount')::int) as avg_retry_count,
    MAX(m.created_at) as last_error_time
  FROM messages m
  JOIN chat_sessions cs ON m.session_id = cs.id
  WHERE 
    m.state = 'error' 
    AND m.error IS NOT NULL
    AND (user_id_param IS NULL OR cs.user_id = user_id_param)
  GROUP BY m.error->>'type'
  ORDER BY error_count DESC;
END;
$$ LANGUAGE plpgsql;