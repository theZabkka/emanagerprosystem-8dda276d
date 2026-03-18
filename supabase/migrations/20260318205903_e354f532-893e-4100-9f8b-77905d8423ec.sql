
-- Fix remaining 3 permissive INSERT policies

-- channel_members: users can only add themselves
DROP POLICY IF EXISTS "Authenticated can insert channel_members" ON public.channel_members;
CREATE POLICY "Users can join channels" ON public.channel_members
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- channels: only staff can create channels
DROP POLICY IF EXISTS "Authenticated can insert channels" ON public.channels;
CREATE POLICY "Staff can insert channels" ON public.channels
  FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));

-- task_status_history: restrict to task members or staff
DROP POLICY IF EXISTS "Authenticated can insert status history" ON public.task_status_history;
CREATE POLICY "Task members or staff can insert status history" ON public.task_status_history
  FOR INSERT TO authenticated WITH CHECK (
    public.is_staff(auth.uid()) OR public.is_task_member(auth.uid(), task_id)
  );
