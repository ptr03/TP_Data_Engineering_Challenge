import React, { useMemo, useState } from 'react'

function formatNumber(n) {
  if (n === null || n === undefined) return '—'
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 })
}
function formatMoney(n) {
  if (n === null || n === undefined) return '—'
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function safeDiv(a, b) {
  if (!b || b === 0) return 0
  return a / b
}
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

export default function CampaignTable({ campaigns = [], metrics = [], selectedCampaign = null }) {
  const [sortKey, setSortKey] = useState('roas')
  const [sortDir, setSortDir] = useState('desc')

  const aggregated = useMemo(() => {
    const map = {}
    for (const m of metrics) {
      const id = m.campaign_id
      if (!map[id]) {
        map[id] = { campaign_id: id, impressions: 0, clicks: 0, cost: 0, conversions: 0, conversion_value: 0 }
      }
      map[id].impressions += Number(m.impressions || 0)
      map[id].clicks += Number(m.clicks || 0)
      map[id].cost += Number(parseFloat(m.cost || 0))
      map[id].conversions += Number(m.conversions || 0)
      map[id].conversion_value += Number(parseFloat(m.conversion_value || 0))
    }

    const rows = Object.values(map).map(r => {
      const meta = campaigns.find(c => c.campaign_id === r.campaign_id) || {}
      const ctr = safeDiv(r.clicks, r.impressions) * 100
      const roas = safeDiv(r.conversion_value, r.cost)
      return {
        campaign_id: r.campaign_id,
        campaign_name: meta.campaign_name || '—',
        campaign_type: meta.campaign_type || '—',
        impressions: r.impressions,
        clicks: r.clicks,
        cost: Number((r.cost).toFixed(2)),
        conversions: r.conversions,
        conversion_value: Number((r.conversion_value).toFixed(2)),
        ctr: Number(ctr.toFixed(2)),
        roas: Number(roas.toFixed(2))
      }
    })
    return rows
  }, [metrics, campaigns])

  const sorted = useMemo(() => sortRows(aggregated, sortKey, sortDir), [aggregated, sortKey, sortDir])

  const toggleSort = (key) => {
    if (key === sortKey) {
      setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

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
            <tr key={row.campaign_id} className={selectedCampaign === row.campaign_id ? 'selected-row' : ''}>
              <td>{row.campaign_name}</td>
              <td>{row.campaign_type}</td>
              <td style={{ textAlign:'right' }}>{formatNumber(row.impressions)}</td>
              <td style={{ textAlign:'right' }}>{formatNumber(row.clicks)}</td>
              <td style={{ textAlign:'right' }}>{formatMoney(row.cost)}</td>
              <td style={{ textAlign:'right' }}>{formatNumber(row.conversions)}</td>
              <td style={{ textAlign:'right' }}>{formatMoney(row.conversion_value)}</td>
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
