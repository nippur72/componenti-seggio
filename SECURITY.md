# Report di sicurezza — componenti-seggio

Data analisi: 2026-10-01
Ambito: SPA React client-only su GitHub Pages + database Supabase (PostgreSQL), zero server.
Documento interno di analisi (non è il canale di segnalazione vulnerabilità).

---

## 0. Sintesi

L'impianto dichiarato ("la sicurezza è nella segretezza dell'URL, non nella robustezza dei
codici") è **vero ma più debole del previsto**, per due motivi indipendenti:

1. **I dati non sono protetti dal PIN.** Le policy RLS permettono la lettura di *tutta* la
   tabella con la sola chiave anon (pubblica per design, presente nel bundle e nel repo):
   un singolo `curl` scarica nome, cognome, codice fiscale e IBAN di tutte le sezioni,
   senza aprire l'app e senza conoscere nessun PIN/QR.
2. **La pagina "nascosta" `elettorale_status` non è nascosta**: è raggiungibile in due
   click da qualsiasi pagina sezione tramite un bottone nella home (`HomePage.tsx`) e il
   link alla home nell'header (`SiteHeader.tsx`). Chiunque riceva un QR la trova.

Inoltre la scrittura è altrettanto pubblica della lettura: chiunque può riscrivere le 5
colonne di qualsiasi riga → vandalismo/cancellazione dei dati in un attacco banale da
script, proprio nei giorni delle elezioni.

Correzioni minime individuate (nessuna richiede un server e nessuna stravolge
l'architettura): sezione 5.

---

## 1. Architettura e modello di minaccia dichiarato

- SPA statica React 18 + Vite pubblicata su GitHub Pages (repo pubblico: richiesto dal
  piano GitHub Free per il Pages), `HashRouter`, nessun server.
- Dati su Supabase; il browser usa `supabase-js` con la chiave **anon pubblicabile**
  (`sb_publishable_...`): per definizione non è un segreto.
- Flussi:
  - `/#/elettorale/{pin}` — scheda di sezione (QR), lettura + modifica dei componenti;
  - `/#/elettorale_status` — vista completa di tutte le sezioni, filtro ed export CSV;
  - `/` — home: genera il link/PIN di qualsiasi sezione e linka la pagina di stato.
- Assunzioni di sicurezza dichiarate dal progetto:
  1. chi non ha il QR non conosce il PIN → non entra nella pagina e non fa danni;
  2. `elettorale_status` non è nota al pubblico → in teoria nessuno vi accede;
  3. eventuali segreti sono ricavabili dal sorgente su GitHub; la difesa è l'oscurità.

---

## 2. Verifica delle assunzioni (esito)

### 2.1 Il PIN / QR — offuscamento efficace come tale, ma non è una barriera

Evidenze (`src/pages/pin.ts`):

- l'algoritmo è reversibile e pubblico: `pin = ((sez*2 + speciale) * 2543) ^ 349524`;
  `pin_to_sez` lo inverte con controlli di coerenza (mod 2543, range 1–196);
- lo spazio dei PIN è **392 valori** (196 sezioni × normale/speciale): enumerabile in
  pochi secondi da chiunque legga il codice;
- **il generatore di PIN è pubblicato**: `HomePage.tsx` alla radice del sito accetta un
  numero di sezione e produce il link `#/elettorale/{pin}` per chiunque conosca l'URL del
  sito. Quindi il PIN non è un segreto rispetto a chi trova la home.

Verdetto: come "codice porta" casuale da QR cartaceo ha un valore pratico (scoraggia il
curioso che non conosce il sito), ma non resiste a chi conosce l'URL del sito o il repo.
E soprattutto il PIN non protegge i *dati*: vedi 3.1.

### 2.2 La pagina `elettorale_status` — non nascosta

Evidenze:

- `src/pages/HomePage.tsx` contiene il bottone "Stato componenti di seggio" →
  `#/elettorale_status`;
- `src/components/SiteHeader.tsx` linka la home da ogni pagina;
- quindi: QR della sezione → click sul titolo → click sul bottone → **tutti** i CF/IBAN di
  tutte le sezioni;
- il sito è su GitHub Pages pubblica (e indicizzabile dai motori di ricerca, salvo
  `robots`/`meta noindex`).

Verdetto: l'assunzione 2 non è rispettata. Va corretto o accettato esplicitamente.

### 2.3 Il sorgente su GitHub — nessun segreto, ma la superficie è più larga del previsto

Verificato sullo storico git (unico commit `e830678`):

- **nessuna** `service_role` key e **nessuna** password/connection string reale
  committata (in `DEPLOY.md` e `tools/import_tabella_csv.mjs` ci sono solo placeholder);
- la chiave nel bundle (`src/lib/supabase.ts`) è una chiave pubblicabile: giusto che sia
  lì;
- nessun CSV di dati reali committato (`*.csv` in `.gitignore`; verificato anche
  `git check-ignore` e l'assenza dallo storico);
- `db/import_dati_iniziali.sql` è ignorato da git (resta locale).

Il problema non è quindi "il sorgente rivela i segreti": è che **RLS rende pubblico
esattamente ciò che il client fa**: lettura totale e aggiornamento delle 5 colonne per
chiunque presenti la chiave pubblicabile.

---

## 3. Risultati della verifica (falle e rischi)

### 3.1 [Alta] Lettura pubblica di tutti i dati personali

`db/setup.sql`:

```sql
CREATE POLICY "lettura_pubblica" ON componenti_seggi
    FOR SELECT TO anon, authenticated USING (true);
GRANT SELECT ON componenti_seggi TO anon;
```

Chiunque, senza PIN e senza UI, con la chiave anon (pubblica nel bundle e nel repo):

```
GET https://<progetto>.supabase.co/rest/v1/componenti_seggi?select=*
apikey: <chiave anon>
```

ottiene in una/due richieste (limite 1000 righe lato PostgREST) l'intera tabella:
nominativi, codici fiscali, IBAN. Impatto GDPR/PA elevato e superiore al rischio
"casuale" assunto: la scoperta del progetto (repo pubblico, Pages, URL citato altrove)
equivale alla pubblicazione dei dati.

### 3.2 [Alta] Scrittura pubblica = vandalismo di massa

Stesse policy:

```sql
CREATE POLICY "aggiornamento_pubblico" ON componenti_seggi
    FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
GRANT UPDATE (nome, cognome, codice_fiscale, iban, telefono) ON componenti_seggi TO anon;
```

Chiunque può riscrivere le 5 colonne di **qualsiasi** riga (id sequenziali, enumerabili),
per esempio svuotando tutti i nominativi. Non c'è rate limiting nell'app. Il PIN non
c'entra nulla: la scrittura avviene contro l'API REST, non contro la pagina. Nei giorni
delle elezioni è un rischio di integrità dei dati, non solo di privacy.

### 3.3 [Media] Grant asimmetrici: il ruolo `authenticated` conserva privilegi più ampi

In `db/setup.sql` il `REVOKE`/`GRANT` column-level è fatto **solo per `anon`**, mentre le
policy valgono `TO anon, authenticated`. Nei progetti Supabase i privilegi di default
dello schema `public` concedono `ALL` su ogni tabella nuova a `anon`, `authenticated`,
`service_role` (comportamento di default: da verificare con la query in 6.1). Se il
progetto lascia attive le registrazioni email (default), chiunque può **auto-registrarsi**
con la chiave pubblica, ottenere un JWT `authenticated` e — se i grant di default sono
rimasti — eseguire UPDATE su *tutte* le colonne (anche `sez`, `ruolo`, `id`), non solo
sulle 5 editabili. INSERT/DELETE restano negati (nessuna policy li copre).

### 3.4 [Media] L'oscurità della pagina di stato è smentita dal codice

Vedi 2.2: link diretto dalla home, home linkata dall'header. L'URL "non noto al pubblico"
è anche indicizzabile: nessun `robots`/`noindex`.

### 3.5 [Bassa-Media] Componenti minori

- **`pin_to_sez` valida il range (1–196)**, ma il PIN resta enumerabile e rigenerabile
  dalla home pubblica (2.1). La protezione "QR" è offuscamento, non un segreto.
- **Terze parti**: `src/pages/iban.ts` invia ogni IBAN inserito (a 27 caratteri) a
  `openiban.com`. È un trasferimento di dato personale a un terzo non menzionato
  all'utente; dipendenza esterna nel flusso di inserimento.
- **Indexing/ricerca**: nessuna meta `robots` in `index.html`; il sito può comparire nei
  motori e nel repository GitHub.
- **Audit**: il trigger registra anche UPDATE identici (nessun `WHEN (OLD.* IS DISTINCT
  FROM NEW.*)`): rumore nel log, non un rischio.
- **Workflow**: `.github/workflows/deploy.yml` usa permessi minimi e nessun secret
  (bene). Gli step usano action di terze parti per tag (`@v4`) e non per SHA: nota
  supply-chain standard, accettabile per il contesto.
- **Fraintendimento residuo da sanare**: `README.md` suggerisce che la lettura pubblica
  "equivale alle API pubbliche dell'originale" e che il PIN protegge la scheda; con il
  database centralizzato e la chiave pubblica, il perimetro è diverso dall'originale:
  l'esposizione è dell'intero database, non di una sezione alla volta.

---

## 4. Cosa è risultato a posto

- Nessun segreto reale nello storico git (solo placeholder); niente CSV nei commit;
  `.env`, `*.csv`, `db/import_dati_iniziali.sql` ignorati.
- `audit_log`: RLS attiva senza policy → non leggibile via API; trigger `SECURITY
  DEFINER` con `search_path` fissato (corretto).
- Limite colonne `anon` in UPDATE implementato a livello di GRANT (le 5 editabili).
- Nessun INSERT/DELETE consentito via API.
- Deploy: GitHub Actions con `permissions` minimi e senza secret.
- Traffico HTTPS (Pages e Supabase).

---

## 5. Remediation proposta

Criterio: restare senza server, senza login, con manutenzione minima. In ordine di
rapporto valore/sforzo.

### 5.1 Quick win (nessuna modifica architetturale)

1. **Chiudere il ruolo `authenticated`** (3.3): revoke dei grant + policy `TO anon`;
   in dashboard disattivare i signup se non usati. SQL in 6.2.
2. **Non linkare `elettorale_status` da pagine pubbliche** (3.4): rimuovere il bottone
   dalla home; valutare di proteggere la pagina con un token amministratore (5.2) o
   accettare esplicitamente l'esposizione.
3. **`noindex`**: `<meta name="robots" content="noindex,nofollow">` in `index.html`
   (riduce solo la scoperta accidentale).
4. **Revoke difensivo** anche su `audit_log` per `anon`/`authenticated`.
5. **Privacy IBAN**: sostituire `openiban.com` con validazione locale (lunghezza,
   prefisso IT, checksum mod 97) oppure accettare e documentare il trasferimento al
   terzo.
6. **Pulizia**: cancellare il CSV esportato nella root (`*.csv`, 120 KB di dati reali) e
   `db/import_dati_iniziali.sql` dopo l'uso.

Nota: i punti 1–4 riducono il rischio di scoperta/vandalismo tramite UI, ma **non
chiudono il dump completo** via REST (3.1), perché la lettura pubblica resta per scelta.
Se lo si vuole chiudere davvero → 5.2.

### 5.2 Proposta "token + RPC" (resta client-only; opzionale ma consigliata)

Sostituisce il PIN reversibile con un **capability token casuale per sezione** e sposta
lettura/scrittura dietro funzioni `SECURITY DEFINER`, revocando ogni accesso diretto
alle tabelle. Risultato:

- dump completo impossibile con la sola chiave pubblica (serve il token admin);
- un QR compromesso espone/modifica **solo** la propria sezione;
- il danno massimo da vandalismo è limitato a una sezione;
- nessun server, nessun account, nessuna dipendenza nuova.

Bozza SQL (da rifinire, `pgcrypto`/`gen_random_bytes` è disponibile su Supabase):

```sql
-- token per sezione (non leggibile via API: RLS senza policy)
create table if not exists sezioni_token (
    sez      int     not null,
    speciale boolean not null default false,
    token    text    not null default encode(gen_random_bytes(16), 'hex'),
    primary key (sez, speciale)
);
alter table sezioni_token enable row level security;

-- impostazioni (token amministratore per status e generazione link)
create table if not exists impostazioni (
    chiave text primary key,
    valore text not null
);
alter table impostazioni enable row level security;
insert into impostazioni (chiave, valore)
values ('admin_token', encode(gen_random_bytes(24), 'hex'))
on conflict do nothing;

-- lettura di una sezione: richiede il token della sezione
create or replace function get_seggio(p_token text)
returns setof componenti_seggi
language sql security definer set search_path = public, extensions as $$
    select c.*
    from componenti_seggi c
    join sezioni_token t on t.sez = c.sez and t.speciale = c.speciale
    where t.token = p_token
    order by c.ruolo, c.id;
$$;

-- scrittura: il token deve appartenere alla sezione della riga
create or replace function put_componente(
    p_token text, p_id bigint,
    p_nome text, p_cognome text, p_codice_fiscale text, p_iban text, p_telefono text)
returns void
language sql security definer set search_path = public, extensions as $$
    update componenti_seggi c
    set nome = coalesce(p_nome, ''), cognome = coalesce(p_cognome, ''),
        codice_fiscale = coalesce(p_codice_fiscale, ''), iban = coalesce(p_iban, ''),
        telefono = coalesce(p_telefono, '')
    where c.id = p_id
      and exists (select 1 from sezioni_token t
                  where t.sez = c.sez and t.speciale = c.speciale
                    and t.token = p_token);
$$;

-- lettura completa (pagina status): richiede il token admin
create or replace function get_all_seggi(p_admin text)
returns setof componenti_seggi
language sql security definer set search_path = public, extensions as $$
    select * from componenti_seggi
    where p_admin = (select valore from impostazioni where chiave = 'admin_token')
    order by sez, speciale desc, ruolo, id;
$$;

-- superficie: niente più accesso diretto alle tabelle
drop policy if exists "lettura_pubblica" on componenti_seggi;
drop policy if exists "aggiornamento_pubblico" on componenti_seggi;
revoke all on table componenti_seggi  from anon, authenticated;
revoke all on table sezioni_token     from anon, authenticated;
revoke all on table impostazioni      from anon, authenticated;
grant execute on function get_seggio(text)   to anon, authenticated;
grant execute on function put_componente(text, bigint, text, text, text, text, text)
                                             to anon, authenticated;
grant execute on function get_all_seggi(text) to anon, authenticated;
```

Impatti sul frontend (contenuti):

- `src/lib/elettorale.ts`: `supabase.rpc("get_seggio", { p_token })`,
  `supabase.rpc("put_componente", { ... })`, `supabase.rpc("get_all_seggi", { p_admin })`;
- `HomePage`: per generare i link serve il token admin → la home diventa pagina
  "ufficio" (token chiesto una volta e tenuto in `localStorage`) che elenca i link
  leggendo i token; il pubblico continua a usare solo il link del QR;
- URL della scheda: `#/elettorale/{token}` al posto del PIN numerico;
- attenzione al limite 1000 righe PostgREST anche per le RPC (paginazione come oggi).
- compatibilità: il vecchio PIN può essere mantenuto in parallelo durante il passaggio.

### 5.3 Operativo (zero codice)

- **Kill switch** documentato: dalla dashboard Supabase, in caso di abuso, revocare
  `UPDATE`/`SELECT` alla tabella o mettere in pausa il progetto; aggiornare qui la
  procedura.
- Rotazione della chiave pubblicabile se abusata (richiede redeploy: la chiave è una
  costante in `src/lib/supabase.ts`).
- Backup/export CSV prima dei giorni di elezione; conservare fuori dal repo.
- Controllo periodico di `audit_log` (via SQL Editor) e del keep-alive del free tier.
- Documentare la decisione presa su 3.1/3.4 (accettata o risolta) per non riesaminarla
  ogni volta.

---

## 6. Query e test di verifica

### 6.1 Verifica dei privilegi attuali (SQL Editor Supabase)

```sql
-- privilegi per tabella e per colonna
select grantee, privilege_type, column_name
from information_schema.column_privileges
where table_schema = 'public' and table_name = 'componenti_seggi'
order by grantee, privilege_type, column_name;

-- policy attive
select policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public' and tablename in ('componenti_seggi', 'audit_log');
```

Da controllare: se `authenticated` compare con UPDATE su colonne oltre le 5 editabili
(atteso con i default Supabase) → applicare 5.1 punto 1. Verificare anche che le
registrazioni email siano disattivate (Authentication → Providers → Email).

### 6.2 Fix pronto per 3.3 (opzione conservativa)

```sql
revoke all on table componenti_seggi from authenticated;
grant select on table componenti_seggi to authenticated;
grant update (nome, cognome, codice_fiscale, iban, telefono)
    on table componenti_seggi to authenticated;
revoke all on table audit_log from anon, authenticated;
```

Alternativa più netta (app senza login): togliere `authenticated` dalle policy.

```sql
drop policy "lettura_pubblica" on componenti_seggi;
drop policy "aggiornamento_pubblico" on componenti_seggi;
create policy "lettura_pubblica" on componenti_seggi
    for select to anon using (true);
create policy "aggiornamento_pubblico" on componenti_seggi
    for update to anon using (true) with check (true);
```

### 6.3 Test manuale di esposizione (sul proprio progetto, dati propri)

Da eseguire solo per prendere consapevolezza dell'esposizione attuale (prima dei fix):

```bash
curl "https://<progetto>.supabase.co/rest/v1/componenti_seggi?select=sez,nome,cognome,codice_fiscale&limit=1" \
  -H "apikey: <chiave anon>"
```

Se risponde con i dati, la lettura pubblica è confermata (3.1). Dopo il fix 5.2 deve
rispondere con errore/vuoto.

---

## 7. Vincoli di progetto da rispettare (per chi interviene)

- Nessun server, nessun login, nessun container: la proposta 5.2 è l'unico passo
  consentito verso più sicurezza reale.
- Non introdurre `service_role` nel client (mai).
- Non committare dati personali (CSV, dump SQL, export).
- Modifiche RLS/schema: sempre in `db/setup.sql` e riportate qui.
- Se il repo è pubblico, questo documento è a sua volta pubblico: non contiene segreti,
  ma descrive le debolezze — decisione consapevole se committarlo.
