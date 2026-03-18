
CREATE TABLE public.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_name text NOT NULL,
  module_name text NOT NULL,
  can_view boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(role_name, module_name)
);

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view role_permissions"
  ON public.role_permissions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage role_permissions"
  ON public.role_permissions FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.role_permissions (role_name, module_name, can_view) VALUES
  ('boss', 'Mój dzień', true), ('boss', 'Pulpit', true), ('boss', 'Cele i OKR', true),
  ('boss', 'Zadania', true), ('boss', 'Projekty', true), ('boss', 'Tablica operacyjna', true),
  ('boss', 'Tablica zespołu', true), ('boss', 'Rutyny', true),
  ('boss', 'Klienci', true), ('boss', 'Umowy', true), ('boss', 'Zlecenia', true),
  ('boss', 'Lejek sprzedaży', true), ('boss', 'Pomysły klientów', true), ('boss', 'Rozmowy', true), ('boss', 'Mikro-interwencje', true),
  ('boss', 'Komunikator', true), ('boss', 'Skrzynka klientów', true), ('boss', 'Zgłoszenia', true),
  ('boss', 'Zespół', true), ('boss', 'Spotkania', true), ('boss', 'Kalendarz', true), ('boss', 'Nieobecności', true), ('boss', 'Sprzęt', true),
  ('boss', 'Analityki', true), ('boss', 'Retencja', true), ('boss', 'Raporty', true), ('boss', 'Raporty czasu', true), ('boss', 'Wyniki zespołu', true), ('boss', 'Notatki zespołu', true),
  ('boss', 'Automatyzacje', true), ('boss', 'Centrum automatyzacji', true), ('boss', 'Analityka zespołu', true),
  ('boss', 'Zadania cykliczne', true), ('boss', 'Sugestie', true), ('boss', 'Co nowego', true), ('boss', 'Ustawienia', true),
  ('boss', 'Dokumentacja', true), ('boss', 'Instrukcja projektu', true),
  ('koordynator', 'Mój dzień', true), ('koordynator', 'Pulpit', true), ('koordynator', 'Cele i OKR', true),
  ('koordynator', 'Zadania', true), ('koordynator', 'Projekty', true), ('koordynator', 'Tablica operacyjna', true),
  ('koordynator', 'Tablica zespołu', true), ('koordynator', 'Rutyny', true),
  ('koordynator', 'Klienci', true), ('koordynator', 'Umowy', true), ('koordynator', 'Zlecenia', true),
  ('koordynator', 'Lejek sprzedaży', true), ('koordynator', 'Pomysły klientów', true), ('koordynator', 'Rozmowy', true), ('koordynator', 'Mikro-interwencje', true),
  ('koordynator', 'Komunikator', true), ('koordynator', 'Skrzynka klientów', true), ('koordynator', 'Zgłoszenia', true),
  ('koordynator', 'Zespół', true), ('koordynator', 'Spotkania', true), ('koordynator', 'Kalendarz', true), ('koordynator', 'Nieobecności', true), ('koordynator', 'Sprzęt', true),
  ('koordynator', 'Analityki', true), ('koordynator', 'Retencja', true), ('koordynator', 'Raporty', true), ('koordynator', 'Raporty czasu', true), ('koordynator', 'Wyniki zespołu', true), ('koordynator', 'Notatki zespołu', true),
  ('koordynator', 'Automatyzacje', true), ('koordynator', 'Centrum automatyzacji', true), ('koordynator', 'Analityka zespołu', false),
  ('koordynator', 'Zadania cykliczne', true), ('koordynator', 'Sugestie', true), ('koordynator', 'Co nowego', true), ('koordynator', 'Ustawienia', false),
  ('koordynator', 'Dokumentacja', true), ('koordynator', 'Instrukcja projektu', true),
  ('specjalista', 'Mój dzień', true), ('specjalista', 'Pulpit', true), ('specjalista', 'Cele i OKR', false),
  ('specjalista', 'Zadania', true), ('specjalista', 'Projekty', true), ('specjalista', 'Tablica operacyjna', true),
  ('specjalista', 'Tablica zespołu', true), ('specjalista', 'Rutyny', true),
  ('specjalista', 'Klienci', true), ('specjalista', 'Umowy', false), ('specjalista', 'Zlecenia', false),
  ('specjalista', 'Lejek sprzedaży', false), ('specjalista', 'Pomysły klientów', true), ('specjalista', 'Rozmowy', true), ('specjalista', 'Mikro-interwencje', false),
  ('specjalista', 'Komunikator', true), ('specjalista', 'Skrzynka klientów', false), ('specjalista', 'Zgłoszenia', true),
  ('specjalista', 'Zespół', true), ('specjalista', 'Spotkania', true), ('specjalista', 'Kalendarz', true), ('specjalista', 'Nieobecności', true), ('specjalista', 'Sprzęt', false),
  ('specjalista', 'Analityki', false), ('specjalista', 'Retencja', false), ('specjalista', 'Raporty', false), ('specjalista', 'Raporty czasu', true), ('specjalista', 'Wyniki zespołu', false), ('specjalista', 'Notatki zespołu', true),
  ('specjalista', 'Automatyzacje', false), ('specjalista', 'Centrum automatyzacji', false), ('specjalista', 'Analityka zespołu', false),
  ('specjalista', 'Zadania cykliczne', true), ('specjalista', 'Sugestie', true), ('specjalista', 'Co nowego', true), ('specjalista', 'Ustawienia', false),
  ('specjalista', 'Dokumentacja', true), ('specjalista', 'Instrukcja projektu', true),
  ('praktykant', 'Mój dzień', true), ('praktykant', 'Pulpit', true), ('praktykant', 'Cele i OKR', false),
  ('praktykant', 'Zadania', true), ('praktykant', 'Projekty', true), ('praktykant', 'Tablica operacyjna', false),
  ('praktykant', 'Tablica zespołu', false), ('praktykant', 'Rutyny', false),
  ('praktykant', 'Klienci', false), ('praktykant', 'Umowy', false), ('praktykant', 'Zlecenia', false),
  ('praktykant', 'Lejek sprzedaży', false), ('praktykant', 'Pomysły klientów', false), ('praktykant', 'Rozmowy', false), ('praktykant', 'Mikro-interwencje', false),
  ('praktykant', 'Komunikator', true), ('praktykant', 'Skrzynka klientów', false), ('praktykant', 'Zgłoszenia', false),
  ('praktykant', 'Zespół', true), ('praktykant', 'Spotkania', true), ('praktykant', 'Kalendarz', true), ('praktykant', 'Nieobecności', true), ('praktykant', 'Sprzęt', false),
  ('praktykant', 'Analityki', false), ('praktykant', 'Retencja', false), ('praktykant', 'Raporty', false), ('praktykant', 'Raporty czasu', true), ('praktykant', 'Wyniki zespołu', false), ('praktykant', 'Notatki zespołu', false),
  ('praktykant', 'Automatyzacje', false), ('praktykant', 'Centrum automatyzacji', false), ('praktykant', 'Analityka zespołu', false),
  ('praktykant', 'Zadania cykliczne', false), ('praktykant', 'Sugestie', false), ('praktykant', 'Co nowego', true), ('praktykant', 'Ustawienia', false),
  ('praktykant', 'Dokumentacja', true), ('praktykant', 'Instrukcja projektu', true);
