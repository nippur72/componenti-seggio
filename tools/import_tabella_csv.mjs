#!/usr/bin/env node
// Importa in Supabase (PostgreSQL) il CSV dei componenti dei seggi esportato dal
// vecchio sistema (formato di work/tabella_sql.csv: separatore ";", colonne
// sez;speciale;ruolo;NOME;COGNOME;codice_fiscale;iban[;note...]).
//
// ATTENZIONE: il CSV contiene dati personali reali (codici fiscali, IBAN).
// NON committarlo nel repository e cancellalo dopo l'import.
//
// DATABASE_URL: usa la connessione "Session pooler" di Supabase
// (Project Settings -> Database -> Connection string -> URI), es.:
//   postgres://postgres.PROGETTO:PASSWORD@aws-0-regione.pooler.supabase.com:5432/postgres
// La connessione diretta usa il ruolo proprietario: l'RLS non si applica all'import.
//
// Uso (dalla cartella componenti-seggio/):
//   node tools/import_tabella_csv.mjs <percorso-file.csv> [--truncate]

import { readFileSync } from "fs";
import pg from "pg";

const args = process.argv.slice(2);
const csvPath = args.find(a => !a.startsWith("--"));
const doTruncate = args.includes("--truncate");

if (!csvPath) {
    console.error("Uso: node tools/import_tabella_csv.mjs <file.csv> [--truncate]");
    process.exit(1);
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
    console.error("DATABASE_URL non impostata (es. node --env-file=server/.env tools/import_tabella_csv.mjs ...)");
    process.exit(1);
}

const client = new pg.Client({ connectionString: databaseUrl });

// l'IBAN va accettato solo se plausibile: nel CSV originale alcuni campi contengono
// "Q" / "QUIETANZA DIRETTA" o note libere al posto dell'IBAN
function ibanoPulito(iban) {
    const v = (iban || "").trim().toUpperCase();
    return /^[A-Z0-9]{15,34}$/.test(v) ? v : "";
}

function righe(csv) {
    const lines = csv.split(/\r?\n/).filter(l => l.trim().length > 0);
    const out = [];
    for (const line of lines) {
        const campi = line.split(";").map(s => s.trim());
        if (!/^\d+$/.test(campi[0] ?? "")) continue; // salta header e righe non dati
        out.push({
            sez: parseInt(campi[0]),
            speciale: campi[1] === "1",
            ruolo: (campi[2] ?? "").toUpperCase(),
            nome: (campi[3] ?? "").toUpperCase(),
            cognome: (campi[4] ?? "").toUpperCase(),
            codice_fiscale: (campi[5] ?? "").toUpperCase(),
            iban: ibanoPulito(campi[6])
        });
    }
    return out;
}

try {
    const csv = readFileSync(csvPath, "utf-8");
    const dati = righe(csv);
    if (dati.length === 0) {
        console.error("Nessuna riga dati trovata nel CSV.");
        process.exit(1);
    }

    await client.connect();

    if (doTruncate) {
        await client.query("TRUNCATE TABLE componenti_seggi");
        console.log("Tabella componenti_seggi svuotata.");
    }

    let inserite = 0;
    for (const d of dati) {
        await client.query(
            `INSERT INTO componenti_seggi (sez, speciale, ruolo, nome, cognome, codice_fiscale, iban, telefono)
             VALUES ($1, $2, $3, $4, $5, $6, $7, '')`,
            [d.sez, d.speciale, d.ruolo, d.nome, d.cognome, d.codice_fiscale, d.iban]);
        inserite++;
    }

    console.log(`Import completato: ${inserite} righe inserite.`);
} catch (e) {
    console.error("Import fallito:", e.message);
    process.exitCode = 1;
} finally {
    await client.end().catch(() => {});
}
