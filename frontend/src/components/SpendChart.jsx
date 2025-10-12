import React, { useMemo } from 'react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts'

export default function SpendChart({ metrics }) {
  const data = useMemo(() => {
    const map = {}
    metrics.forEach(m => {
      const d = m.date
      if (!map[d]) map[d] = { date: d, cost: 0, impressions: 0 }
      map[d].cost += Number(m.cost || 0)
      map[d].impressions += Number(m.impressions || 0)
    })
    return Object.values(map).sort((a,b) => a.date.localeCompare(b.date))
  }, [metrics])

  return (
    <div className="chart-wrap">
      <h2>Spend over Time</h2>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip 
            formatter={(value) => {
              if (value === null || value === undefined) return value;
              return Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            }}
            labelFormatter={(label) => label}
          />
          <Line type="monotone" dataKey="cost" stroke="#8884d8" name="Cost (€)" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
