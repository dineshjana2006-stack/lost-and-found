import React, { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, MapPin, Calendar, Tag, Mail, Phone, User, Image as ImageIcon, Trash2, CheckCircle, TrendingUp, Zap, AlertCircle } from 'lucide-react'
import PageWrapper from '../components/layout/PageWrapper'
import Footer from '../components/layout/Footer'
import MatchCard from '../components/items/MatchCard'
import { Spinner, PageSpinner } from '../components/ui/Spinner'
import { useToast } from '../components/ui/Toast'
import { lostApi, foundApi, matchApi } from '../services/api'
import { formatDate, CATEGORY_ICONS, imageUrl, scoreBadgeClass, scoreLabel } from '../utils/helpers'

export default function ItemDetails() {
  const { type, id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()

  const [item,       setItem]       = useState(null)
  const [matches,    setMatches]    = useState([])
  const [activeImg,  setActiveImg]  = useState(0)
  const [loading,    setLoading]    = useState(true)
  const [mLoading,   setMLoading]   = useState(true)
  const [deleting,   setDeleting]   = useState(false)
  const [notFound,   setNotFound]   = useState(false)

  const api = type === 'lost' ? lostApi : foundApi

  useEffect(() => {
    setLoading(true); setMLoading(true)
    api.get(id)
      .then(r => setItem(r.data.data))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))

    const matchFn = type === 'lost' ? matchApi.forLost : matchApi.forFound
    matchFn(id)
      .then(r => setMatches(r.data.data?.matches || []))
      .catch(() => {})
      .finally(() => setMLoading(false))
  }, [id, type])

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this report?')) return
    setDeleting(true)
    try {
      await api.delete(id)
      toast('Report deleted.', 'success')
      navigate('/explore')
    } catch { toast('Failed to delete.', 'error') }
    finally { setDeleting(false) }
  }

  const handleResolve = async () => {
    try {
      await api.update(id, { status: 'resolved' })
      setItem(i => ({ ...i, status: 'resolved' }))
      toast('Marked as resolved! 🎉', 'success')
    } catch { toast('Failed to update status.', 'error') }
  }

  if (loading) return <PageWrapper><PageSpinner /></PageWrapper>
  if (notFound || !item) return (
    <PageWrapper>
      <div style={{ textAlign: 'center', padding: '6rem 1rem' }}>
        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🔍</div>
        <h2 style={{ color: '#fafafa', marginBottom: '0.5rem' }}>Item not found</h2>
        <p style={{ color: '#71717a', marginBottom: '1.5rem' }}>This report may have been deleted or doesn't exist.</p>
        <Link to="/explore" className="btn btn-primary">Browse all items</Link>
      </div>
    </PageWrapper>
  )

  const icon   = CATEGORY_ICONS[item.category] || '📦'
  const images = item.images || []
  const isLost = type === 'lost'

  return (
    <PageWrapper>
      <div className="container" style={{ padding: '2rem 1.5rem' }}>
        {/* Back */}
        <Link to="/explore" className="btn btn-ghost btn-sm" style={{ marginBottom: '1.5rem', display: 'inline-flex' }}>
          <ArrowLeft size={14} /> Back to Explore
        </Link>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 340px', gap: '2rem', alignItems: 'start' }}>
          {/* ── Left column ─────────────────────────────────────── */}
          <div>
            {/* Image gallery */}
            <div className="glass" style={{ overflow: 'hidden', marginBottom: '1.5rem' }}>
              <div style={{ height: 340, background: 'rgba(255,255,255,0.03)', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {images.length > 0 ? (
                  <img src={imageUrl(images[activeImg])} alt={item.item_name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                ) : (
                  <div style={{ textAlign: 'center', color: '#52525b' }}>
                    <div style={{ fontSize: '4rem', marginBottom: '0.5rem' }}>{icon}</div>
                    <p style={{ fontSize: '0.8rem' }}>No photos</p>
                  </div>
                )}
                {/* Type + Status overlay */}
                <div style={{ position: 'absolute', top: 12, left: 12, display: 'flex', gap: '0.4rem' }}>
                  <span className={`badge badge-${type}`}>{isLost ? '🔍 Lost' : '✅ Found'}</span>
                  <span className={`badge badge-${item.status}`}>{item.status}</span>
                </div>
              </div>
              {/* Thumbnails */}
              {images.length > 1 && (
                <div style={{ display: 'flex', gap: '0.5rem', padding: '0.75rem', overflowX: 'auto' }}>
                  {images.map((img, i) => (
                    <button key={i} onClick={() => setActiveImg(i)} style={{
                      width: 60, height: 60, borderRadius: 8, overflow: 'hidden', flexShrink: 0,
                      border: `2px solid ${i === activeImg ? '#7c3aed' : 'transparent'}`,
                    }}>
                      <img src={imageUrl(img)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Item info */}
            <div className="glass" style={{ padding: '1.75rem', marginBottom: '1.5rem' }}>
              <h1 className="heading-md" style={{ marginBottom: '0.5rem' }}>{item.item_name}</h1>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.25rem' }}>
                {item.category && <span className="badge badge-active"><Tag size={9} /> {item.category}</span>}
                {item.color && <span style={{ fontSize: '0.72rem', background: 'rgba(255,255,255,0.06)', color: '#a1a1aa', borderRadius: 999, padding: '0.2rem 0.6rem', border: '1px solid rgba(255,255,255,0.08)' }}>🎨 {item.color}</span>}
                {item.brand && <span style={{ fontSize: '0.72rem', background: 'rgba(255,255,255,0.06)', color: '#a1a1aa', borderRadius: 999, padding: '0.2rem 0.6rem', border: '1px solid rgba(255,255,255,0.08)' }}>🏷️ {item.brand}</span>}
              </div>

              <p style={{ color: '#a1a1aa', lineHeight: 1.7, fontSize: '0.9rem', marginBottom: '1.5rem' }}>{item.description}</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                {item.location && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.875rem' }}>
                    <MapPin size={14} color="#7c3aed" />
                    <span style={{ color: '#a1a1aa' }}>{item.location}</span>
                  </div>
                )}
                {item.date && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.875rem' }}>
                    <Calendar size={14} color="#7c3aed" />
                    <span style={{ color: '#a1a1aa' }}>{isLost ? 'Lost on' : 'Found on'} {formatDate(item.date)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            {item.status === 'active' && (
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <button className="btn btn-secondary" onClick={handleResolve} style={{ flex: 1, justifyContent: 'center' }}>
                  <CheckCircle size={15} /> Mark as Resolved
                </button>
                <button className="btn btn-danger" onClick={handleDelete} disabled={deleting}>
                  {deleting ? <Spinner size={14} /> : <Trash2 size={14} />} Delete
                </button>
              </div>
            )}
          </div>

          {/* ── Right column ────────────────────────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Contact card */}
            {(item.contact_email || item.contact_name) && (
              <div className="glass" style={{ padding: '1.4rem' }}>
                <h3 className="heading-sm" style={{ marginBottom: '1rem', color: '#fafafa' }}>Contact</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {item.contact_name && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                      <User size={14} color="#52525b" /> <span style={{ color: '#a1a1aa' }}>{item.contact_name}</span>
                    </div>
                  )}
                  {item.contact_email && (
                    <a href={`mailto:${item.contact_email}`} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#8b5cf6' }}>
                      <Mail size={14} /> {item.contact_email}
                    </a>
                  )}
                  {item.contact_phone && (
                    <a href={`tel:${item.contact_phone}`} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#8b5cf6' }}>
                      <Phone size={14} /> {item.contact_phone}
                    </a>
                  )}
                </div>
                <a href={`mailto:${item.contact_email}?subject=ReConnect: About your ${isLost ? 'lost' : 'found'} ${item.item_name}`} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '1rem' }}>
                  <Mail size={14} /> Send Message
                </a>
              </div>
            )}

            {/* Matches panel */}
            <div className="glass" style={{ padding: '1.4rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <div style={{ width: 28, height: 28, background: 'rgba(124,58,237,0.2)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Zap size={13} color="#8b5cf6" />
                </div>
                <div>
                  <h3 className="heading-sm">Smart Matches</h3>
                  <p style={{ fontSize: '0.72rem', color: '#52525b' }}>AI-powered compatibility scores</p>
                </div>
              </div>

              {mLoading ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#52525b', fontSize: '0.85rem', padding: '1rem 0' }}>
                  <Spinner size={16} /> Scanning for matches…
                </div>
              ) : matches.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '1.5rem 0', color: '#52525b' }}>
                  <TrendingUp size={28} style={{ margin: '0 auto 0.75rem', display: 'block' }} />
                  <p style={{ fontSize: '0.82rem' }}>No matches found yet.</p>
                  <p style={{ fontSize: '0.75rem', marginTop: '0.3rem' }}>More matches appear as reports are submitted.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {matches.map((m, i) => (
                    <MatchCard
                      key={m.item.id}
                      match={m}
                      index={i}
                      queryItemId={id}
                      queryItemType={type}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Meta */}
            <div className="glass" style={{ padding: '1rem 1.25rem' }}>
              <p style={{ fontSize: '0.72rem', color: '#52525b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.6rem' }}>Report Details</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                {[['ID', item.id?.slice(0, 8) + '…'], ['Reported', formatDate(item.created_at)], ['Updated', formatDate(item.updated_at)]].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                    <span style={{ color: '#52525b' }}>{k}</span>
                    <span style={{ color: '#71717a' }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`@media (max-width: 768px) { .details-grid { grid-template-columns: 1fr !important; } }`}</style>
      <Footer />
    </PageWrapper>
  )
}
