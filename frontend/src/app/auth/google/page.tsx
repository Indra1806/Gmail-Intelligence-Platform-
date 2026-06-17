'use client'

import React, { useEffect } from 'react'

export default function GoogleAuthRedirect() {
  useEffect(() => {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'
    const redirectUri = `${window.location.origin}/dashboard`
    window.location.href = `${apiBase}/auth/login?redirect_uri=${redirectUri}`
  }, [])

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-950 text-white font-sans">
      <div className="flex flex-col items-center gap-4">
        {/* Loading Spinner */}
        <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
        <h1 className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-indigo-200">
          OVO.AI
        </h1>
        <p className="text-xs font-semibold text-slate-400 tracking-wider uppercase animate-pulse">
          Redirecting to Google Secure Login...
        </p>
      </div>
    </div>
  )
}
