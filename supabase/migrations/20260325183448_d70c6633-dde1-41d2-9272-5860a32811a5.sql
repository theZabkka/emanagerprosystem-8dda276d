-- Create notification type enum
CREATE TYPE public.notification_type AS ENUM ('bug', 'message', 'ticket');

-- Create notifications table
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title text NOT NULL,
  content text,
  link text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast queries
CREATE INDEX idx_notifications_user_unread ON public.notifications (user_id, is_read) WHERE is_read = false;
CREATE INDEX idx_notifications_user_created ON public.notifications (user_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notifications
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Users can update own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- ============================================================
-- TRIGGER: New bug report → notify staff (admin/koordynator)
-- ============================================================
CREATE OR REPLACE FUNCTION public.notify_on_new_bug()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, title, content, link)
  SELECT p.id, 'bug'::notification_type,
    'Nowy błąd: ' || NEW.title,
    LEFT(NEW.description, 200),
    '/admin/bugs'
  FROM public.profiles p
  WHERE p.role IN ('superadmin', 'boss', 'koordynator')
    AND p.status != 'inactive'
    AND p.id != NEW.reporter_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_new_bug
  AFTER INSERT ON public.bug_reports
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_new_bug();

-- ============================================================
-- TRIGGER: New ticket → notify staff
-- ============================================================
CREATE OR REPLACE FUNCTION public.notify_on_new_ticket()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.assigned_to IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, content, link)
    VALUES (
      NEW.assigned_to, 'ticket'::notification_type,
      'Nowe zgłoszenie: ' || NEW.title,
      LEFT(NEW.description, 200),
      '/admin/tickets'
    );
  ELSE
    INSERT INTO public.notifications (user_id, type, title, content, link)
    SELECT p.id, 'ticket'::notification_type,
      'Nowe zgłoszenie: ' || NEW.title,
      LEFT(NEW.description, 200),
      '/admin/tickets'
    FROM public.profiles p
    WHERE p.role IN ('superadmin', 'boss', 'koordynator')
      AND p.status != 'inactive';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_new_ticket
  AFTER INSERT ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_new_ticket();

-- ============================================================
-- TRIGGER: New comment on task → notify assigned members
-- ============================================================
CREATE OR REPLACE FUNCTION public.notify_on_new_comment()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  v_task_title text;
BEGIN
  SELECT title INTO v_task_title FROM public.tasks WHERE id = NEW.task_id;

  INSERT INTO public.notifications (user_id, type, title, content, link)
  SELECT ta.user_id, 'message'::notification_type,
    'Nowy komentarz w: ' || COALESCE(v_task_title, 'zadanie'),
    LEFT(NEW.content, 200),
    '/tasks/' || NEW.task_id
  FROM public.task_assignments ta
  WHERE ta.task_id = NEW.task_id
    AND ta.user_id != NEW.user_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_new_comment
  AFTER INSERT ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_new_comment();