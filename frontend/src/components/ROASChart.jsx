import React, { useMemo } from 'react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from 'recharts'

/** Money formatter: returns em dash for missing values; fixed to 2 decimals. */
function formatMoney(n) {
  if (n === null || n === undefined) return '—'
  return Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/** Shortens long labels for the X axis (keeps bars readable). */
function shorten(text, max = 20) {
  if (!text) return ''
  if (text.length <= max) return text
  return text.slice(0, max - 1).trim() + '…'
}

/**
 * ROASChart
 * Aggregates metrics by campaign and renders a sortable (desc by ROAS) bar chart.
 * Clicking a bar notifies parent via onBarClick(campaign_id).
 */
export default function ROASChart({ campaigns = [], metrics = [], onBarClick = () => {}, selectedCampaign = null }) {
  /**
   * Build chart data:
   * - sum cost & conversion value per campaign_id
   * - join campaign name (fallback to id)
   * - compute ROAS (guarding division by 0)
   * - pre-round numeric fields to stabilize tooltips & rendering
   */
  const data = useMemo(() => {
    const map = {}
    for (const m of metrics) {
      const id = m.campaign_id
      if (!map[id]) map[id] = { campaign_id: id, cost: 0, conv_value: 0 }
      map[id].cost += Number(m.cost || 0)
      map[id].conv_value += Number(m.conversion_value || 0)
    }

    const rows = Object.values(map).map(r => {
      // Note: linear search is fine for small lists; could index campaigns by id if large.
      const meta = campaigns.find(c => c.campaign_id === r.campaign_id) || {}
      const name = meta.campaign_name || r.campaign_id || '—'
      const roas = r.cost > 0 ? r.conv_value / r.cost : 0
      return {
        campaign_id: r.campaign_id,
        name,
        shortName: shorten(name, 20),
        roas: Number(roas.toFixed(2)),
        cost: Number(r.cost.toFixed(2)),
        conv_value: Number(r.conv_value.toFixed(2)),
      }
    })

    // Sort by ROAS descending so best performers appear first
    rows.sort((a, b) => b.roas - a.roas)
    return rows
  }, [metrics, campaigns])

  /**
   * Custom tooltip shows the full campaign name and formatted metrics.
   * Uses Recharts payload shape to read the bound datum.
   */
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
    <div className="chart-wrap" style={{ height: 360, background: 'transparent', marginBottom: 50 }}>
      <h2 style={{ marginBottom: 6 }}>ROAS per Campaign</h2>

      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 20, left: 8, bottom: 70 }}>
          <CartesianGrid strokeDasharray="3 3" />
          {/* Short labels + angled ticks to reduce overlap */}
          <XAxis dataKey="shortName" tick={{ fontSize: 12 }} interval={0} angle={-45} textAnchor="end" height={70} />
          <YAxis />
          <Tooltip content={<CustomTooltip />} />

          {/* Click handler supports both direct datum and Recharts' activePayload fallback */}
          <Bar
            dataKey="roas"
            name="ROAS"
            onClick={(payload) => {
              if (payload && payload.campaign_id) onBarClick(payload.campaign_id)
              else if (payload && payload.activePayload && payload.activePayload[0]) {
                const d = payload.activePayload[0].payload
                if (d && d.campaign_id) onBarClick(d.campaign_id)
              }
            }}
          >
            {data.map(d =>
              <Cell
                key={d.campaign_id}
                fill={selectedCampaign && selectedCampaign === d.campaign_id ? '#0b74d1' : '#4aa3ff'}
                cursor="pointer"
              />
            )}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
