-- Dati di esempio: crea le righe vuote da compilare per alcune sezioni.
-- Struttura identica al seed SQL Server originale (insert_componenti_seggi.sql):
-- per ogni sezione ordinaria 1 Presidente (P), 1 Segretario (Q), 3 Scrutatori (S).
-- Per popolare con i dati reali vedi tools/import_tabella_csv.mjs.

TRUNCATE TABLE componenti_seggi;

INSERT INTO componenti_seggi (sez, speciale, ruolo) VALUES
    (1, false, 'P'), (1, false, 'Q'), (1, false, 'S'), (1, false, 'S'), (1, false, 'S'),
    (2, false, 'P'), (2, false, 'Q'), (2, false, 'S'), (2, false, 'S'), (2, false, 'S'),
    (3, false, 'P'), (3, false, 'Q'), (3, false, 'S'), (3, false, 'S'), (3, false, 'S'),
    (20, true, 'P'), (20, true, 'S'), (20, true, 'S');
