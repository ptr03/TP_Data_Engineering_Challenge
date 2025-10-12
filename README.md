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

Quickstart

### 1. Node.js installieren

Installiere die aktuelle **LTS-Version** von Node.js, falls noch nicht vorhanden.

---

### 2. Repository klonen

Klon das Projekt und öffne anschließend den Projektordner im Root-Verzeichnis.

---

### 3. Root-Dependencies installieren

```bash
npm install
```

---

### 4. Umgebungsvariablen (Server-Seite) einrichten

Erstelle im Root-Verzeichnis eine `.env`-Datei auf Basis des Beispiels:

```bash
cp env.example .env
```

Fülle anschließend in der `.env` die Werte für:

```
SUPABASE_URL
SUPABASE_SERVICE_KEY
```

---

### 5. Frontend-Umgebung konfigurieren

Wechsle in den `frontend`-Ordner und lege dort eine `.env.local`-Datei an.
Kopiere die Variablen aus `env.example` und setze die Werte für:

```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

---

### 6. Daten prüfen & importieren

Zur Validierung und zum Import der Daten (z. B. Kampagnendaten):

```bash
npm run validate
node import.js data/campaigns.csv
```

---

### 7. Frontend starten

```bash
cd frontend
npm install
npm run dev
```

Danach kannst du das Frontend unter
👉 **[http://localhost:5173](http://localhost:5173)**
im Browser öffnen.

---

### 8. (Optional) Production Build erstellen

Falls du das Projekt für den Live-Betrieb bauen möchtest:

```bash
npm run build
```

(diesen Befehl im `frontend`-Ordner ausführen)

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

- Frontend: bessere UI/UX.
- Tests: automatisierte SQL tests + unit tests für Import/Validator.
- Production import: COPY from storage bucket
- Automatischer Datenfluss: CSV-Upload (lokal oder via Storage) triggert Import nach Supabase und aktualisiert das Frontend selbständig.

## Hinweise für Reviewer

- `.env` enthält Secrets und ist in `.gitignore`. Niemals pushen.
- Falls ein Secret versehentlich gepusht wurde: sofort Key rotieren in Supabase.
- Für das Frontend lege `frontend/.env.local` an und setze dort `VITE_SUPABASE_URL` und `VITE_SUPABASE_ANON_KEY`. Die Root-`.env` darf nur den Service-Key für `import.js` enthalten (niemals public).
- Security-Reminder: Wenn ein Service-Role-Key versehentlich gepusht wurde — Key sofort in Supabase rotieren und ggf. Git-History säubern.
