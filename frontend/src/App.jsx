import React, { useEffect, useState, useMemo } from 'react'
import { supabase } from './lib/supabaseClient'
import KPIs from './components/KPIs'
import CampaignTable from './components/CampaignTable'
import SpendChart from './components/SpendChart'
import FilterBar from './components/FilterBar'

export default function App() {
  const [campaigns, setCampaigns] = useState([])
  const [metrics, setMetrics] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filters, setFilters] = useState({})

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const { data: campaignsData, error: cErr } = await supabase.from('campaigns').select('*')
        if (cErr) throw cErr

        const { data: metricsData, error: mErr } = await supabase.from('campaign_metrics').select('*')
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

  // build a lookup for campaign metadata
  const campaignMap = useMemo(() => {
    const m = {}
    campaigns.forEach(c => m[c.campaign_id] = c)
    return m
  }, [campaigns])

  // unique campaign types for select
  const campaignTypes = useMemo(() => {
    return Array.from(new Set(campaigns.map(c => c.campaign_type))).filter(Boolean)
  }, [campaigns])

  // apply filters to metrics and campaigns
  const filteredMetrics = useMemo(() => {
    return metrics.filter(m => {
      // date filter
      if (filters.dateFrom && m.date < filters.dateFrom) return false
      if (filters.dateTo && m.date > filters.dateTo) return false
      // campaign type filter
      if (filters.campaignType) {
        const c = campaignMap[m.campaign_id]
        if (!c || c.campaign_type !== filters.campaignType) return false
      }
      // search filter (search in id or name)
      if (filters.search && filters.search.trim() !== '') {
        const q = filters.search.toLowerCase()
        const c = campaignMap[m.campaign_id] || {}
        const inId = (m.campaign_id || '').toLowerCase().includes(q)
        const inName = (c.campaign_name || '').toLowerCase().includes(q)
        if (!inId && !inName) return false
      }
      return true
    })
  }, [metrics, filters, campaignMap])

  const filteredCampaigns = useMemo(() => {
    // only return campaigns that exist in the filtered metrics (reduce clutter)
    const setIds = new Set(filteredMetrics.map(m => m.campaign_id))
    return campaigns.filter(c => setIds.has(c.campaign_id))
  }, [campaigns, filteredMetrics])

  if (loading) return <div className="container"><p>Loading data…</p></div>
  if (error) return <div className="container"><p>Error: {error}</p></div>

  return (
    <div className="container">
      <h1>Touchpoint — Campaign Dashboard (Phase 1)</h1>

      <FilterBar filters={filters} setFilters={setFilters} campaignTypes={campaignTypes} />

      <KPIs metrics={filteredMetrics} />
      <SpendChart metrics={filteredMetrics} />
      <CampaignTable campaigns={filteredCampaigns} metrics={filteredMetrics} />
    </div>
  )
}
