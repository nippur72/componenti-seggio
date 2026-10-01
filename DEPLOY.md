# Deploy: GitHub Pages + Supabase (tutto client-side, zero server)

Il progetto e' una SPA statica: il build Vite va su GitHub Pages, i dati su un
progetto Supabase (PostgreSQL). Non c'e' alcun server da gestire.

## 1. Progetto Supabase

1. Account su <https://supabase.com> → **New project** (regione UE, es. `West EU (London)`).
2. **SQL Editor** → New query → incolla tutto `db/setup.sql` → **Run**.
   Crea la tabella `componenti_seggi`, il trigger di audit e le policy RLS.
3. (Facoltativo, dati di test) esegui anche `db/seed.sql`.
4. **Project Settings → API**: copia `Project URL` e `anon public` key.

## 2. Configurazione del client

Incolla URL e chiave anon in `src/lib/supabase.ts` (i due valori di default con
"RIMPIAZZA"). In alternativa, a build time: `VITE_SUPABASE_URL` e
`VITE_SUPABASE_ANON_KEY`.

La chiave anon e' pubblica per progetto: la sicurezza e' nelle policy RLS
(lettura di tutto, UPDATE solo di nome/cognome/codice_fiscale/iban/telefono,
niente INSERT/DELETE, audit non leggibile).

## 3. Test locale

```bash
npm install
npm run dev      # http://localhost:5173
```

## 4. GitHub Pages

1. Crea un repository (puo' essere **pubblico**: nel repo non vanno mai dati
   personali — vedi nota sotto) e carica la cartella del progetto come root del repo.
2. **Settings → Pages → Build and deployment → Source: `GitHub Actions`**.
3. Push: il workflow `.github/workflows/deploy.yml` compila e pubblica ad ogni push
   su `main`/`master` (o da tab **Actions → Run workflow**).
4. Il sito sara' su `https://<utente>.github.io/<repo>/` e le schede sezioni su
   `https://<utente>.github.io/<repo>/#/elettorale/<pin>`.

## 5. Import dei dati reali (opzionale)

```bash
# Project Settings -> Database -> Connection string -> URI (Session pooler)
set DATABASE_URL=postgres://postgres.PROGETTO:PASSWORD@aws-0-regione.pooler.supabase.com:5432/postgres
node tools/import_tabella_csv.mjs <percorso di work/tabella_sql.csv> --truncate
```

Il CSV contiene dati personali: non va mai committato, cancellalo dopo l'uso.

## Note operative

- **Pausa free tier**: Supabase mette in pausa i progetti gratuiti dopo ~1 settimana
  di inattivita'; si riattiva con un click dalla dashboard. Per evitarlo, un cron
  GitHub Action che ogni notte fa una richiesta GET all'endpoint REST del progetto
  (con la chiave anon) basta a tenerlo attivo.
- **Backup**: dashboard Supabase → Database → Backups.
- **Audit**: ogni modifica e' registrata nella tabella `audit_log` (solo via SQL
  Editor/dashboard, non via API).
- **Ripristino dati**: la tabella si puo' ricreare sempre da `db/setup.sql` +
  `tools/import_tabella_csv.mjs` con il CSV storico.
