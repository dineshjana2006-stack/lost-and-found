import React, { createContext, useContext, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react'

const ToastContext = createContext(null)

const ICONS = {
  success: <CheckCircle size={16} />,
  error:   <XCircle size={16} />,
  warning: <AlertTriangle size={16} />,
  info:    <Info size={16} />,
}

const COLORS = {
  success: { bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.3)',  color: '#34d399' },
  error:   { bg: 'rgba(239,68,68,0.15)',  border: 'rgba(239,68,68,0.3)',   color: '#f87171' },
  warning: { bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.3)',  color: '#fbbf24' },
  info:    { bg: 'rgba(59,130,246,0.15)', border: 'rgba(59,130,246,0.3)',  color: '#60a5fa' },
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const toast = useCallback((message, type = 'info', duration = 4000) => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration)
  }, [])

  const dismiss = useCallback((id) =>
    setToasts(prev => prev.filter(t => t.id !== id)), [])

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div style={{ position:'fixed', bottom:'1.5rem', right:'1.5rem', zIndex:9999, display:'flex', flexDirection:'column', gap:'0.5rem' }}>
        <AnimatePresence>
          {toasts.map(t => {
            const c = COLORS[t.type] || COLORS.info
            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, x: 60, scale: 0.9 }}
                animate={{ opacity: 1, x: 0,  scale: 1 }}
                exit={{   opacity: 0, x: 60,  scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.6rem',
                  padding: '0.75rem 1rem',
                  background: c.bg,
                  border: `1px solid ${c.border}`,
                  borderRadius: 12,
                  color: c.color,
                  backdropFilter: 'blur(16px)',
                  maxWidth: 340,
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
                }}
              >
                {ICONS[t.type]}
                <span style={{ flex: 1, color: '#fafafa' }}>{t.message}</span>
                <button onClick={() => dismiss(t.id)} style={{ color: '#71717a', lineHeight: 1 }}>
                  <X size={14} />
                </button>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside ToastProvider')
  return ctx
}
