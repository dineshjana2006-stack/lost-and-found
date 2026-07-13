import React from 'react'

export function SkeletonCard() {
  return (
    <div className="glass" style={{ padding: '1.25rem', overflow: 'hidden' }}>
      <div className="skeleton" style={{ height: 160, marginBottom: '1rem', borderRadius: 10 }} />
      <div className="skeleton" style={{ height: 14, width: '60%', marginBottom: '0.6rem' }} />
      <div className="skeleton" style={{ height: 12, width: '40%', marginBottom: '0.6rem' }} />
      <div className="skeleton" style={{ height: 12, width: '80%', marginBottom: '1rem' }} />
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <div className="skeleton" style={{ height: 28, width: 70, borderRadius: 999 }} />
        <div className="skeleton" style={{ height: 28, width: 80, borderRadius: 999 }} />
      </div>
    </div>
  )
}

export function SkeletonList({ count = 6 }) {
  return (
    <div className="grid-3">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  )
}
