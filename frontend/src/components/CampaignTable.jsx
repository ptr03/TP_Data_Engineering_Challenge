import React, { useMemo, useState } from 'react'

/**
 * Lightweight formatters: return an em dash for missing values
 * and use the user's locale for number/money grouping.
 */
function formatNumber(n) {
  if (n === null || n === undefined) return '—'
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 })
}
function formatMoney(n) {
  if (n === null || n === undefined) return '—'
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/**
 * Division guard: avoids NaN/Infinity for 0 or falsy denominators.
 */
function safeDiv(a, b) {
  if (!b || b === 0) return 0
  return a / b
}

/**
 * Generic sorter:
 * - creates a copy to keep input immutable
 * - string columns use localeCompare; others coerced to Number
 * - null/undefined treated as 0
 */
function sortRows(rows, key, dir) {
  const mul = dir === 'asc' ? 1 : -1
  return [...rows].sort((a, b) => {
    const va = a[key] ?? 0
    const vb = b[key] ?? 0
    if (typeof va === 'string' && typeof vb === 'string') {
      return va.localeCompare(vb) * mul
    }
    return (Number(va) - Number(vb)) * mul
  })
}

/**
 * CampaignTable
 * Renders an aggregated, sortable table of campaign performance.
 */
export default function CampaignTable({ campaigns = [], metrics = [], selectedCampaign = null }) {
  // Default sort: ROAS desc (most useful KPI first)
  const [sortKey, setSortKey] = useState('roas')
  const [sortDir, setSortDir] = useState('desc')

  /**
   * Aggregate raw metric rows by campaign_id.
   * - Sums numeric fields
   * - Computes derived KPIs (CTR, ROAS)
   * - Joins basic campaign metadata
   * Memoized to recompute only when inputs change.
   */
  const aggregated = useMemo(() => {
    const map = {}
    for (const m of metrics) {
      const id = m.campaign_id
      if (!map[id]) {
        map[id] = { campaign_id: id, impressions: 0, clicks: 0, cost: 0, conversions: 0, conversion_value: 0 }
      }
      // Coerce to numbers defensively; tolerate null/undefined/strings
      map[id].impressions += Number(m.impressions || 0)
      map[id].clicks += Number(m.clicks || 0)
      map[id].cost += Number(parseFloat(m.cost || 0))
      map[id].conversions += Number(m.conversions || 0)
      map[id].conversion_value += Number(parseFloat(m.conversion_value || 0))
    }

    const rows = Object.values(map).map(r => {
      // Look up campaign meta; fallback to em dash when missing
      const meta = campaigns.find(c => c.campaign_id === r.campaign_id) || {}
      // Derived KPIs
      const ctr = safeDiv(r.clicks, r.impressions) * 100
      const roas = safeDiv(r.conversion_value, r.cost)

      return {
        campaign_id: r.campaign_id,
        campaign_name: meta.campaign_name || '—',
        campaign_type: meta.campaign_type || '—',
        impressions: r.impressions,
        clicks: r.clicks,
        // Normalize to 2 decimals to avoid FP noise in sorting/formatting
        cost: Number((r.cost).toFixed(2)),
        conversions: r.conversions,
        conversion_value: Number((r.conversion_value).toFixed(2)),
        // Keep KPIs rounded at 2 decimals for stable sort & display
        ctr: Number(ctr.toFixed(2)),
        roas: Number(roas.toFixed(2))
      }
    })
    return rows
  }, [metrics, campaigns])

  // Stable derived list for rendering based on current sort
  const sorted = useMemo(() => sortRows(aggregated, sortKey, sortDir), [aggregated, sortKey, sortDir])

  /**
   * Click-to-sort behavior:
   * - clicking same column toggles direction
   * - clicking new column starts at desc (typical for KPI columns)
   */
  const toggleSort = (key) => {
    if (key === sortKey) {
      setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  // Minimal visual indicator for sort state
  const sortIndicator = (key) => {
    if (key !== sortKey) return '↕'
    return sortDir === 'asc' ? '↑' : '↓'
  }

  return (
    <div className="table-wrap">
      <h2>Campaigns</h2>
      <table>
        <thead>
          <tr>
            {/* Sortable headers; right-align numeric columns for readability */}
            <th style={{ cursor:'pointer' }} onClick={() => toggleSort('campaign_name')}>Campaign {sortIndicator('campaign_name')}</th>
            <th style={{ cursor:'pointer' }} onClick={() => toggleSort('campaign_type')}>Type {sortIndicator('campaign_type')}</th>
            <th style={{ cursor:'pointer', textAlign:'right' }} onClick={() => toggleSort('impressions')}>Impr. {sortIndicator('impressions')}</th>
            <th style={{ cursor:'pointer', textAlign:'right' }} onClick={() => toggleSort('clicks')}>Clicks {sortIndicator('clicks')}</th>
            <th style={{ cursor:'pointer', textAlign:'right' }} onClick={() => toggleSort('cost')}>Cost (€) {sortIndicator('cost')}</th>
            <th style={{ cursor:'pointer', textAlign:'right' }} onClick={() => toggleSort('conversions')}>Conv. {sortIndicator('conversions')}</th>
            <th style={{ cursor:'pointer', textAlign:'right' }} onClick={() => toggleSort('conversion_value')}>Conv. value (€) {sortIndicator('conversion_value')}</th>
            <th style={{ cursor:'pointer', textAlign:'right' }} onClick={() => toggleSort('ctr')}>CTR (%) {sortIndicator('ctr')}</th>
            <th style={{ cursor:'pointer', textAlign:'right' }} onClick={() => toggleSort('roas')}>ROAS {sortIndicator('roas')}</th>
            <th style={{ textAlign:'right' }}>ID</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map(row => (
            // Highlight currently selected campaign via CSS class
            <tr key={row.campaign_id} className={selectedCampaign === row.campaign_id ? 'selected-row' : ''}>
              <td>{row.campaign_name}</td>
              <td>{row.campaign_type}</td>
              <td style={{ textAlign:'right' }}>{formatNumber(row.impressions)}</td>
              <td style={{ textAlign:'right' }}>{formatNumber(row.clicks)}</td>
              <td style={{ textAlign:'right' }}>{formatMoney(row.cost)}</td>
              <td style={{ textAlign:'right' }}>{formatNumber(row.conversions)}</td>
              <td style={{ textAlign:'right' }}>{formatMoney(row.conversion_value)}</td>
              {/* KPIs already rounded to 2dp upstream; toFixed here ensures consistent display */}
              <td style={{ textAlign:'right' }}>{row.ctr.toFixed(2)}</td>
              <td style={{ textAlign:'right' }}>{row.roas.toFixed(2)}</td>
              <td style={{ textAlign:'right' }}>{row.campaign_id}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
