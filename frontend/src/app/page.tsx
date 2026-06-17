'use client'

import React, { useState, useEffect, useRef } from 'react'
import { 
  Inbox, 
  Send, 
  Sparkles, 
  RefreshCw, 
  Tag, 
  MessageSquare, 
  PenTool, 
  Paperclip,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  User,
  Clock,
  ExternalLink,
  ChevronRight,
  SendHorizontal
} from 'lucide-react'
import { 
  fetchEmails, 
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

export default function Dashboard() {
  const { 
    userId, 
    accountId, 
    userEmail, 
    selectedCategory, 
    setCategory, 
    isComposeOpen, 
    setComposeOpen, 
    activeThreadId, 
    setActiveThread,
    activeSessionId,
    setActiveSession,
    setAuth,
    logout
  } = useAppStore()

  // State managers
  const [viewMode, setViewMode] = useState<'inbox' | 'chat'>('inbox')
  const [threads, setThreads] = useState<Thread[]>([])
  const [activeThread, setActiveThreadDetails] = useState<{ thread: Thread, emails: Email[] } | null>(null)
  
  // Loading & status indicators
  const [isSyncing, setIsSyncing] = useState(false)
  const [isThreadLoading, setIsThreadLoading] = useState(false)
  
  // Composition Modal inputs
  const [composePrompt, setComposePrompt] = useState('')
  const [composeTone, setComposeTone] = useState<'Professional' | 'Casual' | 'Urgent' | 'Apologetic' | 'Persuasive'>('Professional')
  const [senderName, setSenderName] = useState('')
  const [composedDraft, setComposedDraft] = useState<{ subject: string; body: string } | null>(null)
  const [isComposing, setIsComposing] = useState(false)

  // Reply panel inputs
  const [replyInstruction, setReplyInstruction] = useState('')
  const [isReplying, setIsReplying] = useState(false)
  const [replySuccessMessage, setReplySuccessMessage] = useState('')

  // RAG Chat inputs and history
  const [chatSessions, setChatSessions] = useState<any[]>([])
  const [chatMessages, setChatMessages] = useState<any[]>([])
  const [chatQuery, setChatQuery] = useState('')
  const [isChatLoading, setIsChatLoading] = useState(false)
  
  const chatBottomRef = useRef<HTMLDivElement>(null)

  // Mount-time Authentication Effect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const uId = params.get('user_id')
    const accId = params.get('account_id')
    const email = params.get('email')
    
    if (uId && accId && email) {
      setAuth(uId, accId, email)
      localStorage.setItem('repeatless_user_id', uId)
      localStorage.setItem('repeatless_account_id', accId)
      localStorage.setItem('repeatless_email', email)
      
      const newUrl = window.location.pathname
      window.history.replaceState({}, document.title, newUrl)
    } else {
      const cachedUserId = localStorage.getItem('repeatless_user_id')
      const cachedAccountId = localStorage.getItem('repeatless_account_id')
      const cachedEmail = localStorage.getItem('repeatless_email')
      if (cachedUserId && cachedAccountId && cachedEmail) {
        setAuth(cachedUserId, cachedAccountId, cachedEmail)
      }
    }
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('repeatless_user_id')
    localStorage.removeItem('repeatless_account_id')
    localStorage.removeItem('repeatless_email')
    logout()
  }

  // 1. Initial Data Fetching
  useEffect(() => {
    if (accountId) {
      loadThreads()
    }
  }, [accountId, selectedCategory])

  useEffect(() => {
    if (userId && viewMode === 'chat') {
      loadChatSessions()
    }
  }, [userId, viewMode])

  useEffect(() => {
    if (activeSessionId) {
      loadChatMessages(activeSessionId)
    }
  }, [activeSessionId])

  useEffect(() => {
    if (activeThreadId) {
      loadThreadDetails(activeThreadId)
    }
  }, [activeThreadId])

  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [chatMessages])

  const loadThreads = async () => {
    try {
      const data = await fetchThreads(accountId!, selectedCategory)
      setThreads(data)
    } catch (err) {
      console.error(err)
    }
  }

  const loadThreadDetails = async (id: string) => {
    setIsThreadLoading(true)
    try {
      const data = await fetchThreadDetails(id)
      setActiveThreadDetails(data)
      if (data?.thread?.id && data.thread.id !== id) {
        setActiveThread(data.thread.id)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsThreadLoading(false)
    }
  }

  const loadChatSessions = async () => {
    try {
      const data = await fetchChatSessions(userId!)
      setChatSessions(data)
      if (data.length > 0 && !activeSessionId) {
        setActiveSession(data[0].id)
      }
    } catch (err) {
      console.error(err)
    }
  }

  const loadChatMessages = async (sid: string) => {
    try {
      const data = await fetchChatMessages(sid)
      setChatMessages(data)
    } catch (err) {
      console.error(err)
    }
  }

  // 2. Actions & Timers
  const handleSync = async () => {
    setIsSyncing(true)
    try {
      await triggerSync(accountId!)
      // Reload threads
      await loadThreads()
      if (activeThreadId) {
        await loadThreadDetails(activeThreadId)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsSyncing(false)
    }
  }

  const handleComposeSubmit = async () => {
    if (!composePrompt.trim()) return
    setIsComposing(true)
    try {
      const res = await composeEmail(composePrompt, composeTone, senderName)
      setComposedDraft(res)
    } catch (err) {
      console.error(err)
    } finally {
      setIsComposing(false)
    }
  }

  const handleReplySubmit = async () => {
    if (!replyInstruction.trim() || !activeThread) return
    setIsReplying(true)
    try {
      const res = await replyThread(accountId!, activeThread.thread.id, replyInstruction)
      setReplySuccessMessage("AI Reply generated and transmitted successfully via Gmail API wrapper.")
      setReplyInstruction('')
      
      // Reload thread details to reflect the sent message
      setTimeout(async () => {
        await loadThreadDetails(activeThread.thread.id)
        setReplySuccessMessage('')
      }, 3000)
    } catch (err) {
      console.error(err)
    } finally {
      setIsReplying(false)
    }
  }

  const handleChatSubmit = async () => {
    if (!chatQuery.trim()) return
    
    let sid = activeSessionId
    if (!sid) {
      // Create new session
      const sess = await createChatSession(userId!, "Session Topic")
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
        role: 'assistant',
        content: res.answer,
        source_emails: res.cited_sources,
        created_at: new Date()
      }])
    } catch (err) {
      console.error(err)
    } finally {
      setIsChatLoading(false)
    }
  }

  const handleCreateNewSession = async () => {
    try {
      const title = prompt("Enter topic for new discussion:") || "General Query"
      const sess = await createChatSession(userId!, title)
      setActiveSession(sess.id)
      setChatSessions(prev => [sess, ...prev])
      setChatMessages([])
    } catch (err) {
      console.error(err)
    }
  }

  // 3. Category style lookup helpers
  const getCategoryStyles = (cat: string | undefined) => {
    const defaultStyles = { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200' }
    if (!cat) return defaultStyles
    
    switch (cat.toLowerCase()) {
      case 'work':
        return { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' }
      case 'finance':
        return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' }
      case 'newsletter':
        return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' }
      case 'job':
        return { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' }
      case 'notification':
        return { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' }
      case 'personal':
        return { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' }
      default:
        return defaultStyles
    }
  }

  if (!userId || !accountId) {
    return (
      <div className="flex-1 flex flex-col bg-slate-900 text-slate-100 font-sans min-h-screen relative overflow-hidden bg-gradient-mesh justify-center items-center">
        {/* Background decoration elements */}
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-500/10 blur-[120px] pointer-events-none animate-pulse-slow"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-pink-500/10 blur-[120px] pointer-events-none animate-pulse-slow"></div>

        <div className="max-w-md w-full mx-4 relative z-10">
          <div className="backdrop-blur-xl bg-slate-900/60 border border-slate-800/80 rounded-3xl p-8 shadow-2xl shadow-blue-500/5 flex flex-col items-center text-center">
            
            <div className="w-16 h-16 rounded-2xl bg-gradient-premium flex items-center justify-center shadow-xl shadow-blue-500/20 mb-6">
              <Sparkles className="w-9 h-9 text-white animate-pulse" />
            </div>

            <h1 className="font-extrabold tracking-wider text-2xl bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-pink-400 mb-2">
              REPEATLESS.AI
            </h1>
            
            <p className="text-sm font-semibold text-slate-300 mb-6">
              AI Automation Platform
            </p>

            <div className="h-px w-full bg-slate-800/80 mb-6"></div>

            <p className="text-xs text-slate-400 leading-relaxed mb-8">
              Connect your Gmail account to enable real-time classification, summarization, and AI-driven drafts powered by NVIDIA NIM Cross-Encoder and Gemini 1.5.
            </p>

            <button
              onClick={() => {
                const apiLoginUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'}/auth/login?redirect_uri=${window.location.origin}`;
                window.location.href = apiLoginUrl;
              }}
              className="w-full flex items-center justify-center gap-3 px-6 py-3.5 rounded-xl bg-gradient-premium text-white font-semibold shadow-lg hover:shadow-pink-500/20 hover:scale-[1.02] transition duration-150 active:scale-[0.98]"
            >
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M12.24 10.285V13.4h6.887C18.2 15.614 15.645 18 12.24 18c-3.86 0-7-3.14-7-7s3.14-7 7-7c1.7 0 3.3.6 4.6 1.8l2.4-2.4C17.3 1.7 14.9 1 12.24 1a10 10 0 00-10 10 10 10 0 0010 10c5.3 0 9.25-3.75 9.25-9.385 0-.6-.05-1.2-.16-1.73H12.24z" />
              </svg>
              Sign In with Google
            </button>

            <div className="mt-8 text-[11px] text-slate-500 leading-normal flex flex-col gap-1 w-full text-left bg-slate-950/40 p-4 border border-slate-800/80 rounded-xl font-mono">
              <div className="text-slate-400 font-bold mb-1">Architecture Highlights:</div>
              <div>• Cross-Encoder Reranker: NVIDIA NIM</div>
              <div>• Semantic Vector Index: Supabase pgvector</div>
              <div>• Foundation Model: Google Gemini 1.5</div>
              <div>• Secure Symmetric Encryption: Fernet AES-256</div>
            </div>

          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col bg-slate-900 text-slate-100 font-sans min-h-screen relative overflow-hidden bg-gradient-mesh">
      
      {/* Background decoration elements */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-500/10 blur-[120px] pointer-events-none animate-pulse-slow"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-pink-500/10 blur-[120px] pointer-events-none animate-pulse-slow"></div>

      {/* Top Glassmorphic Navigation Bar */}
      <header className="h-16 flex items-center justify-between px-6 border-b border-slate-800/80 backdrop-blur-xl bg-slate-900/50 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-premium flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold tracking-wider text-lg bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-pink-400">
            REPEATLESS.AI
          </span>
          <span className="text-[10px] px-2.5 py-0.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 font-mono font-bold flex items-center gap-1.5 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            LIVE
          </span>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={handleSync}
            disabled={isSyncing}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-700/80 bg-slate-800/40 text-sm hover:bg-slate-800/90 transition duration-150 disabled:opacity-50 text-slate-300 font-medium"
          >
            <RefreshCw className={`w-4 h-4 text-blue-400 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing...' : 'Sync Inbox'}
          </button>
          
          <div className="h-6 w-px bg-slate-800"></div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
                <User className="w-4 h-4 text-slate-300" />
              </div>
              <div className="hidden md:block text-left">
                <p className="text-xs font-semibold text-slate-200">Gmail Account</p>
                <p className="text-[10px] text-slate-400 font-mono">{userEmail}</p>
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-red-500/20 bg-red-500/10 hover:bg-red-500/20 text-red-400 transition font-medium"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Layout Area */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Sidebar Layout */}
        <aside className="w-64 border-r border-slate-800/60 bg-slate-950/20 backdrop-blur-md flex flex-col justify-between shrink-0 p-4">
          <div className="flex flex-col gap-6">
            
            {/* Primary Action Button */}
            <button 
              onClick={() => {
                setComposedDraft(null)
                setComposePrompt('')
                setComposeOpen(true)
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-premium text-white font-semibold shadow-lg hover:shadow-pink-500/20 hover:scale-[1.01] transition duration-150 active:scale-[0.99]"
            >
              <PenTool className="w-4 h-4" />
              Compose Assistant
            </button>

            {/* Main Navigation Views */}
            <div className="flex flex-col gap-1.5">
              <p className="text-[10px] font-bold text-slate-500 tracking-wider px-3 mb-1 uppercase">Views</p>
              <button 
                onClick={() => setViewMode('inbox')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition duration-150 ${viewMode === 'inbox' ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'}`}
              >
                <Inbox className="w-4 h-4" />
                Inbox Workspace
              </button>
              <button 
                onClick={() => setViewMode('chat')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition duration-150 ${viewMode === 'chat' ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'}`}
              >
                <MessageSquare className="w-4 h-4" />
                AI RAG Chat Agent
              </button>
            </div>

            {/* Smart Category Filters */}
            {viewMode === 'inbox' && (
              <div className="flex flex-col gap-1.5">
                <p className="text-[10px] font-bold text-slate-500 tracking-wider px-3 mb-1 uppercase">Categories</p>
                {['All', 'Work', 'Finance', 'Newsletter', 'Job', 'Notification', 'Personal'].map((cat) => {
                  const active = selectedCategory === cat
                  return (
                    <button
                      key={cat}
                      onClick={() => {
                        setCategory(cat)
                        setActiveThread(null)
                        setActiveThreadDetails(null)
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition duration-150 ${active ? 'bg-slate-800 border border-slate-700 text-slate-200' : 'text-slate-400 hover:bg-slate-800/30 hover:text-slate-300'}`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          cat === 'All' ? 'bg-blue-400' :
                          cat === 'Work' ? 'bg-purple-400' :
                          cat === 'Finance' ? 'bg-emerald-400' :
                          cat === 'Newsletter' ? 'bg-amber-400' :
                          cat === 'Job' ? 'bg-blue-400' :
                          cat === 'Notification' ? 'bg-rose-400' : 'bg-indigo-400'
                        }`} />
                        {cat}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <div className="p-2 border border-slate-800/80 rounded-xl bg-slate-900/30 backdrop-blur-lg">
            <p className="text-[10px] text-slate-500 leading-normal">
              Evaluating NVIDIA NIM Cross-Encoder, pgvector, and Gemini 1.5. Live Gmail sync active.
            </p>
          </div>
        </aside>

        {/* Dynamic Display Panels */}
        {viewMode === 'inbox' ? (
          /* Three-Pane Email Inbox Layout */
          <div className="flex-1 flex overflow-hidden">
            
            {/* Middle Pane: Thread List */}
            <div className="w-96 border-r border-slate-800/60 bg-slate-950/10 flex flex-col shrink-0">
              <div className="h-12 flex items-center justify-between px-4 border-b border-slate-800/60">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  {selectedCategory} Conversations
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 border border-slate-700/60 text-slate-400">
                  {threads.length} threads
                </span>
              </div>

              {/* Scrollable list */}
              <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1.5">
                {threads.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-8 text-center h-48">
                    <Inbox className="w-8 h-8 text-slate-600 mb-2" />
                    <p className="text-sm font-medium text-slate-400">Your inbox is clean</p>
                    <p className="text-xs text-slate-500">Trigger sync to pull latest emails</p>
                  </div>
                ) : (
                  threads.map((thread) => {
                    const active = activeThreadId === thread.id
                    const catStyle = getCategoryStyles(thread.category)
                    
                    return (
                      <button
                        key={thread.id}
                        onClick={() => setActiveThread(thread.id)}
                        className={`w-full text-left p-3.5 rounded-xl border transition duration-150 group relative overflow-hidden ${active ? 'bg-slate-800/90 border-blue-500/50 shadow-md shadow-blue-500/5' : 'bg-slate-900/40 border-slate-800/60 hover:bg-slate-800/40'}`}
                      >
                        <div className="flex justify-between items-start mb-1 gap-1">
                          <span className="font-semibold text-xs text-slate-200 truncate pr-1">
                            {thread.participant_emails.join(', ').replace(/<[^>]*>/g, '')}
                          </span>
                          <span className="text-[10px] text-slate-500 shrink-0 font-mono flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(thread.last_message_at).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}
                          </span>
                        </div>
                        
                        <p className="text-xs font-medium text-slate-300 truncate mb-1.5">
                          {thread.subject}
                        </p>

                        <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed mb-2">
                          {thread.thread_summary || "No summaries available yet."}
                        </p>

                        <div className="flex items-center justify-between">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border ${catStyle.bg} ${catStyle.text} ${catStyle.border}`}>
                            {thread.category || "Uncategorized"}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {thread.message_count} messages
                          </span>
                        </div>
                      </button>
                    )
                  })
                )}
              </div>
            </div>

            {/* Right Pane: Thread Viewer & AI summaries */}
            <div className="flex-1 bg-slate-950/5 flex flex-col overflow-hidden">
              {isThreadLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-2"></div>
                  <p className="text-sm">Analyzing email history context...</p>
                </div>
              ) : activeThread ? (
                <div className="flex-1 flex flex-col overflow-hidden">
                  
                  {/* Thread Header details */}
                  <div className="p-5 border-b border-slate-800/80 bg-slate-900/20 backdrop-blur-xl">
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                      <h2 className="text-base font-bold text-slate-100">{activeThread.thread.subject}</h2>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full border ${getCategoryStyles(activeThread.thread.category).bg} ${getCategoryStyles(activeThread.thread.category).text} ${getCategoryStyles(activeThread.thread.category).border}`}>
                          {activeThread.thread.category}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-400">
                      Participants: {activeThread.thread.participant_emails.join(', ')}
                    </p>
                  </div>

                  {/* Scrollable details */}
                  <div className="flex-1 overflow-y-auto p-5 space-y-4">
                    
                    {/* Sparkles AI Thread Summary block */}
                    {activeThread.thread.thread_summary && (
                      <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-950/20 shadow-lg backdrop-blur-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl"></div>
                        <div className="flex items-center gap-2 mb-2 text-blue-400">
                          <Sparkles className="w-4 h-4" />
                          <span className="text-xs font-bold uppercase tracking-wider">AI Conversation Synthesis</span>
                        </div>
                        <p className="text-xs text-blue-200 leading-relaxed">
                          {activeThread.thread.thread_summary}
                        </p>
                      </div>
                    )}

                    {/* Email Chronology timeline */}
                    <div className="space-y-4">
                      {activeThread.emails.map((email) => {
                        const style = getCategoryStyles(email.category)
                        return (
                          <div 
                            key={email.id}
                            className="rounded-xl border border-slate-800/80 bg-slate-900/40 overflow-hidden"
                          >
                            {/* Email header card */}
                            <div className="px-4 py-3 bg-slate-900/60 border-b border-slate-800/50 flex items-center justify-between flex-wrap gap-2">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center font-bold text-xs text-slate-300">
                                  {email.from_email.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <p className="text-xs font-bold text-slate-200">{email.from_email}</p>
                                  <p className="text-[10px] text-slate-400">To: {email.to_emails.join(', ')}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-[10px] text-slate-400 font-mono">
                                  {new Date(email.received_at).toLocaleString()}
                                </span>
                              </div>
                            </div>
                            
                            {/* Email body text */}
                            <div className="p-4 text-xs text-slate-300 leading-relaxed whitespace-pre-line border-b border-slate-800/40 bg-slate-900/10">
                              {email.body_text}
                            </div>

                            {/* Email meta summaries */}
                            {email.summary && (
                              <div className="px-4 py-2 bg-slate-900/30 text-[11px] text-slate-400 italic flex items-center gap-2">
                                <Sparkles className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                                <span><strong>AI Message Summary:</strong> {email.summary}</span>
                              </div>
                            )}

                            {email.category_explanation && (
                              <div className="px-4 py-2 bg-slate-900/15 border-t border-slate-800/20 text-[10px] text-slate-500 flex items-center justify-between">
                                <span className="flex items-center gap-1.5">
                                  <Tag className="w-3 h-3 text-slate-400" />
                                  Reasoning: {email.category_explanation}
                                </span>
                                <span className="font-mono">Confidence: {Math.round((email.category_confidence || 0) * 100)}%</span>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Interactive Thread Reply area */}
                  <div className="p-4 border-t border-slate-800 bg-slate-900/20 backdrop-blur-xl">
                    {replySuccessMessage && (
                      <div className="mb-3 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 shrink-0" />
                        {replySuccessMessage}
                      </div>
                    )}
                    <div className="relative">
                      <textarea
                        value={replyInstruction}
                        onChange={(e) => setReplyInstruction(e.target.value)}
                        placeholder={`Draft reply (e.g. "Say yes to Friday delay, mention team is ready")`}
                        rows={2}
                        className="w-full rounded-xl border border-slate-800 bg-slate-900/80 p-3 pr-12 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <button
                        onClick={handleReplySubmit}
                        disabled={isReplying || !replyInstruction.trim()}
                        className="absolute bottom-3 right-3 p-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition disabled:opacity-50"
                      >
                        {isReplying ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <SendHorizontal className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500">
                  <Inbox className="w-12 h-12 text-slate-700 mb-3" />
                  <p className="text-sm font-medium text-slate-400 font-sans">No Conversation Selected</p>
                  <p className="text-xs text-slate-500">Choose a thread from the list to display details and AI summaries</p>
                </div>
              )}
            </div>
            
          </div>
        ) : (
          /* Dynamic AI RAG Chat Agent Interface */
          <div className="flex-1 flex overflow-hidden">
            
            {/* Left Chat session history panel */}
            <div className="w-64 border-r border-slate-800/60 bg-slate-950/15 flex flex-col shrink-0">
              <div className="h-12 flex items-center justify-between px-3 border-b border-slate-800/60">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Discussions
                </span>
                <button 
                  onClick={handleCreateNewSession}
                  className="text-[10px] px-2 py-1 rounded bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/20 font-bold transition"
                >
                  New Chat
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {chatSessions.map((session) => (
                  <button
                    key={session.id}
                    onClick={() => setActiveSession(session.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-medium transition ${activeSessionId === session.id ? 'bg-slate-800 text-slate-200 border border-slate-700' : 'text-slate-400 hover:bg-slate-800/30'}`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <MessageSquare className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      <span className="truncate">{session.title}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Chat conversation area */}
            <div className="flex-1 flex flex-col bg-slate-950/5 overflow-hidden">
              
              {/* Chat Session details Header */}
              <div className="h-12 flex items-center justify-between px-6 border-b border-slate-800/80 bg-slate-900/10">
                <div className="flex items-center gap-2 text-xs">
                  <Sparkles className="w-4 h-4 text-blue-400" />
                  <span className="font-bold">AI Retrieval Assistant</span>
                  <span className="text-slate-500">•</span>
                  <span className="text-slate-400">Emails are the exclusive knowledge source</span>
                </div>
              </div>

              {/* Message scroll log */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {chatMessages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8 max-w-md mx-auto">
                    <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-400 mb-4 border border-blue-500/20">
                      <MessageSquare className="w-6 h-6" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-200 mb-1">Semantic Inbox Search</h3>
                    <p className="text-xs text-slate-400 leading-relaxed mb-4">
                      Ask questions about your email database. The agent will retrieve vectors using pgvector, rerank them via NVIDIA NIM, and cite references.
                    </p>
                    <div className="w-full grid grid-cols-1 gap-2">
                      <button 
                        onClick={() => setChatQuery("summarize email discussions on project proposal specifications")}
                        className="p-2.5 rounded-xl border border-slate-800 bg-slate-900/40 text-[11px] text-left hover:bg-slate-800/40 text-slate-300"
                      >
                        "summarize specifications discussions"
                      </button>
                      <button 
                        onClick={() => setChatQuery("do I have any invoices or fees due for NVIDIA?")}
                        className="p-2.5 rounded-xl border border-slate-800 bg-slate-900/40 text-[11px] text-left hover:bg-slate-800/40 text-slate-300"
                      >
                        "any invoices or fees due for NVIDIA?"
                      </button>
                    </div>
                  </div>
                ) : (
                  chatMessages.map((msg, i) => {
                    const isUser = msg.role === 'user'
                    return (
                      <div 
                        key={i} 
                        className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[75%] rounded-2xl p-4 shadow-md text-xs leading-relaxed ${isUser ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-slate-900 border border-slate-850 text-slate-200 rounded-tl-none'}`}>
                          
                          <p className="whitespace-pre-line">{msg.content}</p>

                          {/* Sources citation list */}
                          {!isUser && msg.source_emails && msg.source_emails.length > 0 && (
                            <div className="mt-3.5 pt-2.5 border-t border-slate-800 flex flex-wrap gap-1.5 items-center">
                              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mr-1">Citations:</span>
                              {msg.source_emails.map((eid: string) => (
                                <button
                                  key={eid}
                                  onClick={() => {
                                    setViewMode('inbox')
                                    setActiveThread(eid) // Simulates clicking/opening
                                  }}
                                  className="px-2 py-0.5 rounded border border-slate-800 bg-slate-950 text-[10px] text-blue-400 font-mono flex items-center gap-1 hover:border-blue-500/30 transition"
                                >
                                  <ExternalLink className="w-2.5 h-2.5" />
                                  Source: {eid.substring(0, 8)}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })
                )}
                {isChatLoading && (
                  <div className="flex justify-start">
                    <div className="rounded-2xl rounded-tl-none p-4 bg-slate-900 border border-slate-850 text-slate-400 text-xs flex items-center gap-2">
                      <div className="flex gap-1">
                        <span className="h-1.5 w-1.5 bg-blue-500 rounded-full animate-bounce"></span>
                        <span className="h-1.5 w-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                        <span className="h-1.5 w-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                      </div>
                      <span className="text-[10px] text-slate-500">Retrieving vectors & reranking...</span>
                    </div>
                  </div>
                )}
                <div ref={chatBottomRef} />
              </div>

              {/* Chat Input panel */}
              <div className="p-4 border-t border-slate-800 bg-slate-900/10 backdrop-blur-xl">
                <div className="flex gap-2">
                  <input
                    value={chatQuery}
                    onChange={(e) => setChatQuery(e.target.value)}
                    placeholder="Search query (e.g. 'summarize launch specs' or 'find billing statements')"
                    onKeyDown={(e) => e.key === 'Enter' && handleChatSubmit()}
                    className="flex-1 rounded-xl border border-slate-800 bg-slate-900/80 px-4 py-3 text-xs placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    onClick={handleChatSubmit}
                    disabled={isChatLoading || !chatQuery.trim()}
                    className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 font-semibold text-xs text-white transition disabled:opacity-50 flex items-center gap-1.5"
                  >
                    Ask Agent
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

      </div>

      {/* AI Compose Overlay Modal Dialog */}
      {isComposeOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-xl rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden relative">
            
            <div className="px-6 py-4 border-b border-slate-800/80 bg-slate-900/40 flex justify-between items-center">
              <div className="flex items-center gap-2 text-slate-200">
                <PenTool className="w-4 h-4 text-blue-400" />
                <span className="font-bold text-sm">AI Email Composition Assistant</span>
              </div>
              <button 
                onClick={() => setComposeOpen(false)}
                className="text-slate-400 hover:text-slate-200 text-xs font-semibold px-2 py-1 rounded bg-slate-850 hover:bg-slate-800"
              >
                Close
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Tone Preference</label>
                  <select
                    value={composeTone}
                    onChange={(e: any) => setComposeTone(e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 p-2 text-xs text-slate-200 focus:outline-none"
                  >
                    {['Professional', 'Casual', 'Urgent', 'Apologetic', 'Persuasive'].map(tone => (
                      <option key={tone} value={tone}>{tone}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Sign-off Signature</label>
                  <input
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 p-2 text-xs text-slate-200 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Drafting Instructions</label>
                <textarea
                  value={composePrompt}
                  onChange={(e) => setComposePrompt(e.target.value)}
                  placeholder={`e.g. "Tell AWS billing that we had a test database run overnight by mistake and want to request a refund"`}
                  rows={3}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 p-3 text-xs text-slate-200 focus:outline-none placeholder-slate-650"
                />
              </div>

              <button
                onClick={handleComposeSubmit}
                disabled={isComposing || !composePrompt.trim()}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 font-bold text-xs text-white transition disabled:opacity-50 shadow-md"
              >
                {isComposing ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    Draft Email Draft
                  </>
                )}
              </button>

              {composedDraft && (
                <div className="border border-slate-800 rounded-xl bg-slate-950 p-4 space-y-3 relative overflow-hidden animate-pulse-slow">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Draft Results</span>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400">Subject:</p>
                    <p className="text-xs text-slate-200 font-semibold">{composedDraft.subject}</p>
                  </div>
                  <div className="h-px bg-slate-850"></div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400">Body:</p>
                    <div className="text-xs text-slate-300 leading-relaxed whitespace-pre-line max-h-48 overflow-y-auto font-mono bg-slate-900/40 p-2.5 rounded-lg">
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
