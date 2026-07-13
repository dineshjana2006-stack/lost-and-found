import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { TrendingUp, MapPin, Calendar, ArrowRight, CheckCircle, BarChart2 } from 'lucide-react'
import { formatDate, scoreBadgeClass, scoreLabel, CATEGORY_ICONS, imageUrl } from '../../utils/helpers'

/**
 * MatchCard — displayed in the Smart Matches panel on ItemDetails.
 *
 * Props:
 *   match           – { item, score, score_breakdown, matched_fields }
 *   index           – animation stagger index
 *   queryItemId     – ID of the item whose detail page we're on
 *   queryItemType   – "lost" | "found"  (unused — derived from item.type instead)
 */
export default function MatchCard({ match, index = 0, queryItemId, queryItemType }) {
  const { item, score, score_breakdown, matched_fields } = match
  const navigate = useNavigate()

  const icon   = CATEGORY_ICONS[item.category] || '📦'
  const img    = imageUrl(item.images?.[0])
  const detailHref = `/${item.type}/${item.id}`

  // Use item.type (always set by backend) to correctly assign lostId / foundId.
  // item.type === 'found' → the matched item is found, so current page item is lost.
  // item.type === 'lost'  → the matched item is lost, so current page item is found.
  const lostId  = item.type === 'lost'  ? item.id      : queryItemId
  const foundId = item.type === 'found' ? item.id      : queryItemId
  const reportHref = `/match-report/${lostId}/${foundId}`

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.08, duration: 0.35 }}
    >
      <div className="glass" style={{ padding: '1rem', display: 'flex', gap: '0.85rem', alignItems: 'flex-start' }}>
        {/* Thumbnail */}
        <Link to={detailHref} style={{ flexShrink: 0 }}>
          <div style={{
            width: 60, height: 60, borderRadius: 10, overflow: 'hidden',
            background: 'rgba(255,255,255,0.05)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem',
          }}>
            {img
              ? <img src={img} alt={item.item_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : icon
            }
          </div>
        </Link>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <Link to={detailHref} style={{ textDecoration: 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
              <h4 style={{ fontWeight: 600, fontSize: '0.88rem', color: '#fafafa', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {item.item_name}
              </h4>
              <ArrowRight size={12} color="#52525b" style={{ flexShrink: 0 }} />
            </div>
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
            <span className={`badge ${scoreBadgeClass(score)}`}>
              <TrendingUp size={9} /> {score}% {scoreLabel(score)}
            </span>
            <span className={`badge badge-${item.type}`}>
              {item.type === 'lost' ? '🔍 Lost' : '✅ Found'}
            </span>
          </div>

          {/* Score bar */}
          <div style={{ height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 999, marginBottom: '0.4rem', overflow: 'hidden' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${score}%` }}
              transition={{ delay: index * 0.08 + 0.3, duration: 0.6, ease: 'easeOut' }}
              style={{
                height: '100%', borderRadius: 999,
                background: score >= 70 ? '#10b981' : score >= 40 ? '#f59e0b' : '#71717a',
              }}
            />
          </div>

          {/* Matched fields */}
          {matched_fields?.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginBottom: '0.4rem' }}>
              {matched_fields.slice(0, 3).map(f => (
                <span key={f} style={{
                  display: 'flex', alignItems: 'center', gap: '0.2rem',
                  fontSize: '0.68rem', color: '#34d399', background: 'rgba(16,185,129,0.1)',
                  borderRadius: 4, padding: '0.15rem 0.4rem',
                }}>
                  <CheckCircle size={8} /> {f.replace('_', ' ')}
                </span>
              ))}
            </div>
          )}

          {/* Location & date */}
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.6rem' }}>
            {item.location && (
              <span style={{ fontSize: '0.72rem', color: '#71717a', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <MapPin size={9} /> {item.location.split(',')[0]}
              </span>
            )}
            {item.date && (
              <span style={{ fontSize: '0.72rem', color: '#71717a', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <Calendar size={9} /> {formatDate(item.date)}
              </span>
            )}
          </div>

          {/* View Analysis button */}
          <motion.button
            whileHover={{ scale: 1.02, x: 2 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate(reportHref)}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.35rem',
              width: '100%', justifyContent: 'center',
              background: 'linear-gradient(135deg, rgba(124,58,237,0.25), rgba(37,99,235,0.15))',
              border: '1px solid rgba(124,58,237,0.35)',
              borderRadius: 8, padding: '0.42rem 0.75rem',
              fontSize: '0.75rem', fontWeight: 600, color: '#a78bfa',
              cursor: 'pointer', transition: 'all 0.15s',
              fontFamily: 'inherit',
            }}
          >
            <BarChart2 size={12} />
            View Full Analysis Report
          </motion.button>
        </div>
      </div>
    </motion.div>
  )
}
