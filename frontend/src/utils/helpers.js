// ─────────────────────────────────────────────────────────────
//  Category helpers
// ─────────────────────────────────────────────────────────────
export const CATEGORIES = [
  'Electronics', 'Clothing', 'Accessories', 'Documents', 'Keys',
  'Bags', 'Pets', 'Sports', 'Jewelry', 'Books', 'Vehicles', 'Other',
]

export const STATUSES = ['active', 'resolved', 'archived']

export const CATEGORY_ICONS = {
  Electronics: '📱', Clothing: '👕', Accessories: '👜', Documents: '📄',
  Keys: '🔑', Bags: '🎒', Pets: '🐾', Sports: '⚽',
  Jewelry: '💎', Books: '📚', Vehicles: '🚗', Other: '📦',
}

export const CATEGORY_COLORS = {
  Electronics: '#7c3aed', Clothing: '#db2777', Accessories: '#d97706',
  Documents:   '#2563eb', Keys:    '#16a34a', Bags:        '#9333ea',
  Pets:        '#ea580c', Sports:  '#0891b2', Jewelry:     '#be185d',
  Books:       '#65a30d', Vehicles:'#dc2626', Other:       '#71717a',
}

// ─────────────────────────────────────────────────────────────
//  Date helpers
// ─────────────────────────────────────────────────────────────
export const formatDate = (dateStr) => {
  if (!dateStr) return '—'
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      year: 'numeric', month: 'short', day: 'numeric',
    })
  } catch { return dateStr }
}

export const timeAgo = (isoStr) => {
  if (!isoStr) return ''
  const diff = Date.now() - new Date(isoStr).getTime()
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days  = Math.floor(diff / 86400000)
  if (mins  < 1)  return 'just now'
  if (mins  < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days  < 7)  return `${days}d ago`
  return formatDate(isoStr)
}

// ─────────────────────────────────────────────────────────────
//  Score label
// ─────────────────────────────────────────────────────────────
export const scoreBadgeClass = (score) => {
  if (score >= 70) return 'badge-score-high'
  if (score >= 40) return 'badge-score-medium'
  return 'badge-score-low'
}

export const scoreLabel = (score) => {
  if (score >= 70) return 'High Match'
  if (score >= 40) return 'Possible Match'
  return 'Low Match'
}

// ─────────────────────────────────────────────────────────────
//  Image URL helper
// ─────────────────────────────────────────────────────────────
export const imageUrl = (filename) =>
  filename ? `/uploads/images/${filename}` : null

// ─────────────────────────────────────────────────────────────
//  Class name joiner
// ─────────────────────────────────────────────────────────────
export const cx = (...classes) => classes.filter(Boolean).join(' ')
