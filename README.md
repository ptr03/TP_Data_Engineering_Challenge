# TP Data Engineering Challenge — Phase 1 + Phase 2

Dieses Repository enthält die vollständige Abgabe für die Touchpoint Case Study:

- **Phase 1:** CSV-Validierung & Import in Supabase (Schema + Import-Script).
- **Phase 2:** Frontend Dashboard (React + Vite) mit KPIs, Campaign Table, Spend- und ROAS-Charts.

## Deliverables

- `frontend/` — React + Vite App (Dashboard: KPIs, Tabelle, Charts)
- `campaign_schema.sql` — SQL zur Erstellung der Tabellen in Supabase
- `csv_validator.js` — CSV-Validator (Format- + Logikchecks)
- `import.js` — Batch Importer nach Supabase (nutzt Service Role Key)
- `data/campaigns.csv` — Rohdaten (CSV)
- `env.example` — Vorlage für Umgebungsvariablen (Server & Frontend)
- `Ergebnisse/` — Screenshots / CSV-Exports der SQL-Checks

## Quickstart

1. Node (LTS) installieren.
2. Repo klonen und root öffnen.
3. Root-Dependencies:
   npm install

4. Root `.env` anlegen (server-side, nur für Import):
   cp env.example .env

   # Fülle SUPABASE_URL & SUPABASE_SERVICE_KEY in .env

5. Frontend-Env (lokal, im Ordner frontend):

   # Kopiere die Frontend-Variablen aus env.example in frontend/.env.local

   # Setze VITE_SUPABASE_URL und VITE_SUPABASE_ANON_KEY

6. Daten prüfen & importieren (root):
   npm run validate
   node import.js data/campaigns.csv

7. Frontend starten:
   cd frontend
   npm install
   npm run dev

   # Öffne http://localhost:5173

8. (Optional) Production build:
   npm run build # im frontend-Ordner

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

## Herausforderungen & Lösungen

- **Datum / Dezimalformate:** CSV aus Sheets exportiert; Validator akzeptiert europäische Dezimaltrennung.
- **Fehlende DB-Tabellen:** `campaign_schema.sql` zuerst ausführen.
- **Local dev access:** VPN/Proxy kann `localhost` blockieren (z.B. NordVPN) — Dev-Server nutzbar unter `http://127.0.0.1:5173/`.

## Was ich bei mehr Zeit machen würde

- Frontend: Filters (Datum, Campaign Type), Sortierung, Pagination, bessere UI/UX.
- Tests: automatisierte SQL smoke tests + unit tests für Import/Validator.
- Production import: COPY from storage bucket, partitioning, observability, retries.

## Hinweise für Reviewer

- `.env` enthält Secrets und ist in `.gitignore`. Niemals pushen.
- Falls ein Secret versehentlich gepusht wurde: sofort Key rotieren in Supabase.
- Für das Frontend lege `frontend/.env.local` an und setze dort `VITE_SUPABASE_URL` und `VITE_SUPABASE_ANON_KEY`. Die Root-`.env` darf nur den Service-Key für `import.js` enthalten (niemals public).
- Security-Reminder: Wenn ein Service-Role-Key versehentlich gepusht wurde — Key sofort in Supabase rotieren und ggf. Git-History säubern.
