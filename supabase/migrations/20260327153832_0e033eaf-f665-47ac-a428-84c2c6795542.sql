
CREATE OR REPLACE FUNCTION public.notify_on_new_ticket()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_formatted_number text;
BEGIN
  v_formatted_number := '#' || LPAD(NEW.ticket_number::text, 4, '0');

  IF NEW.assigned_to IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, content, link)
    VALUES (
      NEW.assigned_to, 'ticket'::notification_type,
      '[Zgłoszenie ' || v_formatted_number || '] ' || NEW.title,
      LEFT(NEW.description, 200),
      '/admin/tickets/' || NEW.id
    );
  ELSE
    INSERT INTO public.notifications (user_id, type, title, content, link)
    SELECT p.id, 'ticket'::notification_type,
      '[Zgłoszenie ' || v_formatted_number || '] ' || NEW.title,
      LEFT(NEW.description, 200),
      '/admin/tickets/' || NEW.id
    FROM public.profiles p
    WHERE p.role IN ('superadmin', 'boss', 'koordynator')
      AND p.status != 'inactive';
  END IF;
  RETURN NEW;
END;
$function$;
