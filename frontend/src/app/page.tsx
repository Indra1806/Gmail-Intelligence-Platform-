'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { 
  Inbox, 
  Send, 
  Sparkles, 
  RefreshCw, 
  Tag, 
  MessageSquare, 
  PenTool, 
  CheckCircle,
  Clock,
  ExternalLink,
  SendHorizontal,
  Sun,
  Moon,
  Monitor,
  Search,
  Menu,
  X,
  LogOut,
  ChevronLeft,
  Plus,
  Zap,
  User
} from 'lucide-react'
import { 
  fetchThreads, 
  fetchThreadDetails, 
  composeEmail, 
  replyThread, 
  queryChat, 
  createChatSession, 
  fetchChatSessions, 
  fetchChatMessages, 
  triggerSync 
} from '@/lib/api'
import { useAppStore, Email, Thread } from '@/lib/store'

// ─── Helpers ────────────────────────────────────────────────────────────────

function getInitials(email: string | null): string {
  if (!email) return '?'
  const local = email.split('@')[0]
  const parts = local.split(/[._\-+]/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return local.slice(0, 2).toUpperCase()
}

function getAvatarClass(email: string | null): string {
  if (!email) return 'avatar-gradient-0'
  const idx = email.charCodeAt(0) % 5
  return `avatar-gradient-${idx}`
}

function getUsername(email: string | null): string {
  if (!email) return 'User'
  return email.split('@')[0].replace(/[._\-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

const CATEGORIES = ['All', 'Work', 'Finance', 'Newsletter', 'Job', 'Notification', 'Personal']

const CAT_COLORS: Record<string, { dot: string; bg: string; text: string; border: string; darkBg: string; darkText: string; darkBorder: string }> = {
  Work:         { dot: 'bg-violet-400',  bg: 'bg-violet-50',  text: 'text-violet-700', border: 'border-violet-200', darkBg: 'dark:bg-violet-950/30',  darkText: 'dark:text-violet-300',  darkBorder: 'dark:border-violet-500/30' },
  Finance:      { dot: 'bg-emerald-400', bg: 'bg-emerald-50', text: 'text-emerald-700',border: 'border-emerald-200',darkBg: 'dark:bg-emerald-950/30', darkText: 'dark:text-emerald-300', darkBorder: 'dark:border-emerald-500/30' },
  Newsletter:   { dot: 'bg-amber-400',   bg: 'bg-amber-50',   text: 'text-amber-700',  border: 'border-amber-200',  darkBg: 'dark:bg-amber-950/30',   darkText: 'dark:text-amber-300',   darkBorder: 'dark:border-amber-500/30' },
  Job:          { dot: 'bg-sky-400',     bg: 'bg-sky-50',     text: 'text-sky-700',    border: 'border-sky-200',    darkBg: 'dark:bg-sky-950/30',     darkText: 'dark:text-sky-300',     darkBorder: 'dark:border-sky-500/30' },
  Notification: { dot: 'bg-rose-400',    bg: 'bg-rose-50',    text: 'text-rose-700',   border: 'border-rose-200',   darkBg: 'dark:bg-rose-950/30',    darkText: 'dark:text-rose-300',    darkBorder: 'dark:border-rose-500/30' },
  Personal:     { dot: 'bg-indigo-400',  bg: 'bg-indigo-50',  text: 'text-indigo-700', border: 'border-indigo-200', darkBg: 'dark:bg-indigo-950/30',  darkText: 'dark:text-indigo-300',  darkBorder: 'dark:border-indigo-500/30' },
  All:          { dot: 'bg-blue-400',    bg: 'bg-blue-50',    text: 'text-blue-700',   border: 'border-blue-200',   darkBg: 'dark:bg-blue-950/30',    darkText: 'dark:text-blue-300',    darkBorder: 'dark:border-blue-500/30' },
}

function getCategoryStyle(cat?: string) {
  const c = CAT_COLORS[cat || ''] || CAT_COLORS.All
  return `${c.bg} ${c.text} ${c.border} ${c.darkBg} ${c.darkText} ${c.darkBorder}`
}

function getDot(cat?: string) {
  return (CAT_COLORS[cat || ''] || CAT_COLORS.All).dot
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { 
    userId, accountId, userEmail,
    selectedCategory, setCategory,
    isComposeOpen, setComposeOpen,
    activeThreadId, setActiveThread,
    activeSessionId, setActiveSession,
    setAuth, logout,
    theme, setTheme
  } = useAppStore()

  // UI state
  const [isMobileNavOpen, setMobileNavOpen] = useState(false)
  const [isThemeOpen, setIsThemeOpen] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [searchQuery, setSearchQuery]     = useState('')
  const [viewMode, setViewMode]           = useState<'inbox' | 'chat'>('inbox')
  const [mobilePaneView, setMobilePaneView] = useState<'list' | 'detail'>('list') // mobile inbox sub-view

  // Data state
  const [threads, setThreads]                   = useState<Thread[]>([])
  const [activeThread, setActiveThreadDetails]  = useState<{ thread: Thread; emails: Email[] } | null>(null)
  const [chatSessions, setChatSessions]         = useState<any[]>([])
  const [chatMessages, setChatMessages]         = useState<any[]>([])

  // Loading state
  const [isSyncing, setIsSyncing]           = useState(false)
  const [isThreadLoading, setIsThreadLoading] = useState(false)
  const [isChatLoading, setIsChatLoading]   = useState(false)
  const [isComposing, setIsComposing]       = useState(false)
  const [isReplying, setIsReplying]         = useState(false)

  // Input state
  const [composePrompt, setComposePrompt]   = useState('')
  const [composeTone, setComposeTone]       = useState<'Professional'|'Casual'|'Urgent'|'Apologetic'|'Persuasive'>('Professional')
  const [senderName, setSenderName]         = useState('')
  const [composedDraft, setComposedDraft]   = useState<{ subject: string; body: string } | null>(null)
  const [replyInstruction, setReplyInstruction] = useState('')
  const [replySuccess, setReplySuccess]     = useState('')
  const [chatQuery, setChatQuery]           = useState('')

  const chatBottomRef = useRef<HTMLDivElement>(null)

  // ── Auth ──────────────────────────────────────────────────────────────────

  const [mounted, setMounted]               = useState(false)
  const [isReturningUser, setIsReturningUser] = useState(false)

  useEffect(() => {
    // Mark as mounted so isReturningUser-dependent UI only renders client-side
    setMounted(true)
    setIsReturningUser(!!localStorage.getItem('repeatless_user_id'))

    const params = new URLSearchParams(window.location.search)
    const uId    = params.get('user_id')
    const accId  = params.get('account_id')
    const email  = params.get('email')

    if (uId && accId && email) {
      setAuth(uId, accId, email)
      localStorage.setItem('repeatless_user_id', uId)
      localStorage.setItem('repeatless_account_id', accId)
      localStorage.setItem('repeatless_email', email)
      window.history.replaceState({}, document.title, window.location.pathname)
    } else {
      const cu = localStorage.getItem('repeatless_user_id')
      const ca = localStorage.getItem('repeatless_account_id')
      const ce = localStorage.getItem('repeatless_email')
      if (cu && ca && ce) setAuth(cu, ca, ce)
    }
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('repeatless_user_id')
    localStorage.removeItem('repeatless_account_id')
    localStorage.removeItem('repeatless_email')
    logout()
  }

  // ── Theme ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    const root = document.documentElement
    const apply = (t: 'light' | 'dark' | 'system') => {
      root.classList.remove('light', 'dark')
      if (t === 'system') {
        root.classList.add(window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      } else { root.classList.add(t) }
    }
    apply(theme)
    if (theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)')
      const handler = () => apply('system')
      mq.addEventListener('change', handler)
      return () => mq.removeEventListener('change', handler)
    }
  }, [theme])

  // Lock body scroll when mobile nav open
  useEffect(() => {
    document.body.classList.toggle('nav-locked', isMobileNavOpen)
    return () => { document.body.classList.remove('nav-locked') }
  }, [isMobileNavOpen])

  // ── Data Fetching ─────────────────────────────────────────────────────────

  const loadThreads = useCallback(async () => {
    if (!accountId) return
    try {
      const data = await fetchThreads(accountId, selectedCategory)
      setThreads(data)
    } catch (err) { console.error(err) }
  }, [accountId, selectedCategory])

  const loadThreadDetails = useCallback(async (id: string) => {
    setIsThreadLoading(true)
    try {
      const data = await fetchThreadDetails(id)
      setActiveThreadDetails(data)
      if (data?.thread?.id && data.thread.id !== id) setActiveThread(data.thread.id)
    } catch (err) { console.error(err) }
    finally { setIsThreadLoading(false) }
  }, [])

  const loadChatSessions = useCallback(async () => {
    if (!userId) return
    try {
      const data = await fetchChatSessions(userId)
      setChatSessions(data)
      if (data.length > 0 && !activeSessionId) setActiveSession(data[0].id)
    } catch (err) { console.error(err) }
  }, [userId, activeSessionId])

  const loadChatMessages = useCallback(async (sid: string) => {
    try {
      const data = await fetchChatMessages(sid)
      setChatMessages(data)
    } catch (err) { console.error(err) }
  }, [])

  useEffect(() => { if (accountId) loadThreads() }, [accountId, selectedCategory])
  useEffect(() => { if (userId && viewMode === 'chat') loadChatSessions() }, [userId, viewMode])
  useEffect(() => { if (activeSessionId) loadChatMessages(activeSessionId) }, [activeSessionId])
  useEffect(() => { if (activeThreadId) loadThreadDetails(activeThreadId) }, [activeThreadId])
  useEffect(() => { chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [chatMessages])

  // ── Actions ───────────────────────────────────────────────────────────────

  const handleSync = async () => {
    setIsSyncing(true)
    try {
      await triggerSync(accountId!)
      await loadThreads()
      if (activeThreadId) await loadThreadDetails(activeThreadId)
    } catch (err) { console.error(err) }
    finally { setIsSyncing(false) }
  }

  const handleComposeSubmit = async () => {
    if (!composePrompt.trim()) return
    setIsComposing(true)
    try {
      const res = await composeEmail(composePrompt, composeTone, senderName)
      setComposedDraft(res)
    } catch (err) { console.error(err) }
    finally { setIsComposing(false) }
  }

  const handleReplySubmit = async () => {
    if (!replyInstruction.trim() || !activeThread) return
    setIsReplying(true)
    try {
      await replyThread(accountId!, activeThread.thread.id, replyInstruction)
      setReplySuccess('AI reply generated and sent successfully.')
      setReplyInstruction('')
      setTimeout(async () => {
        await loadThreadDetails(activeThread.thread.id)
        setReplySuccess('')
      }, 3000)
    } catch (err) { console.error(err) }
    finally { setIsReplying(false) }
  }

  const handleChatSubmit = async () => {
    if (!chatQuery.trim()) return
    let sid = activeSessionId
    if (!sid) {
      const sess = await createChatSession(userId!, 'New Chat')
      sid = sess.id
      setActiveSession(sid)
      setChatSessions(prev => [sess, ...prev])
    }
    const newMsg = { role: 'user', content: chatQuery, created_at: new Date() }
    setChatMessages(prev => [...prev, newMsg])
    setChatQuery('')
    setIsChatLoading(true)
    try {
      const res = await queryChat(chatQuery, sid!, userId!, accountId!)
      setChatMessages(prev => [...prev, {
        role: 'assistant', content: res.answer,
        source_emails: res.cited_sources, created_at: new Date()
      }])
    } catch (err) { console.error(err) }
    finally { setIsChatLoading(false) }
  }

  const handleCreateNewSession = async () => {
    try {
      const title = prompt('Session topic:') || 'General Query'
      const sess = await createChatSession(userId!, title)
      setActiveSession(sess.id)
      setChatSessions(prev => [sess, ...prev])
      setChatMessages([])
    } catch (err) { console.error(err) }
  }

  const openThread = (id: string) => {
    setActiveThread(id)
    setMobilePaneView('detail') // on mobile, switch to detail view
  }

  // ── Filtered threads ──────────────────────────────────────────────────────

  const filteredThreads = threads.filter(t => {
    const q = searchQuery.toLowerCase()
    return !q || t.subject?.toLowerCase().includes(q) || t.participant_emails?.some(e => e.toLowerCase().includes(q))
  })

  // ── LOGIN SCREEN ──────────────────────────────────────────────────────────

  if (!userId || !accountId) {
    return (
      <div className="flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans min-h-screen relative overflow-hidden bg-gradient-mesh justify-center items-center px-4">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-blue-500/10 blur-[120px] pointer-events-none animate-pulse-slow" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-pink-500/10 blur-[120px] pointer-events-none animate-pulse-slow" />

        <div className="w-full max-w-sm relative z-10 animate-fade-in-up">
          <div className="backdrop-blur-xl bg-white/70 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800/80 rounded-3xl p-8 shadow-2xl flex flex-col items-center text-center">

            {/* Logo */}
            <div className="w-16 h-16 rounded-2xl bg-gradient-premium flex items-center justify-center shadow-xl shadow-blue-500/25 mb-5">
              <Sparkles className="w-9 h-9 text-white" />
            </div>
            <h1 className="font-extrabold tracking-wider text-2xl bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-pink-500 mb-1">
              REPEATLESS.AI
            </h1>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-6">
              AI Email Automation Platform
            </p>

            <div className="h-px w-full bg-gradient-to-r from-transparent via-slate-300 dark:via-slate-700 to-transparent mb-6" />

            {/* Returning user welcome back — gated on mounted to avoid SSR/client mismatch */}
            {mounted && isReturningUser ? (
              <p className="text-xs text-slate-600 dark:text-slate-300 mb-5 leading-relaxed">
                👋 <strong>Welcome back!</strong> Sign in again to continue with your Gmail account.
              </p>
            ) : (
              <p className="text-xs text-slate-600 dark:text-slate-300 mb-5 leading-relaxed">
                Connect your Gmail to enable real-time AI classification, summarization, and semantic search.
              </p>
            )}

            {/* Sign In / Sign Up CTA */}
            <button
              id="google-signin-btn"
              onClick={() => {
                const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'
                window.location.href = `${apiBase}/auth/login?redirect_uri=${window.location.origin}`
              }}
              className="w-full flex items-center justify-center gap-3 px-6 py-3.5 rounded-xl bg-gradient-premium text-white font-semibold text-sm shadow-lg hover:shadow-blue-500/30 hover:scale-[1.02] transition-all duration-150 active:scale-[0.98] mb-3"
            >
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M12.24 10.285V13.4h6.887C18.2 15.614 15.645 18 12.24 18c-3.86 0-7-3.14-7-7s3.14-7 7-7c1.7 0 3.3.6 4.6 1.8l2.4-2.4C17.3 1.7 14.9 1 12.24 1a10 10 0 00-10 10 10 10 0 0010 10c5.3 0 9.25-3.75 9.25-9.385 0-.6-.05-1.2-.16-1.73H12.24z" />
              </svg>
              {mounted && isReturningUser ? 'Sign In with Google' : 'Get Started with Google'}
            </button>

            <p className="text-[10px] text-slate-400 dark:text-slate-500">
              {mounted && isReturningUser ? 'Not you?' : 'Already have an account?'}{' '}
              <button
                className="underline text-blue-500 hover:text-blue-600 transition"
                onClick={() => {
                  localStorage.clear()
                  window.location.reload()
                }}
              >
                {mounted && isReturningUser ? 'Sign in with another account' : 'Sign in instead'}
              </button>
            </p>

            {/* Architecture note */}
            <div className="mt-6 text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed w-full text-left bg-slate-100/70 dark:bg-slate-950/40 p-4 border border-slate-200 dark:border-slate-800/80 rounded-xl font-mono space-y-0.5">
              <div className="text-slate-700 dark:text-slate-300 font-bold mb-1.5">Stack:</div>
              <div>• Reranker: NVIDIA NIM Cross-Encoder</div>
              <div>• Vector DB: Supabase pgvector</div>
              <div>• LLM: Gemini 2.0 Flash</div>
              <div>• Encryption: AES-256</div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── SIDEBAR CONTENT (shared between desktop and mobile drawer) ────────────

  const SidebarContent = ({ onClose }: { onClose?: () => void }) => (
    <div className="flex flex-col h-full bg-white/60 dark:bg-slate-950/80 backdrop-blur-xl border-r border-slate-200 dark:border-slate-800/60">
      
      {/* Sidebar header (mobile has close button) */}
      <div className="flex items-center justify-between px-4 pt-5 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-premium flex items-center justify-center shadow-md shadow-blue-500/20">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold tracking-wider text-base bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-pink-500">
            REPEATLESS.AI
          </span>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-200/70 dark:hover:bg-slate-800/70 transition text-slate-500">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-5">
        
        {/* Compose button */}
        <button
          id="compose-btn"
          onClick={() => {
            setComposedDraft(null)
            setComposePrompt('')
            setComposeOpen(true)
            onClose?.()
          }}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-premium text-white font-semibold text-sm shadow-lg hover:shadow-blue-500/30 hover:scale-[1.01] transition-all active:scale-[0.99]"
        >
          <PenTool className="w-4 h-4" />
          Compose Assistant
        </button>

        {/* Views */}
        <div>
          <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 tracking-widest px-2 mb-2 uppercase">Views</p>
          <div className="space-y-0.5">
            {([
              { id: 'inbox', label: 'Inbox Workspace', Icon: Inbox },
              { id: 'chat',  label: 'AI RAG Chat',     Icon: MessageSquare },
            ] as const).map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => { setViewMode(id); onClose?.() }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  viewMode === id
                    ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-slate-800/50 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Categories (inbox only) */}
        {viewMode === 'inbox' && (
          <div>
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 tracking-widest px-2 mb-2 uppercase">Categories</p>
            <div className="space-y-0.5">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => {
                    setCategory(cat)
                    setActiveThread(null)
                    setActiveThreadDetails(null)
                    onClose?.()
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    selectedCategory === cat
                      ? 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100/60 dark:hover:bg-slate-800/30 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${getDot(cat)}`} />
                  {cat}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* User Profile Card (bottom of sidebar) */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800/60">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-white/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800/60">
          {/* Avatar */}
          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-md ${getAvatarClass(userEmail)}`}>
            {getInitials(userEmail)}
          </div>
          {/* Name & email */}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">{getUsername(userEmail)}</p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate font-mono">{userEmail}</p>
          </div>
          {/* Sign out */}
          <button
            id="signout-sidebar-btn"
            onClick={handleLogout}
            title="Sign Out"
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )

  // ── MAIN DASHBOARD ────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans min-h-screen h-screen overflow-hidden relative bg-gradient-mesh">

      {/* Background blobs */}
      <div className="absolute top-[-15%] left-[-5%] w-[45%] h-[45%] rounded-full bg-blue-500/8 blur-[100px] pointer-events-none animate-pulse-slow" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] rounded-full bg-pink-500/8 blur-[100px] pointer-events-none animate-pulse-slow" />

      {/* ── Mobile nav overlay ─────────────────────────────────────────────── */}
      {isMobileNavOpen && (
        <>
          <div className="mobile-sidebar-overlay lg:hidden" onClick={() => setMobileNavOpen(false)} />
          <div className="mobile-sidebar lg:hidden">
            <SidebarContent onClose={() => setMobileNavOpen(false)} />
          </div>
        </>
      )}

      {/* ── Top Header ─────────────────────────────────────────────────────── */}
      <header className="h-14 flex items-center justify-between px-4 border-b border-slate-200 dark:border-slate-800/80 backdrop-blur-xl bg-white/60 dark:bg-slate-900/60 sticky top-0 z-40 shrink-0">
        
        {/* Left: hamburger (mobile) + logo */}
        <div className="flex items-center gap-3">
          <button
            id="mobile-menu-btn"
            onClick={() => setMobileNavOpen(true)}
            className="lg:hidden p-2 rounded-lg hover:bg-slate-200/70 dark:hover:bg-slate-800/70 transition text-slate-600 dark:text-slate-300"
            aria-label="Open navigation"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="hidden lg:flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-premium flex items-center justify-center shadow-md shadow-blue-500/20">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold tracking-wider text-base bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-pink-500">
              REPEATLESS.AI
            </span>
          </div>
          {/* Mobile: just the logo icon */}
          <div className="lg:hidden flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-gradient-premium flex items-center justify-center shadow">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-sm bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-pink-500">
              REPEATLESS.AI
            </span>
          </div>

          {/* Live badge */}
          <span className="hidden sm:flex text-[9px] px-2 py-0.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-500 font-mono font-bold items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            LIVE
          </span>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-2">
          {/* Sync button — hidden on very small screens */}
          <button
            id="sync-btn"
            onClick={handleSync}
            disabled={isSyncing}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700/80 bg-white/50 dark:bg-slate-800/40 text-xs hover:bg-slate-100 dark:hover:bg-slate-800/90 transition disabled:opacity-50 text-slate-700 dark:text-slate-300 font-medium"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-blue-500 ${isSyncing ? 'animate-spin' : ''}`} />
            <span className="hidden md:inline">{isSyncing ? 'Syncing...' : 'Sync'}</span>
          </button>

          <div className="hidden sm:block h-5 w-px bg-slate-200 dark:bg-slate-800" />

          {/* Theme switcher */}
          <div className="relative">
            <button
              id="theme-btn"
              onClick={() => { setIsThemeOpen(!isThemeOpen); setIsProfileOpen(false) }}
              className="flex items-center justify-center p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/90 transition"
              aria-label="Toggle Theme"
            >
              {theme === 'light' ? <Sun className="w-4 h-4 text-amber-500" /> :
               theme === 'dark'  ? <Moon className="w-4 h-4 text-blue-400" /> :
                                   <Monitor className="w-4 h-4" />}
            </button>
            {isThemeOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsThemeOpen(false)} />
                <div className="absolute right-0 mt-2 w-32 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg p-1.5 shadow-xl z-50 animate-fade-in-up">
                  {([
                    { val: 'light' as const, label: 'Light', Icon: Sun, cls: 'text-amber-500' },
                    { val: 'dark'  as const, label: 'Dark',  Icon: Moon, cls: 'text-blue-400' },
                    { val: 'system'as const, label: 'System',Icon: Monitor, cls: '' },
                  ]).map(({ val, label, Icon, cls }) => (
                    <button
                      key={val}
                      onClick={() => { setTheme(val); setIsThemeOpen(false) }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition ${
                        theme === val ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <Icon className={`w-3.5 h-3.5 ${cls}`} />
                      {label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Profile button */}
          <div className="relative">
            <button
              id="profile-btn"
              onClick={() => { setIsProfileOpen(!isProfileOpen); setIsThemeOpen(false) }}
              className={`flex items-center gap-2 pl-1 pr-3 py-1 rounded-xl border transition ${
                isProfileOpen
                  ? 'border-blue-500/40 bg-blue-50/80 dark:bg-blue-950/30'
                  : 'border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800/80'
              }`}
            >
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-xs shadow ${getAvatarClass(userEmail)}`}>
                {getInitials(userEmail)}
              </div>
              <span className="hidden md:block text-xs font-semibold text-slate-700 dark:text-slate-200 max-w-[100px] truncate">
                {getUsername(userEmail)}
              </span>
            </button>

            {isProfileOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsProfileOpen(false)} />
                <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl shadow-2xl z-50 overflow-hidden animate-fade-in-up">
                  
                  {/* Profile header */}
                  <div className="p-5 bg-gradient-to-br from-blue-50 to-pink-50 dark:from-slate-900 dark:to-slate-950 border-b border-slate-200 dark:border-slate-800 flex flex-col items-center text-center gap-3">
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-lg ${getAvatarClass(userEmail)}`}>
                      {getInitials(userEmail)}
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 dark:text-slate-100 text-sm">{getUsername(userEmail)}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">{userEmail}</p>
                    </div>
                    <span className="text-[9px] px-2.5 py-0.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-500 font-mono font-bold flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Connected · Gmail
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="p-2">
                    <button
                      id="sync-profile-btn"
                      onClick={() => { handleSync(); setIsProfileOpen(false) }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-blue-500" />
                      Sync Inbox
                    </button>
                    <div className="h-px bg-slate-100 dark:bg-slate-800 my-1" />
                    <button
                      id="signout-profile-btn"
                      onClick={() => { handleLogout(); setIsProfileOpen(false) }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Sign Out
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── Main Layout ─────────────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden min-h-0">

        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex w-64 shrink-0 flex-col">
          <SidebarContent />
        </aside>

        {/* Content Area */}
        {viewMode === 'inbox' ? (
          /* ── INBOX: Three-Pane Layout ──────────────────────────────────── */
          <div className="flex-1 flex overflow-hidden min-h-0">

            {/* Thread List */}
            <div className={`flex flex-col w-full lg:w-96 border-r border-slate-200 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-950/30 shrink-0 ${
              mobilePaneView === 'detail' ? 'hidden lg:flex' : 'flex'
            }`}>
              {/* List header */}
              <div className="h-12 flex items-center justify-between px-4 border-b border-slate-200 dark:border-slate-800/60 shrink-0">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {selectedCategory} · {filteredThreads.length}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-200/60 dark:bg-slate-800 border border-slate-300/60 dark:border-slate-700/60 text-slate-500 dark:text-slate-400">
                  threads
                </span>
              </div>

              {/* Search */}
              <div className="p-2 border-b border-slate-200 dark:border-slate-800/60 shrink-0">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                  <input
                    id="thread-search"
                    type="text"
                    placeholder="Search subject or sender..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full text-xs pl-8 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition placeholder-slate-400 dark:placeholder-slate-600"
                  />
                </div>
              </div>

              {/* Thread list scroll */}
              <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
                {filteredThreads.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-10 text-center h-48">
                    {searchQuery ? <Search className="w-8 h-8 text-slate-300 dark:text-slate-700 mb-2" /> : <Inbox className="w-8 h-8 text-slate-300 dark:text-slate-700 mb-2" />}
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{searchQuery ? 'No matching threads' : 'Inbox is empty'}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{searchQuery ? 'Clear search or try another term' : 'Sync your inbox to load emails'}</p>
                  </div>
                ) : filteredThreads.map(thread => {
                  const active = activeThreadId === thread.id
                  return (
                    <button
                      key={thread.id}
                      onClick={() => openThread(thread.id)}
                      className={`w-full text-left p-3.5 rounded-xl border transition-all duration-150 group ${
                        active
                          ? 'bg-white dark:bg-slate-800 border-blue-500/40 shadow-sm dark:shadow-md dark:shadow-blue-500/5'
                          : 'bg-white/50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800/60 hover:bg-white dark:hover:bg-slate-800/60 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-sm'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-1 gap-2">
                        <span className="font-semibold text-xs text-slate-700 dark:text-slate-200 truncate">
                          {thread.participant_emails.join(', ').replace(/<[^>]*>/g, '')}
                        </span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 shrink-0 font-mono flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          {new Date(thread.last_message_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-300 truncate mb-1">{thread.subject}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed mb-2">
                        {thread.thread_summary || 'No summary available yet.'}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${getCategoryStyle(thread.category)}`}>
                          {thread.category || 'Uncategorized'}
                        </span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">{thread.message_count} msgs</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Thread Detail */}
            <div className={`flex-1 flex flex-col overflow-hidden min-h-0 ${
              mobilePaneView === 'list' ? 'hidden lg:flex' : 'flex'
            }`}>
              {/* Mobile back button */}
              <div className="lg:hidden flex items-center gap-2 px-4 py-2.5 border-b border-slate-200 dark:border-slate-800/60 bg-white/50 dark:bg-slate-900/40 shrink-0">
                <button
                  onClick={() => setMobilePaneView('list')}
                  className="flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
                >
                  <ChevronLeft className="w-4 h-4" />
                  All threads
                </button>
              </div>

              {isThreadLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-2 text-slate-500">
                  <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-blue-500" />
                  <p className="text-xs">Analyzing thread context...</p>
                </div>
              ) : activeThread ? (
                <div className="flex-1 flex flex-col overflow-hidden min-h-0">

                  {/* Thread header */}
                  <div className="p-5 border-b border-slate-200 dark:border-slate-800/80 bg-white/30 dark:bg-slate-900/20 backdrop-blur-xl shrink-0">
                    <div className="flex flex-wrap items-start justify-between gap-3 mb-1.5">
                      <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-snug flex-1">{activeThread.thread.subject}</h2>
                      <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border shrink-0 ${getCategoryStyle(activeThread.thread.category)}`}>
                        {activeThread.thread.category || 'Uncategorized'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate">
                      Participants: {activeThread.thread.participant_emails.join(', ')}
                    </p>
                  </div>

                  {/* Scroll area */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">

                    {/* AI thread summary */}
                    {activeThread.thread.thread_summary && (
                      <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-500/20 bg-blue-50/60 dark:bg-blue-950/15 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl" />
                        <div className="flex items-center gap-2 mb-2 text-blue-600 dark:text-blue-400">
                          <Sparkles className="w-3.5 h-3.5" />
                          <span className="text-[10px] font-bold uppercase tracking-wider">AI Synthesis</span>
                        </div>
                        <p className="text-xs text-blue-800 dark:text-blue-200 leading-relaxed">{activeThread.thread.thread_summary}</p>
                      </div>
                    )}

                    {/* Email cards */}
                    {activeThread.emails.map(email => (
                      <div key={email.id} className="rounded-xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900/50 overflow-hidden shadow-sm">
                        {/* Email header */}
                        <div className="px-4 py-3 bg-slate-50/80 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800/50 flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-sm ${getAvatarClass(email.from_email)}`}>
                              {email.from_email.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{email.from_email}</p>
                              <p className="text-[10px] text-slate-500 dark:text-slate-400">To: {email.to_emails?.join(', ')}</p>
                            </div>
                          </div>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                            {new Date(email.received_at).toLocaleString()}
                          </span>
                        </div>
                        {/* Body */}
                        <div className="p-4 text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line border-b border-slate-100 dark:border-slate-800/40">
                          {email.body_text}
                        </div>
                        {/* AI summary */}
                        {email.summary && (
                          <div className="px-4 py-2.5 bg-slate-50/60 dark:bg-slate-900/30 text-[11px] text-slate-500 dark:text-slate-400 flex items-start gap-2 border-b border-slate-100 dark:border-slate-800/20">
                            <Sparkles className="w-3 h-3 text-blue-500 shrink-0 mt-0.5" />
                            <span><strong>Summary:</strong> {email.summary}</span>
                          </div>
                        )}
                        {/* Category reasoning */}
                        {email.category_explanation && (
                          <div className="px-4 py-2 text-[10px] text-slate-400 dark:text-slate-500 flex items-center justify-between gap-2">
                            <span className="flex items-center gap-1.5"><Tag className="w-3 h-3" />{email.category_explanation}</span>
                            <span className="font-mono shrink-0">Confidence: {Math.round((email.category_confidence || 0) * 100)}%</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Reply bar */}
                  <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white/30 dark:bg-slate-900/20 backdrop-blur-xl shrink-0">
                    {/* Quick chips */}
                    <div className="flex gap-2 mb-3 overflow-x-auto scrollbar-none py-0.5">
                      {[
                        { label: '🤝 Accept & Schedule', text: 'Draft a professional acceptance and schedule a follow-up meeting' },
                        { label: '❌ Decline Politely',  text: 'Draft a polite refusal explaining our schedule is fully committed' },
                        { label: 'ℹ️ Request Details',   text: 'Request more technical details and timelines regarding this proposal' },
                      ].map(({ label, text }) => (
                        <button
                          key={label}
                          onClick={() => setReplyInstruction(text)}
                          className="text-[10px] font-semibold px-2.5 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 hover:border-blue-400 dark:hover:border-blue-500/60 hover:text-blue-600 dark:hover:text-blue-400 transition shrink-0"
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    {replySuccess && (
                      <div className="mb-3 px-3 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 shrink-0" />
                        {replySuccess}
                      </div>
                    )}
                    <div className="relative">
                      <textarea
                        value={replyInstruction}
                        onChange={e => setReplyInstruction(e.target.value)}
                        placeholder='Draft reply instruction (e.g. "Say yes to Friday deadline, mention team is ready")'
                        rows={2}
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-3 pr-12 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                      />
                      <button
                        onClick={handleReplySubmit}
                        disabled={isReplying || !replyInstruction.trim()}
                        className="absolute bottom-3 right-3 p-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition disabled:opacity-40"
                      >
                        {isReplying ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <SendHorizontal className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-8">
                  <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                    <Inbox className="w-7 h-7 text-slate-400 dark:text-slate-500" />
                  </div>
                  <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">No Thread Selected</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 max-w-xs">Pick a conversation from the left to view emails and AI summaries</p>
                </div>
              )}
            </div>
          </div>

        ) : (
          /* ── AI CHAT AGENT ─────────────────────────────────────────────── */
          <div className="flex-1 flex overflow-hidden min-h-0">

            {/* Chat sessions sidebar */}
            <div className="hidden md:flex w-60 border-r border-slate-200 dark:border-slate-800/60 flex-col bg-white/30 dark:bg-slate-950/20 shrink-0">
              <div className="h-12 flex items-center justify-between px-3 border-b border-slate-200 dark:border-slate-800/60 shrink-0">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Discussions</span>
                <button
                  id="new-chat-btn"
                  onClick={handleCreateNewSession}
                  className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/20 font-bold transition"
                >
                  <Plus className="w-3 h-3" /> New
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {chatSessions.map(session => (
                  <button
                    key={session.id}
                    onClick={() => setActiveSession(session.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-medium transition ${
                      activeSessionId === session.id
                        ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-sm'
                        : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100/70 dark:hover:bg-slate-800/30'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <MessageSquare className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      <span className="truncate">{session.title}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Chat main */}
            <div className="flex-1 flex flex-col overflow-hidden min-h-0 bg-slate-50/30 dark:bg-slate-950/10">
              
              {/* Chat header */}
              <div className="h-12 flex items-center justify-between px-5 border-b border-slate-200 dark:border-slate-800/60 bg-white/40 dark:bg-slate-900/20 shrink-0">
                <div className="flex items-center gap-2 text-xs">
                  <Sparkles className="w-4 h-4 text-blue-500" />
                  <span className="font-bold text-slate-700 dark:text-slate-200">AI Retrieval Assistant</span>
                  <span className="hidden sm:inline text-slate-300 dark:text-slate-600">•</span>
                  <span className="hidden sm:inline text-slate-400 dark:text-slate-500">Powered by Gemini 2.0 Flash + pgvector</span>
                </div>
                {/* Mobile: new chat button */}
                <button
                  onClick={handleCreateNewSession}
                  className="md:hidden flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 font-bold"
                >
                  <Plus className="w-3 h-3" /> New
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {chatMessages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 max-w-sm mx-auto">
                    <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500 mb-4 animate-pulse-slow">
                      <Zap className="w-6 h-6" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">Semantic Email Search</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-5">
                      Ask anything about your emails. The agent uses pgvector + NVIDIA NIM to find and synthesize answers.
                    </p>
                    <div className="w-full space-y-2">
                      {[
                        'Do I have any invoices or fees due for NVIDIA?',
                        'Summarize the project proposal specifications',
                        'Any important deadlines from this week?',
                      ].map(q => (
                        <button
                          key={q}
                          onClick={() => setChatQuery(q)}
                          className="w-full text-left p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/50 text-xs text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800/60 hover:border-blue-400/50 transition shadow-sm"
                        >
                          "{q}"
                        </button>
                      ))}
                    </div>
                  </div>
                ) : chatMessages.map((msg, i) => {
                  const isUser = msg.role === 'user'
                  return (
                    <div key={i} className={`flex gap-3 animate-fade-in-up ${isUser ? 'justify-end' : 'justify-start'}`}>
                      {!isUser && (
                        <div className="w-7 h-7 rounded-full bg-gradient-premium flex items-center justify-center shrink-0 mt-1">
                          <Sparkles className="w-3.5 h-3.5 text-white" />
                        </div>
                      )}
                      <div className={`max-w-[78%] p-4 text-xs leading-relaxed shadow-sm ${isUser ? 'chat-bubble-user' : 'chat-bubble-ai'}`}>
                        <p className="whitespace-pre-line">{msg.content}</p>
                        {/* Citations */}
                        {!isUser && msg.source_emails?.length > 0 && (
                          <div className="mt-3 pt-2.5 border-t border-slate-200/80 dark:border-slate-700/60 flex flex-wrap gap-1.5 items-center">
                            <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Sources:</span>
                            {msg.source_emails.map((eid: string) => (
                              <button
                                key={eid}
                                onClick={() => { setViewMode('inbox'); setActiveThread(eid) }}
                                className="px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900 text-[10px] text-blue-600 dark:text-blue-400 font-mono flex items-center gap-1 hover:border-blue-400/50 transition"
                              >
                                <ExternalLink className="w-2.5 h-2.5" />
                                {eid.substring(0, 8)}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      {isUser && (
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0 mt-1 ${getAvatarClass(userEmail)}`}>
                          {getInitials(userEmail)}
                        </div>
                      )}
                    </div>
                  )
                })}
                {isChatLoading && (
                  <div className="flex gap-3 justify-start animate-fade-in">
                    <div className="w-7 h-7 rounded-full bg-gradient-premium flex items-center justify-center shrink-0 mt-1">
                      <Sparkles className="w-3.5 h-3.5 text-white" />
                    </div>
                    <div className="chat-bubble-ai px-5 py-3.5 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 bg-blue-500 rounded-full dot-bounce-1" />
                      <span className="w-1.5 h-1.5 bg-blue-500 rounded-full dot-bounce-2" />
                      <span className="w-1.5 h-1.5 bg-blue-500 rounded-full dot-bounce-3" />
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 ml-1.5">Retrieving context...</span>
                    </div>
                  </div>
                )}
                <div ref={chatBottomRef} />
              </div>

              {/* Chat input */}
              <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/20 backdrop-blur-xl shrink-0">
                <div className="flex gap-2 items-end">
                  <div className="flex-1 relative">
                    <input
                      id="chat-input"
                      value={chatQuery}
                      onChange={e => setChatQuery(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleChatSubmit()}
                      placeholder='Ask about your emails (e.g. "Any NVIDIA invoices?")'
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 px-4 py-3 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/60 transition"
                    />
                  </div>
                  <button
                    id="chat-submit-btn"
                    onClick={handleChatSubmit}
                    disabled={isChatLoading || !chatQuery.trim()}
                    className="px-5 py-3 rounded-xl bg-gradient-premium hover:shadow-lg hover:shadow-blue-500/20 font-semibold text-xs text-white transition-all disabled:opacity-50 flex items-center gap-2 shadow-md"
                  >
                    <SendHorizontal className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Ask</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Compose Modal ─────────────────────────────────────────────────────── */}
      {isComposeOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full sm:max-w-xl sm:rounded-2xl rounded-t-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden">

            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/50 flex justify-between items-center">
              <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
                <PenTool className="w-4 h-4 text-blue-500" />
                <span className="font-bold text-sm">AI Compose Assistant</span>
              </div>
              <button
                onClick={() => setComposeOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-200/70 dark:hover:bg-slate-800/70 transition text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Tone selector pills */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Tone</label>
                <div className="flex flex-wrap gap-1.5">
                  {(['Professional', 'Casual', 'Urgent', 'Apologetic', 'Persuasive'] as const).map(tone => (
                    <button
                      key={tone}
                      onClick={() => setComposeTone(tone)}
                      className={`px-3 py-1.5 rounded-full text-[11px] font-semibold border transition ${
                        composeTone === tone
                          ? 'bg-blue-500 text-white border-blue-500 shadow-md shadow-blue-500/20'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-blue-400 dark:hover:border-blue-500/60'
                      }`}
                    >
                      {tone}
                    </button>
                  ))}
                </div>
              </div>

              {/* Signature */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Sign-off Name</label>
                <input
                  value={senderName}
                  onChange={e => setSenderName(e.target.value)}
                  placeholder={getUsername(userEmail)}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Instructions */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Draft Instructions</label>
                <textarea
                  value={composePrompt}
                  onChange={e => setComposePrompt(e.target.value)}
                  placeholder='e.g. "Tell AWS billing we had a test DB run overnight by mistake and request a refund"'
                  rows={3}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none placeholder-slate-400"
                />
              </div>

              <button
                onClick={handleComposeSubmit}
                disabled={isComposing || !composePrompt.trim()}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-premium font-bold text-xs text-white transition-all disabled:opacity-50 shadow-lg hover:shadow-blue-500/20"
              >
                {isComposing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <><Sparkles className="w-3.5 h-3.5" /> Generate Draft</>}
              </button>

              {composedDraft && (
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Subject</p>
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{composedDraft.subject}</p>
                  </div>
                  <div className="p-4">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Body</p>
                    <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line max-h-44 overflow-y-auto font-mono bg-white dark:bg-slate-900/60 p-3 rounded-lg border border-slate-200 dark:border-slate-800/40">
                      {composedDraft.body}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
