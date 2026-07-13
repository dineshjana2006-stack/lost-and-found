import React from 'react'
import { Link } from 'react-router-dom'
import PageWrapper from '../components/layout/PageWrapper'
import Footer from '../components/layout/Footer'

export default function NotFound() {
  return (
    <PageWrapper>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 1.5rem', textAlign: 'center' }}>
        <div style={{ fontSize: '5rem', marginBottom: '1rem', lineHeight: 1 }}>404</div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fafafa', marginBottom: '0.5rem' }}>Page not found</h1>
        <p style={{ color: '#71717a', marginBottom: '2rem', maxWidth: 360 }}>
          The page you're looking for doesn't exist or was moved.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          <Link to="/"       className="btn btn-primary">Go Home</Link>
          <Link to="/explore" className="btn btn-secondary">Explore Items</Link>
        </div>
      </div>
      <Footer />
    </PageWrapper>
  )
}
