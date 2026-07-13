import React, { useState, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, X, MapPin, Calendar, Tag, Mail, Phone, User, ChevronRight, ChevronLeft, Check, Image as ImageIcon, AlertCircle } from 'lucide-react'
import PageWrapper from '../components/layout/PageWrapper'
import Footer from '../components/layout/Footer'
import { Spinner } from '../components/ui/Spinner'
import { useToast } from '../components/ui/Toast'
import { lostApi, foundApi } from '../services/api'
import { CATEGORIES } from '../utils/helpers'

const today = new Date().toISOString().split('T')[0]

const STEPS = ['Type', 'Details', 'Images', 'Contact']

const emptyForm = {
  item_name: '', category: '', color: '', brand: '', description: '',
  location: '', date: '', contact_name: '', contact_email: '', contact_phone: '',
}

function FieldGroup({ label, required, error, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
      <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#a1a1aa', letterSpacing: '0.02em' }}>
        {label} {required && <span style={{ color: '#ef4444' }}>*</span>}
      </label>
      {children}
      {error && <span style={{ fontSize: '0.75rem', color: '#f87171', display: 'flex', alignItems: 'center', gap: '0.3rem' }}><AlertCircle size={11} />{error}</span>}
    </div>
  )
}

export default function ReportItem() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const toast    = useToast()
  const fileRef  = useRef()

  const [step,    setStep]    = useState(0)
  const [type,    setType]    = useState(searchParams.get('type') || 'lost')
  const [form,    setForm]    = useState(emptyForm)
  const [files,   setFiles]   = useState([])
  const [previews, setPreviews] = useState([])
  const [errors,  setErrors]  = useState({})
  const [loading, setLoading] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const validate = (stepIndex) => {
    const e = {}
    if (stepIndex === 1) {
      if (!form.item_name.trim())        e.item_name    = 'Item name is required'
      if (!form.category)                e.category     = 'Category is required'
      if (!form.description.trim() || form.description.trim().length < 10)
                                         e.description  = 'Description must be at least 10 characters'
      if (!form.location.trim())         e.location     = 'Location is required'
      if (!form.date)                    e.date         = 'Date is required'
      if (form.date > today)             e.date         = 'Date cannot be in the future'
    }
    if (stepIndex === 3) {
      if (!form.contact_email.trim())    e.contact_email = 'Email is required'
      else if (!/\S+@\S+\.\S+/.test(form.contact_email)) e.contact_email = 'Enter a valid email'
    }
    return e
  }

  const nextStep = () => {
    const e = validate(step)
    if (Object.keys(e).length) { setErrors(e); return }
    setErrors({})
    setStep(s => s + 1)
  }

  const handleFiles = (newFiles) => {
    const arr = Array.from(newFiles).slice(0, 5 - files.length)
    setFiles(f => [...f, ...arr])
    arr.forEach(file => {
      const reader = new FileReader()
      reader.onload = e => setPreviews(p => [...p, e.target.result])
      reader.readAsDataURL(file)
    })
  }

  const removeFile = (i) => {
    setFiles(f => f.filter((_, idx) => idx !== i))
    setPreviews(p => p.filter((_, idx) => idx !== i))
  }

  const submit = async () => {
    const e = validate(3)
    if (Object.keys(e).length) { setErrors(e); return }
    setLoading(true)
    try {
      let res
      if (files.length > 0) {
        const fd = new FormData()
        Object.entries(form).forEach(([k, v]) => fd.append(k, v))
        files.forEach(f => fd.append('images', f))
        res = type === 'lost' ? await lostApi.create(fd) : await foundApi.create(fd)
      } else {
        res = type === 'lost' ? await lostApi.create(form) : await foundApi.create(form)
      }
      const id = res.data.data?.item?.id
      toast('Item reported successfully! 🎉', 'success')
      navigate(id ? `/${type}/${id}` : '/explore')
    } catch (err) {
      toast(err.message || 'Failed to submit. Please try again.', 'error')
    } finally { setLoading(false) }
  }

  const isLost = type === 'lost'

  return (
    <PageWrapper>
      <div className="container" style={{ maxWidth: 680, padding: '2.5rem 1.5rem' }}>
        <div style={{ marginBottom: '2rem' }}>
          <h1 className="heading-lg">Report an Item</h1>
          <p style={{ color: '#71717a', marginTop: '0.4rem' }}>Help someone recover their belongings</p>
        </div>

        {/* Progress stepper */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2.5rem', gap: '0' }}>
          {STEPS.map((label, i) => (
            <React.Fragment key={label}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: i < step ? '#7c3aed' : i === step ? 'rgba(124,58,237,0.2)' : 'rgba(255,255,255,0.05)',
                  border: `2px solid ${i <= step ? '#7c3aed' : 'rgba(255,255,255,0.1)'}`,
                  fontSize: '0.78rem', fontWeight: 700, color: i <= step ? '#fff' : '#52525b',
                  transition: 'all 0.3s',
                }}>
                  {i < step ? <Check size={14} /> : i + 1}
                </div>
                <span style={{ fontSize: '0.68rem', color: i === step ? '#a78bfa' : '#52525b', marginTop: '0.3rem', fontWeight: i === step ? 600 : 400 }}>{label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div style={{ flex: 1, height: 2, background: i < step ? '#7c3aed' : 'rgba(255,255,255,0.08)', transition: 'background 0.3s', marginBottom: 20 }} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Step panels */}
        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}>
            {/* Step 0: Type */}
            {step === 0 && (
              <div>
                <h2 className="heading-md" style={{ marginBottom: '0.5rem' }}>What are you reporting?</h2>
                <p style={{ color: '#71717a', marginBottom: '2rem', fontSize: '0.9rem' }}>Select whether you lost something or found something.</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  {[
                    { value: 'lost',  emoji: '🔍', title: 'I lost something',  desc: 'Report an item you lost and get matched with finders.',  color: '#ef4444' },
                    { value: 'found', emoji: '✅', title: 'I found something', desc: 'Report an item you found and match it with its owner.', color: '#10b981' },
                  ].map(opt => (
                    <button key={opt.value} onClick={() => setType(opt.value)}
                      style={{
                        padding: '1.75rem 1.25rem', borderRadius: 16, textAlign: 'left', cursor: 'pointer',
                        background: type === opt.value ? `${opt.color}15` : 'rgba(255,255,255,0.03)',
                        border: `2px solid ${type === opt.value ? opt.color : 'rgba(255,255,255,0.08)'}`,
                        transition: 'all 0.2s',
                        boxShadow: type === opt.value ? `0 0 30px ${opt.color}25` : 'none',
                      }}
                    >
                      <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>{opt.emoji}</div>
                      <div style={{ fontWeight: 700, fontSize: '1rem', color: '#fafafa', marginBottom: '0.4rem' }}>{opt.title}</div>
                      <div style={{ fontSize: '0.8rem', color: '#71717a', lineHeight: 1.5 }}>{opt.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 1: Details */}
            {step === 1 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <h2 className="heading-md" style={{ marginBottom: '0' }}>Item Details</h2>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <FieldGroup label="Item Name" required error={errors.item_name}>
                    <input className={`input ${errors.item_name ? 'input-error' : ''}`} placeholder="e.g. Black iPhone 14" value={form.item_name} onChange={e => set('item_name', e.target.value)} />
                  </FieldGroup>
                  <FieldGroup label="Category" required error={errors.category}>
                    <select className={`input ${errors.category ? 'input-error' : ''}`} value={form.category} onChange={e => set('category', e.target.value)}>
                      <option value="">Select a category</option>
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </FieldGroup>
                  <FieldGroup label="Color">
                    <input className="input" placeholder="e.g. Black, Silver" value={form.color} onChange={e => set('color', e.target.value)} />
                  </FieldGroup>
                  <FieldGroup label="Brand / Make">
                    <input className="input" placeholder="e.g. Apple, Samsung" value={form.brand} onChange={e => set('brand', e.target.value)} />
                  </FieldGroup>
                </div>
                <FieldGroup label="Description" required error={errors.description}>
                  <textarea className={`input ${errors.description ? 'input-error' : ''}`} placeholder="Describe the item in detail – distinctive features, markings, condition, etc." rows={4} value={form.description} onChange={e => set('description', e.target.value)} />
                </FieldGroup>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <FieldGroup label={isLost ? 'Where did you lose it?' : 'Where did you find it?'} required error={errors.location}>
                    <input className={`input ${errors.location ? 'input-error' : ''}`} placeholder="e.g. Central Park, New York" value={form.location} onChange={e => set('location', e.target.value)} />
                  </FieldGroup>
                  <FieldGroup label={isLost ? 'Date Lost' : 'Date Found'} required error={errors.date}>
                    <input type="date" className={`input ${errors.date ? 'input-error' : ''}`} max={today} value={form.date} onChange={e => set('date', e.target.value)} />
                  </FieldGroup>
                </div>
              </div>
            )}

            {/* Step 2: Images */}
            {step === 2 && (
              <div>
                <h2 className="heading-md" style={{ marginBottom: '0.5rem' }}>Add Photos</h2>
                <p style={{ color: '#71717a', marginBottom: '1.5rem', fontSize: '0.875rem' }}>Photos improve match accuracy by up to 40%. Up to 5 images, max 5 MB each. (Optional)</p>
                {/* Drop zone */}
                <div
                  onClick={() => fileRef.current?.click()}
                  onDrop={e => { e.preventDefault(); handleFiles(e.dataTransfer.files) }}
                  onDragOver={e => e.preventDefault()}
                  style={{
                    border: '2px dashed rgba(255,255,255,0.12)', borderRadius: 16, padding: '2.5rem',
                    textAlign: 'center', cursor: 'pointer', transition: 'border-color 0.2s, background 0.2s',
                    background: 'rgba(255,255,255,0.02)',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(124,58,237,0.4)'; e.currentTarget.style.background = 'rgba(124,58,237,0.04)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.background = 'rgba(255,255,255,0.02)' }}
                >
                  <Upload size={28} color="#52525b" style={{ margin: '0 auto 0.75rem' }} />
                  <p style={{ color: '#a1a1aa', fontWeight: 500, marginBottom: '0.3rem' }}>Click or drag & drop images</p>
                  <p style={{ color: '#52525b', fontSize: '0.8rem' }}>PNG, JPG, WEBP, GIF – max 5 MB each</p>
                  <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={e => handleFiles(e.target.files)} />
                </div>
                {/* Previews */}
                {previews.length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '0.75rem', marginTop: '1rem' }}>
                    {previews.map((src, i) => (
                      <div key={i} style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', aspectRatio: '1', background: '#18181b' }}>
                        <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <button onClick={() => removeFile(i)} style={{
                          position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.7)', border: 'none',
                          borderRadius: '50%', width: 20, height: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <X size={10} color="#fff" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Contact */}
            {step === 3 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <h2 className="heading-md" style={{ marginBottom: '0' }}>Contact Information</h2>
                <p style={{ color: '#71717a', fontSize: '0.875rem', marginTop: '-0.75rem' }}>This allows others to contact you about this item.</p>
                <FieldGroup label="Your Name">
                  <input className="input" placeholder="Full name" value={form.contact_name} onChange={e => set('contact_name', e.target.value)} />
                </FieldGroup>
                <FieldGroup label="Email Address" required error={errors.contact_email}>
                  <input type="email" className={`input ${errors.contact_email ? 'input-error' : ''}`} placeholder="you@example.com" value={form.contact_email} onChange={e => set('contact_email', e.target.value)} />
                </FieldGroup>
                <FieldGroup label="Phone Number (optional)">
                  <input type="tel" className="input" placeholder="+91 00000 00000" value={form.contact_phone} onChange={e => set('contact_phone', e.target.value)} />
                </FieldGroup>
                {/* Summary */}
                <div className="glass" style={{ padding: '1.1rem 1.25rem', marginTop: '0.5rem' }}>
                  <p style={{ fontWeight: 600, fontSize: '0.8rem', color: '#a1a1aa', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Summary</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    {[
                      ['Type', type === 'lost' ? '🔍 Lost' : '✅ Found'],
                      ['Item', form.item_name], ['Category', form.category],
                      ['Location', form.location], ['Date', form.date],
                      ['Photos', `${files.length} attached`],
                    ].map(([k, v]) => v && (
                      <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                        <span style={{ color: '#71717a' }}>{k}</span>
                        <span style={{ color: '#fafafa', fontWeight: 500 }}>{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <button className="btn btn-secondary" onClick={() => setStep(s => s - 1)} disabled={step === 0}>
            <ChevronLeft size={15} /> Back
          </button>
          {step < STEPS.length - 1 ? (
            <button className="btn btn-primary" onClick={nextStep}>
              Continue <ChevronRight size={15} />
            </button>
          ) : (
            <button className="btn btn-primary btn-lg" onClick={submit} disabled={loading}>
              {loading ? <><Spinner size={16} /> Submitting…</> : <><Check size={15} /> Submit Report</>}
            </button>
          )}
        </div>
      </div>
      <Footer />
    </PageWrapper>
  )
}
