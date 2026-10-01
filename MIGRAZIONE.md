# Migrazione: estrazione dal progetto "presenze" → progetto autonomo client-only

Documento di handoff. Serve a chi (umano o agente LLM) prende in carico il progetto
**dopo** lo spostamento della cartella in un nuovo repository, senza conoscere il
progetto di origine.

---

## 1. Contesto e origine

Questo progetto è stato **estratto** dal progetto `presenze`
(`C:\Users\Utente\Desktop\USB\dipendenti.reggiocal.it\presenze`), un sito ASP.NET
Web Pages (Razor, .NET Framework 4.0) su SQL Server, con frontend React/Vite in `src/`,
per la funzionalità **"Componenti del Seggio Elettorale"** del Comune di Reggio Calabria.

Il progetto originale resta **intatto e funzionante**. La cartella `componenti-seggio/`
è autonoma e spostabile ovunque (nessun percorso assoluto nel codice).

### Architettura attuale (serverless)

- **SPA statica** React 18 + Vite, pubblicata su **GitHub Pages** (workflow incluso)
- **Supabase** (PostgreSQL) per i dati: il browser usa direttamente `supabase-js`
  con la chiave anon; i permessi sono nelle **policy RLS** di `db/setup.sql`
- **Zero server**: niente Express, niente RPC, niente container

Storia: la prima versione dell'estrazione aveva un server Node/Express con lo stesso
protocollo RPC dell'app originale (`Elettorale.*`, deploy su Cloud Run + Cloud SQL).
È stata convertita a client-only su richiesta (manutenzione e know-how minimi);
quella variante si può ricostruire da zero se un giorno servisse controllo server-side.

### Mappa delle fonti originali → progetto

| File originale (in `presenze/`) | File qui |
|---|---|
| `Code/Api/ElettoraleApi.cs` | logica in `src/lib/elettorale.ts` (3 funzioni su Supabase) |
| `src/pages/elettorale/ComponentiSeggi.tsx` | `src/pages/ComponentiSeggi.tsx` |
| `src/pages/elettorale/ElettoraleStatus.tsx` | `src/pages/ElettoraleStatus.tsx` |
| `src/pages/elettorale/pin.ts` | `src/pages/pin.ts` (senza assegnazioni a `window`) |
| `src/pages/elettorale/iban.ts` | `src/pages/iban.ts` |
| `src/lib/CodiceFiscale.ts` | `src/lib/CodiceFiscale.ts` (verbatim) |
| `src/lib/utils.ts` (capitalize/capitalizeAll) | `src/lib/utils.ts` (solo quelle 2 funzioni) |
| tabella SQL Server `ComponentiSeggi` (db Phoenix64) | `db/setup.sql` (tabella `componenti_seggi` + RLS + audit) |
| `src/pages/elettorale/work/insert_componenti_seggi.sql` | struttura replicata in `db/seed.sql` |
| `src/pages/elettorale/work/tabella_sql.csv` (dati reali 2024) | importabile con `tools/import_tabella_csv.mjs` |

`src/pages/HomePage.tsx` e `src/components/SiteHeader.tsx` sono **nuovi** (nell'originale
i link con PIN arrivavano da presenze e l'header era in `MainTag.tsx`).

### Equivalenze originali → attuali

| App originale | Qui |
|---|---|
| RPC `Elettorale.GetSeggio` (pubblica) | `getSeggio()` → SELECT RLS `lettura_pubblica` |
| RPC `Elettorale.GetAllSeggi` (pubblica) | `getAllSeggi()` → stessa policy |
| RPC `Elettorale.PutComponente` (pubblica) | `putSeggio()` → UPDATE RLS limitato alle 5 colonne |
| `Logga` → `log_sito_web.YYYY.MM.txt` | trigger `trg_componenti_audit` → tabella `audit_log` |
| PIN nell'URL `/elettorale/{pin}` | PIN nell'URL `/#/elettorale/{pin}` (HashRouter per GitHub Pages) |
| Router BrowserRouter | **HashRouter** (GitHub Pages non ha fallback SPA) |
| client RPC (`api.ts`/`http.ts`) | eliminati: `supabase-js` diretto |

Le colonne DB sono snake_case (`id`, `iban`); la conversione verso le chiavi usate
dal frontend (`Id`, `IBAN`, come il JSON originale) avviene solo in
`src/lib/elettorale.ts` (`rigaDaDb`).

### Decisioni prese

- Presenze **non modificato**; tutte le API/l'accesso restano **pubblici come
  l'originale** (l'unica protezione è il PIN nell'URL: espone IBAN e CF della sezione).
- `speciale` bit SQL Server 0/1 → `boolean` PostgreSQL.
- La chiave anon Supabase è nel bundle JS (è pubblica per progetto): l'accesso REST
  diretto ai dati è paritetico alle API pubbliche originali; i GRANT limitano però
  UPDATE alle sole 5 colonne editabili e vietano INSERT/DELETE.
- `CampoInput` semplificato (solo rami string/password/search, gli unici usati);
  header semplificato; niente stili `_stili.css` dell'originale (solo `global.css`).
- Nel repo non vanno mai dati personali (il CSV storico è locale, mai committato).

---

## 2. Come isolare (spostare la cartella)

Dalla root del progetto presenze, su Windows:

```bat
robocopy componenti-seggio C:\percorso\nuovo-repo /E
cd C:\percorso\nuovo-repo
git init
git add .
git commit -m "Primo import: Componenti Seggio (estratto dal progetto presenze)"
git remote add origin <URL-nuovo-repo>
git push -u origin main
```

`node_modules/` e `dist/` sono già esclusi da `.gitignore`; **`package-lock.json`
va committato** (serve a `npm ci` nel workflow GitHub Pages).
Se si tiene la cartella dentro presenze funziona comunque, ma il workflow Pages
vale quando la cartella è la root del repository.

---

## 3. Verifiche post-spostamento

```bash
npm install
npm run typecheck     # tsc --noEmit
npm run build         # vite build → dist/
npm run dev           # test locale su http://localhost:5173 (richiede Supabase configurato)
```

Setup Supabase e GitHub Pages: [DEPLOY.md](DEPLOY.md) (punti 1-4).

Flusso browser: `/` → sezione 1 → `/#/elettorale/175412` → inserisci dati di un
componente → "Invia dati" → `/#/elettorale_status` mostra la sezione completa
e l'export CSV funziona. In Supabase, `audit_log` contiene l'UPDATE.

---

## 4. Stato attuale e cose da fare

Fatto:
- conversione client-only completata: build e typecheck OK;
- struttura appiattita (SPA alla root), HashRouter, RLS + audit in `db/setup.sql`.

Da fare alla prima sessione utile (nessuna dipendenza dal progetto presenze):
1. **Creare il progetto Supabase** ed eseguire `db/setup.sql` (e opzionalmente `db/seed.sql`).
2. **Configurare** URL + chiave anon in `src/lib/supabase.ts`.
3. **Test end-to-end** con dati reali (`npm run dev`) e **abilitare GitHub Pages**
   (Settings → Pages → Source: GitHub Actions) al primo push.
4. **Import dati reali** con `tools/import_tabella_csv.mjs` (CSV con dati personali:
   non committarlo, cancellarlo dopo l'uso).
5. Facoltativo: keep-alive del free tier Supabase (vedi nota in DEPLOY.md).

---

## 5. Prompt di avvio suggerito per la nuova chat

> Nella cartella `[percorso]/componenti-seggio` trovi una SPA React 18 + Vite
> client-only estratta dal progetto legacy ASP.NET "presenze": gestisce
> l'inserimento dei dati dei componenti dei seggi elettorali. I dati stanno su
> Supabase (PostgreSQL) e il deploy è su GitHub Pages tramite il workflow incluso.
> Prima di intervenire leggi `README.md`, `MIGRAZIONE.md` (mappa delle fonti
> originali, equivalenze con le API originali, decisioni prese) e `DEPLOY.md`
> (setup Supabase + Pages). Stato: build/typecheck OK; restano la creazione del
> progetto Supabase con `db/setup.sql`, la configurazione in `src/lib/supabase.ts`,
> l'abilitazione di Pages e l'eventuale import del CSV storico. Vincoli: accesso
> dati pubblico con RLS (UPDATE solo sulle 5 colonne editabili), HashRouter,
> nessun server; non introdurre backend né cambiare le policy RLS senza motivo
> esplicito.
