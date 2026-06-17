-- Create a function to perform vector similarity search on email embeddings
CREATE OR REPLACE FUNCTION match_emails (
  query_embedding vector(768),
  match_limit int,
  filter_account_id uuid
)
RETURNS TABLE (
  email_id uuid,
  thread_id uuid,
  gmail_message_id text,
  subject text,
  from_email text,
  body_text text,
  received_at timestamptz,
  distance double precision,
  metadata jsonb
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id AS email_id,
    e.thread_id,
    e.gmail_message_id,
    e.subject,
    e.from_email,
    e.body_text,
    e.received_at,
    (ee.embedding <=> query_embedding) AS distance,
    ee.metadata
  FROM email_embeddings ee
  JOIN emails e ON ee.email_id = e.id
  WHERE e.account_id = filter_account_id
  ORDER BY ee.embedding <=> query_embedding
  LIMIT match_limit;
END;
$$;
