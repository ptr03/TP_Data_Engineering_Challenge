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

  const [selectedCampaign, setSelectedCampaign] = useState(null)

  // Seed used to force remounts (and reset internal state) on reset.
  const [resetSeed, setResetSeed] = useState(0)

  const isISO = (v) => /^\d{4}-\d{2}-\d{2}$/.test(v || '')

  /**
   * Initial load from Supabase:
   * - fetches campaigns and metrics
   * - guards errors
   * - sets loading state appropriately
   */
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

  // Fast lookup by campaign_id to avoid repeated .find calls elsewhere.
  const campaignMap = useMemo(() => {
    const m = {}
    campaigns.forEach(c => (m[c.campaign_id] = c))
    return m
  }, [campaigns])

  // Unique list of campaign types for the filter dropdown.
  const campaignTypes = useMemo(() => {
    return Array.from(new Set(campaigns.map(c => c.campaign_type))).filter(Boolean)
  }, [campaigns])

  /**
   * Compute min/max dates from the metrics (for date inputs and defaults).
   * Works off distinct sorted date strings (YYYY-MM-DD).
   */
  const [minDate, maxDate] = useMemo(() => {
    if (!metrics.length) return ['', '']
    const dates = [...new Set(metrics.map(m => m.date))].sort()
    return [dates[0], dates[dates.length - 1]]
  }, [metrics])

  /**
   * If new data extends/changes the max date, ensure filters.dateTo
   * is valid and not beyond the available range.
   */
  useEffect(() => {
    if (!maxDate) return
    setFilters(prev => {
      const needs = !isISO(prev.dateTo) || prev.dateTo > maxDate
      return needs ? { ...prev, dateTo: maxDate } : prev
    })
  }, [maxDate])

  /**
   * Apply all filters to the raw metrics:
   * - date range (inclusive)
   * - campaign type
   * - free-text search on campaign id or name
   */
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

  // Limit campaigns list to those present in the filtered metrics.
  const filteredCampaigns = useMemo(() => {
    const setIds = new Set(filteredMetrics.map(m => m.campaign_id))
    return campaigns.filter(c => setIds.has(c.campaign_id))
  }, [campaigns, filteredMetrics])

  // If a campaign is selected, narrow charts/KPIs to just that campaign.
  const metricsBase = useMemo(() => {
    if (!selectedCampaign) return filteredMetrics
    return filteredMetrics.filter(m => m.campaign_id === selectedCampaign)
  }, [filteredMetrics, selectedCampaign])

  // Toggle behavior: clicking the same campaign again clears the selection.
  const toggleSelectedCampaign = (id) => {
    setSelectedCampaign(prev => (prev === id ? null : id))
  }

  /**
   * Global reset:
   * - reset filters to end of available range
   * - clear selected campaign
   * - bump resetSeed to force child components to remount if they keep local state
   */
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

      {/* Keys include resetSeed to clear any internal memo/local state after reset */}
      <KPIs key={`kpis-${resetSeed}`} metrics={metricsBase} />

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
