import React, { useMemo } from 'react'

export default function CampaignTable({ campaigns, metrics }) {
  const rows = useMemo(() => {
    const map = {}
    metrics.forEach(m => {
      const id = m.campaign_id
      if (!map[id]) {
        map[id] = { campaign_id: id, impressions:0, clicks:0, cost:0, conversions:0, conversion_value:0 }
      }
      map[id].impressions += Number(m.impressions || 0)
      map[id].clicks += Number(m.clicks || 0)
      map[id].cost += Number(m.cost || 0)
      map[id].conversions += Number(m.conversions || 0)
      map[id].conversion_value += Number(m.conversion_value || 0)
    })
    return Object.values(map).map(r => {
      const ctr = r.impressions ? (r.clicks / r.impressions) * 100 : null
      const roas = r.cost ? r.conversion_value / r.cost : null
      return { ...r, ctr, roas }
    })
  }, [metrics])

  const enriched = rows.map(r => {
    const c = campaigns.find(x => x.campaign_id === r.campaign_id) || {}
    return { ...r, campaign_name: c.campaign_name || r.campaign_id, campaign_type: c.campaign_type || '—' }
  })

  return (
    <div className="table-wrap">
      <h2>Campaigns</h2>
      <table>
        <thead>
          <tr>
            <th>Campaign</th>
            <th>Type</th>
            <th>Impr.</th>
            <th>Clicks</th>
            <th>Cost (€)</th>
            <th>Conv.</th>
            <th>Conv. value (€)</th>
            <th>CTR (%)</th>
            <th>ROAS</th>
          </tr>
        </thead>
        <tbody>
          {enriched.map(r => (
            <tr key={r.campaign_id}>
              <td>{r.campaign_name}</td>
              <td>{r.campaign_type}</td>
              <td>{r.impressions.toLocaleString()}</td>
              <td>{r.clicks.toLocaleString()}</td>
              <td>{Number(r.cost || 0).toFixed(2)}</td>
              <td>{r.conversions}</td>
              <td>{Number(r.conversion_value || 0).toFixed(2)}</td>
              <td>{r.ctr == null ? '-' : r.ctr.toFixed(2)}</td>
              <td>{r.roas == null ? '-' : r.roas.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
