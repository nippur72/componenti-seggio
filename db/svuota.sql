-- ============================================================
-- componenti-seggio: svuota i dati anagrafici dei componenti
-- Da eseguire in Dashboard Supabase -> SQL Editor -> New query.
-- Azzera nome, cognome, codice fiscale, IBAN e telefono lasciando
-- intatti numero di sezione (sez/speciale), ruolo e id.
-- ============================================================

UPDATE componenti_seggi
SET nome = '',
    cognome = '',
    codice_fiscale = '',
    iban = '',
    telefono = ''
WHERE nome <> ''
   OR cognome <> ''
   OR codice_fiscale <> ''
   OR iban <> ''
   OR telefono <> '';
