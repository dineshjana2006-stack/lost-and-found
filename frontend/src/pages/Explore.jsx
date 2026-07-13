import React, { useState, useEffect, useCallback } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, SlidersHorizontal, X, ChevronLeft, ChevronRight, Filter } from 'lucide-react'
import PageWrapper from '../components/layout/PageWrapper'
import Footer from '../components/layout/Footer'
import ItemCard from '../components/items/ItemCard'
import { SkeletonList } from '../components/ui/SkeletonCard'
import { searchApi } from '../services/api'
import { CATEGORIES, STATUSES } from '../utils/helpers'

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'name',   label: 'Name A–Z'     },
]

export default function Explore() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [query,    setQuery]    = useState(searchParams.get('q') || '')
  const [type,     setType]     = useState(searchParams.get('type') || 'all')
  const [category, setCategory] = useState(searchParams.get('category') || '')
  const [sort,     setSort]     = useState('newest')
  const [status,   setStatus]   = useState('')
  const [page,     setPage]     = useState(1)
  const [results,  setResults]  = useState([])
  const [meta,     setMeta]     = useState(null)
  const [loading,  setLoading]  = useState(false)
  const [showFilters, setShowFilters] = useState(false)

  const doSearch = useCallback(async () => {
    setLoading(true)
    try {
      const params = { q: query, type, category, sort, status, page, page_size: 12 }
      const res = await searchApi.global(params)
      setResults(res.data.data || [])
      setMeta(res.data.meta || null)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [query, type, category, sort, status, page])

  useEffect(() => { doSearch() }, [doSearch])

  // Sync query param on load
  useEffect(() => {
    const cat = searchParams.get('category')
    if (cat) setCategory(cat)
  }, [])

  const handleSearch = (e) => {
    e.preventDefault()
    setPage(1)
    doSearch()
  }

  const clearFilters = () => {
    setQuery(''); setType('all'); setCategory(''); setSort('newest'); setStatus(''); setPage(1)
  }

  const hasFilters = query || type !== 'all' || category || status

  return (
    <PageWrapper>
      <div className="container" style={{ padding: '2.5rem 1.5rem 0' }}>
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 className="heading-lg">Explore Items</h1>
          <p style={{ color: '#71717a', marginTop: '0.4rem' }}>
            {meta ? `${meta.total} items found` : 'Search across all reports'}
          </p>
        </div>

        {/* Search bar */}
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 260, position: 'relative' }}>
            <Search size={16} color="#52525b" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            <input
              className="input"
              style={{ paddingLeft: '2.5rem' }}
              placeholder="Search by name, description, location…"
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ padding: '0.65rem 1.5rem' }}>
            <Search size={15} /> Search
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => setShowFilters(v => !v)}>
            <SlidersHorizontal size={15} /> Filters {hasFilters && <span style={{ width: 6, height: 6, background: '#7c3aed', borderRadius: '50%', display: 'inline-block', marginLeft: '0.1rem' }} />}
          </button>
          {hasFilters && (
            <button type="button" className="btn btn-ghost" onClick={clearFilters}>
              <X size={14} /> Clear
            </button>
          )}
        </form>

        {/* Filters panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
              style={{ overflow: 'hidden', marginBottom: '1.25rem' }}
            >
              <div className="glass" style={{ padding: '1.25rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem' }}>
                {/* Type */}
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#a1a1aa', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '0.4rem' }}>Type</label>
                  <select className="input" value={type} onChange={e => { setType(e.target.value); setPage(1) }}>
                    <option value="all">All Items</option>
                    <option value="lost">Lost Only</option>
                    <option value="found">Found Only</option>
                  </select>
                </div>
                {/* Category */}
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#a1a1aa', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '0.4rem' }}>Category</label>
                  <select className="input" value={category} onChange={e => { setCategory(e.target.value); setPage(1) }}>
                    <option value="">All Categories</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                {/* Status */}
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#a1a1aa', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '0.4rem' }}>Status</label>
                  <select className="input" value={status} onChange={e => { setStatus(e.target.value); setPage(1) }}>
                    <option value="">Any Status</option>
                    {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                  </select>
                </div>
                {/* Sort */}
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#a1a1aa', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '0.4rem' }}>Sort</label>
                  <select className="input" value={sort} onChange={e => { setSort(e.target.value); setPage(1) }}>
                    {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Type pills */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
          {['all','lost','found'].map(t => (
            <button
              key={t} onClick={() => { setType(t); setPage(1) }}
              className={type === t ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm'}
            >
              {t === 'all' ? 'All' : t === 'lost' ? '🔍 Lost' : '✅ Found'}
            </button>
          ))}
          {CATEGORIES.slice(0,6).map(cat => (
            <button
              key={cat} onClick={() => { setCategory(category === cat ? '' : cat); setPage(1) }}
              className={category === cat ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm'}
              style={{ fontSize: '0.78rem' }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Results */}
        {loading ? (
          <SkeletonList count={12} />
        ) : results.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ textAlign: 'center', padding: '5rem 1rem', color: '#52525b' }}>
            <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>🔍</div>
            <h3 style={{ color: '#a1a1aa', fontWeight: 600, marginBottom: '0.5rem' }}>No items found</h3>
            <p style={{ fontSize: '0.875rem', marginBottom: '1.5rem' }}>Try adjusting your search or filters</p>
            <button onClick={clearFilters} className="btn btn-secondary">Clear all filters</button>
          </motion.div>
        ) : (
          <div className="grid-3">
            {results.map((item, i) => <ItemCard key={item.id} item={item} index={i} />)}
          </div>
        )}

        {/* Pagination */}
        {meta && meta.total_pages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', margin: '2.5rem 0' }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}>
              <ChevronLeft size={14} />
            </button>
            {Array.from({ length: meta.total_pages }, (_, i) => i+1)
              .filter(p => Math.abs(p - page) <= 2)
              .map(p => (
                <button key={p} onClick={() => setPage(p)}
                  className={p === page ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm'}
                  style={{ minWidth: 36 }}
                >{p}</button>
              ))
            }
            <button className="btn btn-secondary btn-sm" onClick={() => setPage(p => Math.min(meta.total_pages, p+1))} disabled={page === meta.total_pages}>
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>
      <div style={{ flex: 1 }} />
      <Footer />
    </PageWrapper>
  )
}
