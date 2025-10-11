# TP Data Engineering Challenge — Phase 1

Dieses Repo enthält Phase 1 der Case Study: CSV-Validierung, Import in Supabase und Data-Quality-Checks. Das Projekt ist reproduzierbar und vorbereitet für Phase 2 (Frontend).

## Deliverables

- `frontend/` — React + Vite App (Dashboard: KPIs, Tabelle, Chart)
- `campaign_schema.sql` — SQL zur Erstellung der Tabellen in Supabase
- `csv_validator.js` — CSV-Validator (Format- + Logikchecks)
- `import.js` — Batch Importer nach Supabase
- `data/campaigns.csv` — Rohdaten (CSV)
- `env.example` — Vorlage für Umgebungsvariablen
- `Ergebnisse/` — Screenshots / CSV-Exports der SQL-Checks

## Quickstart

1. Node (LTS) installieren.
2. Repo klonen / öffnen.
3. Dependencies installieren (root + frontend):

   ```bash
   npm install
   cd frontend
   npm install
   ```

4. `.env` / `frontend/.env.local` anlegen:

   - Root `.env`: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` (Service Role Key — nur server-side für Import)
   - `frontend/.env.local`: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (Anon key für Browser)

5. In Supabase → SQL Editor `campaign_schema.sql` ausführen.
6. Daten prüfen & importieren:

   ```bash
   # CSV prüfen
   npm run validate
   # Import starten (nutzt Service Role Key)
   npm run import
   # Frontend starten (im /frontend)
   cd frontend
   npm run dev
   ```

## Design-Entscheidungen

- **Schema:** normalisiert in `campaigns` (Stammdaten) und `campaign_metrics` (time series). Vorteil: saubere Aggregationen, Indexierung und verhindert Redundanz.
- **Datentypen:** `bigint` für Counts, `numeric(14,2)` für Geldwerte → präzise Summen/ROAS.
- **Import:** pre-validation → batch processing → upsert für campaigns, insert für metrics → errors nach `errors/`.
- **Security:** Service Role Key wird **nicht** ins Repo gepusht. `.env` ist in `.gitignore`.

## Wie die Daten importiert wurden

1. CSV aus Google Sheets exportiert (UTF-8, comma).
2. `csv_validator.js` geprüft alles auf Format & Logik.
3. `campaign_schema.sql` in Supabase erstellt.
4. `import.js` ausgeführt (batch upserts/inserts).
5. SQL-Checks ausgeführt (counts, nulls, duplicates, logical checks) — Ergebnisse in `evidence/`.

## Wichtige SQL-Checks (zum Kopieren → Supabase SQL Editor)

```sql
-- Counts
SELECT 'campaigns' t, COUNT(*) FROM public.campaigns
UNION ALL
SELECT 'campaign_metrics', COUNT(*) FROM public.campaign_metrics;

-- Datumsspanne
SELECT MIN(date), MAX(date) FROM public.campaign_metrics;

-- Null/Negative checks
SELECT
 SUM(CASE WHEN impressions < 0 THEN 1 ELSE 0 END) AS neg_impr,
 SUM(CASE WHEN cost < 0 THEN 1 ELSE 0 END) AS neg_cost
FROM public.campaign_metrics;

-- Duplikate
SELECT date, campaign_id, COUNT(*) FROM public.campaign_metrics GROUP BY date, campaign_id HAVING COUNT(*) > 1;
```

## Herausforderungen & Lösungen (kurz)

- **Datum / Dezimalformate:** CSV aus Sheets exportiert; Validator akzeptiert europäische Dezimaltrennung.
- **Fehlende DB-Tabellen:** `campaign_schema.sql` zuerst ausführen.
- **Local dev access:** VPN/Proxy kann `localhost` blockieren (z.B. NordVPN) — Dev-Server nutzbar unter `http://127.0.0.1:5173/`.

## Was ich bei mehr Zeit machen würde

- Frontend: Filters (Datum, Campaign Type), Sortierung, Pagination, bessere UI/UX.
- Tests: automatisierte SQL smoke tests + unit tests für Import/Validator.
- Production import: COPY from storage bucket, partitioning, observability, retries.

## Evidence & Abgabe

- `evidence/` enthält Screenshots/CSV-Exports der SQL-Checks.
- Bitte lade folgende GitHub-User als Collaborators ein:

  - `Mojojojo89i`
  - `tp-tjarek`

## Hinweise für Reviewer

- `.env` enthält Secrets und ist in `.gitignore`. Niemals pushen.
- Falls ein Secret versehentlich gepusht wurde: sofort Key rotieren in Supabase.

EOF

# commit & push (edit commit message if you prefer)

git add README.md
git commit -m "docs: finalize concise README for Phase 1 (setup, deliverables, checks)"
git push

```

Sobald du das ausgeführt hast, antworte hier mit **`README committed`** — dann machen wir als nächsten Schritt das UI-Polish (Filters + zusätzliche Metric + Table filter/sort) — ich gebe dir die genauen Änderungen + Commit-Message.
```
