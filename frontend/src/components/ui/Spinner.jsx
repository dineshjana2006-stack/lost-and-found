import React from 'react'

export function Spinner({ size = 24, className = '' }) {
  return (
    <span
      className={className}
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        border: '2px solid rgba(255,255,255,0.1)',
        borderTopColor: '#8b5cf6',
        borderRadius: '50%',
        animation: 'spin 0.7s linear infinite',
        flexShrink: 0,
      }}
    />
  )
}

export function PageSpinner() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '60vh', flexDirection: 'column', gap: '1rem',
    }}>
      <Spinner size={40} />
      <p style={{ color: '#71717a', fontSize: '0.875rem' }}>Loading…</p>
    </div>
  )
}
