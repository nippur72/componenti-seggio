# Componenti Seggio Elettorale

App **statica client-only** estratta dal progetto **presenze** (ASP.NET + SQL Server):
replica la funzionalità "Componenti Seggio" con React 18 + Vite lato client e
**Supabase (PostgreSQL)** come database. Zero server, deploy su **GitHub Pages**.

Il progetto non ha dipendenze dal progetto presenze: la cartella è un repository a sé.

## Struttura

```
├── index.html  vite.config.ts  tsconfig.json  package.json
├── src/                    # SPA React (unica applicazione)
│   ├── lib/supabase.ts     # URL + chiave anon del progetto Supabase (da compilare)
│   ├── lib/elettorale.ts   # accesso dati: getSeggio/getAllSeggi/putSeggio
│   ├── pages/              # ComponentiSeggi, ElettoraleStatus, HomePage + pin/iban
│   ├── components/         # Frame, SiteHeader
│   └── tags/               # Icon, Spinner, LoadingButton, CampoInput
├── db/setup.sql            # schema + policy RLS + trigger audit (da eseguire in Supabase)
├── db/seed.sql             # righe d'esempio (opzionale)
├── tools/import_tabella_csv.mjs   # import del CSV storico dei componenti
├── .github/workflows/deploy.yml   # build & publish automatico su GitHub Pages
├── DEPLOY.md               # istruzioni deploy passo-passo
└── MIGRAZIONE.md           # contesto di estrazione dal progetto presenze (handoff)
```

## Funzionalità (identiche all'originale)

- `/#/elettorale/{pin}` — scheda di inserimento dati dei componenti di una sezione
  (Presidente, Segretario, Scrutatori) con validazione codice fiscale e IBAN
- `/#/elettorale_status` — stato di tutte le sezioni con filtri ed export CSV
- `/` — generatore del link sezione (PIN), che nell'app originale arrivava da presenze

## Sicurezza

Nessun server: il browser parla direttamente con Supabase usando la **chiave anon**
(pubblica). I permessi sono imposti dalle **policy RLS** di `db/setup.sql`:

- `SELECT` pubblico (equivale alle API `GetSeggio`/`GetAllSeggi`, già pubbliche nell'originale)
- `UPDATE` solo sulle 5 colonne editabili (nome, cognome, codice_fiscale, iban, telefono)
- niente `INSERT`/`DELETE` via API
- ogni modifica registrata nella tabella `audit_log` (non leggibile via API)

La protezione della scheda resta il PIN nell'URL, come nell'app originale:
chi conosce il PIN di una sezione vede IBAN e codici fiscali dei suoi componenti.

## Avvio rapido

1. Progetto Supabase + `db/setup.sql` (dettagli in [DEPLOY.md](DEPLOY.md), sezione 1-2)
2. URL e chiave anon in `src/lib/supabase.ts`
3. `npm install && npm run dev` → <http://localhost:5173>

Deploy su GitHub Pages: [DEPLOY.md](DEPLOY.md) — il workflow `.github/workflows/deploy.yml`
pubblica automaticamente ad ogni push.

## Dati

- `db/setup.sql` — tabella `componenti_seggi` (port della tabella SQL Server omonima), RLS, audit
- `db/seed.sql` — righe vuote d'esempio (sezioni 1, 2, 3 e 20 speciale)
- `tools/import_tabella_csv.mjs` — import del CSV storico via connection string
  Supabase ("Session pooler"). **Il CSV contiene dati personali reali: non committarlo.**

## Contesto di origine

La mappa delle fonti originali, le decisioni prese e il prompt di handoff per una
nuova sessione sono in [MIGRAZIONE.md](MIGRAZIONE.md).
