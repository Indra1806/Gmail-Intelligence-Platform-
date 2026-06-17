-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector"; -- pgvector for embeddings

-- =========================================
-- 1. Users & Accounts
-- =========================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE gmail_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    email_address TEXT NOT NULL,
    access_token TEXT,
    refresh_token TEXT,
    token_expiry TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, email_address)
);

-- =========================================
-- 2. Sync State
-- =========================================

CREATE TABLE sync_state (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID NOT NULL REFERENCES gmail_accounts(id) ON DELETE CASCADE,
    history_id TEXT, -- Gmail history ID for incremental sync
    last_synced_at TIMESTAMPTZ,
    page_token TEXT,
    sync_status TEXT DEFAULT 'pending', -- pending, syncing, completed, failed
    UNIQUE(account_id)
);

-- =========================================
-- 3. Threads & Emails
-- =========================================

CREATE TABLE threads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID NOT NULL REFERENCES gmail_accounts(id) ON DELETE CASCADE,
    gmail_thread_id TEXT NOT NULL,
    subject TEXT,
    participant_emails TEXT[],
    last_message_at TIMESTAMPTZ,
    message_count INTEGER DEFAULT 0,
    thread_summary TEXT, -- AI generated
    category TEXT,       -- AI categorized at thread level
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(account_id, gmail_thread_id)
);

CREATE TABLE emails (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID NOT NULL REFERENCES gmail_accounts(id) ON DELETE CASCADE,
    thread_id UUID NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
    gmail_message_id TEXT NOT NULL,
    subject TEXT,
    from_email TEXT,
    to_emails TEXT[],
    cc_emails TEXT[],
    bcc_emails TEXT[],
    body_text TEXT,
    body_html TEXT,
    snippet TEXT,
    received_at TIMESTAMPTZ NOT NULL,
    category TEXT,      -- e.g., 'Newsletter', 'Finance'
    summary TEXT,       -- AI generated
    is_read BOOLEAN DEFAULT FALSE,
    labels TEXT[],      -- Gmail labels (e.g., 'INBOX', 'IMPORTANT')
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(account_id, gmail_message_id)
);

-- =========================================
-- 4. Embeddings (pgvector)
-- =========================================

CREATE TABLE email_embeddings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email_id UUID REFERENCES emails(id) ON DELETE CASCADE,
    thread_id UUID REFERENCES threads(id) ON DELETE CASCADE,
    content_type TEXT NOT NULL, -- 'message_body', 'thread_summary'
    embedding vector(768),      -- Gemini embedding dimension
    metadata JSONB DEFAULT '{}'::jsonb, -- e.g., chunk index, sender info
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================
-- 5. Chat Agent State
-- =========================================

CREATE TABLE chat_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    source_emails UUID[], -- Array of email IDs used as context/citations
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================
-- 6. Indexes & Performance Optimizations
-- =========================================

-- B-Tree indexes for standard lookups and joins
CREATE INDEX idx_emails_account_id ON emails(account_id);
CREATE INDEX idx_emails_thread_id ON emails(thread_id);
CREATE INDEX idx_emails_received_at ON emails(received_at DESC);
CREATE INDEX idx_emails_category ON emails(category);
CREATE INDEX idx_threads_account_id ON threads(account_id);
CREATE INDEX idx_threads_last_message_at ON threads(last_message_at DESC);

-- GIN indexes for array and JSONB search
CREATE INDEX idx_emails_labels_gin ON emails USING GIN (labels);
CREATE INDEX idx_emails_to_emails_gin ON emails USING GIN (to_emails);
CREATE INDEX idx_email_embeddings_metadata_gin ON email_embeddings USING GIN (metadata);

-- HNSW Vector Index for fast semantic search (Cosine similarity)
CREATE INDEX idx_email_embeddings_embedding 
ON email_embeddings USING hnsw (embedding vector_cosine_ops) 
WITH (m = 16, ef_construction = 64);
