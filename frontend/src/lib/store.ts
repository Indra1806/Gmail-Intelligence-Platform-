import { create } from 'zustand'

export interface Email {
  id: string
  account_id: string
  thread_id: string
  gmail_message_id: string
  subject: string
  from_email: string
  to_emails: string[]
  cc_emails: string[]
  bcc_emails: string[]
  body_text: string
  body_html: string
  snippet: string
  received_at: string
  category: string
  summary: string
  is_read: boolean
  labels: string[]
  category_confidence?: number
  category_explanation?: string
}

export interface Thread {
  id: string
  account_id: string
  gmail_thread_id: string
  subject: string
  participant_emails: string[]
  last_message_at: string
  message_count: number
  thread_summary?: string
  category?: string
}

interface AppState {
  // Authentication Context
  userId: string | null
  accountId: string | null
  userEmail: string | null
  setAuth: (userId: string, accountId: string, email: string) => void
  logout: () => void

  // Navigation Filter
  selectedCategory: string | null
  setCategory: (category: string | null) => void

  // Compose Modal Trigger
  isComposeOpen: boolean
  setComposeOpen: (isOpen: boolean) => void

  // Active Reading Thread
  activeThreadId: string | null
  setActiveThread: (id: string | null) => void
  
  // RAG Chat Sessions
  activeSessionId: string | null
  setActiveSession: (id: string | null) => void

  // Theme configuration
  theme: 'light' | 'dark' | 'system'
  setTheme: (theme: 'light' | 'dark' | 'system') => void
}

export const useAppStore = create<AppState>((set) => ({
  userId: null,
  accountId: null,
  userEmail: null,
  
  setAuth: (userId, accountId, email) => set({ userId, accountId, userEmail: email }),
  logout: () => set({ userId: null, accountId: null, userEmail: null, activeThreadId: null, activeSessionId: null }),

  selectedCategory: "All",
  setCategory: (category) => set({ selectedCategory: category }),

  isComposeOpen: false,
  setComposeOpen: (isOpen) => set({ isComposeOpen: isOpen }),

  activeThreadId: null,
  setActiveThread: (id) => set({ activeThreadId: id }),

  activeSessionId: null,
  setActiveSession: (id) => set({ activeSessionId: id }),

  theme: 'system',
  setTheme: (theme) => set({ theme })
}))
