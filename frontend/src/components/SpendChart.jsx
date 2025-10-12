import React, { useMemo } from 'react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip,
  CartesianGrid, ReferenceLine
} from 'recharts';

// ---- Helpers ----
// Locale-aware formatters (German/EUR). Keep UI consistent with rest of app.
const fmtEUR = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' });
const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('de-DE', { year: 'numeric', month: '2-digit', day: '2-digit' }) : '';

/**
 * fillDaily
 * Ensures a continuous daily time series between the first and last data points.
 * Fills missing dates with zeros so the line chart doesn't skip gaps.
 */
function fillDaily(data) {
  if (!data.length) return data;
  const res = [];
  const start = new Date(data[0].date);
  const end = new Date(data[data.length - 1].date);
  const map = new Map(data.map(d => [d.date, d]));
  for (let t = new Date(start); t <= end; t.setDate(t.getDate() + 1)) {
    const key = t.toISOString().slice(0, 10); // YYYY-MM-DD
    res.push(map.get(key) ?? { date: key, cost: 0, impressions: 0 });
  }
  return res;
}

/**
 * SpendChart
 * Aggregates daily spend, fills missing days, and plots spend over time
 * with a horizontal reference line for the average daily spend.
 */
export default function SpendChart({ metrics }) {
  // Aggregate by date and fill gaps; memoized to avoid recompute on every render.
  const { data, avg } = useMemo(() => {
    const byDate = {};
    for (const m of metrics || []) {
      const d = m.date; // expected: YYYY-MM-DD
      const cost = Number(m.cost || 0);
      const impressions = Number(m.impressions || 0);
      if (!byDate[d]) byDate[d] = { date: d, cost: 0, impressions: 0 };
      byDate[d].cost += cost;
      byDate[d].impressions += impressions;
    }
    // Chronological order for fillDaily and the chart
    let arr = Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));
    arr = fillDaily(arr);

    // Average daily spend over the displayed period (including filled zero days)
    const total = arr.reduce((s, d) => s + d.cost, 0);
    const avg = arr.length ? total / arr.length : 0;

    return { data: arr, avg };
  }, [metrics]);

  // Axis/tooltip formatters: keep numbers and dates readable & localized
  const yFmt = (v) => fmtEUR.format(v);
  const xTickFmt = (v) => fmtDate(v);

  return (
    <div className="chart-wrap">
      <h2 style={{ marginBottom: 10 }}>Spend over Time</h2>
      <div style={{ color: '#666', marginBottom: 12, fontSize: 12 }}>
        Täglich · Durchschnitt: <strong>{fmtEUR.format(avg)}</strong>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tickFormatter={xTickFmt}
            minTickGap={24}
            interval="preserveStartEnd"
            height={30}
            tickMargin={8}
            padding={{ left: 16, right: 16 }}
            tick={{ fontSize: 13, fill: '#111' }}
          />
          <YAxis
            width={84}
            tick={{ fontSize: 13, fill: '#111' }}
            tickFormatter={yFmt}
            domain={[
              (min) => Math.floor(min * 0.95),  // small padding below min for aesthetics
              (max) => Math.ceil(max * 1.05),   // small padding above max
            ]}
          />
          <Tooltip
            labelFormatter={(label) => fmtDate(label)}
            formatter={(value, name) => (name === 'Cost' ? fmtEUR.format(value) : value)}
          />
          {/* Horizontal average line for quick benchmark */}
          <ReferenceLine y={avg} strokeOpacity={0.5} strokeDasharray="4 4" />
          <Line
            type="monotone"       // smooth curve; good for time series
            dataKey="cost"
            name="Cost"
            stroke="#8884d8"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
