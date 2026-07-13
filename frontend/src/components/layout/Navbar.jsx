import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, MapPin, Menu, X, Zap } from 'lucide-react'
import { useState } from 'react'

const NAV_LINKS = [
  { to: '/',             label: 'Home'         },
  { to: '/explore',      label: 'Explore'      },
  { to: '/case-studies', label: 'Case Studies' },
  { to: '/report',       label: 'Report'       },
]

export default function Navbar() {
  const { pathname } = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <header style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      borderBottom: '1px solid rgba(255,255,255,0.06)',
      background: 'rgba(9,9,11,0.85)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
    }}>
      <div className="container" style={{ height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* Logo */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
          <div style={{
            width: 28, height: 28, background: 'linear-gradient(135deg,#7c3aed,#2563eb)',
            borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Zap size={15} color="#fff" fill="#fff" />
          </div>
          <span style={{ fontWeight: 700, fontSize: '1rem', letterSpacing: '-0.02em', color: '#fafafa' }}>
            Re<span style={{ color: '#8b5cf6' }}>Connect</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }} className="hidden-mobile">
          {NAV_LINKS.map(link => (
            <Link
              key={link.to}
              to={link.to}
              style={{
                padding: '0.4rem 0.9rem',
                borderRadius: 8,
                fontSize: '0.875rem',
                fontWeight: 500,
                color: pathname === link.to ? '#fafafa' : '#a1a1aa',
                background: pathname === link.to ? 'rgba(255,255,255,0.08)' : 'transparent',
                transition: 'all 0.15s',
              }}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* CTA */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Link to="/report" className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <MapPin size={13} />
            Report Item
          </Link>
          <button
            className="hidden-desktop"
            onClick={() => setMobileOpen(v => !v)}
            style={{ color: '#a1a1aa', padding: '0.3rem' }}
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ borderTop: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}
          >
            <div className="container" style={{ padding: '0.75rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              {NAV_LINKS.map(link => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileOpen(false)}
                  style={{
                    padding: '0.65rem 0.75rem',
                    borderRadius: 8,
                    fontSize: '0.9rem',
                    fontWeight: 500,
                    color: pathname === link.to ? '#fafafa' : '#a1a1aa',
                    background: pathname === link.to ? 'rgba(255,255,255,0.08)' : 'transparent',
                  }}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @media (max-width: 640px) { .hidden-mobile { display: none !important; } }
        @media (min-width: 641px) { .hidden-desktop { display: none !important; } }
      `}</style>
    </header>
  )
}
