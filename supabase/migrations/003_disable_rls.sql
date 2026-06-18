-- Disable Row Level Security (RLS) on chat tables to allow backend anon client insertions
ALTER TABLE chat_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages DISABLE ROW LEVEL SECURITY;
