import React from 'react'

export default function FilterBar({ filters, setFilters, campaignTypes }) {
  const onChange = (e) => {
    const { name, value } = e.target
    setFilters(prev => ({ ...prev, [name]: value }))
  }

  return (
    <div className="filter-bar" style={{ display:'flex', gap:12, marginBottom:16, alignItems:'center' }}>
      <label>
        From: <input type="date" name="dateFrom" value={filters.dateFrom || ''} onChange={onChange} />
      </label>
      <label>
        To: <input type="date" name="dateTo" value={filters.dateTo || ''} onChange={onChange} />
      </label>
      <label>
        Type:
        <select name="campaignType" value={filters.campaignType || ''} onChange={onChange}>
          <option value="">All</option>
          {campaignTypes.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </label>
      <label style={{ marginLeft: 'auto' }}>
        Search:
        <input name="search" placeholder="campaign name or id" value={filters.search || ''} onChange={onChange} />
      </label>
      <button type="button" onClick={() => setFilters({})} style={{ marginLeft:8 }}>Reset</button>
    </div>
  )
}
