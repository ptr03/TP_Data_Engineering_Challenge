import React, { useEffect, useState } from 'react'
import { supabase } from './lib/supabaseClient'
import KPIs from './components/KPIs'
import CampaignTable from './components/CampaignTable'
import SpendChart from './components/SpendChart'

export default function App() {
  const [campaigns, setCampaigns] = useState([])
  const [metrics, setMetrics] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const { data: campaignsData, error: cErr } = await supabase
          .from('campaigns')
          .select('*')
        if (cErr) throw cErr

        const { data: metricsData, error: mErr } = await supabase
          .from('campaign_metrics')
          .select('*')
        if (mErr) throw mErr

        setCampaigns(campaignsData || [])
        setMetrics(metricsData || [])
      } catch (e) {
        console.error(e)
        setError(e.message || String(e))
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  if (loading) return <div className="container"><p>Loading data…</p></div>
  if (error) return <div className="container"><p>Error: {error}</p></div>

  return (
    <div className="container">
      <h1>Touchpoint — Campaign Dashboard (Phase 1)</h1>
      <KPIs metrics={metrics} />
      <SpendChart metrics={metrics} />
      <CampaignTable campaigns={campaigns} metrics={metrics} />
    </div>
  )
}
