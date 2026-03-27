
CREATE SEQUENCE IF NOT EXISTS public.tickets_ticket_number_seq;

ALTER TABLE public.tickets ADD COLUMN ticket_number integer NOT NULL DEFAULT nextval('public.tickets_ticket_number_seq');

ALTER SEQUENCE public.tickets_ticket_number_seq OWNED BY public.tickets.ticket_number;
