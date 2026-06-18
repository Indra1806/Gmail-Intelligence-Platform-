const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'

export async function fetchEmails(accountId: string, category: string | null = null, search: string | null = null) {
  const params = new URLSearchParams()
  params.append('account_id', accountId)
  if (category && category !== 'All') {
    params.append('category', category)
  }
  if (search && search.trim()) {
    params.append('search', search.trim())
  }
  const res = await fetch(`${API_BASE_URL}/emails?${params.toString()}`, { cache: 'no-store' })
  if (!res.ok) throw new Error('Failed to fetch emails')
  return res.json()
}

export async function fetchThreads(accountId: string, category: string | null = null, search: string | null = null) {
  const params = new URLSearchParams()
  params.append('account_id', accountId)
  if (category && category !== 'All') {
    params.append('category', category)
  }
  if (search && search.trim()) {
    params.append('search', search.trim())
  }
  const res = await fetch(`${API_BASE_URL}/emails/threads?${params.toString()}`, { cache: 'no-store' })
  if (!res.ok) throw new Error('Failed to fetch threads')
  return res.json()
}

export async function fetchThreadDetails(threadId: string) {
  const res = await fetch(`${API_BASE_URL}/emails/threads/${threadId}`, { cache: 'no-store' })
  if (!res.ok) throw new Error('Failed to fetch thread details')
  return res.json()
}

export async function composeEmail(userPrompt: string, tone: string, senderName: string | null) {
  const res = await fetch(`${API_BASE_URL}/emails/compose`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_prompt: userPrompt,
      tone,
      sender_name: senderName
    })
  })
  if (!res.ok) throw new Error('Failed to compose email')
  return res.json()
}

export async function replyThread(accountId: string, threadId: string, userInstruction: string) {
  const res = await fetch(`${API_BASE_URL}/threads/reply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      account_id: accountId,
      thread_id: threadId,
      user_instruction: userInstruction
    })
  })
  if (!res.ok) throw new Error('Failed to send thread reply')
  return res.json()
}

export async function queryChat(query: string, sessionId: string, userId: string, accountId: string) {
  const res = await fetch(`${API_BASE_URL}/chat/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query,
      session_id: sessionId,
      user_id: userId,
      account_id: accountId
    })
  })
  if (!res.ok) throw new Error('Failed to query chat agent')
  return res.json()
}

export async function createChatSession(userId: string, title: string | null = null) {
  const res = await fetch(`${API_BASE_URL}/chat/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: userId,
      title
    })
  })
  if (!res.ok) throw new Error('Failed to create chat session')
  return res.json()
}

export async function fetchChatSessions(userId: string) {
  const res = await fetch(`${API_BASE_URL}/chat/sessions?user_id=${userId}`, { cache: 'no-store' })
  if (!res.ok) throw new Error('Failed to fetch chat sessions')
  return res.json()
}

export async function fetchChatMessages(sessionId: string) {
  const res = await fetch(`${API_BASE_URL}/chat/sessions/${sessionId}/messages`, { cache: 'no-store' })
  if (!res.ok) throw new Error('Failed to fetch chat messages')
  return res.json()
}

export async function triggerSync(accountId: string) {
  const res = await fetch(`${API_BASE_URL}/sync/trigger`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      account_id: accountId
    })
  })
  if (!res.ok) throw new Error('Failed to trigger sync')
  return res.json()
}
