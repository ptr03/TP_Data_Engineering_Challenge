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

  // seed used to force-remount some visuals on reset (kept, harmless)
  const [resetSeed, setResetSeed] = useState(0)

  const isISO = (v) => /^\d{4}-\d{2}-\d{2}$/.test(v || '')

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

  const campaignMap = useMemo(() => {
    const m = {}
    campaigns.forEach(c => (m[c.campaign_id] = c))
    return m
  }, [campaigns])

  const campaignTypes = useMemo(() => {
    return Array.from(new Set(campaigns.map(c => c.campaign_type))).filter(Boolean)
  }, [campaigns])

  // --- compute CSV min/max dates (YYYY-MM-DD) ---
  const [minDate, maxDate] = useMemo(() => {
    if (!metrics.length) return ['', '']
    const dates = [...new Set(metrics.map(m => m.date))].sort()
    return [dates[0], dates[dates.length - 1]]
  }, [metrics])

  // --- One-time align dateTo to CSV maxDate (no constant rewriting) ---
  useEffect(() => {
    if (!maxDate) return
    setFilters(prev => {
      const needs = !isISO(prev.dateTo) || prev.dateTo > maxDate
      return needs ? { ...prev, dateTo: maxDate } : prev
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maxDate])

  // apply filters to metrics (date/type/search)
  const filteredMetrics = useMemo(() => {
    const from = isISO(filters.dateFrom) ? filters.dateFrom : null
    const to   = isISO(filters.dateTo)   ? filters.dateTo   : null

    return metrics.filter(m => {
      if (from && m.date < from) return false
      if (to   && m.date > to)   return false
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

  // Base metrics for KPIs & SpendChart (optionally narrowed by selectedCampaign)
  const metricsBase = useMemo(() => {
    if (!selectedCampaign) return filteredMetrics
    return filteredMetrics.filter(m => m.campaign_id === selectedCampaign)
  }, [filteredMetrics, selectedCampaign])

  const toggleSelectedCampaign = (id) => {
    setSelectedCampaign(prev => (prev === id ? null : id))
  }

  // Reset: clear everything to initial state
  const handleReset = () => {
    setFilters({ dateTo: maxDate || today })
    setSelectedCampaign(null)
    setResetSeed(s => s + 1)
  }

  if (loading) return <div className="container"><p>Loading data…</p></div>
  if (error) return <div className="container"><p>Error: {error}</p></div>

  return (
    <div className="container">
      <h1>Touchpoint — Campaign Dashboard</h1>

      <FilterBar
        filters={filters}
        setFilters={setFilters}
        campaignTypes={campaignTypes}
        defaultDate={maxDate || today}
        minDate={minDate}
        maxDate={maxDate}
        onReset={handleReset}
      />

      {/* KPIs reflect filters (and selected campaign, if any) */}
      <KPIs key={`kpis-${resetSeed}`} metrics={metricsBase} />

      {/* SpendChart reflects filters (and selected campaign) */}
      <SpendChart key={`spend-${resetSeed}`} metrics={metricsBase} />

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
