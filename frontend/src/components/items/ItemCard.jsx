import React from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { MapPin, Calendar, Tag, Image as ImageIcon, ArrowRight } from 'lucide-react'
import { formatDate, timeAgo, CATEGORY_ICONS, imageUrl } from '../../utils/helpers'

export default function ItemCard({ item, index = 0 }) {
  const isLost  = item.type === 'lost'
  const icon    = CATEGORY_ICONS[item.category] || '📦'
  const imgFile = item.images?.[0]
  const img     = imageUrl(imgFile)
  const href    = `/${item.type}/${item.id}`

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.35, ease: 'easeOut' }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
    >
      <Link to={href} style={{ display: 'block', textDecoration: 'none' }}>
        <div className="glass" style={{ overflow: 'hidden', height: '100%' }}>
          {/* Image / placeholder */}
          <div style={{ position: 'relative', height: 160, background: 'rgba(255,255,255,0.04)', overflow: 'hidden' }}>
            {img ? (
              <img src={img} alt={item.item_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem' }}>
                {icon}
              </div>
            )}
            {/* Type badge */}
            <div style={{ position: 'absolute', top: 10, left: 10 }}>
              <span className={`badge badge-${item.type}`}>
                {isLost ? '🔍 Lost' : '✅ Found'}
              </span>
            </div>
            {/* Status badge */}
            {item.status !== 'active' && (
              <div style={{ position: 'absolute', top: 10, right: 10 }}>
                <span className={`badge badge-${item.status}`}>{item.status}</span>
              </div>
            )}
          </div>

          {/* Content */}
          <div style={{ padding: '1rem 1.1rem 1.1rem' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.35rem' }}>
              <h3 style={{ fontWeight: 600, fontSize: '0.95rem', color: '#fafafa', lineHeight: 1.3, letterSpacing: '-0.01em' }}>
                {item.item_name}
              </h3>
              <ArrowRight size={14} color="#52525b" style={{ flexShrink: 0, marginTop: 2 }} />
            </div>

            <p style={{ color: '#71717a', fontSize: '0.8rem', marginBottom: '0.75rem', lineHeight: 1.5,
              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {item.description || 'No description provided.'}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              {item.location && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#a1a1aa', fontSize: '0.78rem' }}>
                  <MapPin size={11} style={{ flexShrink: 0 }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.location}</span>
                </div>
              )}
              {item.date && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#a1a1aa', fontSize: '0.78rem' }}>
                  <Calendar size={11} style={{ flexShrink: 0 }} />
                  <span>{formatDate(item.date)}</span>
                </div>
              )}
            </div>

            {/* Category + time */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#52525b', fontSize: '0.75rem' }}>
                <Tag size={10} />
                <span>{item.category}</span>
              </div>
              <span style={{ color: '#52525b', fontSize: '0.72rem' }}>{timeAgo(item.created_at)}</span>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}
