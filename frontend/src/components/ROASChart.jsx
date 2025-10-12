import React, { useMemo } from 'react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'

/**
 * ROASChart
 * Props:
 *  - campaigns: array of campaign meta objects
 *  - metrics: array of metric rows (can be filtered)
 *  - onBarClick: function(campaign_id) => called when a bar is clicked
 */
function formatMoney(n) {
  if (n === null || n === undefined) return '—'
  return Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function ROASChart({ campaigns = [], metrics = [], onBarClick = () => {} }) {
  // aggregate metrics per campaign
  const data = useMemo(() => {
    const map = {}
    for (const m of metrics) {
      const id = m.campaign_id
      if (!map[id]) map[id] = { campaign_id: id, cost: 0, conv_value: 0 }
      map[id].cost += Number(m.cost || 0)
      map[id].conv_value += Number(m.conversion_value || 0)
    }
    const rows = Object.values(map).map(r => {
      const meta = campaigns.find(c => c.campaign_id === r.campaign_id) || {}
      const roas = r.cost > 0 ? r.conv_value / r.cost : 0
      return {
        campaign_id: r.campaign_id,
        name: meta.campaign_name || r.campaign_id,
        roas: Number(roas.toFixed(2)),
        cost: Number(r.cost.toFixed(2)),
        conv_value: Number(r.conv_value.toFixed(2)),
      }
    })

    rows.sort((a, b) => b.roas - a.roas)
    return rows.slice(0, 8)
  }, [metrics, campaigns])

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload || !payload[0]) return null
    const d = payload[0].payload
    return (
      <div style={{ background: '#fff', border: '1px solid #eee', padding: 8, borderRadius: 6 }}>
        <div style={{ fontWeight: 700 }}>{d.name}</div>
        <div>ROAS: {d.roas}</div>
        <div>Cost: €{formatMoney(d.cost)}</div>
        <div>Conv. value: €{formatMoney(d.conv_value)}</div>
      </div>
    )
  }

  return (
    <div className="chart-wrap" style={{ height: 320, background: 'transparent', marginBottom: 12 }}>
      <h2 style={{ marginBottom: 6 }}>ROAS per Campaign</h2>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 8, right: 20, left: 8, bottom: 40 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" tick={{ fontSize: 12 }} interval={0} angle={-45} textAnchor="end" height={70} />
          <YAxis />
          <Tooltip content={<CustomTooltip />} />
          <Bar
            dataKey="roas"
            name="ROAS"
            fill="#4aa3ff"
            onClick={(d) => {
              // d is the payload object
              if (d && d.campaign_id) onBarClick(d.campaign_id)
            }}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
