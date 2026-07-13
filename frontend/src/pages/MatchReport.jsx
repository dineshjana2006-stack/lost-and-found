import React, { useEffect, useState, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, CheckCircle, XCircle, AlertTriangle, Mail, Phone, User,
  MapPin, Calendar, Tag, Download, Share2, BarChart2, Zap,
  TrendingUp, Clock, Star, Award, ChevronRight, Copy, ExternalLink,
} from 'lucide-react'
import PageWrapper from '../components/layout/PageWrapper'
import Footer from '../components/layout/Footer'
import { Spinner, PageSpinner } from '../components/ui/Spinner'
import { useToast } from '../components/ui/Toast'
import { reportApi } from '../services/api'
import { formatDate, CATEGORY_ICONS, imageUrl } from '../utils/helpers'

// ── Score colour helpers ───────────────────────────────────────
const scoreColor  = (s) => s >= 70 ? '#10b981' : s >= 40 ? '#f59e0b' : '#71717a'
const scoreLabel  = (s) => s >= 70 ? 'High Confidence' : s >= 40 ? 'Possible Match' : 'Low Match'
const scoreBg     = (s) => s >= 70 ? 'rgba(16,185,129,0.15)' : s >= 40 ? 'rgba(245,158,11,0.15)' : 'rgba(113,113,122,0.15)'
const scoreBorder = (s) => s >= 70 ? 'rgba(16,185,129,0.3)'  : s >= 40 ? 'rgba(245,158,11,0.3)'  : 'rgba(113,113,122,0.3)'

// Field weights (mirrors backend config exactly)
const FIELD_META = {
  category:    { label: 'Category Match',       weight: 30, icon: Tag,        color: '#7c3aed' },
  name:        { label: 'Item Name Similarity',  weight: 25, icon: Star,       color: '#3b82f6' },
  color:       { label: 'Color Match',           weight: 15, icon: Award,      color: '#ec4899' },
  location:    { label: 'Location Similarity',   weight: 10, icon: MapPin,     color: '#f59e0b' },
  brand:       { label: 'Brand Match',           weight: 10, icon: TrendingUp, color: '#14b8a6' },
  date:        { label: 'Date Proximity',        weight:  5, icon: Calendar,   color: '#8b5cf6' },
  description: { label: 'Description Overlap',   weight:  5, icon: BarChart2,  color: '#06b6d4' },
}

// ── Circular gauge SVG ─────────────────────────────────────────
function CircularGauge({ score }) {
  const r       = 70
  const cx      = 90
  const cy      = 90
  const circ    = 2 * Math.PI * r
  const clampedScore = Math.min(Math.max(score, 0), 100)
  const dashOffset = circ * (1 - clampedScore / 100)
  const color   = scoreColor(clampedScore)

  return (
    <div style={{ position: 'relative', width: 180, height: 180, margin: '0 auto' }}>
      <svg width="180" height="180" style={{ transform: 'rotate(-90deg)' }}>
        {/* Background track */}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
        {/* Progress arc */}
        <motion.circle
          cx={cx} cy={cy} r={r} fill="none"
          stroke={color} strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: dashOffset }}
          transition={{ duration: 1.4, ease: 'easeOut', delay: 0.3 }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      }}>
        <motion.span
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, duration: 0.5, type: 'spring' }}
          style={{ fontSize: '2.2rem', fontWeight: 800, color, letterSpacing: '-0.04em', lineHeight: 1 }}
        >
          {clampedScore}%
        </motion.span>
        <span style={{ fontSize: '0.72rem', color: '#71717a', marginTop: '0.25rem', fontWeight: 500 }}>
          {scoreLabel(clampedScore)}
        </span>
      </div>
    </div>
  )
}

// ── Score field bar ────────────────────────────────────────────
function ScoreBar({ fieldKey, rawScore, index }) {
  const meta       = FIELD_META[fieldKey] || { label: fieldKey, weight: 0, color: '#71717a', icon: BarChart2 }
  const Icon       = meta.icon
  const percentage = meta.weight > 0 ? Math.min((rawScore / meta.weight) * 100, 100) : 0

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.07 + 0.2 }}
      style={{ padding: '0.85rem 1rem', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{
            width: 26, height: 26, borderRadius: 7,
            background: `${meta.color}20`, border: `1px solid ${meta.color}30`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon size={12} color={meta.color} />
          </div>
          <span style={{ fontWeight: 600, fontSize: '0.82rem', color: '#d4d4d8' }}>{meta.label}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.75rem' }}>
          <span style={{ color: '#52525b' }}>Weight: {meta.weight}%</span>
          <span style={{
            fontWeight: 700, color: percentage >= 70 ? '#10b981' : percentage >= 40 ? '#f59e0b' : '#71717a',
          }}>
            {rawScore.toFixed(1)} / {meta.weight}
          </span>
        </div>
      </div>
      <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 999, overflow: 'hidden' }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ delay: index * 0.07 + 0.5, duration: 0.7, ease: 'easeOut' }}
          style={{
            height: '100%', borderRadius: 999,
            background: percentage >= 70 ? '#10b981' : percentage >= 40 ? '#f59e0b' : '#3f3f46',
            boxShadow: percentage >= 70 ? '0 0 8px rgba(16,185,129,0.5)' : percentage >= 40 ? '0 0 8px rgba(245,158,11,0.4)' : 'none',
          }}
        />
      </div>
    </motion.div>
  )
}

// ── Item comparison card ───────────────────────────────────────
function ItemComparisonCard({ item, label, accentColor, accentBg }) {
  const [activeImg, setActiveImg] = useState(0)
  if (!item) return null
  const icon   = CATEGORY_ICONS[item.category] || '📦'
  const images = item.images || []

  return (
    <div className="glass" style={{ overflow: 'hidden', height: '100%' }}>
      {/* Header strip */}
      <div style={{
        padding: '0.65rem 1.1rem',
        background: `${accentBg}`,
        borderBottom: `1px solid ${accentColor}30`,
        display: 'flex', alignItems: 'center', gap: '0.5rem',
      }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: accentColor }} />
        <span style={{ fontWeight: 700, fontSize: '0.78rem', color: accentColor, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
        <span className={`badge badge-${item.type}`} style={{ marginLeft: 'auto', fontSize: '0.65rem' }}>
          {item.type === 'lost' ? '🔍 Lost' : '✅ Found'}
        </span>
      </div>

      {/* Image area */}
      <div style={{ height: 200, background: 'rgba(0,0,0,0.3)', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {images.length > 0 ? (
          <img
            src={imageUrl(images[activeImg])}
            alt={item.item_name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <span style={{ fontSize: '3.5rem' }}>{icon}</span>
        )}
        {/* Status overlay */}
        <div style={{ position: 'absolute', bottom: 8, right: 8 }}>
          <span className={`badge badge-${item.status}`}>{item.status}</span>
        </div>
      </div>

      {/* Thumbnail strip */}
      {images.length > 1 && (
        <div style={{ display: 'flex', gap: '0.4rem', padding: '0.5rem 0.75rem', background: 'rgba(0,0,0,0.2)', overflowX: 'auto' }}>
          {images.map((img, i) => (
            <button key={i} onClick={() => setActiveImg(i)} style={{
              width: 44, height: 44, borderRadius: 6, overflow: 'hidden', flexShrink: 0,
              border: `2px solid ${i === activeImg ? accentColor : 'transparent'}`,
              cursor: 'pointer',
            }}>
              <img src={imageUrl(img)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </button>
          ))}
        </div>
      )}

      {/* Details */}
      <div style={{ padding: '1.1rem' }}>
        <h3 style={{ fontWeight: 700, fontSize: '1rem', color: '#fafafa', marginBottom: '0.65rem', letterSpacing: '-0.01em' }}>
          {item.item_name}
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
          {[
            ['Category', item.category],
            ['Color',    item.color],
            ['Brand',    item.brand],
            ['Location', item.location],
            ['Date',     formatDate(item.date)],
          ].map(([k, v]) => v && (
            <div key={k} style={{ display: 'flex', gap: '0.5rem', fontSize: '0.8rem' }}>
              <span style={{ color: '#52525b', minWidth: 68, fontWeight: 500 }}>{k}</span>
              <span style={{ color: '#a1a1aa', flex: 1 }}>{v}</span>
            </div>
          ))}
        </div>
        {item.description && (
          <p style={{
            marginTop: '0.75rem', fontSize: '0.78rem', color: '#71717a', lineHeight: 1.6,
            display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>
            {item.description}
          </p>
        )}
        {/* Contact */}
        {item.contact_email && (
          <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <a href={`mailto:${item.contact_email}`} style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              fontSize: '0.78rem', color: accentColor,
            }}>
              <Mail size={11} /> {item.contact_email}
            </a>
            {item.contact_phone && (
              <a href={`tel:${item.contact_phone}`} style={{
                display: 'flex', alignItems: 'center', gap: '0.4rem',
                fontSize: '0.78rem', color: '#71717a', marginTop: '0.25rem',
              }}>
                <Phone size={11} /> {item.contact_phone}
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Timeline step ──────────────────────────────────────────────
function TimelineStep({ icon: Icon, label, value, color, isLast }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, position: 'relative' }}>
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        style={{
          width: 44, height: 44, borderRadius: '50%',
          background: `${color}20`, border: `2px solid ${color}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative', zIndex: 1,
        }}
      >
        <Icon size={18} color={color} />
      </motion.div>
      {!isLast && (
        <div style={{
          position: 'absolute', top: 21, left: '50%', width: '100%',
          height: 2, background: 'rgba(255,255,255,0.08)',
          zIndex: 0,
        }} />
      )}
      <div style={{ marginTop: '0.6rem', textAlign: 'center' }}>
        <p style={{ fontSize: '0.72rem', color: '#52525b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</p>
        <p style={{ fontSize: '0.75rem', color: '#a1a1aa', marginTop: '0.15rem', lineHeight: 1.4 }}>{value || '—'}</p>
      </div>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────
export default function MatchReport() {
  const { lostId, foundId } = useParams()
  const navigate = useNavigate()
  const toast    = useToast()

  const [report,    setReport]    = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [resolving, setResolving] = useState(false)
  const [notFound,  setNotFound]  = useState(false)
  const [activeTab, setActiveTab] = useState('breakdown')

  useEffect(() => {
    setLoading(true)
    reportApi.get(lostId, foundId)
      .then(res => setReport(res.data.data?.report || null))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [lostId, foundId])

  const handleResolve = async () => {
    if (!window.confirm('Mark both items as resolved and close this case?')) return
    setResolving(true)
    try {
      await reportApi.resolve(lostId, foundId)
      setReport(r => ({ ...r, status: 'resolved' }))
      toast('Case resolved successfully! 🎉 Both items have been marked as reunited.', 'success', 6000)
    } catch (err) {
      toast(err.message || 'Failed to resolve.', 'error')
    } finally { setResolving(false) }
  }

  const handleShare = () => {
    const url = window.location.href
    navigator.clipboard?.writeText(url)
      .then(() => toast('Report URL copied to clipboard!', 'success'))
      .catch(() => toast(`Share this URL: ${url}`, 'info', 8000))
  }

  const handleDownload = () => {
    toast('PDF export is coming soon! Use your browser\'s Print → Save as PDF for now.', 'info', 5000)
  }

  if (loading) return <PageWrapper><PageSpinner /></PageWrapper>

  if (notFound || !report) return (
    <PageWrapper>
      <div style={{ textAlign: 'center', padding: '6rem 1rem' }}>
        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🔍</div>
        <h2 style={{ color: '#fafafa', marginBottom: '0.5rem' }}>Report not found</h2>
        <p style={{ color: '#71717a', marginBottom: '1.5rem' }}>
          Could not find a match between these two items. Make sure both IDs are valid.
        </p>
        <Link to="/explore" className="btn btn-primary">Back to Explore</Link>
      </div>
    </PageWrapper>
  )

  const {
    lost_item, found_item, score, score_breakdown = {},
    matched_fields = [], conclusion = {}, computed_at, status,
  } = report

  const sc = score || 0
  const breakdown_entries = Object.entries(FIELD_META)

  return (
    <PageWrapper>
      {/* ── Background orbs ───────────────────────────────────── */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
        <div className="orb orb-purple" style={{ width: 500, height: 500, top: -100, right: -150, opacity: 0.4 }} />
        <div className="orb orb-blue"   style={{ width: 400, height: 400, bottom: 0,  left: -100,  opacity: 0.3 }} />
      </div>

      <div className="container" style={{ padding: '2rem 1.5rem', position: 'relative', zIndex: 1 }}>

        {/* ── Breadcrumb + Header ───────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            <button onClick={() => navigate(-1)} className="btn btn-ghost btn-sm" style={{ padding: '0.3rem 0.6rem' }}>
              <ArrowLeft size={14} />
            </button>
            <ChevronRight size={12} color="#52525b" />
            <Link to="/explore" style={{ fontSize: '0.8rem', color: '#71717a' }}>Explore</Link>
            <ChevronRight size={12} color="#52525b" />
            <Link to={`/lost/${lostId}`} style={{ fontSize: '0.8rem', color: '#71717a' }}>
              {lost_item?.item_name || 'Lost Item'}
            </Link>
            <ChevronRight size={12} color="#52525b" />
            <span style={{ fontSize: '0.8rem', color: '#a78bfa' }}>Match Analysis</span>
          </div>

          {/* Report title bar */}
          <div className="glass" style={{ padding: '1.5rem 1.75rem', marginBottom: '1.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: 'linear-gradient(135deg, #7c3aed, #2563eb)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 20px rgba(124,58,237,0.4)',
              }}>
                <BarChart2 size={20} color="#fff" />
              </div>
              <div>
                <h1 style={{ fontWeight: 800, fontSize: '1.15rem', color: '#fafafa', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                  Smart Match Analysis Report
                </h1>
                <p style={{ fontSize: '0.75rem', color: '#52525b', marginTop: '0.2rem' }}>
                  ID: {report.report_id} · Generated {formatDate(computed_at)}
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                padding: '0.35rem 0.85rem', borderRadius: 999,
                background: scoreBg(sc), border: `1px solid ${scoreBorder(sc)}`,
                fontSize: '0.78rem', fontWeight: 700, color: scoreColor(sc),
              }}>
                <TrendingUp size={12} />
                {sc}% — {scoreLabel(sc)}
              </div>
              <span className={`badge badge-${status}`}>{status}</span>
            </div>
          </div>
        </motion.div>

        {/* ── Side-by-side Item Comparison ─────────────────────── */}
        <section style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '0.8rem', fontWeight: 700, color: '#52525b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Zap size={12} color="#7c3aed" /> Side-by-Side Comparison
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <motion.div initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4 }}>
              <ItemComparisonCard item={lost_item}  label="Lost Item"  accentColor="#ef4444" accentBg="rgba(239,68,68,0.08)" />
            </motion.div>
            <motion.div initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4 }}>
              <ItemComparisonCard item={found_item} label="Found Item" accentColor="#10b981" accentBg="rgba(16,185,129,0.08)" />
            </motion.div>
          </div>

          {/* Responsive stack for mobile */}
          <style>{`@media(max-width:640px){ .comparison-grid { grid-template-columns: 1fr !important; } }`}</style>
        </section>

        {/* ── Main Analysis Panel ───────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '1.5rem', alignItems: 'start' }}>

          {/* Left: Tabs + content */}
          <div>
            {/* Tab bar */}
            <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1.25rem', background: 'rgba(255,255,255,0.04)', padding: '0.3rem', borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)', width: 'fit-content' }}>
              {[
                { key: 'breakdown', label: 'Score Breakdown', icon: BarChart2 },
                { key: 'conclusion', label: 'AI Conclusion', icon: Zap },
                { key: 'timeline', label: 'Timeline', icon: Clock },
              ].map(tab => (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.35rem',
                    padding: '0.5rem 0.9rem', borderRadius: 8, border: 'none', cursor: 'pointer',
                    fontSize: '0.8rem', fontWeight: 600, fontFamily: 'inherit',
                    background: activeTab === tab.key ? 'rgba(124,58,237,0.25)' : 'transparent',
                    color: activeTab === tab.key ? '#a78bfa' : '#52525b',
                    borderColor: activeTab === tab.key ? 'rgba(124,58,237,0.4)' : 'transparent',
                    transition: 'all 0.15s',
                  }}
                >
                  <tab.icon size={13} /> {tab.label}
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">

              {/* ── Score Breakdown Tab ──────────────────────────── */}
              {activeTab === 'breakdown' && (
                <motion.div
                  key="breakdown"
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}
                >
                  <div className="glass" style={{ padding: '1.5rem' }}>
                    <h3 style={{ fontWeight: 700, fontSize: '0.95rem', color: '#fafafa', marginBottom: '0.35rem' }}>
                      Field-by-Field Score Breakdown
                    </h3>
                    <p style={{ fontSize: '0.78rem', color: '#52525b', marginBottom: '1.25rem' }}>
                      Each factor is scored individually and weighted to produce the final confidence score.
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1.5rem' }}>
                      {breakdown_entries.map(([key, meta], i) => (
                        <ScoreBar
                          key={key}
                          fieldKey={key}
                          rawScore={score_breakdown[key] ?? 0}
                          index={i}
                        />
                      ))}
                    </div>

                    {/* Total row */}
                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '0.9rem 1rem', borderRadius: 10,
                      background: scoreBg(sc), border: `1px solid ${scoreBorder(sc)}`,
                    }}>
                      <span style={{ fontWeight: 700, color: '#fafafa', fontSize: '0.88rem' }}>Overall Match Score</span>
                      <span style={{ fontWeight: 800, fontSize: '1.2rem', color: scoreColor(sc) }}>{sc}%</span>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ── AI Conclusion Tab ────────────────────────────── */}
              {activeTab === 'conclusion' && (
                <motion.div
                  key="conclusion"
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}
                >
                  <div className="glass" style={{ padding: '1.5rem' }}>
                    {/* Confidence badge */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
                      <div style={{
                        width: 40, height: 40, borderRadius: 10,
                        background: scoreBg(sc), border: `1px solid ${scoreBorder(sc)}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {sc >= 70 ? <CheckCircle size={18} color="#10b981" /> : sc >= 40 ? <AlertTriangle size={18} color="#f59e0b" /> : <XCircle size={18} color="#71717a" />}
                      </div>
                      <div>
                        <p style={{ fontWeight: 700, fontSize: '0.95rem', color: '#fafafa' }}>
                          {conclusion.confidence_label || scoreLabel(sc)} Confidence Match
                        </p>
                        <p style={{ fontSize: '0.72rem', color: '#52525b' }}>AI-generated analysis based on 7 comparison factors</p>
                      </div>
                    </div>

                    {/* Summary */}
                    {conclusion.summary && (
                      <div style={{ marginBottom: '1.25rem', padding: '1rem', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <p style={{ fontSize: '0.875rem', color: '#d4d4d8', lineHeight: 1.7 }}>
                          {conclusion.summary.replace(/\*\*/g, '')}
                        </p>
                      </div>
                    )}

                    {/* Matching attributes */}
                    {conclusion.matching?.length > 0 && (
                      <div style={{ marginBottom: '1rem' }}>
                        <h4 style={{ fontSize: '0.78rem', fontWeight: 700, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <CheckCircle size={12} /> Matching Attributes
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                          {conclusion.matching.map((m, i) => (
                            <div key={i} style={{ display: 'flex', gap: '0.5rem', fontSize: '0.825rem', color: '#a1a1aa', lineHeight: 1.5 }}>
                              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', marginTop: '0.45rem', flexShrink: 0 }} />
                              <span>{m.replace(/\*\*/g, '')}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Non-matching attributes */}
                    {conclusion.non_matching?.length > 0 && (
                      <div style={{ marginBottom: '1.25rem' }}>
                        <h4 style={{ fontSize: '0.78rem', fontWeight: 700, color: '#f87171', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <XCircle size={12} /> Differences / Mismatches
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                          {conclusion.non_matching.map((m, i) => (
                            <div key={i} style={{ display: 'flex', gap: '0.5rem', fontSize: '0.825rem', color: '#a1a1aa', lineHeight: 1.5 }}>
                              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444', marginTop: '0.45rem', flexShrink: 0 }} />
                              <span>{m.replace(/\*\*/g, '')}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Recommendation */}
                    {conclusion.recommendation && (
                      <div style={{ padding: '0.9rem 1rem', borderRadius: 10, background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.25)' }}>
                        <p style={{ fontSize: '0.78rem', fontWeight: 700, color: '#a78bfa', marginBottom: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <Zap size={11} fill="#a78bfa" /> Recommendation
                        </p>
                        <p style={{ fontSize: '0.83rem', color: '#c4b5fd', lineHeight: 1.6 }}>
                          {conclusion.recommendation}
                        </p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* ── Timeline Tab ─────────────────────────────────── */}
              {activeTab === 'timeline' && (
                <motion.div
                  key="timeline"
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}
                >
                  <div className="glass" style={{ padding: '1.5rem' }}>
                    <h3 style={{ fontWeight: 700, fontSize: '0.95rem', color: '#fafafa', marginBottom: '0.35rem' }}>Case Timeline</h3>
                    <p style={{ fontSize: '0.78rem', color: '#52525b', marginBottom: '1.75rem' }}>Chronological sequence of events for this case</p>

                    {/* Horizontal timeline */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0', position: 'relative', overflow: 'hidden' }}>
                      {/* Connector line */}
                      <div style={{
                        position: 'absolute', top: 21, left: '12.5%', right: '12.5%',
                        height: 2, background: 'linear-gradient(90deg, rgba(239,68,68,0.4), rgba(16,185,129,0.4), rgba(124,58,237,0.4), rgba(113,113,122,0.4))',
                        zIndex: 0,
                      }} />
                      <TimelineStep
                        icon={MapPin}   color="#ef4444"
                        label="Item Lost"
                        value={`${formatDate(lost_item?.date)}${lost_item?.location ? ' · ' + lost_item.location.split(',')[0] : ''}`}
                        isLast={false}
                      />
                      <TimelineStep
                        icon={CheckCircle} color="#10b981"
                        label="Item Found"
                        value={`${formatDate(found_item?.date)}${found_item?.location ? ' · ' + found_item.location.split(',')[0] : ''}`}
                        isLast={false}
                      />
                      <TimelineStep
                        icon={Zap}      color="#7c3aed"
                        label="Match Detected"
                        value={formatDate(computed_at)}
                        isLast={false}
                      />
                      <TimelineStep
                        icon={status === 'resolved' ? Award : Clock}
                        color={status === 'resolved' ? '#10b981' : '#71717a'}
                        label="Current Status"
                        value={status === 'resolved' ? 'Resolved ✓' : 'Under Review'}
                        isLast={true}
                      />
                    </div>

                    {/* Matched fields list */}
                    {matched_fields.length > 0 && (
                      <div style={{ marginTop: '2rem', padding: '1rem', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <p style={{ fontSize: '0.72rem', fontWeight: 700, color: '#52525b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.6rem' }}>
                          Fields that matched in this report
                        </p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                          {matched_fields.map(f => (
                            <span key={f} style={{
                              display: 'flex', alignItems: 'center', gap: '0.3rem',
                              fontSize: '0.75rem', background: 'rgba(16,185,129,0.1)',
                              color: '#34d399', borderRadius: 6, padding: '0.25rem 0.6rem',
                              border: '1px solid rgba(16,185,129,0.2)',
                            }}>
                              <CheckCircle size={10} /> {f.replace(/_/g, ' ')}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          </div>

          {/* ── Right sidebar ─────────────────────────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            {/* Confidence gauge */}
            <div className="glass" style={{ padding: '1.5rem', textAlign: 'center' }}>
              <p style={{ fontSize: '0.72rem', fontWeight: 700, color: '#52525b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>
                Match Confidence
              </p>
              <CircularGauge score={sc} />
              <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                {[['High ≥70%','#10b981'],['Medium ≥40%','#f59e0b'],['Low <40%','#71717a']].map(([label, color]) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.68rem', color: '#52525b' }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: color }} />
                    {label}
                  </div>
                ))}
              </div>
            </div>

            {/* Action buttons */}
            <div className="glass" style={{ padding: '1.25rem' }}>
              <p style={{ fontSize: '0.72rem', fontWeight: 700, color: '#52525b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.85rem' }}>
                Actions
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {/* Contact Reporter */}
                {lost_item?.contact_email && (
                  <a
                    href={`mailto:${lost_item.contact_email}?subject=ReConnect: Match found for your lost ${lost_item.item_name}&body=Hi, I found a potential match for your lost item on ReConnect. Match Report: ${window.location.href}`}
                    className="btn btn-secondary"
                    style={{ justifyContent: 'center', fontSize: '0.82rem' }}
                  >
                    <Mail size={14} /> Contact Reporter (Lost)
                  </a>
                )}
                {/* Contact Finder */}
                {found_item?.contact_email && (
                  <a
                    href={`mailto:${found_item.contact_email}?subject=ReConnect: We found the owner for your item&body=Hi, we found a potential owner for the item you found on ReConnect. Match Report: ${window.location.href}`}
                    className="btn btn-secondary"
                    style={{ justifyContent: 'center', fontSize: '0.82rem' }}
                  >
                    <Mail size={14} /> Contact Finder (Found)
                  </a>
                )}
                {/* Share */}
                <button className="btn btn-secondary" onClick={handleShare} style={{ justifyContent: 'center', fontSize: '0.82rem' }}>
                  <Copy size={14} /> Copy Report Link
                </button>
                {/* Download */}
                <button className="btn btn-ghost" onClick={handleDownload} style={{ justifyContent: 'center', fontSize: '0.82rem' }}>
                  <Download size={14} /> Download PDF
                </button>
                {/* Resolve */}
                {status !== 'resolved' && (
                  <button
                    className="btn btn-primary"
                    onClick={handleResolve}
                    disabled={resolving}
                    style={{ justifyContent: 'center', fontSize: '0.82rem', marginTop: '0.25rem' }}
                  >
                    {resolving ? <Spinner size={14} /> : <Award size={14} />}
                    Mark as Resolved
                  </button>
                )}
                {status === 'resolved' && (
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                    padding: '0.65rem', borderRadius: 8,
                    background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)',
                    fontSize: '0.82rem', color: '#34d399', fontWeight: 600,
                  }}>
                    <CheckCircle size={14} /> Case Resolved ✓
                  </div>
                )}
              </div>
            </div>

            {/* Quick links */}
            <div className="glass" style={{ padding: '1rem 1.25rem' }}>
              <p style={{ fontSize: '0.72rem', fontWeight: 700, color: '#52525b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.6rem' }}>
                Item Links
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <Link to={`/lost/${lostId}`} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', color: '#a1a1aa' }}
                  onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                  onMouseLeave={e => e.currentTarget.style.color = '#a1a1aa'}
                >
                  <ExternalLink size={11} />
                  {lost_item?.item_name || 'Lost Item'} (Lost)
                </Link>
                <Link to={`/found/${foundId}`} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', color: '#a1a1aa' }}
                  onMouseEnter={e => e.currentTarget.style.color = '#10b981'}
                  onMouseLeave={e => e.currentTarget.style.color = '#a1a1aa'}
                >
                  <ExternalLink size={11} />
                  {found_item?.item_name || 'Found Item'} (Found)
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Responsive sidebar */}
      <style>{`
        @media (max-width: 900px) {
          .report-grid { grid-template-columns: 1fr !important; }
          .comparison-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <Footer />
    </PageWrapper>
  )
}
