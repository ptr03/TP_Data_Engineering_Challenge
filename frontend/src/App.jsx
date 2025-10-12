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

  const [resetSeed, setResetSeed] = useState(0)

  const [brushWindow, setBrushWindow] = useState(null)

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

  const [minDate, maxDate] = useMemo(() => {
    if (!metrics.length) return ['', '']
    const dates = [...new Set(metrics.map(m => m.date))].sort()
    return [dates[0], dates[dates.length - 1]]
  }, [metrics])

  useEffect(() => {
    if (!maxDate) return
    setFilters(prev => {
      const next = { ...prev }
      if (!next.dateTo || next.dateTo > maxDate) next.dateTo = maxDate
      if (next.dateFrom && next.dateFrom < minDate) next.dateFrom = minDate
      if (next.dateFrom && next.dateTo && next.dateFrom > next.dateTo) next.dateFrom = next.dateTo
      return next
    })
  }, [minDate, maxDate])

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

  const metricsBase = useMemo(() => {
    if (!selectedCampaign) return filteredMetrics
    return filteredMetrics.filter(m => m.campaign_id === selectedCampaign)
  }, [filteredMetrics, selectedCampaign])

  const metricsForKPIs = useMemo(() => {
    if (!brushWindow?.from || !brushWindow?.to) return metricsBase
    return metricsBase.filter(m => m.date >= brushWindow.from && m.date <= brushWindow.to)
  }, [metricsBase, brushWindow])

  const toggleSelectedCampaign = (id) => {
    setSelectedCampaign(prev => (prev === id ? null : id))
  }

  const handleReset = () => {
    setFilters({ dateTo: maxDate || today })
    setSelectedCampaign(null)
    setBrushWindow(null)               
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

      <KPIs key={`kpis-${resetSeed}`} metrics={metricsForKPIs} />

      <SpendChart
        key={`spend-${resetSeed}-${maxDate || today}`}
        metrics={metricsBase}
        onDateWindowChange={setBrushWindow}
      />

      <ROASChart
        key={`roas-${resetSeed}`}
        campaigns={campaigns}
        metrics={filteredMetrics}
        selectedCampaign={selectedCampaign}
        onBarClick={toggleSelectedCampaign}
      />

      <CampaignTable
        key={`table-${resetSeed}`}
        campaigns={filteredCampaigns}
        metrics={filteredMetrics}
        selectedCampaign={selectedCampaign}
      />
    </div>
  )
}
