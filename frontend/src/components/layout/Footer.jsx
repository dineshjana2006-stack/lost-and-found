import React from 'react'
import { Link } from 'react-router-dom'
import { Zap, Heart } from 'lucide-react'

export default function Footer() {
  return (
    <footer style={{
      borderTop: '1px solid rgba(255,255,255,0.06)',
      padding: '3rem 0 2rem',
      marginTop: 'auto',
    }}>
      <div className="container">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2rem', marginBottom: '2.5rem' }}>
          {/* Brand */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <div style={{
                width: 26, height: 26, background: 'linear-gradient(135deg,#7c3aed,#2563eb)',
                borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Zap size={13} color="#fff" fill="#fff" />
              </div>
              <span style={{ fontWeight: 700, fontSize: '0.95rem', letterSpacing: '-0.02em' }}>
                Re<span style={{ color: '#8b5cf6' }}>Connect</span>
              </span>
            </div>
            <p style={{ color: '#71717a', fontSize: '0.82rem', lineHeight: 1.6, maxWidth: 220 }}>
              Smart digital lost & found network powered by intelligent matching.
            </p>
          </div>

          {/* Links */}
          <div>
            <p style={{ fontWeight: 600, fontSize: '0.8rem', color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>Platform</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {[['/', 'Home'], ['/explore', 'Explore Items'], ['/report', 'Report Item']].map(([to, label]) => (
                <Link key={to} to={to} style={{ color: '#71717a', fontSize: '0.85rem', transition: 'color 0.15s' }}
                  onMouseEnter={e => e.target.style.color = '#fafafa'}
                  onMouseLeave={e => e.target.style.color = '#71717a'}
                >{label}</Link>
              ))}
            </div>
          </div>

          {/* API */}
          <div>
            <p style={{ fontWeight: 600, fontSize: '0.8rem', color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>API</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {[
                ['http://localhost:5000/api/health', 'Health Check'],
                ['http://localhost:5000/api/stats/summary', 'Stats API'],
              ].map(([href, label]) => (
                <a key={href} href={href} target="_blank" rel="noopener noreferrer"
                  style={{ color: '#71717a', fontSize: '0.85rem', transition: 'color 0.15s' }}
                  onMouseEnter={e => e.target.style.color = '#8b5cf6'}
                  onMouseLeave={e => e.target.style.color = '#71717a'}
                >{label}</a>
              ))}
            </div>
          </div>
        </div>

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
          <p style={{ color: '#52525b', fontSize: '0.8rem' }}>
            © {new Date().getFullYear()} ReConnect. Built with <Heart size={11} style={{ display: 'inline', color: '#7c3aed' }} /> for the community.
          </p>
          <p style={{ color: '#52525b', fontSize: '0.8rem' }}>
            Flask + React + Smart Matching Engine
          </p>
        </div>
      </div>
    </footer>
  )
}
