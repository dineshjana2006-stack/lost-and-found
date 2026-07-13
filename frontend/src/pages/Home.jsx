import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Search, MapPin, ArrowRight, Zap, TrendingUp, Users, Globe, ChevronRight } from 'lucide-react'
import PageWrapper from '../components/layout/PageWrapper'
import Footer from '../components/layout/Footer'
import ItemCard from '../components/items/ItemCard'
import { SkeletonCard } from '../components/ui/SkeletonCard'
import { statsApi, lostApi, foundApi } from '../services/api'
import { CATEGORY_ICONS, CATEGORIES } from '../utils/helpers'

const stagger = {
  animate: { transition: { staggerChildren: 0.1 } }
}
const fadeUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
}

function StatCard({ icon: Icon, value, label, color }) {
  return (
    <motion.div variants={fadeUp} className="glass" style={{ padding: '1.25rem 1.5rem', textAlign: 'center' }}>
      <div style={{ width: 40, height: 40, background: `${color}20`, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.75rem', border: `1px solid ${color}30` }}>
        <Icon size={18} color={color} />
      </div>
      <div style={{ fontWeight: 800, fontSize: '1.8rem', letterSpacing: '-0.04em', color: '#fafafa' }}>{value ?? '—'}</div>
      <div style={{ color: '#71717a', fontSize: '0.78rem', marginTop: '0.2rem' }}>{label}</div>
    </motion.div>
  )
}

export default function Home() {
  const [stats, setStats]     = useState(null)
  const [recent, setRecent]   = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      statsApi.summary(),
      lostApi.list({ page_size: 3, sort: 'newest' }),
      foundApi.list({ page_size: 3, sort: 'newest' }),
    ]).then(([s, l, f]) => {
      setStats(s.data.data)
      const combined = [...(l.data.data || []), ...(f.data.data || [])]
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 6)
      setRecent(combined)
    }).catch(console.error).finally(() => setLoading(false))
  }, [])

  return (
    <PageWrapper>
      {/* ── Hero ────────────────────────────────────────────────── */}
      <section style={{ position: 'relative', minHeight: '90vh', display: 'flex', alignItems: 'center', overflow: 'hidden', padding: '6rem 0 4rem' }}>
        {/* Background orbs */}
        <div className="orb orb-purple" style={{ width: 600, height: 600, top: -200, left: -200 }} />
        <div className="orb orb-blue"   style={{ width: 500, height: 500, top: 100, right: -150 }} />
        <div className="orb orb-teal"   style={{ width: 400, height: 400, bottom: -100, left: '30%' }} />

        <div className="container" style={{ position: 'relative', zIndex: 1 }}>
          <motion.div variants={stagger} initial="initial" animate="animate" style={{ maxWidth: 780, margin: '0 auto', textAlign: 'center' }}>
            {/* Badge */}
            <motion.div variants={fadeUp} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)', borderRadius: 999, padding: '0.4rem 1rem', marginBottom: '1.75rem' }}>
              <Zap size={12} color="#8b5cf6" fill="#8b5cf6" />
              <span style={{ fontSize: '0.78rem', color: '#a78bfa', fontWeight: 600, letterSpacing: '0.02em' }}>SMART MATCHING ENGINE</span>
            </motion.div>

            {/* Heading */}
            <motion.h1 variants={fadeUp} className="heading-xl" style={{ marginBottom: '1.25rem' }}>
              Reunite people with{' '}
              <span className="gradient-text">what matters most</span>
            </motion.h1>

            <motion.p variants={fadeUp} style={{ color: '#a1a1aa', fontSize: 'clamp(1rem, 2vw, 1.2rem)', lineHeight: 1.7, marginBottom: '2rem', maxWidth: 560, margin: '0 auto 2rem' }}>
              Report lost or found items and let our intelligent 7-factor matching engine connect them automatically. Fast, smart, and free.
            </motion.p>

            {/* CTAs */}
            <motion.div variants={fadeUp} style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '3.5rem' }}>
              <Link to="/report" className="btn btn-primary btn-lg">
                <MapPin size={16} /> Report an Item
              </Link>
              <Link to="/explore" className="btn btn-secondary btn-lg">
                <Search size={16} /> Explore Items <ArrowRight size={14} />
              </Link>
            </motion.div>

            {/* Quick search bar */}
            <motion.div variants={fadeUp}>
              <Link to="/explore" style={{ display: 'block', maxWidth: 500, margin: '0 auto' }}>
                <div className="glass" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1.25rem', borderRadius: 50, cursor: 'pointer' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(124,58,237,0.4)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}
                >
                  <Search size={16} color="#52525b" />
                  <span style={{ color: '#52525b', fontSize: '0.9rem', flex: 1, textAlign: 'left' }}>Search for lost or found items…</span>
                  <div style={{ background: '#7c3aed', borderRadius: 999, padding: '0.25rem 0.85rem', fontSize: '0.78rem', color: '#fff', fontWeight: 500 }}>Search</div>
                </div>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── Stats ───────────────────────────────────────────────── */}
      <section className="section" style={{ paddingTop: '2rem' }}>
        <div className="container">
          <motion.div
            variants={stagger} initial="initial" whileInView="animate" viewport={{ once: true }}
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}
          >
            <StatCard icon={TrendingUp} value={stats?.total_reports}   label="Total Reports"    color="#7c3aed" />
            <StatCard icon={Users}      value={stats?.items_reunited}   label="Items Reunited"   color="#10b981" />
            <StatCard icon={Search}     value={stats?.active_searches}  label="Active Searches"  color="#3b82f6" />
            <StatCard icon={Globe}      value={stats?.cities_covered}   label="Cities Covered"   color="#f59e0b" />
          </motion.div>
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────────── */}
      <section className="section">
        <div className="container">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2 className="heading-lg" style={{ marginBottom: '0.75rem' }}>How it works</h2>
            <p style={{ color: '#71717a', maxWidth: 480, margin: '0 auto' }}>Three simple steps to reconnect people with their belongings</p>
          </motion.div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.25rem' }}>
            {[
              { step: '01', icon: '📝', title: 'Report', desc: 'Submit a detailed report of your lost item or something you found. Include photos, location, and description.' },
              { step: '02', icon: '⚡', title: 'Smart Match', desc: 'Our 7-factor AI engine scores compatibility between lost and found reports using category, name, color, location, and more.' },
              { step: '03', icon: '🤝', title: 'Reconnect', desc: 'View your top matches, contact the finder or owner directly, and mark the item as resolved.' },
            ].map((s, i) => (
              <motion.div
                key={s.step}
                initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.12 }} viewport={{ once: true }}
                className="glass"
                style={{ padding: '1.75rem', position: 'relative', overflow: 'hidden' }}
              >
                <div style={{ position: 'absolute', top: 16, right: 16, fontWeight: 800, fontSize: '2rem', color: 'rgba(255,255,255,0.04)', letterSpacing: '-0.04em' }}>{s.step}</div>
                <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>{s.icon}</div>
                <h3 className="heading-sm" style={{ marginBottom: '0.5rem' }}>{s.title}</h3>
                <p style={{ color: '#71717a', fontSize: '0.875rem', lineHeight: 1.6 }}>{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Recent Items ─────────────────────────────────────────── */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
            <div>
              <h2 className="heading-md">Recent Reports</h2>
              <p style={{ color: '#71717a', fontSize: '0.875rem', marginTop: '0.25rem' }}>Latest lost & found submissions</p>
            </div>
            <Link to="/explore" className="btn btn-ghost btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              View all <ChevronRight size={14} />
            </Link>
          </div>

          {loading ? (
            <div className="grid-3">
              {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : (
            <div className="grid-3">
              {recent.map((item, i) => <ItemCard key={item.id} item={item} index={i} />)}
            </div>
          )}

          {!loading && recent.length === 0 && (
            <div style={{ textAlign: 'center', padding: '4rem 0', color: '#52525b' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📭</div>
              <p>No items reported yet. Be the first to report!</p>
              <Link to="/report" className="btn btn-primary" style={{ marginTop: '1rem' }}>Report an Item</Link>
            </div>
          )}
        </div>
      </section>

      {/* ── Categories ───────────────────────────────────────────── */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} style={{ marginBottom: '2rem' }}>
            <h2 className="heading-md">Browse by Category</h2>
            <p style={{ color: '#71717a', fontSize: '0.875rem', marginTop: '0.25rem' }}>Find items by type</p>
          </motion.div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '0.75rem' }}>
            {CATEGORIES.map((cat, i) => (
              <motion.div
                key={cat}
                initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.04 }} viewport={{ once: true }}
              >
                <Link
                  to={`/explore?category=${cat}`}
                  className="glass"
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem', padding: '1rem 0.5rem', textDecoration: 'none', cursor: 'pointer' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(124,58,237,0.4)'; e.currentTarget.style.background = 'rgba(124,58,237,0.05)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = ''; e.currentTarget.style.background = '' }}
                >
                  <span style={{ fontSize: '1.5rem' }}>{CATEGORY_ICONS[cat]}</span>
                  <span style={{ fontSize: '0.72rem', color: '#a1a1aa', fontWeight: 500, textAlign: 'center' }}>{cat}</span>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ───────────────────────────────────────────── */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.2) 0%, rgba(37,99,235,0.1) 100%)', border: '1px solid rgba(124,58,237,0.25)', borderRadius: 24, padding: 'clamp(2rem, 5vw, 3.5rem)', textAlign: 'center', position: 'relative', overflow: 'hidden' }}
          >
            <div className="orb orb-purple" style={{ width: 300, height: 300, top: -100, right: -100 }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <h2 className="heading-lg" style={{ marginBottom: '0.75rem' }}>Found something? <span className="gradient-text">Report it now</span></h2>
              <p style={{ color: '#a1a1aa', marginBottom: '2rem', maxWidth: 400, margin: '0 auto 2rem' }}>Someone out there is looking for it. Help them get it back in seconds.</p>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                <Link to="/report?type=lost"  className="btn btn-primary  btn-lg"><MapPin size={16} /> Report Lost</Link>
                <Link to="/report?type=found" className="btn btn-secondary btn-lg"><MapPin size={16} /> Report Found</Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </PageWrapper>
  )
}
