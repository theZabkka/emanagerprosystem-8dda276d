-- Add lexo_rank column to tasks
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS lexo_rank TEXT;

-- Seed initial lexo_rank values based on created_at order
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) as rn
  FROM tasks
  WHERE lexo_rank IS NULL
)
UPDATE tasks
SET lexo_rank = (
  SELECT 
    CASE 
      WHEN rn <= 13 THEN chr((64 + (rn::int * 2))::int)
      ELSE 'z' || lpad(rn::text, 6, '0')
    END
  FROM ranked
  WHERE ranked.id = tasks.id
)
WHERE lexo_rank IS NULL;

-- Set default for future rows
ALTER TABLE tasks ALTER COLUMN lexo_rank SET DEFAULT 'U';

-- Create index for ordering
CREATE INDEX IF NOT EXISTS idx_tasks_lexo_rank ON tasks (lexo_rank);