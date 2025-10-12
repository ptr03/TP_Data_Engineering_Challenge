import React from 'react'

/**
 * FilterBar
 * Provides controls for filtering campaign data:
 * - date range (from/to)
 * - campaign type
 * - search by name or ID
 * - reset button
 */
export default function FilterBar({
  filters,
  setFilters,
  campaignTypes,
  defaultDate,
  onReset,
  minDate,   // e.g. '2024-09-01'
  maxDate    // e.g. '2024-09-30'
}) {
  // Simple YYYY-MM-DD format check for safe <input type="date"> usage
  const isISO = (v) => /^\d{4}-\d{2}-\d{2}$/.test(v || '')

  /**
   * Generic change handler for all inputs:
   * updates the relevant key in the filters object.
   */
  const onChange = (e) => {
    const { name, value } = e.target
    setFilters(prev => ({ ...prev, [name]: value }))
  }

  /**
   * Reset behavior:
   * - calls onReset() if provided (for custom logic)
   * - otherwise falls back to resetting only dateTo
   */
  const reset = () => {
    if (typeof onReset === 'function') {
      onReset()
    } else {
      setFilters({ dateTo: defaultDate })
    }
  }

  return (
    <div className="filter-bar">
      {/* Date range inputs */}
      <div className="filter-group">
        <label className="filter-label from-label">From</label>
        <input
          className="filter-input"
          type="date"
          name="dateFrom"
          value={filters.dateFrom || ''}
          onChange={onChange}
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
          min={isISO(minDate) ? minDate : undefined}
          max={isISO(maxDate) ? maxDate : undefined}
        />
      </div>

      {/* Campaign type dropdown */}
      <div className="filter-group">
        <label className="filter-label type-label">Type</label>
        <select
          className="filter-select"
          name="campaignType"
          value={filters.campaignType || ''}
          onChange={onChange}
        >
          <option value="">All</option>
          {campaignTypes.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {/* Free text search */}
      <div className="filter-group search-group">
        <label className="filter-label search-label">Search</label>
        <input
          className="filter-input search-input"
          name="search"
          placeholder="campaign name or id"
          value={filters.search || ''}
          onChange={onChange}
        />
      </div>

      {/* Spacer + Reset button */}
      <div style={{ flex: 1 }} />
      <button className="btn btn-primary reset-button" type="button" onClick={reset}>
        Reset
      </button>
    </div>
  )
}
