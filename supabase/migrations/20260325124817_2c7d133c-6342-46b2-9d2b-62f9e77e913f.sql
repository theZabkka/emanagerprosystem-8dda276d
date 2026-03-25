
-- Step 1: Create new columns with proper lexo_rank ordering
-- First, save existing column IDs and their deals mapping
DO $$
DECLARE
  first_new_col_id uuid;
BEGIN
  -- Insert new columns
  INSERT INTO crm_columns (id, name, lexo_rank) VALUES
    (gen_random_uuid(), 'MINI TABLICA DNIA', 'A'),
    (gen_random_uuid(), 'LEAD – do przesiania', 'B'),
    (gen_random_uuid(), 'KWALIFIKACJA', 'C'),
    (gen_random_uuid(), 'PRAWIE I UMÓWIONE SPOTKANIE', 'D'),
    (gen_random_uuid(), 'WAŻNE – OPRACOWAĆ!!!', 'E'),
    (gen_random_uuid(), 'OFERTA', 'F'),
    (gen_random_uuid(), 'PIERWSZY TELEFON DO OFERTY', 'G'),
    (gen_random_uuid(), 'PROCES SPRZEDAŻY – REALIZACJA', 'H'),
    (gen_random_uuid(), 'WISI W POWIETRZU', 'I'),
    (gen_random_uuid(), 'DO ODRZUCENIA', 'J'),
    (gen_random_uuid(), 'MIKRO INTERWENCJE DO ROZLICZENIA', 'K');

  -- Get the first new column (LEAD – do przesiania) to migrate existing cards
  SELECT id INTO first_new_col_id FROM crm_columns WHERE lexo_rank = 'B' LIMIT 1;

  -- Move all existing deals to LEAD column
  UPDATE crm_deals SET column_id = first_new_col_id
  WHERE column_id IN (
    SELECT id FROM crm_columns WHERE lexo_rank NOT IN ('A','B','C','D','E','F','G','H','I','J','K')
  );

  -- Delete old columns
  DELETE FROM crm_columns WHERE lexo_rank NOT IN ('A','B','C','D','E','F','G','H','I','J','K');
END $$;
