'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { 
  Inbox, 
  Send, 
  RefreshCw, 
  Tag, 
  MessageSquare, 
  PenTool, 
  CheckCircle,
  Check,
  Clock,
  ExternalLink,
  SendHorizontal,
  Search,
  Menu,
  X,
  LogOut,
  ChevronLeft,
  Plus,
  Zap,
  Sparkles,
} from 'lucide-react'

interface ChatSession {
  id: string
  user_id: string
  title: string | null
  created_at: string
}

interface ChatCitation {
  email_id?: string
  thread_id?: string
  subject?: string
  from_email?: string
  snippet?: string
}

interface ChatMessage {
  id?: string
  session_id?: string
  role: 'user' | 'assistant' | 'system'
  content: string
  created_at?: string | Date
  citations?: ChatCitation[]
  source_emails?: string[]
}
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
    theme
  } = useAppStore()

  // UI state
  const [isMobileNavOpen, setMobileNavOpen] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [searchQuery, setSearchQuery]     = useState('')
  const [viewMode, setViewMode]           = useState<'inbox' | 'chat'>('inbox')
  const [mobilePaneView, setMobilePaneView] = useState<'list' | 'detail'>('list') // mobile inbox sub-view
  const [copyFeedback, setCopyFeedback] = useState(false)

  // Data state
  const [threads, setThreads]                   = useState<Thread[]>([])
  const [activeThread, setActiveThreadDetails]  = useState<{ thread: Thread; emails: Email[] } | null>(null)
  const [chatSessions, setChatSessions]         = useState<ChatSession[]>([])
  const [chatMessages, setChatMessages]         = useState<ChatMessage[]>([])

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

  useEffect(() => {
    // Mark as mounted so UI only renders client-side
    Promise.resolve().then(() => setMounted(true))

    const params = new URLSearchParams(window.location.search)
    const uId    = params.get('user_id')
    const accId  = params.get('account_id')
    const email  = params.get('email')

    if (uId && accId && email) {
      setAuth(uId, accId, email)
      localStorage.setItem('OVO_user_id', uId)
      localStorage.setItem('OVO_account_id', accId)
      localStorage.setItem('OVO_email', email)
      window.history.replaceState({}, document.title, window.location.pathname)
    } else {
      const cu = localStorage.getItem('OVO_user_id')
      const ca = localStorage.getItem('OVO_account_id')
      const ce = localStorage.getItem('OVO_email')
      if (cu && ca && ce) {
        setAuth(cu, ca, ce)
      } else {
        // Not authenticated, redirect to landing page
        window.location.href = '/'
      }
    }
  }, [setAuth])

  const handleLogout = () => {
    localStorage.removeItem('OVO_user_id')
    localStorage.removeItem('OVO_account_id')
    localStorage.removeItem('OVO_email')
    logout()
    window.location.href = '/'
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
  }, [setActiveThread])

  const loadChatSessions = useCallback(async () => {
    if (!userId) return
    try {
      const data = await fetchChatSessions(userId)
      setChatSessions(data)
      if (data.length > 0 && !activeSessionId) setActiveSession(data[0].id)
    } catch (err) { console.error(err) }
  }, [userId, activeSessionId, setActiveSession])

  const loadChatMessages = useCallback(async (sid: string) => {
    try {
      const data = await fetchChatMessages(sid)
      setChatMessages(data)
    } catch (err) { console.error(err) }
  }, [])

  useEffect(() => {
    if (accountId) {
      Promise.resolve().then(() => loadThreads())
    }
  }, [accountId, selectedCategory, loadThreads])

  useEffect(() => {
    if (userId && viewMode === 'chat') {
      Promise.resolve().then(() => loadChatSessions())
    }
  }, [userId, viewMode, loadChatSessions])

  useEffect(() => {
    if (activeSessionId) {
      Promise.resolve().then(() => loadChatMessages(activeSessionId))
    }
  }, [activeSessionId, loadChatMessages])

  useEffect(() => {
    if (activeThreadId) {
      Promise.resolve().then(() => loadThreadDetails(activeThreadId))
    }
  }, [activeThreadId, loadThreadDetails])
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

  const handleCopyDraft = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopyFeedback(true)
    setTimeout(() => setCopyFeedback(false), 2000)
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
    const newMsg: ChatMessage = { role: 'user', content: chatQuery, created_at: new Date() }
    setChatMessages(prev => [...prev, newMsg])
    setChatQuery('')
    setIsChatLoading(true)
    try {
      const res = await queryChat(chatQuery, sid!, userId!, accountId!)
      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: res.answer,
        source_emails: res.cited_sources,
        created_at: new Date()
      }
      setChatMessages(prev => [...prev, assistantMsg])
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

  if (!mounted || !userId || !accountId) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neutral-950 text-white font-sans">
        <div className="flex flex-col items-center gap-5">
          <div className="relative w-12 h-12">
            <div className="absolute inset-0 border-4 border-indigo-500/20 rounded-full" />
            <div className="absolute inset-0 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="text-xs font-semibold tracking-wider text-neutral-400 uppercase">Loading OVO Workspace...</p>
        </div>
      </div>
    )
  }

  // ── SIDEBAR CONTENT ────────────────────────────────────────────────────────

  const renderSidebarContent = (onClose?: () => void) => (
    <div className="flex flex-col h-full bg-neutral-900/40 dark:bg-neutral-950/70 backdrop-blur-xl border-r border-neutral-800/40">
      
      {/* Sidebar Header */}
      <div className="flex items-center justify-between px-6 pt-6 pb-4">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="OVO Logo" className="w-8 h-8 rounded-xl object-contain shadow-lg shadow-indigo-500/10" />
          <span className="font-extrabold tracking-widest text-sm bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400 font-mono">
            OVO.AI
          </span>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-neutral-800/50 transition text-neutral-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-6 scrollbar-none">
        
        {/* Compose Button */}
        <button
          id="compose-btn"
          onClick={() => {
            setComposedDraft(null)
            setComposePrompt('')
            setComposeOpen(true)
            onClose?.()
          }}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-premium text-white font-bold text-xs shadow-lg hover:shadow-indigo-500/20 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer"
        >
          <PenTool className="w-3.5 h-3.5" />
          Compose Assistant
        </button>

        {/* Navigation Views */}
        <div>
          <p className="text-[10px] font-bold text-neutral-500 tracking-widest px-2.5 mb-2 uppercase">Views</p>
          <div className="space-y-1">
            {([
              { id: 'inbox', label: 'Smart Inbox', Icon: Inbox },
              { id: 'chat',  label: 'AI Chat RAG', Icon: MessageSquare },
            ] as const).map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => { setViewMode(id); onClose?.() }}
                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-semibold transition-all border cursor-pointer ${
                  viewMode === id
                    ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20 shadow-md shadow-indigo-500/5'
                    : 'text-neutral-400 border-transparent hover:bg-neutral-900/60 hover:text-neutral-200'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Categories Navigation */}
        {viewMode === 'inbox' && (
          <div>
            <p className="text-[10px] font-bold text-neutral-500 tracking-widest px-2.5 mb-2 uppercase">Inbox Tabs</p>
            <div className="space-y-1">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => {
                    setCategory(cat)
                    setActiveThread(null)
                    setActiveThreadDetails(null)
                    onClose?.()
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all border cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-neutral-900 border-neutral-800 text-neutral-200 shadow-sm'
                      : 'text-neutral-400 border-transparent hover:bg-neutral-900/30 hover:text-neutral-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${getDot(cat)}`} />
                    {cat}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Profile Bar */}
      <div className="p-4 border-t border-neutral-800/40">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-neutral-900/30 border border-neutral-800/40">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-md ${getAvatarClass(userEmail)}`}>
            {getInitials(userEmail)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-neutral-300 truncate">{getUsername(userEmail)}</p>
            <p className="text-[10px] text-neutral-500 truncate font-mono">{userEmail}</p>
          </div>
          <button
            id="signout-sidebar-btn"
            onClick={handleLogout}
            title="Sign Out"
            className="p-2 rounded-xl text-neutral-500 hover:text-rose-400 hover:bg-rose-500/5 transition cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )

  // ── MAIN DASHBOARD CONTAINER ────────────────────────────────────────────────

  return (
    <div className="flex flex-col bg-neutral-950 text-neutral-200 font-sans min-h-screen h-screen overflow-hidden relative bg-grid-pattern">

      {/* Mesh Glow Background */}
      <div className="absolute top-[-10%] left-[-5%] w-[45%] h-[45%] rounded-full bg-indigo-500/5 blur-[120px] pointer-events-none animate-pulse-slow" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] rounded-full bg-purple-500/5 blur-[120px] pointer-events-none animate-pulse-slow" />

      {/* Mobile Sidebar overlay */}
      {isMobileNavOpen && (
        <>
          <div className="mobile-sidebar-overlay lg:hidden" onClick={() => setMobileNavOpen(false)} />
          <div className="mobile-sidebar lg:hidden">
            {renderSidebarContent(() => setMobileNavOpen(false))}
          </div>
        </>
      )}

      {/* Top Navigation Header */}
      <header className="h-14 flex items-center justify-between px-6 border-b border-neutral-850 backdrop-blur-xl bg-neutral-950/60 sticky top-0 z-40 shrink-0">
        
        {/* Left: Mobile Trigger & OVO Brand */}
        <div className="flex items-center gap-4">
          <button
            id="mobile-menu-btn"
            onClick={() => setMobileNavOpen(true)}
            className="lg:hidden p-2 rounded-xl hover:bg-neutral-900 transition text-neutral-400 hover:text-white"
            aria-label="Open navigation"
          >
            <Menu className="w-4 h-4" />
          </button>
          
          <div className="hidden lg:flex items-center gap-3">
            <img src="/logo.png" alt="OVO Logo" className="w-7 h-7 rounded-xl object-contain shadow-md shadow-indigo-500/10" />
            <span className="font-extrabold tracking-widest text-xs bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400 font-mono">
              OVO.AI
            </span>
          </div>

          <div className="lg:hidden flex items-center gap-2">
            <img src="/logo.png" alt="OVO Logo" className="w-6 h-6 rounded-lg object-contain" />
            <span className="font-bold text-xs bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400 font-mono">
              OVO.AI
            </span>
          </div>

          <span className="flex text-[9px] px-2 py-0.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 font-mono font-bold items-center gap-1.5 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            SANDBOX ENGINE
          </span>
        </div>

        {/* Right: Sync & Utilities */}
        <div className="flex items-center gap-3">
          <button
            id="sync-btn"
            onClick={handleSync}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-800 bg-neutral-900/40 text-xs hover:bg-neutral-800 transition disabled:opacity-50 text-neutral-300 font-bold cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-indigo-400 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : 'Sync'}</span>
          </button>

          <div className="h-4 w-px bg-neutral-800" />

          {/* User Account Button */}
          <div className="relative">
            <button
              id="profile-btn"
              onClick={() => { setIsProfileOpen(!isProfileOpen) }}
              className={`flex items-center gap-2 pl-1 pr-3 py-1 rounded-xl border transition cursor-pointer ${
                isProfileOpen
                  ? 'border-indigo-500/40 bg-indigo-500/5'
                  : 'border-neutral-800 bg-neutral-900/40 hover:bg-neutral-800/80'
              }`}
            >
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-[10px] shadow ${getAvatarClass(userEmail)}`}>
                {getInitials(userEmail)}
              </div>
              <span className="hidden md:block text-[11px] font-semibold text-neutral-300 max-w-[100px] truncate">
                {getUsername(userEmail)}
              </span>
            </button>

            {isProfileOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsProfileOpen(false)} />
                <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-neutral-800 bg-neutral-900/90 backdrop-blur-xl shadow-2xl z-50 overflow-hidden animate-fade-in-up">
                  
                  {/* Dropdown Header */}
                  <div className="p-5 bg-neutral-950/40 border-b border-neutral-800 flex flex-col items-center text-center gap-3">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-lg ${getAvatarClass(userEmail)}`}>
                      {getInitials(userEmail)}
                    </div>
                    <div>
                      <p className="font-bold text-neutral-200 text-xs">{getUsername(userEmail)}</p>
                      <p className="text-[10px] text-neutral-500 font-mono mt-0.5">{userEmail}</p>
                    </div>
                    <span className="text-[9px] px-2.5 py-0.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 font-mono font-bold flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Connected Account
                    </span>
                  </div>

                  {/* Dropdown Actions */}
                  <div className="p-2">
                    <button
                      id="sync-profile-btn"
                      onClick={() => { handleSync(); setIsProfileOpen(false) }}
                      className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-neutral-300 hover:bg-neutral-800 transition cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-indigo-400" />
                      Sync Inbox
                    </button>
                    <div className="h-px bg-neutral-800 my-1" />
                    <button
                      id="signout-profile-btn"
                      onClick={() => { handleLogout(); setIsProfileOpen(false) }}
                      className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-950/20 transition cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5 text-rose-500" />
                      Sign Out
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── Main View Workspace ── */}
      <div className="flex-1 flex overflow-hidden min-h-0">

        {/* Sidebar Panel */}
        <aside className="hidden lg:flex w-64 shrink-0 flex-col">
          {renderSidebarContent()}
        </aside>

        {/* View Routing */}
        {viewMode === 'inbox' ? (
          
          /* ── THREE-PANE INBOX WORKSPACE ── */
          <div className="flex-1 flex overflow-hidden min-h-0">

            {/* Pane 1: Thread List */}
            <div className={`flex flex-col w-full lg:w-96 border-r border-neutral-800/40 bg-neutral-950/30 shrink-0 ${
              mobilePaneView === 'detail' ? 'hidden lg:flex' : 'flex'
            }`}>
              
              {/* Inbox Section Info */}
              <div className="h-12 flex items-center justify-between px-5 border-b border-neutral-800/40 shrink-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                  {selectedCategory} · {filteredThreads.length}
                </span>
                <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-neutral-900 border border-neutral-800 text-neutral-400 uppercase">
                  Workspace
                </span>
              </div>

              {/* Search Bar */}
              <div className="p-3 border-b border-neutral-800/40 shrink-0">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-neutral-500" />
                  <input
                    id="thread-search"
                    type="text"
                    placeholder="Search sender, subject..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-neutral-800 bg-neutral-900/30 text-neutral-200 focus:outline-none focus:border-indigo-500/50 transition placeholder-neutral-600"
                  />
                </div>
              </div>

              {/* Threads Scroll List */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-none">
                {filteredThreads.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-10 text-center h-48">
                    <Inbox className="w-8 h-8 text-neutral-700 mb-2" />
                    <p className="text-xs font-semibold text-neutral-400">No emails matched query</p>
                    <p className="text-[10px] text-neutral-500 mt-0.5">Connect your Gmail or click Sync</p>
                  </div>
                ) : filteredThreads.map(thread => {
                  const active = activeThreadId === thread.id
                  return (
                    <button
                      key={thread.id}
                      onClick={() => openThread(thread.id)}
                      className={`w-full text-left p-4 rounded-xl border transition-all duration-150 relative group cursor-pointer ${
                        active
                          ? 'bg-neutral-900/60 border-indigo-500/30 shadow-md shadow-indigo-500/5'
                          : 'bg-neutral-900/10 border-neutral-900 hover:bg-neutral-900/30 hover:border-neutral-800'
                      }`}
                    >
                      {/* Active Indicator bar */}
                      {active && <span className="absolute left-0 top-3 bottom-3 w-1 rounded-r-md bg-indigo-500 shadow-md shadow-indigo-500" />}
                      
                      <div className="flex justify-between items-start mb-1.5 gap-2">
                        <span className="font-bold text-xs text-neutral-300 truncate">
                          {thread.participant_emails.join(', ').replace(/<[^>]*>/g, '')}
                        </span>
                        <span className="text-[9px] text-neutral-500 shrink-0 font-mono flex items-center gap-1 font-bold">
                          <Clock className="w-2.5 h-2.5" />
                          {new Date(thread.last_message_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                      
                      <p className="text-xs font-bold text-neutral-200 truncate mb-1.5">{thread.subject}</p>
                      
                      <p className="text-[10px] text-neutral-400 line-clamp-2 leading-relaxed mb-3">
                        {thread.thread_summary || 'Synchronizing and synthesizing email context...'}
                      </p>

                      <div className="flex items-center justify-between">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${getCategoryStyle(thread.category)}`}>
                          {thread.category || 'Uncategorized'}
                        </span>
                        <span className="text-[9px] text-neutral-500 font-mono font-bold uppercase">{thread.message_count} messages</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Pane 2: Thread Detailed View */}
            <div className={`flex-1 flex flex-col overflow-hidden min-h-0 bg-neutral-950/20 ${
              mobilePaneView === 'list' ? 'hidden lg:flex' : 'flex'
            }`}>
              
              {/* Mobile return link */}
              <div className="lg:hidden flex items-center gap-2 px-5 py-3 border-b border-neutral-800/40 bg-neutral-950/60 shrink-0">
                <button
                  onClick={() => setMobilePaneView('list')}
                  className="flex items-center gap-1.5 text-xs font-bold text-indigo-400 hover:text-indigo-300"
                >
                  <ChevronLeft className="w-4 h-4" />
                  All discussions
                </button>
              </div>

              {isThreadLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 text-neutral-500">
                  <div className="relative w-8 h-8">
                    <div className="absolute inset-0 border-2 border-indigo-500/20 rounded-full" />
                    <div className="absolute inset-0 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Synthesizing thread...</p>
                </div>
              ) : activeThread ? (
                <div className="flex-1 flex flex-col overflow-hidden min-h-0">

                  {/* Detailed Thread Header */}
                  <div className="p-6 border-b border-neutral-800/40 backdrop-blur-xl bg-neutral-950/40 shrink-0">
                    <div className="flex flex-wrap items-start justify-between gap-4 mb-2">
                      <h2 className="text-base font-extrabold text-neutral-100 leading-snug flex-1">{activeThread.thread.subject}</h2>
                      <span className={`text-[9px] font-bold px-2.5 py-1 rounded-full border shrink-0 ${getCategoryStyle(activeThread.thread.category)}`}>
                        {activeThread.thread.category || 'Uncategorized'}
                      </span>
                    </div>
                    <p className="text-[10px] text-neutral-500 font-mono">
                      Participants: {activeThread.thread.participant_emails.join(', ')}
                    </p>
                  </div>

                  {/* Message Timeline Panel */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-none">

                    {/* AI Thread Summary overlay */}
                    {activeThread.thread.thread_summary && (
                      <div className="p-5 rounded-2xl border border-indigo-500/10 bg-gradient-to-r from-indigo-500/5 via-purple-500/3 to-pink-500/3 relative overflow-hidden shadow-sm">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
                        <div className="flex items-center gap-2 mb-2.5 text-indigo-400 font-bold">
                          <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
                          <span className="text-[9px] font-bold uppercase tracking-widest">AI Context Synthesis</span>
                        </div>
                        <p className="text-xs text-neutral-300 leading-relaxed">{activeThread.thread.thread_summary}</p>
                      </div>
                    )}

                    {/* Chronological Message Stack */}
                    {activeThread.emails.map(email => (
                      <div key={email.id} className="rounded-2xl border border-neutral-800/60 bg-neutral-900/20 overflow-hidden shadow-sm hover:border-neutral-800 transition">
                        
                        {/* Message Header */}
                        <div className="px-5 py-4 bg-neutral-950/40 border-b border-neutral-850 flex items-center justify-between flex-wrap gap-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold text-xs shadow-md ${getAvatarClass(email.from_email)}`}>
                              {email.from_email.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-neutral-200">{email.from_email}</p>
                              <p className="text-[9px] text-neutral-500">To: {email.to_emails?.join(', ')}</p>
                            </div>
                          </div>
                          <span className="text-[10px] text-neutral-500 font-mono font-bold uppercase">
                            {new Date(email.received_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        
                        {/* MIME text contents */}
                        <div className="p-5 text-xs text-neutral-300 leading-relaxed whitespace-pre-line border-b border-neutral-900/45 selection:bg-indigo-500/20">
                          {email.body_text}
                        </div>
                        
                        {/* Single email summary card */}
                        {email.summary && (
                          <div className="px-5 py-3.5 bg-neutral-950/20 text-xs text-neutral-400 flex items-start gap-2.5 border-b border-neutral-900/20">
                            <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5 animate-pulse" />
                            <span><strong className="text-indigo-400">Brief:</strong> {email.summary}</span>
                          </div>
                        )}
                        
                        {/* Auto category validation */}
                        {email.category_explanation && (
                          <div className="px-5 py-2.5 text-[9px] text-neutral-500 flex items-center justify-between gap-3 bg-neutral-950/10 font-bold">
                            <span className="flex items-center gap-1.5"><Tag className="w-3 h-3 text-neutral-500" />{email.category_explanation}</span>
                            <span className="font-mono uppercase">Confidence: {Math.round((email.category_confidence || 0) * 100)}%</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* AI Quick Reply Assistant */}
                  <div className="p-5 border-t border-neutral-800 bg-neutral-950/40 backdrop-blur-xl shrink-0">
                    <div className="flex gap-2 mb-3 overflow-x-auto scrollbar-none py-1">
                      {[
                        { label: '🤝 Accept & Schedule', text: 'Draft a professional acceptance and schedule a follow-up meeting' },
                        { label: '❌ Decline Politely',  text: 'Draft a polite refusal explaining our schedule is fully committed' },
                        { label: 'ℹ️ Request Details',   text: 'Request more technical details and timelines regarding this proposal' },
                      ].map(({ label, text }) => (
                        <button
                          key={label}
                          onClick={() => setReplyInstruction(text)}
                          className="text-[9px] font-bold uppercase tracking-wider px-3.5 py-2 rounded-xl border border-neutral-800 bg-neutral-900/60 text-neutral-400 hover:border-indigo-500/40 hover:text-indigo-400 transition shrink-0 cursor-pointer"
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    
                    {replySuccess && (
                      <div className="mb-3 px-3 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 shrink-0" />
                        {replySuccess}
                      </div>
                    )}
                    
                    <div className="relative flex items-center">
                      <textarea
                        value={replyInstruction}
                        onChange={e => setReplyInstruction(e.target.value)}
                        placeholder='Draft reply instruction (e.g. "Say yes to Friday deadline, mention team is ready")'
                        rows={2}
                        className="w-full rounded-2xl border border-neutral-800 bg-neutral-950/80 p-4 pr-14 text-xs text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-indigo-550/40 resize-none"
                      />
                      <button
                        onClick={handleReplySubmit}
                        disabled={isReplying || !replyInstruction.trim()}
                        className="absolute right-4 p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition disabled:opacity-40 cursor-pointer shadow-md shadow-indigo-500/10 active:scale-95"
                      >
                        {isReplying ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <SendHorizontal className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-8">
                  <div className="w-14 h-14 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center">
                    <Inbox className="w-6 h-6 text-neutral-600 animate-pulse-slow" />
                  </div>
                  <p className="text-xs font-bold uppercase tracking-widest text-neutral-500">No Discussion Selected</p>
                  <p className="text-[10px] text-neutral-600 max-w-[200px]">Select a thread from the side list to examine parsed metadata and compose responses.</p>
                </div>
              )}
            </div>
          </div>

        ) : (
          
          /* ── CLAUDE/OPENAI-STYLE RAG AI CHAT AGENT ── */
          <div className="flex-1 flex overflow-hidden min-h-0">

            {/* Chat Sessions Sidebar list */}
            <div className="hidden md:flex w-60 border-r border-neutral-800/40 flex-col bg-neutral-950/20 shrink-0">
              
              <div className="h-12 flex items-center justify-between px-4 border-b border-neutral-800/40 shrink-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">History</span>
                <button
                  id="new-chat-btn"
                  onClick={handleCreateNewSession}
                  className="flex items-center gap-1 text-[9px] uppercase tracking-wider px-2 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 font-bold transition cursor-pointer"
                >
                  <Plus className="w-3 h-3" /> New
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5 scrollbar-none">
                {chatSessions.map(session => (
                  <button
                    key={session.id}
                    onClick={() => setActiveSession(session.id)}
                    className={`w-full text-left px-3.5 py-3 rounded-xl text-xs font-semibold transition cursor-pointer border ${
                      activeSessionId === session.id
                        ? 'bg-neutral-900 border-neutral-800 text-neutral-200 shadow-sm'
                        : 'text-neutral-400 border-transparent hover:bg-neutral-900/30'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <MessageSquare className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span className="truncate">{session.title}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Chat Conversation Timeline */}
            <div className="flex-1 flex flex-col overflow-hidden min-h-0 bg-neutral-950/10">
              
              {/* Header Info */}
              <div className="h-12 flex items-center justify-between px-6 border-b border-neutral-800/40 bg-neutral-950/40 shrink-0">
                <div className="flex items-center gap-2.5 text-xs">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  <span className="font-bold text-neutral-300">Semantic Chat Assistant</span>
                  <span className="hidden sm:inline text-neutral-700">•</span>
                  <span className="hidden sm:inline text-neutral-500 text-[10px] font-mono">Gemini RAG + pgvector Hybrid Search</span>
                </div>
                
                <button
                  onClick={handleCreateNewSession}
                  className="md:hidden flex items-center gap-1.5 text-[9px] uppercase tracking-wider px-2.5 py-1 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-bold"
                >
                  <Plus className="w-3 h-3" /> New
                </button>
              </div>

              {/* Chat timeline feed */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-none">
                {chatMessages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 max-w-sm mx-auto">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-5 animate-pulse-slow">
                      <Zap className="w-6 h-6 animate-pulse" />
                    </div>
                    <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-300 mb-2.5">AI semantic query console</h3>
                    <p className="text-[11px] text-neutral-500 leading-relaxed mb-6">
                      Ask questions regarding project specs, deliverables, or invoice deadlines. Context is automatically extracted and synthesized with deep citations.
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
                          className="w-full text-left p-3.5 rounded-xl border border-neutral-850 bg-neutral-900/30 text-xs text-neutral-400 hover:bg-neutral-900/50 hover:border-indigo-500/30 transition shadow-sm cursor-pointer"
                        >
                          "{q}"
                        </button>
                      ))}
                    </div>
                  </div>
                ) : chatMessages.map((msg, i) => {
                  const isUser = msg.role === 'user'
                  return (
                    <div key={i} className={`flex gap-3.5 animate-fade-in-up ${isUser ? 'justify-end' : 'justify-start'}`}>
                      {!isUser && (
                        <div className="w-7 h-7 rounded-xl bg-gradient-premium flex items-center justify-center shrink-0 mt-1 shadow-sm">
                          <Sparkles className="w-3.5 h-3.5 text-white" />
                        </div>
                      )}
                      
                      {/* Bubble */}
                      <div className={`max-w-[80%] p-4 text-xs leading-relaxed border ${
                        isUser
                          ? 'chat-bubble-user bg-gradient-to-br from-indigo-600 to-indigo-700 border-indigo-500/10 text-white shadow-md'
                          : 'chat-bubble-ai bg-neutral-900/30 border-neutral-850 text-neutral-300 shadow-sm'
                      }`}>
                        <p className="whitespace-pre-line selection:bg-indigo-500/20">{msg.content}</p>
                        
                        {/* Citation badges with thread ID links */}
                        {!isUser && msg.source_emails && msg.source_emails.length > 0 && (
                          <div className="mt-4 pt-3 border-t border-neutral-800/40 flex flex-wrap gap-1.5 items-center">
                            <span className="text-[9px] text-neutral-500 font-bold uppercase tracking-wider">Citations:</span>
                            {msg.source_emails.map((eid: string) => (
                              <button
                                key={eid}
                                onClick={() => { setViewMode('inbox'); openThread(eid) }}
                                className="px-2.5 py-0.5 rounded-full border border-neutral-800 bg-neutral-950 text-[10px] text-indigo-400 font-mono flex items-center gap-1.5 hover:border-indigo-500/40 transition cursor-pointer hover:shadow-lg hover:shadow-indigo-500/5"
                              >
                                <ExternalLink className="w-2.5 h-2.5 text-indigo-400" />
                                {eid.substring(0, 8)}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {isUser && (
                        <div className={`w-7 h-7 rounded-xl flex items-center justify-center text-white font-bold text-[10px] shrink-0 mt-1 shadow-sm ${getAvatarClass(userEmail)}`}>
                          {getInitials(userEmail)}
                        </div>
                      )}
                    </div>
                  )
                })}

                {/* Shimmer dot loader */}
                {isChatLoading && (
                  <div className="flex gap-3.5 justify-start animate-fade-in">
                    <div className="w-7 h-7 rounded-xl bg-gradient-premium flex items-center justify-center shrink-0 mt-1 shadow-sm">
                      <Sparkles className="w-3.5 h-3.5 text-white" />
                    </div>
                    <div className="chat-bubble-ai bg-neutral-900/30 border border-neutral-850 px-5 py-4 rounded-xl flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full dot-bounce-1" />
                      <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full dot-bounce-2" />
                      <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full dot-bounce-3" />
                      <span className="text-[10px] text-neutral-500 font-mono ml-2">Retrieving Context...</span>
                    </div>
                  </div>
                )}
                <div ref={chatBottomRef} />
              </div>

              {/* Chat Input Console (Floating Vercel/ChatGPT style) */}
              <div className="p-6 shrink-0 bg-neutral-950/20">
                <div className="max-w-2xl mx-auto flex gap-2 items-center bg-neutral-900/60 backdrop-blur-xl border border-neutral-800 rounded-2xl p-2.5 shadow-2xl focus-within:border-indigo-500/40 transition">
                  <input
                    id="chat-input"
                    value={chatQuery}
                    onChange={e => setChatQuery(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleChatSubmit()}
                    placeholder='Query database (e.g. "Do I have any invoices?")'
                    className="flex-1 text-xs bg-transparent border-0 px-3 py-2 text-neutral-200 placeholder-neutral-600 focus:outline-none"
                  />
                  <button
                    id="chat-submit-btn"
                    onClick={handleChatSubmit}
                    disabled={isChatLoading || !chatQuery.trim()}
                    className="px-4 py-2 rounded-xl bg-gradient-premium hover:shadow-lg hover:shadow-indigo-500/20 font-bold text-xs text-white transition-all disabled:opacity-50 flex items-center gap-2 shadow-md cursor-pointer"
                  >
                    <SendHorizontal className="w-3.5 h-3.5" />
                    <span>Ask</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── AI COMPOSE ASSISTANT OVERLAY DIALOG ── */}
      {isComposeOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
          <div className="w-full sm:max-w-xl sm:rounded-2xl rounded-t-2xl border border-neutral-800 bg-neutral-900 shadow-2xl overflow-hidden animate-fade-in-up">

            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-neutral-800/60 bg-neutral-950/50 flex justify-between items-center">
              <div className="flex items-center gap-2.5 text-neutral-200">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <span className="font-extrabold text-sm tracking-wider uppercase font-mono">Compose Assistant</span>
              </div>
              <button
                onClick={() => setComposeOpen(false)}
                className="p-1.5 rounded-xl hover:bg-neutral-800 transition text-neutral-500 hover:text-neutral-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5">
              
              {/* Tone Selection */}
              <div>
                <label className="block text-[9px] font-bold text-neutral-500 uppercase tracking-widest mb-2.5">Tone Profile</label>
                <div className="flex flex-wrap gap-1.5">
                  {(['Professional', 'Casual', 'Urgent', 'Apologetic', 'Persuasive'] as const).map(tone => (
                    <button
                      key={tone}
                      onClick={() => setComposeTone(tone)}
                      className={`px-3.5 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider border transition cursor-pointer ${
                        composeTone === tone
                          ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-500/20'
                          : 'bg-neutral-950 border-neutral-850 text-neutral-400 hover:border-indigo-500/30'
                      }`}
                    >
                      {tone}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sender Name Signoff */}
              <div>
                <label className="block text-[9px] font-bold text-neutral-500 uppercase tracking-widest mb-2">Signature Name</label>
                <input
                  value={senderName}
                  onChange={e => setSenderName(e.target.value)}
                  placeholder={getUsername(userEmail)}
                  className="w-full rounded-xl border border-neutral-800 bg-neutral-950 p-3 text-xs text-neutral-200 focus:outline-none focus:border-indigo-500/50"
                />
              </div>

              {/* Instruction Prompt */}
              <div>
                <label className="block text-[9px] font-bold text-neutral-500 uppercase tracking-widest mb-2">Draft Instructions</label>
                <textarea
                  value={composePrompt}
                  onChange={e => setComposePrompt(e.target.value)}
                  placeholder='e.g. "Draft an update asking for status report of AWS integration task..."'
                  rows={3}
                  className="w-full rounded-xl border border-neutral-800 bg-neutral-950 p-3 text-xs text-neutral-200 focus:outline-none focus:border-indigo-500/50 resize-none placeholder-neutral-700"
                />
              </div>

              {/* Generate button */}
              <button
                onClick={handleComposeSubmit}
                disabled={isComposing || !composePrompt.trim()}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-premium font-bold text-xs text-white shadow-lg hover:shadow-indigo-500/20 hover:scale-[1.005] active:scale-[0.995] transition disabled:opacity-50 cursor-pointer"
              >
                {isComposing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <><Sparkles className="w-3.5 h-3.5" /> Generate Draft</>}
              </button>

              {/* Generated Draft Display */}
              {composedDraft && (
                <div className="border border-neutral-800 rounded-xl bg-neutral-950 overflow-hidden shadow-inner relative group">
                  <div className="px-4 py-3.5 border-b border-neutral-850 flex justify-between items-center">
                    <div>
                      <p className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider">Subject</p>
                      <p className="text-xs font-bold text-neutral-200 mt-0.5">{composedDraft.subject}</p>
                    </div>
                    
                    {/* Copy to clipboard button */}
                    <button
                      onClick={() => handleCopyDraft(`${composedDraft.subject}\n\n${composedDraft.body}`)}
                      className="px-2.5 py-1.5 rounded-xl border border-neutral-800 bg-neutral-900 text-[10px] text-indigo-400 font-bold uppercase tracking-wider hover:border-indigo-500/40 hover:text-indigo-300 transition cursor-pointer flex items-center gap-1.5 shadow-sm"
                    >
                      {copyFeedback ? <Check className="w-3 h-3 text-emerald-400" /> : <Send className="w-3 h-3" />}
                      <span>{copyFeedback ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <div className="p-4 bg-neutral-950/60">
                    <p className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider mb-2">Body</p>
                    <div className="text-xs text-neutral-300 leading-relaxed whitespace-pre-line max-h-40 overflow-y-auto font-mono bg-neutral-900/30 p-3 rounded-lg border border-neutral-850">
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
