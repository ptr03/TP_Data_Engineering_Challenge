import React, { useEffect, useState, useMemo } from 'react'
import { supabase } from './lib/supabaseClient'
import KPIs from './components/KPIs'
import CampaignTable from './components/CampaignTable'
import SpendChart from './components/SpendChart'
import FilterBar from './components/FilterBar'
import ROASChart from './components/ROASChart'

export default function App() {
  const today = new Date().toISOString().split('T')[0]
  const [campaigns, setCampaigns] = useState([])
  const [metrics, setMetrics] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filters, setFilters] = useState({ dateTo: today })

  // selected campaign id (null = none)
  const [selectedCampaign, setSelectedCampaign] = useState(null)

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
    campaigns.forEach(c => (m[c.campaign_id] = c))
    return m
  }, [campaigns])

  // unique campaign types for select
  const campaignTypes = useMemo(() => {
    return Array.from(new Set(campaigns.map(c => c.campaign_type))).filter(Boolean)
  }, [campaigns])

  // apply filters to metrics and campaigns
  const filteredMetrics = useMemo(() => {
    return metrics.filter(m => {
      if (filters.dateFrom && m.date < filters.dateFrom) return false
      if (filters.dateTo && m.date > filters.dateTo) return false
      if (filters.campaignType) {
        const c = campaignMap[m.campaign_id]
        if (!c || c.campaign_type !== filters.campaignType) return false
      }
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
    const setIds = new Set(filteredMetrics.map(m => m.campaign_id))
    return campaigns.filter(c => setIds.has(c.campaign_id))
  }, [campaigns, filteredMetrics])

  // Toggle selection: click same id again -> deselect
  const toggleSelectedCampaign = (id) => {
    setSelectedCampaign(prev => {
      const next = prev === id ? null : id
      // sync search filter to show the campaign in the table when selected, clear when deselected
      setFilters(prevFilters => ({ ...prevFilters, search: next || '' }))
      return next
    })
  }

  if (loading) return <div className="container"><p>Loading data…</p></div>
  if (error) return <div className="container"><p>Error: {error}</p></div>

  return (
    <div className="container">
      <h1>Touchpoint — Campaign Dashboard</h1>

      <FilterBar filters={filters} setFilters={setFilters} campaignTypes={campaignTypes} defaultDate={today} />

      <KPIs metrics={filteredMetrics} />
      <SpendChart metrics={filteredMetrics} />

      <ROASChart
        campaigns={campaigns}
        metrics={filteredMetrics}
        selectedCampaign={selectedCampaign}
        onBarClick={toggleSelectedCampaign}
      />

      <CampaignTable
        campaigns={filteredCampaigns}
        metrics={filteredMetrics}
        selectedCampaign={selectedCampaign}
      />
    </div>
  )
}
