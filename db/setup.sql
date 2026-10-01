-- ============================================================
-- componenti-seggio: setup database Supabase (PostgreSQL)
-- Da eseguire una sola volta: Dashboard Supabase -> SQL Editor -> New query,
-- incollare tutto ed eseguire.
-- ============================================================

-- 1) Tabella: port della tabella SQL Server "ComponentiSeggi" (db Phoenix64)
CREATE TABLE IF NOT EXISTS componenti_seggi (
    id             bigserial   PRIMARY KEY,
    sez            int         NOT NULL,
    speciale       boolean     NOT NULL DEFAULT false,
    ruolo          char(1)     NOT NULL CHECK (ruolo IN ('P', 'S', 'G', 'Q')),
    nome           varchar(50) NOT NULL DEFAULT '',
    cognome        varchar(50) NOT NULL DEFAULT '',
    codice_fiscale varchar(16) NOT NULL DEFAULT '',
    iban           varchar(34) NOT NULL DEFAULT '',
    telefono       varchar(20) NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS ix_componenti_seggi_sez ON componenti_seggi (sez, speciale);

-- 2) Log di audit (opzionale ma consigliato): ogni UPDATE fatto dal client viene
--    registrato qui. Equivale al "Logga" dell'app presenze. La tabella NON e'
--    leggibile via API (RLS attivo senza policy).
CREATE TABLE IF NOT EXISTS audit_log (
    id            bigserial   PRIMARY KEY,
    at            timestamptz NOT NULL DEFAULT now(),
    componente_id bigint,
    azione        text        NOT NULL,
    dettaglio     jsonb
);

CREATE OR REPLACE FUNCTION log_componente_update() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    INSERT INTO audit_log (componente_id, azione, dettaglio)
    VALUES (NEW.id, 'UPDATE', jsonb_build_object(
        'nome', NEW.nome,
        'cognome', NEW.cognome,
        'codice_fiscale', NEW.codice_fiscale,
        'iban', NEW.iban,
        'telefono', NEW.telefono));
    RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_componenti_audit ON componenti_seggi;
CREATE TRIGGER trg_componenti_audit
    AFTER UPDATE ON componenti_seggi
    FOR EACH ROW EXECUTE FUNCTION log_componente_update();

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- 3) Sicurezza: RLS. Il browser usa la chiave "anon" (pubblica), quindi i
--    permessi qui sotto sono l'intera superficie di attacco: equivalente alle
--    3 API pubbliche dell'app originale (lettura di tutto, aggiornamento solo
--    delle 5 colonne editabili, nessuna creazione/cancellazione).
ALTER TABLE componenti_seggi ENABLE ROW LEVEL SECURITY;

-- lettura pubblica (equivale a Elettorale.GetSeggio / Elettorale.GetAllSeggi)
CREATE POLICY "lettura_pubblica" ON componenti_seggi
    FOR SELECT TO anon, authenticated USING (true);

-- aggiornamento pubblico (equivale a Elettorale.PutComponente); le colonne
-- modificabili sono limitate dai GRANT qui sotto
CREATE POLICY "aggiornamento_pubblico" ON componenti_seggi
    FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

REVOKE ALL ON componenti_seggi FROM anon;
GRANT SELECT ON componenti_seggi TO anon;
GRANT UPDATE (nome, cognome, codice_fiscale, iban, telefono) ON componenti_seggi TO anon;

-- 4) (opzionale) righe d'esempio: vedi db/seed.sql
