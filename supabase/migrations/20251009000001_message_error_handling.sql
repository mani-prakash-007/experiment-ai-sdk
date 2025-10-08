-- Simplified error handling columns for messages
-- Adds minimal fields to support retrying failed AI requests

-- Add compact columns (no triggers/complex validation)
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS ai_state TEXT DEFAULT 'success',
  ADD COLUMN IF NOT EXISTS ai_error_message TEXT,
  ADD COLUMN IF NOT EXISTS ai_retry_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ai_original_request JSONB;

-- Backfill from the older / more complex schema if present
-- If `error` JSONB exists, copy useful fields into simplified columns
DO $$
BEGIN
  IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='messages' AND column_name='error') THEN
    UPDATE messages
    SET
      ai_state = CASE WHEN error IS NOT NULL THEN 'error' ELSE ai_state END,
      ai_error_message = COALESCE(ai_error_message, error->>'message'),
      ai_retry_count = COALESCE(ai_retry_count, NULLIF((error->>'retryCount'), '')::int),
      ai_original_request = COALESCE(ai_original_request, "originalRequest")
    WHERE error IS NOT NULL OR "originalRequest" IS NOT NULL;
  END IF;
END$$;

-- Indexes for quick lookups
CREATE INDEX IF NOT EXISTS idx_messages_ai_state ON messages(ai_state);
CREATE INDEX IF NOT EXISTS idx_messages_ai_retry_count ON messages(ai_retry_count);
