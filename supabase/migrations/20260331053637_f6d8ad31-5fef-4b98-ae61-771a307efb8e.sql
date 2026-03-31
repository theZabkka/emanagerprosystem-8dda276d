-- Drop NOT NULL constraints on user reference columns to allow SET NULL on delete

ALTER TABLE public.comments ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.crm_deal_comments ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.time_logs ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.messages ALTER COLUMN sender_id DROP NOT NULL;