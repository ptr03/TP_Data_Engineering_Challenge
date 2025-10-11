import React from 'react'

export default function FilterBar({ filters, setFilters, campaignTypes, defaultDate }) {
  const onChange = (e) => {
    const { name, value } = e.target
    setFilters(prev => ({ ...prev, [name]: value }))
  }

  const reset = () => {
    // preserve default To date
    setFilters({ dateTo: defaultDate })
  }

  return (
    <div className="filter-bar">
      <div className="filter-group">
        <label className="filter-label from-label">From</label>
        <input className="filter-input" type="date" name="dateFrom" value={filters.dateFrom || ''} onChange={onChange} />
      </div>

      <div className="filter-group">
        <label className="filter-label to-label">To</label>
        <input className="filter-input" type="date" name="dateTo" value={filters.dateTo || ''} onChange={onChange} />
      </div>

      <div className="filter-group">
        <label className="filter-label type-label">Type</label>
        <select className="filter-select" name="campaignType" value={filters.campaignType || ''} onChange={onChange}>
          <option value="">All</option>
          {campaignTypes.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      <div style={{ flex: 1 }} />

      <div className="filter-group search-group">
        <label className="filter-label search-label">Search</label>
        <input className="filter-input search-input" name="search" placeholder="campaign name or id" value={filters.search || ''} onChange={onChange} />
      </div>

      <button className="btn btn-primary" type="button" onClick={reset}>Reset</button>
    </div>
  )
}
