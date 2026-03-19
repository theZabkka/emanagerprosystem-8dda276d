
-- Add new task statuses to enum
ALTER TYPE task_status ADD VALUE IF NOT EXISTS 'client_verified';
ALTER TYPE task_status ADD VALUE IF NOT EXISTS 'closed';
ALTER TYPE task_status ADD VALUE IF NOT EXISTS 'waiting_for_client';

-- Add verification_start_time and not_understood fields to tasks
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS verification_start_time timestamptz DEFAULT NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS not_understood boolean DEFAULT false;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS not_understood_at timestamptz DEFAULT NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS correction_severity text DEFAULT NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS client_review_accepted_by text DEFAULT NULL;
