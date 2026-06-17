![BANNER](image.png)


# Next.js 15 Frontend Implementation

I have designed the frontend architecture using the modern **App Router**, **Tailwind CSS**, and **shadcn/ui**. This stack ensures a highly responsive, modern "glassmorphic" feel with minimal boilerplate, fulfilling the requirement for a premium user experience.

## 1. App Router Folder Structure

```text
frontend/
├── app/
│   ├── (auth)/
│   │   └── login/
│   │       └── page.tsx           # Google OAuth Login screen
│   ├── (dashboard)/
│   │   ├── layout.tsx             # Sidebar (Categories) & Top Nav
│   │   ├── inbox/
│   │   │   └── page.tsx           # Email list view
│   │   ├── thread/[id]/
│   │   │   └── page.tsx           # Full thread view with summary
│   │   ├── chat/
│   │   │   └── page.tsx           # RAG Chat Agent interface
│   │   └── compose/
│   │       └── page.tsx           # AI Composition UI
│   ├── api/
│   │   └── auth/[...nextauth]/
│   │       └── route.ts           # NextAuth.js endpoints
│   ├── globals.css                # Tailwind base & shadcn variables
│   └── layout.tsx                 # Root layout (Providers)
├── components/
│   ├── ui/                        # Auto-generated shadcn components (Button, Card, Input)
│   ├── email/
│   │   ├── EmailList.tsx
│   │   ├── ThreadSummaryCard.tsx
│   │   └── ComposeModal.tsx
│   ├── chat/
│   │   ├── ChatInterface.tsx
│   │   └── SourceCitation.tsx
│   └── layout/
│       └── Sidebar.tsx
├── lib/
│   ├── api.ts                     # Axios/fetch wrappers for FastAPI backend
│   └── store.ts                   # Zustand state management
```

---

## 2. State Management (Zustand)

For a lightweight app like this, Redux is overkill. We use Zustand to manage the globally active UI state (like opening the compose modal or tracking the currently selected category filter).

```typescript
// lib/store.ts
import { create } from 'zustand'

interface AppState {
  selectedCategory: string | null;
  setCategory: (category: string | null) => void;
  
  isComposeOpen: boolean;
  setComposeOpen: (isOpen: boolean) => void;
  
  activeThreadId: string | null;
  setActiveThread: (id: string | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  selectedCategory: null,
  setCategory: (category) => set({ selectedCategory: category }),
  
  isComposeOpen: false,
  setComposeOpen: (isOpen) => set({ isComposeOpen: isOpen }),
  
  activeThreadId: null,
  setActiveThread: (id) => set({ activeThreadId: id }),
}))
```

---

## 3. API Integration (React Server Components)

Next.js 15 heavily utilizes Server Components. We can fetch the email list directly on the server, resulting in zero client-side loading spinners for the initial load.

```tsx
// app/(dashboard)/inbox/page.tsx
import { Suspense } from 'react'
import { EmailList } from '@/components/email/EmailList'
import { getEmailsFromFastAPI } from '@/lib/api'

// This component runs entirely on the server
export default async function InboxPage({
  searchParams,
}: {
  searchParams: { category?: string }
}) {
  const category = searchParams.category || 'All'
  
  // Fetch data directly from our Python FastAPI backend
  const emails = await getEmailsFromFastAPI(category)

  return (
    <div className="flex-1 p-6 overflow-y-auto">
      <h1 className="text-3xl font-bold tracking-tight mb-6">
        {category} Inbox
      </h1>
      
      <Suspense fallback={<div className="animate-pulse h-96 bg-muted rounded-xl" />}>
        <EmailList initialEmails={emails} />
      </Suspense>
    </div>
  )
}
```

---

## 4. UI Design: Thread View with AI Summaries

Combining **shadcn/ui** `Card` and `ScrollArea` components to create a premium, thread-aware reading experience.

```tsx
// components/email/ThreadSummaryCard.tsx
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { SparklesIcon } from "lucide-react"

export function ThreadSummaryCard({ summary }: { summary: string }) {
  return (
    <Card className="mb-6 border-blue-200 bg-blue-50/50 shadow-sm backdrop-blur-xl">
      <CardHeader className="pb-3 flex flex-row items-center gap-2">
        <SparklesIcon className="w-5 h-5 text-blue-600" />
        <CardTitle className="text-sm font-medium text-blue-900">
          AI Thread Summary
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-blue-800 leading-relaxed">
          {summary}
        </p>
      </CardContent>
    </Card>
  )
}
```

---

## 5. The Chat Agent Interface

The Chat Agent requires a dynamic client-side interface because it streams responses and maintains conversational history.

```tsx
// components/chat/ChatInterface.tsx
'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { SourceCitation } from "./SourceCitation"

interface Message {
  role: 'user' | 'assistant'
  content: string
  sources?: string[]
}

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSend = async () => {
    if (!input.trim()) return
    
    const userMsg = { role: 'user' as const, content: input }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setIsLoading(true)

    // Call FastAPI backend
    const res = await fetch('/api/proxy/chat', {
      method: 'POST',
      body: JSON.stringify({ query: input }),
      headers: { 'Content-Type': 'application/json' }
    })
    
    const data = await res.json()
    
    setMessages(prev => [...prev, {
      role: 'assistant',
      content: data.answer,
      sources: data.cited_sources
    }])
    setIsLoading(false)
  }

  return (
    <div className="flex flex-col h-[80vh] border rounded-xl shadow-lg bg-background">
      <ScrollArea className="flex-1 p-4">
        {messages.map((msg, i) => (
          <div key={i} className={`mb-4 flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-2xl p-4 ${
              msg.role === 'user' 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-muted/50 border backdrop-blur-sm'
            }`}>
              <p className="text-sm leading-relaxed">{msg.content}</p>
              
              {/* RAG Source Attribution */}
              {msg.sources && msg.sources.length > 0 && (
                <div className="mt-3 pt-3 border-t border-border/50 flex gap-2 flex-wrap">
                  {msg.sources.map(src => (
                    <SourceCitation key={src} emailId={src} />
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </ScrollArea>
      
      <div className="p-4 border-t bg-muted/20">
        <div className="flex gap-2">
          <Input 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything about your emails..."
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            className="rounded-full shadow-inner"
          />
          <Button onClick={handleSend} disabled={isLoading} className="rounded-full px-6">
            {isLoading ? 'Thinking...' : 'Send'}
          </Button>
        </div>
      </div>
    </div>
  )
}
```

## Responsive Layout Note
The layout is designed `mobile-first` using Tailwind. 
*   On mobile (`sm` and below), the Category Sidebar is hidden behind a Hamburger menu (Sheet component from shadcn).
*   The Email List collapses into a full-screen view on mobile, hiding the reading pane until an email is tapped.
*   On desktop (`md` and up), we use a classic 3-pane layout: Sidebar (Categories) -> Inbox List -> Reading Pane (Thread View).
