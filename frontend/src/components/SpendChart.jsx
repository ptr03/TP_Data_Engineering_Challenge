import React, { useMemo, useState, useEffect, useRef } from 'react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip,
  CartesianGrid, ReferenceLine, Brush
} from 'recharts';

const fmtEUR = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' });
const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('de-DE', { year: 'numeric', month: '2-digit', day: '2-digit' }) : '';

function fillDaily(data) {
  if (!data.length) return data;
  const res = [];
  const start = new Date(data[0].date);
  const end = new Date(data[data.length - 1].date);
  const map = new Map(data.map(d => [d.date, d]));
  for (let t = new Date(start); t <= end; t.setDate(t.getDate() + 1)) {
    const key = t.toISOString().slice(0, 10);
    res.push(map.get(key) ?? { date: key, cost: 0, impressions: 0 });
  }
  return res;
}

export default function SpendChart({ metrics, onDateWindowChange = () => {} }) {
  const { data, avg } = useMemo(() => {
    const byDate = {};
    for (const m of metrics || []) {
      const d = m.date; 
      const cost = Number(m.cost || 0);
      const impressions = Number(m.impressions || 0);
      if (!byDate[d]) byDate[d] = { date: d, cost: 0, impressions: 0 };
      byDate[d].cost += cost;
      byDate[d].impressions += impressions;
    }
    let arr = Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));
    arr = fillDaily(arr);
    const total = arr.reduce((s, d) => s + d.cost, 0);
    const avg = arr.length ? total / arr.length : 0;
    return { data: arr, avg };
  }, [metrics]);

  const [range, setRange] = useState({
    startIndex: 0,
    endIndex: Math.max(0, (data?.length || 1) - 1),
  });

  useEffect(() => {
    const n = data?.length || 0;
    if (!n) {
      setRange({ startIndex: 0, endIndex: 0 });
      return;
    }
    setRange(prev => {
      const startIndex = Math.min(Math.max(0, prev.startIndex), n - 1);
      const endIndex = Math.min(Math.max(startIndex, prev.endIndex), n - 1);
      if (startIndex === prev.startIndex && endIndex === prev.endIndex) return prev;
      return { startIndex, endIndex };
    });
  }, [data]);

  const view = useMemo(() => {
    if (!data?.length) return [];
    const { startIndex, endIndex } = range;
    return data.slice(startIndex, endIndex + 1);
  }, [data, range]);

  const yFmt = (v) => fmtEUR.format(v);
  const xTickFmt = (v) => fmtDate(v);

  const lastWindowRef = useRef({ from: null, to: null });
  useEffect(() => {
    const n = data?.length || 0;
    if (!n) return;

    const from = data[Math.max(0, range.startIndex)]?.date;
    const to = data[Math.min(n - 1, range.endIndex)]?.date;
    if (!from || !to) return;

    const last = lastWindowRef.current;
    if (last.from !== from || last.to !== to) {
      lastWindowRef.current = { from, to };
      onDateWindowChange({ from, to });
    }
  }, [data, range, onDateWindowChange]);

  return (
    <div className="chart-wrap">
      <h2 style={{ marginBottom: 10 }}>Spend over Time</h2>
      <div style={{ color: '#666', marginBottom: 12, fontSize: 12 }}>
        Täglich · Durchschnitt: <strong>{fmtEUR.format(avg)}</strong>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={view} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
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
              (min) => Math.floor(min * 0.95),
              (max) => Math.ceil(max * 1.05),
            ]}
          />
          <Tooltip
            labelFormatter={(label) => fmtDate(label)}
            formatter={(value, name) => (name === 'Cost' ? fmtEUR.format(value) : value)}
          />
          <ReferenceLine y={avg} strokeOpacity={0.5} strokeDasharray="4 4" />
          <Line
            type="monotone"
            dataKey="cost"
            name="Cost"
            stroke="#8884d8"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 6 }}>
        <span style={{ fontSize: 13, color: '#6b7280', width: 80, textAlign: 'center' }}>
          {data?.[0]?.date ? fmtDate(data[0].date) : ''}
        </span>

        <div style={{ width: '70%', minWidth: 260 }}>
          <ResponsiveContainer width="100%" height={34}>
            <LineChart data={data}>
              <Brush
                dataKey="date"
                height={18}
                travellerWidth={10}
                startIndex={range.startIndex}
                endIndex={range.endIndex}
                onChange={(r) => {
                  if (!r) return;
                  const n = data?.length || 0;
                  const s = Math.min(Math.max(0, r.startIndex ?? 0), Math.max(0, n - 1));
                  const e = Math.min(Math.max(0, r.endIndex ?? s), Math.max(0, n - 1));
                  setRange(prev => {
                    if (prev.startIndex === s && prev.endIndex === e) return prev;
                    return { startIndex: s, endIndex: e };
                  });
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <span style={{ fontSize: 13, color: '#6b7280', width: 80, textAlign: 'center' }}>
          {data?.length ? fmtDate(data[data.length - 1].date) : ''}
        </span>
      </div>
    </div>
  );
}
