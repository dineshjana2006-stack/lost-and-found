import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  BarChart2, CheckCircle, Clock, TrendingUp, Zap,
  ChevronRight, Award, Search, AlertTriangle,
} from 'lucide-react'
import PageWrapper from '../components/layout/PageWrapper'
import Footer from '../components/layout/Footer'
import { PageSpinner } from '../components/ui/Spinner'
import { reportApi } from '../services/api'
import { formatDate } from '../utils/helpers'

// ── Helpers ──────────────────────────────────────────────────
const scoreColor  = (s) => s >= 70 ? '#10b981' : s >= 40 ? '#f59e0b' : '#71717a'
const scoreBg     = (s) => s >= 70 ? 'rgba(16,185,129,0.12)' : s >= 40 ? 'rgba(245,158,11,0.12)' : 'rgba(113,113,122,0.12)'
const scoreBorder = (s) => s >= 70 ? 'rgba(16,185,129,0.3)' : s >= 40 ? 'rgba(245,158,11,0.3)' : 'rgba(113,113,122,0.3)'
const scoreLabel  = (s) => s >= 70 ? 'High Confidence' : s >= 40 ? 'Possible Match' : 'Low Match'

// ── Single case card ──────────────────────────────────────────
function CaseCard({ report, index }) {
  const {
    report_id, lost_id, found_id, score = 0,
    status, computed_at, last_accessed,
    lost_name, found_name,
  } = report

  const sc = score || 0
  const href = `/match-report/${lost_id}/${found_id}`
  const isResolved = status === 'resolved'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.35 }}
      whileHover={{ y: -3, transition: { duration: 0.15 } }}
    >
      <Link to={href} style={{ textDecoration: 'none', display: 'block' }}>
        <div className="glass" style={{
          padding: '1.35rem',
          borderRadius: 14,
          cursor: 'pointer',
          transition: 'border-color 0.2s',
          border: `1px solid ${isResolved ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.06)'}`,
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Resolved glow strip */}
          {isResolved && (
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: 2,
              background: 'linear-gradient(90deg, #10b981, #3b82f6)',
            }} />
          )}

          {/* Header row */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.85rem', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                background: isResolved ? 'rgba(16,185,129,0.15)' : 'rgba(124,58,237,0.15)',
                border: `1px solid ${isResolved ? 'rgba(16,185,129,0.3)' : 'rgba(124,58,237,0.3)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {isResolved
                  ? <Award size={16} color="#10b981" />
                  : <BarChart2 size={16} color="#8b5cf6" />
                }
              </div>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: '0.7rem', color: '#52525b', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {report_id}
                </p>
                <p style={{ fontSize: '0.72rem', color: '#71717a', marginTop: '0.1rem' }}>
                  {formatDate(computed_at)}
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.3rem', flexShrink: 0 }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '0.3rem',
                padding: '0.2rem 0.6rem', borderRadius: 999,
                background: scoreBg(sc), border: `1px solid ${scoreBorder(sc)}`,
                fontSize: '0.72rem', fontWeight: 700, color: scoreColor(sc),
              }}>
                <TrendingUp size={10} /> {sc}%
              </div>
              <span className={`badge badge-${status}`} style={{ fontSize: '0.65rem' }}>
                {isResolved ? '✓ Resolved' : '⟳ Active'}
              </span>
            </div>
          </div>

          {/* Item names */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '0.5rem', alignItems: 'center', marginBottom: '0.85rem' }}>
            <div style={{ padding: '0.5rem 0.65rem', borderRadius: 8, background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.15)' }}>
              <p style={{ fontSize: '0.65rem', color: '#f87171', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.2rem' }}>Lost</p>
              <p style={{ fontSize: '0.82rem', fontWeight: 600, color: '#fafafa', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {lost_name || lost_id?.slice(0, 12)}
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Zap size={14} color="#7c3aed" />
            </div>
            <div style={{ padding: '0.5rem 0.65rem', borderRadius: 8, background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.15)' }}>
              <p style={{ fontSize: '0.65rem', color: '#34d399', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.2rem' }}>Found</p>
              <p style={{ fontSize: '0.82rem', fontWeight: 600, color: '#fafafa', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {found_name || found_id?.slice(0, 12)}
              </p>
            </div>
          </div>

          {/* Score bar */}
          <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 999, marginBottom: '0.75rem', overflow: 'hidden' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${sc}%` }}
              transition={{ delay: index * 0.06 + 0.4, duration: 0.7, ease: 'easeOut' }}
              style={{
                height: '100%', borderRadius: 999,
                background: sc >= 70 ? 'linear-gradient(90deg,#10b981,#3b82f6)' : sc >= 40 ? '#f59e0b' : '#3f3f46',
                boxShadow: sc >= 70 ? '0 0 8px rgba(16,185,129,0.5)' : 'none',
              }}
            />
          </div>

          {/* Footer row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.72rem', color: '#52525b' }}>
              {scoreLabel(sc)}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', color: '#8b5cf6', fontWeight: 600 }}>
              View Report <ChevronRight size={12} />
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}

// ── Stats bar ─────────────────────────────────────────────────
function StatPill({ label, value, color, icon: Icon }) {
  return (
    <div className="glass" style={{
      padding: '1rem 1.25rem', borderRadius: 12, textAlign: 'center',
      border: `1px solid ${color}20`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', marginBottom: '0.3rem' }}>
        <Icon size={14} color={color} />
        <span style={{ fontSize: '0.72rem', color: '#52525b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
      </div>
      <p style={{ fontSize: '1.6rem', fontWeight: 800, color, letterSpacing: '-0.04em', lineHeight: 1 }}>{value}</p>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────
export default function CaseStudies() {
  const [reports,  setReports]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [filter,   setFilter]   = useState('all')   // all | active | resolved
  const [search,   setSearch]   = useState('')

  useEffect(() => {
    reportApi.recent(50)
      .then(res => setReports(res.data.data?.reports || []))
      .catch(() => setReports([]))
      .finally(() => setLoading(false))
  }, [])

  const filtered = reports.filter(r => {
    const matchesFilter = filter === 'all' || r.status === filter
    const matchesSearch = !search ||
      r.lost_name?.toLowerCase().includes(search.toLowerCase()) ||
      r.found_name?.toLowerCase().includes(search.toLowerCase()) ||
      r.report_id?.toLowerCase().includes(search.toLowerCase())
    return matchesFilter && matchesSearch
  })

  const total    = reports.length
  const resolved = reports.filter(r => r.status === 'resolved').length
  const active   = reports.filter(r => r.status !== 'resolved').length
  const avgScore = total > 0
    ? Math.round(reports.reduce((s, r) => s + (r.score || 0), 0) / total)
    : 0

  return (
    <PageWrapper>
      {/* Background orbs */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
        <div className="orb orb-purple" style={{ width: 500, height: 500, top: -100, right: -150, opacity: 0.35 }} />
        <div className="orb orb-blue"   style={{ width: 350, height: 350, bottom: 50, left: -100, opacity: 0.25 }} />
      </div>

      <div className="container" style={{ padding: '2rem 1.5rem', position: 'relative', zIndex: 1, flex: 1 }}>

        {/* ── Hero ─────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ marginBottom: '2rem' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'linear-gradient(135deg,#7c3aed,#2563eb)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 16px rgba(124,58,237,0.4)',
            }}>
              <BarChart2 size={18} color="#fff" />
            </div>
            <h1 className="heading-lg gradient-text" style={{ marginBottom: 0 }}>Case Studies</h1>
          </div>
          <p style={{ color: '#71717a', fontSize: '0.9rem', maxWidth: 500 }}>
            Every match report generated by the ReConnect AI engine — active cases, resolved reunions, and the full analysis behind each one.
          </p>
        </motion.div>

        {/* ── Stats row ──────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '1.75rem' }}>
          <StatPill label="Total Cases"   value={total}    color="#8b5cf6" icon={BarChart2}    />
          <StatPill label="Resolved"      value={resolved} color="#10b981" icon={Award}         />
          <StatPill label="Active"        value={active}   color="#f59e0b" icon={Clock}         />
          <StatPill label="Avg Score"     value={`${avgScore}%`} color="#3b82f6" icon={TrendingUp} />
        </div>

        {/* ── Filter + Search ────────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          {/* Search */}
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <Search size={14} color="#52525b" style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by item name or report ID…"
              className="input"
              style={{ paddingLeft: '2rem', width: '100%', boxSizing: 'border-box' }}
            />
          </div>

          {/* Filter pills */}
          <div style={{ display: 'flex', gap: '0.3rem', background: 'rgba(255,255,255,0.04)', padding: '0.25rem', borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)' }}>
            {[
              { key: 'all',      label: 'All',       icon: BarChart2    },
              { key: 'active',   label: 'Active',    icon: Clock        },
              { key: 'resolved', label: 'Resolved',  icon: CheckCircle  },
            ].map(tab => (
              <button key={tab.key} onClick={() => setFilter(tab.key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.3rem',
                  padding: '0.4rem 0.8rem', borderRadius: 8, border: 'none', cursor: 'pointer',
                  fontSize: '0.78rem', fontWeight: 600, fontFamily: 'inherit',
                  background: filter === tab.key ? 'rgba(124,58,237,0.25)' : 'transparent',
                  color: filter === tab.key ? '#a78bfa' : '#52525b',
                  transition: 'all 0.15s',
                }}
              >
                <tab.icon size={11} /> {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Content ──────────────────────────────────────────────── */}
        {loading ? (
          <PageSpinner />
        ) : filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ textAlign: 'center', padding: '5rem 1rem', color: '#52525b' }}
          >
            <AlertTriangle size={48} style={{ margin: '0 auto 1rem', display: 'block', opacity: 0.4 }} />
            <p style={{ fontWeight: 600, color: '#71717a', fontSize: '1rem' }}>
              {search ? 'No cases match your search.' : total === 0 ? 'No match reports yet.' : 'No cases with this filter.'}
            </p>
            <p style={{ fontSize: '0.82rem', marginTop: '0.4rem' }}>
              {total === 0
                ? 'Report a lost or found item to start generating match analysis reports!'
                : 'Try changing the filter or searching for something else.'}
            </p>
            {total === 0 && (
              <Link to="/report" className="btn btn-primary" style={{ marginTop: '1.5rem', display: 'inline-flex' }}>
                Report an Item
              </Link>
            )}
          </motion.div>
        ) : (
          <>
            <p style={{ fontSize: '0.78rem', color: '#52525b', marginBottom: '1rem' }}>
              Showing {filtered.length} case{filtered.length !== 1 ? 's' : ''}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))', gap: '1rem' }}>
              {filtered.map((r, i) => (
                <CaseCard key={r.report_id} report={r} index={i} />
              ))}
            </div>
          </>
        )}

      </div>

      <style>{`
        @media (max-width: 640px) {
          .stats-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>

      <Footer />
    </PageWrapper>
  )
}
