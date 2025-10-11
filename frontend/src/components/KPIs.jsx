import React from 'react'

function formatNumber(n) {
  return n == null ? '-' : Number(n).toLocaleString()
}
export default function KPIs({ metrics }) {
  const totalSpend = metrics.reduce((s, r) => s + Number(r.cost || 0), 0)
  const totalConversions = metrics.reduce((s, r) => s + Number(r.conversions || 0), 0)
  const totalValue = metrics.reduce((s, r) => s + Number(r.conversion_value || 0), 0)
  const roas = totalSpend === 0 ? null : totalValue / totalSpend
  const avgCtr = (() => {
    const imp = metrics.reduce((s, r) => s + Number(r.impressions || 0), 0)
    const clk = metrics.reduce((s, r) => s + Number(r.clicks || 0), 0)
    return imp === 0 ? null : (clk / imp) * 100
  })()

  return (
    <div className="kpi-grid">
      <div className="kpi-card">
        <div className="kpi-title">Total Spend</div>
        <div className="kpi-value">€ {formatNumber(totalSpend.toFixed(2))}</div>
      </div>
      <div className="kpi-card">
        <div className="kpi-title">Total Conversions</div>
        <div className="kpi-value">{formatNumber(totalConversions)}</div>
      </div>
      <div className="kpi-card">
        <div className="kpi-title">Avg. ROAS</div>
        <div className="kpi-value">{roas == null ? '-' : roas.toFixed(2)}</div>
      </div>
      <div className="kpi-card">
        <div className="kpi-title">Avg. CTR (%)</div>
        <div className="kpi-value">{avgCtr == null ? '-' : avgCtr.toFixed(2)}</div>
      </div>
    </div>
  )
}
