-- Add composite indexes for better query performance on project_messages table

-- Index for fetching messages by project with timestamp
CREATE INDEX IF NOT EXISTS idx_project_messages_composite 
ON project_messages(project_name, created_at DESC);

-- Index for unread messages
CREATE INDEX IF NOT EXISTS idx_project_messages_unread 
ON project_messages(direction, read_at) 
WHERE direction = 'inbound' AND read_at IS NULL;

-- Full-text search index for message content
CREATE INDEX IF NOT EXISTS idx_project_messages_search 
ON project_messages USING gin(to_tsvector('english', message));