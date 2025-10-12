import React from 'react'

export default function FilterBar({
  filters,
  setFilters,
  campaignTypes,
  defaultDate,
  onReset,
  minDate,   // e.g. '2024-09-01'
  maxDate    // e.g. '2024-09-30'
}) {
  const isISO = (v) => /^\d{4}-\d{2}-\d{2}$/.test(v || '')
  const clampDate = (v) => {
    if (!isISO(v)) return v
    if (isISO(minDate) && v < minDate) return minDate
    if (isISO(maxDate) && v > maxDate) return maxDate
    return v
  }

  const onChange = (e) => {
    const { name, value } = e.target
    const clamped = (name === 'dateFrom' || name === 'dateTo') ? clampDate(value) : value
    setFilters(prev => ({ ...prev, [name]: clamped }))
  }

  const onBlur = (e) => {
    const { name, value } = e.target
    if (name === 'dateFrom' || name === 'dateTo') {
      const clamped = clampDate(value)
      if (clamped !== value) {
        setFilters(prev => ({ ...prev, [name]: clamped }))
      }
    }
  }

  const reset = () => {
    setFilters({ dateTo: defaultDate })
    if (typeof onReset === 'function') onReset()
  }

  return (
    <div className="filter-bar">
      <div className="filter-group">
        <label className="filter-label from-label">From</label>
        <input
          className="filter-input"
          type="date"
          name="dateFrom"
          value={filters.dateFrom || ''}
          onChange={onChange}
          onBlur={onBlur}
          min={isISO(minDate) ? minDate : undefined}
          max={isISO(maxDate) ? maxDate : undefined}
        />
      </div>

      <div className="filter-group">
        <label className="filter-label to-label">To</label>
        <input
          className="filter-input"
          type="date"
          name="dateTo"
          value={filters.dateTo || ''}
          onChange={onChange}
          onBlur={onBlur}
          min={isISO(minDate) ? minDate : undefined}
          max={isISO(maxDate) ? maxDate : undefined}
        />
      </div>

      <div className="filter-group">
        <label className="filter-label type-label">Type</label>
        <select className="filter-select" name="campaignType" value={filters.campaignType || ''} onChange={onChange}>
          <option value="">All</option>
          {campaignTypes.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      <div className="filter-group search-group">
        <label className="filter-label search-label">Search</label>
        <input className="filter-input search-input" name="search" placeholder="campaign name or id" value={filters.search || ''} onChange={onChange} />
      </div>

      <div style={{ flex: 1 }} />

      <button className="btn btn-primary reset-button" type="button" onClick={reset}>Reset</button>
    </div>
  )
}
