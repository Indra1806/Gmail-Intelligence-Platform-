'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { 
  Sparkles, 
  Mail, 
  MessageSquare, 
  Zap, 
  Tag, 
  Search, 
  Shield, 
  ArrowRight, 
  Check, 
  Star, 
  Globe, 
  Lock, 
  Menu, 
  X, 
  Play, 
  RefreshCw, 
  CheckCircle, 
  Eye, 
  ChevronDown, 
  Layers, 
  AlertCircle
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

// Custom Inline SVG Social Icons
const GithubIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.577.688.479C19.138 20.162 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
  </svg>
)

const LinkedinIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.779-1.75-1.75s.784-1.75 1.75-1.75 1.75.779 1.75 1.75-.784 1.75-1.75 1.75zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
  </svg>
)

const TwitterIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
)

// Custom hook to trigger animation on scroll intersection
function AnimatedCounter({ value, suffix = '', duration = 1500 }: { value: number; suffix?: string; duration?: number }) {
  const [count, setCount] = useState(0)
  const elementRef = useRef<HTMLSpanElement>(null)
  const [hasAnimated, setHasAnimated] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !hasAnimated) {
        setHasAnimated(true)
        let startTimestamp: number | null = null
        const step = (timestamp: number) => {
          if (!startTimestamp) startTimestamp = timestamp
          const progress = Math.min((timestamp - startTimestamp) / duration, 1)
          setCount(Math.floor(progress * value))
          if (progress < 1) {
            window.requestAnimationFrame(step)
          }
        }
        window.requestAnimationFrame(step)
      }
    }, { threshold: 0.1 })

    if (elementRef.current) {
      observer.observe(elementRef.current)
    }
    return () => observer.disconnect()
  }, [value, duration, hasAnimated])

  return <span ref={elementRef}>{count}{suffix}</span>
}

export default function LandingPage() {
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  
  // Cookie Consent Banner State
  const [showCookieConsent, setShowCookieConsent] = useState(false)
  
  // 6-Second Registration Popup State
  const [showPromoPopup, setShowPromoPopup] = useState(false)
  
  // FAQ Active State
  const [activeFaq, setActiveFaq] = useState<number | null>(null)
  
  // Interactive Dashboard Tab State
  const [activeShowcaseTab, setActiveShowcaseTab] = useState<'inbox' | 'summary' | 'categories' | 'chat'>('inbox')

  // Contact Form State
  const [contactForm, setContactForm] = useState({ name: '', email: '', message: '' })
  const [formSubmitted, setFormSubmitted] = useState(false)

  // Interactive Simulator State
  const [sandboxInput, setSandboxInput] = useState('')
  const [sandboxLogs, setSandboxLogs] = useState<string[]>([])
  const [sandboxResponse, setSandboxResponse] = useState('')
  const [isSandboxRunning, setIsSandboxRunning] = useState(false)
  const [sandboxSource, setSandboxSource] = useState('')
  const [typedSandboxResponse, setTypedSandboxResponse] = useState('')

  const runSandboxSimulation = (inputVal: string) => {
    if (isSandboxRunning || !inputVal.trim()) return
    setIsSandboxRunning(true)
    setSandboxLogs([])
    setSandboxResponse('')
    setTypedSandboxResponse('')
    setSandboxSource('')

    const logs = [
      '🔌 Initializing handshake with Google Secure APIs...',
      '📂 Scanning sandbox email headers & building message context...',
      '🧠 Running Supabase pgvector cosine similarity scans...',
      '⚡ Reranking vector context using NVIDIA NIM Cross-Encoder...',
      '🚀 Feeding contextual prompt into Gemini-2.0-flash model...'
    ]

    // Cycle through logs in sequence
    let currentLogIndex = 0
    const logInterval = setInterval(() => {
      if (currentLogIndex < logs.length) {
        setSandboxLogs(prev => [...prev, logs[currentLogIndex]])
        currentLogIndex++
      } else {
        clearInterval(logInterval)
        
        // Determine reply
        let finalReply = ''
        let sourceName = ''
        const lowerInput = inputVal.toLowerCase()
        if (lowerInput.includes('billing') || lowerInput.includes('invoice') || lowerInput.includes('nvidia') || lowerInput.includes('fee')) {
          finalReply = 'Based on May 2026 statements: You have a pending charge of $450.00 from NVIDIA NIM Cloud Services which will be automatically debited. There are no overdue invoices.'
          sourceName = 'nvidia_notice_may26.eml'
        } else if (lowerInput.includes('apology') || lowerInput.includes('customer') || lowerInput.includes('delay') || lowerInput.includes('sorry')) {
          finalReply = "Dear Customer,\n\nWe sincerely apologize for the delay. Our replica databases experienced a brief CPU spike, which has now been fully resolved. We have processed transaction #820491.\n\nBest regards,\nOVO Support"
          sourceName = 'stripe_invoice_8204.eml'
        } else if (lowerInput.includes('server') || lowerInput.includes('alert') || lowerInput.includes('cpu')) {
          finalReply = 'Critical Server Alert Summary:\n- Supabase DB Replica: High CPU utilization (92%) reported.\n- Vercel: Node.js 20 build completed in 22 seconds.'
          sourceName = 'supabase_replica_alert.eml'
        } else if (lowerInput.includes('pirate')) {
          finalReply = "Ahoy matey!\n\nYe have one invoice awaitin' yer gold! NVIDIA demands $450.00 doubloons by the end of the moon. Pay up or walk the plank!\n\nCaptain OVO"
          sourceName = 'nvidia_invoice.eml'
        } else {
          finalReply = `I scanned your sandbox inbox and synthesized context for "${inputVal}". Gemini 2.0 Flash returns a successful match! Link your real Gmail account to run this query on your actual mail database.`
          sourceName = 'ovo_intelligence_tutorial.eml'
        }

        setSandboxResponse(finalReply)
        setSandboxSource(sourceName)
        
        // Typing effect
        let typedIndex = 0
        const typingInterval = setInterval(() => {
          if (typedIndex <= finalReply.length) {
            setTypedSandboxResponse(finalReply.slice(0, typedIndex))
            typedIndex++
          } else {
            clearInterval(typingInterval)
            setIsSandboxRunning(false)
          }
        }, 12)
      }
    }, 500)
  }

  // Auto-redirect already authenticated users
  useEffect(() => {
    const userId = localStorage.getItem('OVO_user_id')
    const accountId = localStorage.getItem('OVO_account_id')
    if (userId && accountId) {
      window.location.href = '/dashboard'
    } else {
      setCheckingAuth(false)
    }
  }, [])

  // Manage cookie consent banner display
  useEffect(() => {
    if (!checkingAuth) {
      const consent = localStorage.getItem('OVO_cookie_consent')
      if (!consent) {
        setShowCookieConsent(true)
      }
    }
  }, [checkingAuth])

  // Trigger registration popup after 6 seconds
  useEffect(() => {
    if (!checkingAuth) {
      const dismissed = sessionStorage.getItem('OVO_promo_dismissed')
      const userId = localStorage.getItem('OVO_user_id')
      
      if (!dismissed && !userId) {
        const timer = setTimeout(() => {
          setShowPromoPopup(true)
        }, 6000)
        return () => clearTimeout(timer)
      }
    }
  }, [checkingAuth])

  // Mouse-following glow effect in Hero
  const heroRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!heroRef.current) return
      const rect = heroRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      heroRef.current.style.setProperty('--mouse-x', `${x}px`)
      heroRef.current.style.setProperty('--mouse-y', `${y}px`)
    }
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  // Auth Redirection Trigger
  const handleAuthRedirect = () => {
    window.location.href = '/auth/google'
  }

  // Handle Cookie consent actions
  const handleCookieConsent = (accept: boolean) => {
    localStorage.setItem('OVO_cookie_consent', accept ? 'accepted' : 'declined')
    setShowCookieConsent(false)
  }

  // Handle Close registration promo
  const closePromoPopup = () => {
    sessionStorage.setItem('OVO_promo_dismissed', 'true')
    setShowPromoPopup(false)
  }

  // Handle Contact submit
  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (contactForm.name && contactForm.email && contactForm.message) {
      setFormSubmitted(true)
      setTimeout(() => {
        setContactForm({ name: '', email: '', message: '' })
        setFormSubmitted(false)
      }, 3000)
    }
  }

  if (checkingAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950 text-white font-sans">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-slate-400">Loading workspace...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 font-sans overflow-x-hidden relative selection:bg-violet-500/30 selection:text-violet-200">
      
      {/* Background radial meshes & grids */}
      <div className="absolute inset-0 bg-grid-pattern opacity-30 pointer-events-none" />
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-violet-600/10 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-[600px] h-[600px] bg-blue-600/5 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-10 w-[500px] h-[500px] bg-fuchsia-600/5 rounded-full blur-[150px] pointer-events-none" />

      {/* Abstract Background elements */}
      <motion.div 
        animate={{ y: [0, -15, 0], rotate: [0, 5, 0] }}
        transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
        className="absolute top-[12%] left-[4%] opacity-20 pointer-events-none text-violet-500 hidden xl:block z-0"
      >
        <svg className="w-16 h-16" fill="none" stroke="currentColor" strokeWidth="1" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0l-7.5-4.615a2.25 2.25 0 01-1.07-1.916V6.75" />
        </svg>
      </motion.div>

      <motion.div 
        animate={{ y: [0, 15, 0], rotate: [0, -5, 0] }}
        transition={{ repeat: Infinity, duration: 7, ease: "easeInOut" }}
        className="absolute top-[28%] right-[4%] opacity-25 pointer-events-none text-indigo-500 hidden xl:block z-0"
      >
        <svg className="w-20 h-20" fill="none" stroke="currentColor" strokeWidth="1" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
        </svg>
      </motion.div>

      <motion.div 
        animate={{ y: [0, -20, 0], x: [0, 10, 0] }}
        transition={{ repeat: Infinity, duration: 9, ease: "easeInOut" }}
        className="absolute bottom-[40%] left-[2%] opacity-30 pointer-events-none bg-slate-900/50 border border-white/5 p-3 rounded-xl font-mono text-[9px] text-violet-300 hidden lg:block backdrop-blur-sm z-0"
      >
        <p className="text-slate-500">// OVO AI Vector Embedding Index</p>
        <p className="text-emerald-400">"message_id": "msg_90412"</p>
        <p className="text-violet-400">"vector_emb": [0.0142, -0.9251, 0.4412]</p>
        <p className="text-pink-400">"sec_tag": "aes_256_enc"</p>
        <p className="text-blue-400">"rerank_score": 0.985</p>
      </motion.div>

      <div className="absolute top-[22%] left-[45%] w-[120px] h-[120px] rounded-full border border-white/5 border-t-violet-500/25 animate-spin pointer-events-none opacity-40 z-0" style={{ animationDuration: '20s' }} />



      {/* ── NAVBAR ──────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 w-full border-b border-white/5 bg-[#030712]/60 backdrop-blur-xl transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-xl bg-gradient-premium flex items-center justify-center shadow-lg shadow-violet-500/20 group-hover:scale-105 transition-transform duration-200">
                <Sparkles className="w-4.5 h-4.5 text-white" />
              </div>
              <span className="font-bold tracking-tight text-lg bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-slate-400 font-mono">
                OVO.AI
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-6">
              <a href="#features" className="text-xs font-semibold text-slate-400 hover:text-slate-100 transition-colors">Features</a>
              <a href="#how-it-works" className="text-xs font-semibold text-slate-400 hover:text-slate-100 transition-colors">How It Works</a>
              <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 cursor-not-allowed">
                Pricing
                <span className="text-[9px] bg-white/5 border border-white/10 text-violet-400 px-1.5 py-0.25 rounded-md font-mono scale-90">Soon</span>
              </span>
              <a href="#contact" className="text-xs font-semibold text-slate-400 hover:text-slate-100 transition-colors">Contact</a>
            </nav>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <button 
              onClick={handleAuthRedirect} 
              className="text-xs font-semibold text-slate-300 hover:text-white px-4 py-2 hover:bg-white/5 rounded-xl transition-all"
            >
              Sign In
            </button>
            <button 
              onClick={handleAuthRedirect} 
              className="text-xs font-bold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 shadow-md shadow-violet-500/20 px-4 py-2.5 rounded-xl hover:scale-[1.02] transition-all"
            >
              Get Started
            </button>
          </div>

          {/* Mobile hamburger */}
          <button 
            className="md:hidden p-2 text-slate-400 hover:text-white"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Navigation Drawer */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-b border-white/5 bg-[#030712]/95 backdrop-blur-2xl overflow-hidden"
            >
              <div className="px-4 pt-2 pb-6 space-y-4 flex flex-col">
                <a href="#features" onClick={() => setMobileMenuOpen(false)} className="text-sm font-semibold text-slate-400 hover:text-slate-100 transition py-1">Features</a>
                <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)} className="text-sm font-semibold text-slate-400 hover:text-slate-100 transition py-1">How It Works</a>
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-500 py-1">
                  Pricing <span className="text-[9px] bg-white/5 border border-white/10 text-violet-400 px-1.5 py-0.25 rounded-md font-mono">Coming Soon</span>
                </div>
                <a href="#contact" onClick={() => setMobileMenuOpen(false)} className="text-sm font-semibold text-slate-400 hover:text-slate-100 transition py-1">Contact</a>
                
                <div className="pt-4 border-t border-white/5 flex flex-col gap-3">
                  <button 
                    onClick={() => { setMobileMenuOpen(false); handleAuthRedirect(); }} 
                    className="w-full text-center text-sm font-semibold text-slate-300 py-2.5 rounded-xl border border-white/5 bg-white/5"
                  >
                    Sign In
                  </button>
                  <button 
                    onClick={() => { setMobileMenuOpen(false); handleAuthRedirect(); }} 
                    className="w-full text-center text-sm font-bold text-white py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 shadow"
                  >
                    Get Started Free
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* ── HERO SECTION ────────────────────────────────────────────────────── */}
      <section 
        ref={heroRef}
        className="relative pt-16 pb-20 md:pt-28 md:pb-32 overflow-hidden flex flex-col items-center text-center px-4 max-w-7xl mx-auto"
        style={{
          background: 'radial-gradient(1000px circle at var(--mouse-x, 50%) var(--mouse-y, 20%), rgba(124, 58, 237, 0.05) 0%, transparent 60%)'
        }}
      >
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-violet-500/20 bg-violet-500/5 text-violet-400 text-xs font-semibold mb-6 shadow-sm shadow-violet-500/5"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Supercharged Gmail Platform</span>
        </motion.div>

        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-4xl sm:text-5xl md:text-7xl font-extrabold tracking-tight max-w-4xl bg-clip-text text-transparent bg-gradient-to-b from-white via-slate-100 to-slate-400 leading-[1.1] mb-6"
        >
          Your Gmail. <br className="sm:hidden" />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-violet-400 via-indigo-300 to-cyan-300">
            Supercharged by AI.
          </span>
        </motion.h1>

        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-slate-400 text-sm sm:text-base md:text-lg max-w-2xl leading-relaxed mb-10"
        >
          Connect your inbox, summarize conversations, draft replies, organize emails, and chat with your email history using AI. Built for high-growth startups and modern teams.
        </motion.p>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-col sm:flex-row gap-4 justify-center items-center w-full max-w-xs sm:max-w-md mb-16 relative z-10"
        >
          <button 
            onClick={handleAuthRedirect}
            className="w-full sm:w-auto px-8 py-4 rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white font-bold text-sm shadow-lg shadow-violet-500/30 flex items-center justify-center gap-2 hover:scale-[1.02] transition-all group cursor-pointer"
          >
            Get Started Free
            <ArrowRight className="w-4.5 h-4.5 group-hover:translate-x-1 transition-transform" />
          </button>
          <a 
            href="#showcase"
            className="w-full sm:w-auto px-8 py-4 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:text-white font-semibold text-sm hover:bg-white/10 hover:border-white/20 transition-all flex items-center justify-center gap-2"
          >
            <Play className="w-4 h-4 fill-current text-slate-400 group-hover:text-white" />
            Watch Demo
          </a>
        </motion.div>

        {/* Hero Interactive Product Preview */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="w-full max-w-5xl rounded-2xl border border-white/5 bg-[#0b0f19]/80 backdrop-blur-xl p-4 sm:p-6 shadow-2xl relative"
        >
          {/* Subtle glow border */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-violet-500/10 via-indigo-500/5 to-cyan-500/10 opacity-30 blur-xl pointer-events-none" />

          {/* Window Header */}
          <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-rose-500/40" />
              <div className="w-3 h-3 rounded-full bg-amber-500/40" />
              <div className="w-3 h-3 rounded-full bg-emerald-500/40" />
            </div>
            <div className="text-[10px] text-slate-500 font-mono tracking-wider bg-white/5 px-3 py-1 rounded-md border border-white/5">
              OVO-INTELLIGENCE-WORKSPACE.v1
            </div>
            <div className="w-16" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-left">
            {/* Sidebar list mock */}
            <div className="lg:col-span-4 space-y-3 hidden sm:block border-r border-white/5 pr-4">
              <div className="text-[10px] font-bold text-slate-500 tracking-wider mb-2 uppercase">Your Smart Feed</div>
              {[
                { from: 'NVIDIA AI Billing', subject: 'Invoice #NV-92048', time: '10m ago', cat: 'Finance' },
                { from: 'Vercel Deployments', subject: 'Production build successful', time: '2h ago', cat: 'Work' },
                { from: 'Gemini Generative API', subject: 'New model updates live', time: '1d ago', cat: 'Newsletter' }
              ].map((mail, i) => (
                <div 
                  key={i} 
                  className={`p-3 rounded-xl border transition-all cursor-pointer ${i === 0 ? 'bg-white/5 border-violet-500/30' : 'bg-transparent border-white/5 hover:bg-white/5'}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-slate-200">{mail.from}</span>
                    <span className="text-[9px] text-slate-500">{mail.time}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 truncate mb-1.5">{mail.subject}</div>
                  <span className={`text-[9px] px-2 py-0.5 rounded-full font-semibold border ${
                    mail.cat === 'Finance' ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400' :
                    mail.cat === 'Work' ? 'border-violet-500/20 bg-violet-500/10 text-violet-400' :
                    'border-amber-500/20 bg-amber-500/10 text-amber-400'
                  }`}>
                    {mail.cat}
                  </span>
                </div>
              ))}
            </div>

            {/* Email Detail Mock */}
            <div className="lg:col-span-8 space-y-4">
              <div className="p-4 rounded-xl border border-white/5 bg-slate-950/40 relative overflow-hidden">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-xs font-bold text-slate-300">NVIDIA NIM Cloud Services</h3>
                    <p className="text-[10px] text-slate-500">To: indra@ovo.ai</p>
                  </div>
                  <span className="text-[10px] text-slate-500">June 18, 2026</span>
                </div>
                <h2 className="text-sm font-bold text-slate-200 mb-2">Notice: Billing Statement for May 2026</h2>
                <p className="text-xs text-slate-400 leading-relaxed mb-3">
                  Your billing statement for the period of May 1 to May 31, 2026 is now available. The total charge of <strong className="text-white">$450.00</strong> will be debited from your registered account ending in *8041...
                </p>

                {/* AI Summary Card (overlaying/floating look) */}
                <div className="mt-4 p-3.5 rounded-xl border border-violet-500/20 bg-violet-950/20 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-violet-500/10 rounded-full blur-xl pointer-events-none" />
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-violet-400 animate-pulse" />
                    <span className="text-xs font-bold text-violet-300">OVO AI Summary</span>
                  </div>
                  <ul className="text-xs text-slate-300 space-y-1 font-sans list-disc list-inside">
                    <li>May billing period invoice amount is <strong className="text-violet-300">$450.00</strong>.</li>
                    <li>Funds will be automatically debited. No manual intervention required.</li>
                    <li>No past due or overdue charges listed.</li>
                  </ul>
                </div>
              </div>

              {/* Chat simulation */}
              <div className="p-4 rounded-xl border border-white/5 bg-slate-950/40 relative">
                <div className="flex gap-2.5 items-start mb-3">
                  <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-[10px] text-white">U</div>
                  <div className="bg-white/5 border border-white/10 px-3 py-1.5 rounded-2xl text-xs text-slate-300 max-w-[85%]">
                    Do I have any invoices or fees due for NVIDIA?
                  </div>
                </div>

                <div className="flex gap-2.5 items-start">
                  <div className="w-6 h-6 rounded-full bg-gradient-premium flex items-center justify-center text-[10px] text-white">
                    <Sparkles className="w-3 h-3 text-white" />
                  </div>
                  <div className="bg-violet-950/10 border border-violet-500/10 px-3.5 py-2 rounded-2xl text-xs text-slate-300 max-w-[85%] relative">
                    <div className="absolute top-0 right-0 w-12 h-12 bg-indigo-500/5 rounded-full blur-lg pointer-events-none" />
                    <p className="mb-2 leading-relaxed">
                      Yes, you have one pending statement from **NVIDIA NIM Cloud Services** for the amount of **$450.00**, which will be debited automatically. There are no overdue invoices.
                    </p>
                    <div className="text-[10px] text-violet-400/80 font-bold border-t border-violet-500/10 pt-1.5 flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      Cited Source: nvidia_notice_may26.eml
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ── TRUST SECTION ───────────────────────────────────────────────────── */}
      <section className="border-y border-white/5 bg-white/[0.01] py-12">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-xs font-semibold text-slate-500 tracking-widest uppercase mb-8">
            POWERED BY ENTERPRISE-GRADE INFRASTRUCTURE
          </p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6 items-center justify-items-center opacity-70">
            {[
              { name: 'Gmail API Powered', desc: 'Secure Integration' },
              { name: 'Gemini 2.0 Flash', desc: 'SOTA Reasoning' },
              { name: 'NVIDIA NIM', desc: '10x Faster Reranking' },
              { name: 'Supabase Vector', desc: 'Encrypted Embeddings' },
              { name: 'OAuth 2.0 Secure', desc: 'Google Verified' }
            ].map((tech, i) => (
              <div 
                key={i} 
                className="flex flex-col items-center justify-center p-3 rounded-xl border border-white/5 bg-[#070b13] hover:border-violet-500/20 transition-all duration-300 w-full max-w-[180px] hover:scale-105"
              >
                <div className="text-xs font-bold text-slate-200 tracking-tight">{tech.name}</div>
                <div className="text-[9px] text-violet-400 font-mono mt-0.5">{tech.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── INTERACTIVE PLAYGROUND SECTION ───────────────────────────────────── */}
      <section className="py-20 border-b border-white/5 bg-slate-900/10 relative overflow-hidden">
        {/* Abstract floating nodes inside playground */}
        <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none" />
        <div className="absolute top-10 right-10 w-72 h-72 bg-violet-500/5 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-10 left-10 w-72 h-72 bg-blue-500/5 rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-violet-500/20 bg-violet-500/5 text-violet-400 text-xs font-semibold mb-4">
              <Zap className="w-3.5 h-3.5" />
              <span>Interactive Simulator</span>
            </div>
            <h3 className="text-2xl sm:text-4xl font-extrabold tracking-tight mb-4 text-white text-center">
              Try OVO's AI Engine Sandbox
            </h3>
            <p className="text-slate-400 text-xs sm:text-sm leading-relaxed text-center">
              Query our simulated semantic inbox index. Click a preset prompt or type your own, and watch our pipeline process and stream back Gemini responses.
            </p>
          </div>

          <div className="rounded-2xl border border-white/5 bg-[#0b0f19]/80 backdrop-blur-xl p-5 sm:p-6 shadow-2xl relative">
            {/* Input sandbox controls */}
            <div className="flex flex-col gap-4 mb-6">
              <div className="flex flex-wrap gap-2">
                {[
                  { label: '💸 Scans for billings', query: 'Do I have any invoices or fees due for NVIDIA?' },
                  { label: '🚀 Draft customer apology', query: 'Draft a polite customer apology for delay' },
                  { label: '🏴‍☠️ Resign in Pirate tone', query: 'Draft a resignation email in Pirate tone' }
                ].map((pill, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setSandboxInput(pill.query)
                      runSandboxSimulation(pill.query)
                    }}
                    className="px-3 py-1.5 rounded-lg border border-white/5 bg-white/5 text-[11px] font-semibold text-slate-300 hover:bg-white/10 hover:border-violet-500/30 transition-all cursor-pointer"
                  >
                    {pill.label}
                  </button>
                ))}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ask OVO's AI about your simulated inbox (e.g. 'Draft a pirate resignation letter')..."
                  value={sandboxInput}
                  onChange={(e) => setSandboxInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') runSandboxSimulation(sandboxInput)
                  }}
                  className="flex-1 px-4 py-3 bg-[#030712] border border-white/5 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-violet-500/50 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => runSandboxSimulation(sandboxInput)}
                  disabled={isSandboxRunning || !sandboxInput.trim()}
                  className="px-5 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs shadow-md shadow-violet-500/10 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Run
                </button>
              </div>
            </div>

            {/* Sandbox Console Output Display */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start font-mono text-left">
              
              {/* Step Logs Column */}
              <div className="md:col-span-5 space-y-2 p-4 rounded-xl border border-white/5 bg-slate-950/50 min-h-[160px] text-[10px] text-slate-400">
                <div className="text-[9px] font-bold text-slate-500 tracking-wider mb-2 uppercase select-none">
                  Pipeline Steps & Logs
                </div>
                {sandboxLogs.length === 0 && (
                  <div className="text-slate-500 italic select-none">Console idle. Input query and click Run to trigger pipeline.</div>
                )}
                {sandboxLogs.map((log, idx) => (
                  <motion.div
                    initial={{ opacity: 0, x: -5 }}
                    animate={{ opacity: 1, x: 0 }}
                    key={idx}
                    className="flex items-center gap-1.5 text-slate-300 leading-relaxed"
                  >
                    <span className="text-violet-400">⚡</span>
                    <span>{log}</span>
                  </motion.div>
                ))}
                {isSandboxRunning && sandboxLogs.length < 5 && (
                  <div className="flex items-center gap-1.5 text-slate-500 select-none">
                    <span className="animate-spin text-[11px]">⏳</span>
                    <span>Processing...</span>
                  </div>
                )}
              </div>

              {/* Streaming Output Column */}
              <div className="md:col-span-7 space-y-3 p-4 rounded-xl border border-white/5 bg-slate-950/50 min-h-[160px] text-[11px] relative">
                <div className="text-[9px] font-bold text-slate-500 tracking-wider uppercase select-none flex justify-between">
                  <span>Gemini Synthesis Response</span>
                  {isSandboxRunning && <span className="animate-pulse text-violet-400">Streaming</span>}
                </div>
                
                {typedSandboxResponse ? (
                  <div className="text-slate-200 whitespace-pre-wrap leading-relaxed">
                    {typedSandboxResponse}
                  </div>
                ) : (
                  !isSandboxRunning && (
                    <div className="text-slate-500 italic select-none">Waiting for simulation query...</div>
                  )
                )}

                {sandboxSource && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-[10px] text-violet-400/80 font-bold border-t border-violet-500/10 pt-2.5 flex items-center gap-1 mt-4 select-none"
                  >
                    <Lock className="w-3 h-3 text-violet-400" />
                    <span>Cited Source: {sandboxSource}</span>
                  </motion.div>
                )}
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES SECTION ────────────────────────────────────────────────── */}
      <section id="features" className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <h2 className="text-xs font-bold text-violet-400 tracking-wider uppercase mb-3">PRODUCT CAPABILITIES</h2>
          <h3 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight mb-5">
            Designed to eliminate repetitive email work.
          </h3>
          <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
            Harness advanced Large Language Models and semantic index reranking directly inside your inbox. Fast, contextual, and securely sandboxed.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              title: 'AI Email Summaries',
              desc: 'Convert massive threads and complex PDF attachments into bulleted briefings instantly, saving hours of digestion time.',
              icon: Mail
            },
            {
              title: 'Thread-Aware Replies',
              desc: 'Generate perfect replies matching your personal tone, automatically referencing previous chain responses and links.',
              icon: MessageSquare
            },
            {
              title: 'Email Categorization',
              desc: 'Auto-tag incoming emails into customizable categories (Finance, Work, Personal) with explanation logs.',
              icon: Tag
            },
            {
              title: 'AI Inbox Search',
              desc: 'Search your entire inbox using natural, semantic questions. No more hunting for exact keyword strings.',
              icon: Search
            },
            {
              title: 'RAG Chat Agent',
              desc: 'A persistent context-aware chat workspace. Chat directly with your email history, run calculations, and draft agendas.',
              icon: Zap
            },
            {
              title: 'Source Attribution',
              desc: 'Every AI response cites precise email source files. Audit generative answers instantly with clickable file references.',
              icon: Shield
            }
          ].map((feature, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.05 }}
              className="p-6 rounded-2xl border border-white/5 bg-[#0b0f19]/60 hover:bg-[#0b0f19] hover:border-violet-500/20 hover:shadow-xl hover:shadow-violet-500/5 hover:-translate-y-1 transition-all duration-300 group relative"
            >
              <div className="w-10 h-10 rounded-xl bg-violet-600/10 border border-violet-500/10 flex items-center justify-center text-violet-400 mb-5 group-hover:scale-110 transition-transform">
                <feature.icon className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-slate-200 mb-2">{feature.title}</h4>
              <p className="text-xs text-slate-400 leading-relaxed">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS SECTION ────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-24 border-t border-white/5 bg-[#030712]/40 relative">
        <div className="absolute top-1/2 left-1/2 w-[600px] h-[600px] -translate-x-1/2 -translate-y-1/2 bg-violet-600/5 rounded-full blur-[160px] pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-xs font-bold text-violet-400 tracking-wider uppercase mb-3">WORKFLOW</h2>
            <h3 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight mb-5">
              Sync and interact in 4 easy steps.
            </h3>
            <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
              We connect directly with Google Secure OAuth and handle your data with enterprise grade AES-256 encryption.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative z-10">
            {[
              { step: '01', title: 'Connect Gmail', desc: 'Securely link your Google account in one click via OAuth.' },
              { step: '02', title: 'Sync Inbox', desc: 'Our pipeline securely indexes your email headers and body text.' },
              { step: '03', title: 'AI Processing', desc: 'Gemini and NVIDIA models summarize, categorize, and build vectors.' },
              { step: '04', title: 'Chat & Search', desc: 'Interact with your history, generate drafts, and query details.' }
            ].map((step, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="flex flex-col p-6 rounded-2xl border border-white/5 bg-slate-900/40 backdrop-blur relative"
              >
                <div className="text-xs font-mono font-bold text-violet-400 mb-4">{step.step}</div>
                <h4 className="text-base font-bold text-slate-200 mb-2">{step.title}</h4>
                <p className="text-xs text-slate-400 leading-relaxed">{step.desc}</p>
                {i < 3 && (
                  <div className="hidden md:block absolute top-1/2 -right-4 w-8 h-px bg-gradient-to-r from-violet-500/30 to-transparent z-15" />
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRODUCT SHOWCASE ────────────────────────────────────────────────── */}
      <section id="showcase" className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-xs font-bold text-violet-400 tracking-wider uppercase mb-3">DASHBOARD DEMO</h2>
          <h3 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight mb-5">
            A command center for your communications.
          </h3>
          <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
            Click through the mock tabs below to preview the actual dashboard experience before connecting.
          </p>
        </div>

        {/* Showcase Tabs */}
        <div className="flex flex-wrap gap-2 justify-center mb-8 bg-white/5 p-1.5 rounded-xl border border-white/10 max-w-md mx-auto relative z-10">
          {[
            { id: 'inbox', label: 'Smart Inbox' },
            { id: 'summary', label: 'AI Summarizer' },
            { id: 'categories', label: 'Auto-Categories' },
            { id: 'chat', label: 'RAG Chat Agent' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveShowcaseTab(tab.id as any)}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeShowcaseTab === tab.id 
                  ? 'bg-violet-600 text-white shadow shadow-violet-500/20' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Viewport */}
        <div className="rounded-2xl border border-white/5 bg-[#0b0f19]/70 backdrop-blur p-6 min-h-[400px] shadow-2xl relative">
          <div className="absolute inset-0 bg-gradient-to-r from-violet-500/5 to-cyan-500/5 blur-xl pointer-events-none rounded-2xl" />
          
          <AnimatePresence mode="wait">
            {activeShowcaseTab === 'inbox' && (
              <motion.div
                key="inbox"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
                className="space-y-4"
              >
                <div className="flex justify-between items-center border-b border-white/5 pb-3">
                  <h4 className="text-sm font-bold text-slate-200">Smart Inbox Overview</h4>
                  <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-mono font-semibold">Active Sync</span>
                </div>
                <div className="space-y-3">
                  {[
                    { from: 'Supabase Alerts', sub: '[Database Alert] High CPU utilization on replica', cat: 'Notification', conf: '98% confidence' },
                    { from: 'LinkedIn Jobs', sub: 'New Job Recommendations for Staff Software Engineer', cat: 'Job', conf: '94% confidence' },
                    { from: 'Stripe Billings', sub: 'Invoice paid successfully #INV-820491', cat: 'Finance', conf: '99% confidence' }
                  ].map((item, idx) => (
                    <div key={idx} className="p-4 rounded-xl bg-slate-950/30 border border-white/5 hover:border-violet-500/20 transition-all flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold text-slate-200">{item.from}</span>
                          <span className="text-[9px] text-slate-500">• {item.conf}</span>
                        </div>
                        <p className="text-xs text-slate-400">{item.sub}</p>
                      </div>
                      <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border w-fit ${
                        item.cat === 'Finance' ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400' :
                        item.cat === 'Job' ? 'border-sky-500/20 bg-sky-500/10 text-sky-400' :
                        'border-rose-500/20 bg-rose-500/10 text-rose-400'
                      }`}>
                        {item.cat}
                      </span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {activeShowcaseTab === 'summary' && (
              <motion.div
                key="summary"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
                className="space-y-4"
              >
                <div className="flex justify-between items-center border-b border-white/5 pb-3">
                  <h4 className="text-sm font-bold text-slate-200">Interactive Thread Summaries</h4>
                  <span className="text-[10px] text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded border border-violet-500/20 font-mono font-semibold">Gemini 2.0 Flash</span>
                </div>
                <div className="p-5 rounded-xl border border-violet-500/20 bg-violet-950/10">
                  <div className="text-xs text-slate-400 mb-3 uppercase tracking-wider font-bold">Email Context</div>
                  <h5 className="text-xs font-bold text-slate-200 mb-1">From: Vercel Deployments</h5>
                  <p className="text-xs text-slate-400 mb-4">Subject: Action Required: Production Server Configuration Changes</p>
                  
                  <div className="h-px bg-white/5 mb-4" />
                  
                  <div className="flex items-center gap-2 mb-2 text-violet-300">
                    <Sparkles className="w-4 h-4 text-violet-400" />
                    <span className="text-xs font-bold">Generated Bullet Briefing</span>
                  </div>
                  <ul className="text-xs text-slate-300 space-y-2 list-disc list-inside">
                    <li>Vercel is upgrading build nodes to Node 20.</li>
                    <li>Legacy deployments using Node 16 will build with warnings starting July 1st.</li>
                    <li>Update your `package.json` configurations immediately to avoid deployment failures.</li>
                  </ul>
                </div>
              </motion.div>
            )}

            {activeShowcaseTab === 'categories' && (
              <motion.div
                key="categories"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
                className="space-y-4"
              >
                <div className="flex justify-between items-center border-b border-white/5 pb-3">
                  <h4 className="text-sm font-bold text-slate-200">AI Classification Logs</h4>
                  <span className="text-[10px] text-slate-500 font-mono">Real-time Tagging</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { category: 'Work', bg: 'border-violet-500/20 bg-violet-500/5 text-violet-400', reason: 'Contains project deployment references and workspace pull requests.' },
                    { category: 'Finance', bg: 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400', reason: 'Contains card billing updates and invoice receipts.' },
                    { category: 'Newsletter', bg: 'border-amber-500/20 bg-amber-500/5 text-amber-400', reason: 'Contains weekly AI tech briefings and product digest articles.' },
                    { category: 'Notification', bg: 'border-rose-500/20 bg-rose-500/5 text-rose-400', reason: 'Contains system CPU alerts and server status updates.' }
                  ].map((cat, idx) => (
                    <div key={idx} className="p-4 rounded-xl border border-white/5 bg-slate-950/20">
                      <span className={`inline-block text-[10px] px-2.5 py-0.5 rounded-full font-bold border mb-2.5 ${cat.bg}`}>
                        {cat.category}
                      </span>
                      <p className="text-xs text-slate-400 leading-relaxed font-sans">{cat.reason}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {activeShowcaseTab === 'chat' && (
              <motion.div
                key="chat"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
                className="space-y-4"
              >
                <div className="flex justify-between items-center border-b border-white/5 pb-3">
                  <h4 className="text-sm font-bold text-slate-200">Email History RAG Agent</h4>
                  <span className="text-[10px] text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded border border-violet-500/20 font-mono font-semibold">NVIDIA NIM Reranked</span>
                </div>
                <div className="space-y-3">
                  <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-300 w-fit max-w-[85%] self-end ml-auto">
                    List my recent client feedback summaries.
                  </div>
                  <div className="p-4 rounded-xl bg-violet-950/15 border border-violet-500/15 text-xs text-slate-300 max-w-[85%] space-y-2">
                    <p className="leading-relaxed">
                      I found 2 recent emails regarding client feedback:
                    </p>
                    <ul className="list-decimal list-inside space-y-1 text-slate-400">
                      <li><strong>Acme Corp:</strong> Requested darker headers in the landing page mockups.</li>
                      <li><strong>GlobalTech Inc:</strong> Confirmed approval of the final API deployment script.</li>
                    </ul>
                    <div className="text-[10px] text-violet-400 border-t border-violet-500/10 pt-2 flex flex-wrap gap-2">
                      <span className="bg-violet-950/50 border border-violet-500/20 px-2 py-0.5 rounded font-bold">acme_feedback.eml</span>
                      <span className="bg-violet-950/50 border border-violet-500/20 px-2 py-0.5 rounded font-bold">globaltech_api_approval.eml</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* ── BENEFITS SECTION ────────────────────────────────────────────────── */}
      <section className="py-20 border-y border-white/5 bg-white/[0.01]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
            {[
              { label: '10x Faster', desc: 'Email Processing Speed', val: 10, suffix: 'x' },
              { label: '95% Less', desc: 'Manual Inbox Work', val: 95, suffix: '%' },
              { label: 'Instant Search', desc: 'Natural Language Retrieve', val: 100, suffix: '%' },
              { label: 'Deep Context', desc: 'Thread-Level Understanding', val: 100, suffix: '%' }
            ].map((stat, i) => (
              <div key={i} className="p-6 rounded-2xl border border-white/5 bg-[#070b13] flex flex-col justify-center">
                <div className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-indigo-200 mb-2">
                  <AnimatedCounter value={stat.val} suffix={stat.suffix} />
                </div>
                <h4 className="text-sm font-bold text-slate-200 mb-1">{stat.label}</h4>
                <p className="text-xs text-slate-400">{stat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS SECTION ────────────────────────────────────────────── */}
      <section className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-xs font-bold text-violet-400 tracking-wider uppercase mb-3">TESTIMONIALS</h2>
          <h3 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight mb-5">
            What product builders are saying.
          </h3>
          <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
            Leading developers, product designers, and startup executives use OVO.AI to clear their email backlogs.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              quote: "OVO is literally Superhuman+Notion built on top of Gemini. The RAG agent is so good I can ask it about contract details from 3 years ago and it cites the exact invoice email instantly.",
              author: "Suresh",
              role: "Backend Engineer, Delloitee",
              avatarColor: "avatar-gradient-0"
            },
            {
              quote: "We connected our company inbox to OVO and cut manual triaging down to almost zero. Auto-categorization works with 98% accuracy. Absolutely crucial tool for startup operations.",
              author: "Sarah Chandan",
              role: "Head of Operations, ArcTech",
              avatarColor: "avatar-gradient-2"
            },
            {
              quote: "The draft composition matches my personal style perfectly. Usually, AI replies sound robotic, but the tone selection pill feature makes generated answers sound indistinguishable from my own writing.",
              author: "Markus Webb",
              role: "Staff Frontend Engineer, Mars Inc.",
              avatarColor: "avatar-gradient-4"
            }
          ].map((testi, i) => (
            <div 
              key={i} 
              className="p-6 rounded-2xl border border-white/5 bg-[#0b0f19]/60 flex flex-col justify-between"
            >
              <div>
                <div className="flex gap-1.5 mb-5 text-amber-400">
                  {[...Array(5)].map((_, idx) => (
                    <Star key={idx} className="w-4 h-4 fill-current" />
                  ))}
                </div>
                <p className="text-xs text-slate-300 leading-relaxed italic mb-6">"{testi.quote}"</p>
              </div>
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full ${testi.avatarColor} flex items-center justify-center text-xs text-white font-bold`}>
                  {testi.author.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-200">{testi.author}</div>
                  <div className="text-[10px] text-slate-500">{testi.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FAQ SECTION ─────────────────────────────────────────────────────── */}
      <section className="py-24 border-t border-white/5 bg-[#030712]/40 relative">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-xs font-bold text-violet-400 tracking-wider uppercase mb-3">FAQ</h2>
            <h3 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-5">Frequently Asked Questions</h3>
          </div>

          <div className="space-y-4">
            {[
              {
                q: "Is my Gmail secure?",
                a: "Absolutely. We access your Gmail strictly using official Google Secure OAuth and Gmail read-only/write APIs. Your credentials and tokens are encrypted with military-grade AES-256 standard and stored in a secure sandboxed vault."
              },
              {
                q: "How does AI access my emails?",
                a: "Our system performs vector indexing on email metadata and body text in real-time. When you trigger queries or summaries, relevant search indices are reranked using NVIDIA NIM Cross-Encoders and fed as context into the Gemini API. Your actual email data is never used to train global LLM models."
              },
              {
                q: "Can I disconnect anytime?",
                a: "Yes. You can instantly disconnect your Google accounts and delete all stored indexes and profile settings directly from your settings panel. This removes all database data permanently."
              },
              {
                q: "Does it support multiple accounts?",
                a: "Currently, our platform links one primary Gmail inbox per authenticated workspace. Multi-account routing and synchronization pipelines are on our upcoming product roadmap."
              },
              {
                q: "How is my data stored?",
                a: "Your data is stored in secure, encrypted Supabase PostgreSQL tables using pgvector modules. All database storage is subject to continuous penetration tests and OAuth validation checks."
              }
            ].map((faq, i) => (
              <div 
                key={i} 
                className="rounded-xl border border-white/5 bg-[#0b0f19]/80 overflow-hidden transition-all duration-200"
              >
                <button
                  onClick={() => setActiveFaq(activeFaq === i ? null : i)}
                  className="w-full text-left px-5 py-4 flex justify-between items-center text-slate-200 hover:text-white hover:bg-white/5 transition-all"
                >
                  <span className="text-xs sm:text-sm font-bold">{faq.q}</span>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${activeFaq === i ? 'rotate-180 text-violet-400' : ''}`} />
                </button>
                <AnimatePresence initial={false}>
                  {activeFaq === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="border-t border-white/5 bg-slate-950/20 px-5 py-4 text-xs text-slate-400 leading-relaxed"
                    >
                      {faq.a}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CONTACT US SECTION ──────────────────────────────────────────────── */}
      <section id="contact" className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          <div className="lg:col-span-5 space-y-6">
            <h2 className="text-xs font-bold text-violet-400 tracking-wider uppercase">GET IN TOUCH</h2>
            <h3 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
              Let us talk about email intelligence.
            </h3>
            <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
              Have questions about security, integration timelines, enterprise custom setups, or partner APIs? Drop us a line.
            </p>

            <div className="pt-6 space-y-4">
              <div className="flex items-center gap-3 text-xs text-slate-300">
                <div className="w-8 h-8 rounded-lg border border-white/5 bg-[#0b0f19] flex items-center justify-center text-violet-400">
                  <Mail className="w-4 h-4" />
                </div>
                <span>indra.nit@zohomail.in</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-300">
                <div className="w-8 h-8 rounded-lg border border-white/5 bg-[#0b0f19] flex items-center justify-center text-violet-400">
                  <LinkedinIcon className="w-4 h-4" />
                </div>
                <span>linkedin.com/in/indrasenareddybala</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-300">
                <div className="w-8 h-8 rounded-lg border border-white/5 bg-[#0b0f19] flex items-center justify-center text-violet-400">
                  <GithubIcon className="w-4 h-4" />
                </div>
                <span>github.com/Indra1806</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7">
            <div className="p-6 rounded-2xl border border-white/5 bg-[#0b0f19]/80 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 via-transparent to-transparent pointer-events-none" />
              
              <form onSubmit={handleContactSubmit} className="space-y-4 relative z-10">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Your Name</label>
                    <input 
                      type="text" 
                      required
                      placeholder="Indra"
                      value={contactForm.name}
                      onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                      className="w-full px-4 py-3 bg-[#030712] border border-white/5 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-violet-500 transition-colors"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Email Address</label>
                    <input 
                      type="email" 
                      required
                      placeholder="indra@example.com"
                      value={contactForm.email}
                      onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                      className="w-full px-4 py-3 bg-[#030712] border border-white/5 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-violet-500 transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Message</label>
                  <textarea 
                    rows={4}
                    required
                    placeholder="Hello, I would like to inquire about..."
                    value={contactForm.message}
                    onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                    className="w-full px-4 py-3 bg-[#030712] border border-white/5 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-violet-500 transition-colors resize-none"
                  />
                </div>

                <button 
                  type="submit" 
                  disabled={formSubmitted}
                  className="w-full py-3.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs shadow-md shadow-violet-500/25 transition-all flex items-center justify-center gap-2"
                >
                  {formSubmitted ? (
                    <>
                      <Check className="w-4 h-4" />
                      Message Sent Successfully!
                    </>
                  ) : (
                    'Send Message'
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* ── FINAL CTA SECTION ───────────────────────────────────────────────── */}
      <section className="py-24 border-t border-white/5 bg-gradient-to-b from-transparent to-violet-950/10 relative overflow-hidden text-center px-4">
        <div className="absolute top-1/2 left-1/2 w-[500px] h-[500px] -translate-x-1/2 -translate-y-1/2 bg-violet-600/5 rounded-full blur-[160px] pointer-events-none" />
        
        <div className="max-w-4xl mx-auto space-y-6 relative z-10">
          <h2 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white via-slate-100 to-slate-400 leading-[1.15]">
            Stop Managing Email. <br />
            Start Managing Outcomes.
          </h2>
          <p className="text-slate-400 text-xs sm:text-sm md:text-base max-w-lg mx-auto">
            Connect in 10 seconds. Free tier includes up to 1,000 smart email summarizations and RAG search queries.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row gap-4 justify-center items-center max-w-xs sm:max-w-md mx-auto">
            <button 
              onClick={handleAuthRedirect}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-violet-500/35 flex items-center justify-center gap-2 hover:scale-[1.02] transition-all"
            >
              Get Started Free
              <ArrowRight className="w-4 h-4" />
            </button>
            <button 
              onClick={handleAuthRedirect}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl border border-white/5 bg-white/5 text-slate-300 hover:text-white font-semibold text-xs hover:bg-white/10 hover:border-white/20 transition-all"
            >
              Sign In
            </button>
          </div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/5 bg-[#02050c] py-16 text-slate-400 relative z-10 text-left">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-2 md:grid-cols-5 gap-8">
          <div className="col-span-2 space-y-4 pr-0 md:pr-10">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-xl bg-gradient-premium flex items-center justify-center shadow-md shadow-violet-500/20">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold tracking-tight text-base text-white font-mono">
                OVO.ai
              </span>
            </Link>
            <p className="text-xs leading-relaxed text-slate-500">
              World-class Gmail orchestration and semantic vector reranking models designed for modern engineering teams.
            </p>
            <div className="flex items-center gap-3">
              <a href="/page.tsx" className="hover:text-white transition"><TwitterIcon className="w-4 h-4" /></a>
              <a href="https://linkedin.com/in/indrasenareddybala" className="hover:text-white transition"><LinkedinIcon className="w-4 h-4" /></a>
              <a href="https://github.com/indra1806" className="hover:text-white transition"><GithubIcon className="w-4 h-4" /></a>
            </div>
          </div>

          <div>
            <h5 className="text-[10px] font-bold text-slate-300 uppercase tracking-widest mb-4">Product</h5>
            <ul className="space-y-2.5 text-xs text-slate-500">
              <li><a href="#features" className="hover:text-slate-300 transition">Features</a></li>
              <li><span className="flex items-center gap-1.5 cursor-not-allowed">Security <Lock className="w-3 h-3 text-violet-500" /></span></li>
              <li><span className="flex items-center gap-1.5 cursor-not-allowed">Roadmap <Layers className="w-3 h-3 text-indigo-400" /></span></li>
            </ul>
          </div>

          <div>
            <h5 className="text-[10px] font-bold text-slate-300 uppercase tracking-widest mb-4">Company</h5>
            <ul className="space-y-2.5 text-xs text-slate-500">
              <li><a href=" " className="hover:text-slate-1800 transition">Home</a></li>
              <li><a href="#showcase" className="hover:text-slate-300 transition">About</a></li>
              <li><a href="#contact" className="hover:text-slate-300 transition">Contact</a></li>
            </ul>
          </div>

          <div>
            <h5 className="text-[10px] font-bold text-slate-300 uppercase tracking-widest mb-4">Resources</h5>
            <ul className="space-y-2.5 text-xs text-slate-500">
              <li><a href="https://github.com/Indra1806/Gmail-Intelligence-Platform-/blob/main/README.md" className="hover:text-white transition"><GithubIcon className="w-4 h-4" /></a></li>
              <li><a href="https://github.com" target="_blank" rel="noopener noreferrer" className="hover:text-slate-300 transition">GitHub</a></li>
            </ul>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 pt-8 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-slate-600">
          <div>© 2026 OVO.AI. All rights reserved.</div>
          <div className="flex gap-4">
            <span className="cursor-not-allowed">Privacy Policy</span>
            <span className="cursor-not-allowed">Terms of Service</span>
          </div>
        </div>
      </footer>

      {/* ── COOKIE CONSENT BANNER ───────────────────────────────────────────── */}
      <AnimatePresence>
        {showCookieConsent && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md z-50 p-4 rounded-xl border border-white/10 bg-slate-900/95 backdrop-blur-md shadow-2xl flex flex-col gap-3"
          >
            <div className="flex gap-2.5 items-start">
              <AlertCircle className="w-5 h-5 text-violet-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-slate-200">Cookie & Privacy Settings</h4>
                <p className="text-[11px] text-slate-400 leading-relaxed mt-1">
                  We use cookies and localStorage parameters to authenticate sessions, secure API connections, and save your theme configuration.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 text-[10px] font-bold pt-1">
              <button 
                onClick={() => handleCookieConsent(false)}
                className="px-3.5 py-1.5 rounded-lg border border-white/5 text-slate-400 hover:text-slate-200 hover:bg-white/5"
              >
                Decline
              </button>
              <button 
                onClick={() => handleCookieConsent(true)}
                className="px-4 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white"
              >
                Accept All
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 6-SECOND DELAYED SIGN IN/UP PROMPT POPUP ────────────────────────── */}
      <AnimatePresence>
        {showPromoPopup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-sm p-6 rounded-2xl border border-violet-500/20 bg-slate-900/90 backdrop-blur-xl shadow-2xl relative overflow-hidden flex flex-col items-center text-center"
            >
              {/* Glow accent */}
              <div className="absolute -top-12 -left-12 w-28 h-28 bg-violet-600/20 rounded-full blur-2xl pointer-events-none animate-pulse" />
              <div className="absolute -bottom-12 -right-12 w-28 h-28 bg-blue-600/20 rounded-full blur-2xl pointer-events-none animate-pulse" />

              <button 
                onClick={closePromoPopup}
                className="absolute top-3 right-3 text-slate-400 hover:text-white p-1 hover:bg-white/5 rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="w-12 h-12 rounded-xl bg-gradient-premium flex items-center justify-center shadow-lg shadow-violet-500/25 mb-4">
                <Sparkles className="w-6 h-6 text-white" />
              </div>

              <h4 className="text-sm font-bold text-slate-100 mb-1.5">Connect OVO AI</h4>
              <p className="text-xs text-slate-400 leading-relaxed mb-5 px-1">
                Supercharge your inbox with automated AI summarizing, replies, and RAG chat. Sign in with Google to get started in 10 seconds.
              </p>

              <button 
                onClick={() => { closePromoPopup(); handleAuthRedirect(); }}
                className="w-full flex items-center justify-center gap-2.5 py-3 rounded-xl bg-gradient-premium text-white font-bold text-xs hover:shadow-lg hover:shadow-violet-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M12.24 10.285V13.4h6.887C18.2 15.614 15.645 18 12.24 18c-3.86 0-7-3.14-7-7s3.14-7 7-7c1.7 0 3.3.6 4.6 1.8l2.4-2.4C17.3 1.7 14.9 1 12.24 1a10 10 0 00-10 10 10 10 0 0010 10c5.3 0 9.25-3.75 9.25-9.385 0-.6-.05-1.2-.16-1.73H12.24z" />
                </svg>
                Continue with Google
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  )
}
