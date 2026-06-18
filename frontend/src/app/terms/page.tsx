'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { Menu, X, Lock, Layers } from 'lucide-react'
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

export default function TermsPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [showTermsModal, setShowTermsModal] = useState(false)

  const handleAuthRedirect = () => {
    if (localStorage.getItem('OVO_terms_agreed') === 'true') {
      const uid = localStorage.getItem('OVO_user_id')
      const accId = localStorage.getItem('OVO_account_id')
      const email = localStorage.getItem('OVO_email')
      
      if (uid && accId && email) {
        window.location.href = `/dashboard?user_id=${uid}&account_id=${accId}&email=${email}`
      } else {
        window.location.href = '/auth/google'
      }
    } else {
      setShowTermsModal(true)
    }
  }

  const handleAcceptTerms = () => {
    localStorage.setItem('OVO_terms_agreed', 'true')
    setShowTermsModal(false)
    
    const uid = localStorage.getItem('OVO_user_id')
    const accId = localStorage.getItem('OVO_account_id')
    const email = localStorage.getItem('OVO_email')
    
    if (uid && accId && email) {
      window.location.href = `/dashboard?user_id=${uid}&account_id=${accId}&email=${email}`
    } else {
      window.location.href = '/auth/google'
    }
  }

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 flex flex-col font-sans selection:bg-violet-500/20 selection:text-violet-300 relative overflow-hidden bg-grid-pattern">
      
      {/* Mesh Glow Background */}
      <div className="absolute top-[-10%] left-[-5%] w-[45%] h-[45%] rounded-full bg-indigo-500/5 blur-[120px] pointer-events-none" />
      <div className="absolute top-[30%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-500/5 blur-[120px] pointer-events-none" />

      {/* ── NAVBAR ──────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 w-full border-b border-white/5 bg-[#030712]/60 backdrop-blur-xl transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2.5 group">
              <img src="/logo.png" alt="OVO Logo" className="w-8 h-8 rounded-xl object-contain shadow-lg shadow-violet-500/10 group-hover:scale-105 transition-transform duration-200" />
              <span className="font-bold tracking-tight text-lg bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-slate-400 font-mono">
                OVO.AI
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-6">
              <Link href="/#features" className="text-xs font-semibold text-slate-400 hover:text-slate-100 transition-colors">Features</Link>
              <Link href="/#how-it-works" className="text-xs font-semibold text-slate-400 hover:text-slate-100 transition-colors">How It Works</Link>
              <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 cursor-not-allowed">
                Pricing
                <span className="text-[9px] bg-white/5 border border-white/10 text-violet-400 px-1.5 py-0.25 rounded-md font-mono scale-90">Soon</span>
              </span>
              <Link href="/#contact" className="text-xs font-semibold text-slate-400 hover:text-slate-100 transition-colors">Contact</Link>
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
                <Link href="/#features" onClick={() => setMobileMenuOpen(false)} className="text-sm font-semibold text-slate-400 hover:text-slate-100 transition py-1">Features</Link>
                <Link href="/#how-it-works" onClick={() => setMobileMenuOpen(false)} className="text-sm font-semibold text-slate-400 hover:text-slate-100 transition py-1">How It Works</Link>
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-500 py-1">
                  Pricing <span className="text-[9px] bg-white/5 border border-white/10 text-violet-400 px-1.5 py-0.25 rounded-md font-mono">Coming Soon</span>
                </div>
                <Link href="/#contact" onClick={() => setMobileMenuOpen(false)} className="text-sm font-semibold text-slate-400 hover:text-slate-100 transition py-1">Contact</Link>
                
                <div className="pt-4 border-t border-white/5 flex flex-col gap-3">
                  <button 
                    onClick={() => { setMobileMenuOpen(false); handleAuthRedirect(); }} 
                    className="w-full text-center text-sm font-semibold text-slate-300 py-2.5 rounded-xl border border-white/5 bg-white/5"
                  >
                    Sign In
                  </button>
                  <button 
                    onClick={() => { setMobileMenuOpen(false); handleAuthRedirect(); }} 
                    className="w-full text-center text-sm font-bold text-white bg-gradient-premium py-3 rounded-xl"
                  >
                    Get Started
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* ── TERMS CONTENT SECTION ────────────────────────────────────────── */}
      <main className="flex-1 max-w-4xl mx-auto px-6 py-20 relative z-10 w-full">
        <div className="space-y-4 text-center mb-16">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-indigo-300 font-sans">
            Terms of Service
          </h1>
          <p className="text-xs text-slate-500 font-mono">
            Last Updated: June 18, 2026
          </p>
        </div>

        <div className="glass-panel border border-white/5 rounded-3xl p-8 sm:p-12 bg-white/2 backdrop-blur-2xl space-y-8 text-left text-slate-300 text-xs sm:text-sm leading-relaxed">
          
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
              1. Acceptance of Terms
            </h2>
            <p>
              By accessing or using the services provided by OVO.AI (&quot;OVO,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;), you agree to be bound by these Terms of Service. If you do not agree to these terms, you must not access or use the platform.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
              2. Description of Service
            </h2>
            <p>
              OVO.AI provides an intelligent workspace orchestration assistant that syncs, indexes, categorizes, and processes email records using advanced Large Language Models (LLMs) and vector search capabilities. The services are provided &quot;AS IS&quot; and subject to change or suspension at any time.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
              3. Google OAuth & Access Permissions
            </h2>
            <p>
              OVO.AI integrates with your Gmail account via Google OAuth. To function properly, OVO requires permissions to read, construct, send, and group emails. By authorizing OVO.AI, you grant us explicit permission to access these resources in accordance with our Privacy Policy. You can revoke access at any time through your Google Account security settings.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
              4. User Accounts & Security
            </h2>
            <p>
              You are responsible for maintaining the confidentiality of your session variables, credentials, and API tokens. You agree to notify us immediately of any unauthorized use of your account or security breach. OVO.AI will not be liable for any losses caused by unauthorized access to your workspace.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
              5. Acceptable Use Policy
            </h2>
            <p>
              You agree not to use OVO.AI to:
            </p>
            <ul className="list-disc pl-6 space-y-1.5 text-slate-400">
              <li>Send spam, unsolicited advertisements, or bulk marketing communications.</li>
              <li>Parse or crawl other users&apos; workspace details or extract model weights.</li>
              <li>Expose private user data in violation of privacy regulations.</li>
              <li>Attempt to bypass, disable, or reverse engineer any application safety filters or security protocols.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
              6. Limitation of Liability
            </h2>
            <p>
              To the maximum extent permitted by law, OVO.AI and its developers shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly, resulting from your use of the service or database connectivity.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
              7. Modifications to Terms
            </h2>
            <p>
              We reserve the right to update or modify these Terms of Service at any time. We will notify you of any changes by updating the &quot;Last Updated&quot; date at the top of this page. Your continued use of OVO.AI after modifications are posted constitutes acceptance of those changes.
            </p>
          </section>

        </div>
      </main>

      {/* ── FOOTER ──────────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/5 bg-[#02050c] py-16 text-slate-400 relative z-10 text-left">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-2 md:grid-cols-5 gap-8">
          <div className="col-span-2 space-y-4 pr-0 md:pr-10">
            <Link href="/" className="flex items-center gap-2.5">
              <img src="/logo.png" alt="OVO Logo" className="w-7 h-7 rounded-xl object-contain shadow-md shadow-violet-500/10" />
              <span className="font-bold tracking-tight text-base text-white font-mono">
                OVO.ai
              </span>
            </Link>
            <p className="text-xs leading-relaxed text-slate-500">
              World-class Gmail orchestration and semantic vector reranking models designed for modern engineering teams.
            </p>
            <div className="flex items-center gap-3">
              <Link href="/" className="hover:text-white transition"><TwitterIcon className="w-4 h-4" /></Link>
              <a href="https://linkedin.com/in/indrasenareddybala" className="hover:text-white transition"><LinkedinIcon className="w-4 h-4" /></a>
              <a href="https://github.com/indra1806" className="hover:text-white transition"><GithubIcon className="w-4 h-4" /></a>
            </div>
          </div>

          <div>
            <h5 className="text-[10px] font-bold text-slate-300 uppercase tracking-widest mb-4">Product</h5>
            <ul className="space-y-2.5 text-xs text-slate-500">
              <li><Link href="/#features" className="hover:text-slate-300 transition">Features</Link></li>
              <li><span className="flex items-center gap-1.5 cursor-not-allowed">Security <Lock className="w-3 h-3 text-violet-500" /></span></li>
              <li><span className="flex items-center gap-1.5 cursor-not-allowed">Roadmap <Layers className="w-3 h-3 text-indigo-400" /></span></li>
            </ul>
          </div>

          <div>
            <h5 className="text-[10px] font-bold text-slate-300 uppercase tracking-widest mb-4">Company</h5>
            <ul className="space-y-2.5 text-xs text-slate-500">
              <li><Link href="/" className="hover:text-slate-300 transition">Home</Link></li>
              <li><Link href="/#showcase" className="hover:text-slate-300 transition">About</Link></li>
              <li><Link href="/#contact" className="hover:text-slate-300 transition">Contact</Link></li>
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
            <Link href="/privacy" className="hover:text-slate-300 transition">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-slate-300 transition">Terms of Service</Link>
          </div>
        </div>
      </footer>

      {/* ── TERMS OF SERVICE CONSENT MODAL ── */}
      <AnimatePresence>
        {showTermsModal && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
            <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900/95 backdrop-blur-2xl p-6 sm:p-8 shadow-2xl flex flex-col gap-6 text-left relative overflow-hidden animate-fade-in-up">
              
              {/* Mesh Accent */}
              <div className="absolute top-[-50%] left-[-50%] w-[100%] h-[100%] rounded-full bg-violet-500/5 blur-[50px] pointer-events-none" />

              <div className="flex items-center gap-3">
                <img src="/logo.png" alt="OVO Logo" className="w-10 h-10 rounded-xl object-contain shadow-lg shadow-violet-500/20" />
                <div>
                  <h3 className="text-sm sm:text-base font-extrabold text-white">Agree to OVO.AI Terms</h3>
                  <p className="text-[10px] text-slate-500 font-mono mt-0.5">Required Action</p>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Before logging in or signing up, please review and accept our{' '}
                <Link href="/terms" className="text-violet-400 hover:text-violet-300 font-semibold underline decoration-violet-500/30 transition">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link href="/privacy" className="text-violet-400 hover:text-violet-300 font-semibold underline decoration-violet-500/30 transition">
                  Privacy Policy
                </Link>
                . By clicking &quot;Accept &amp; Continue&quot;, you confirm your consent to these policies.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  onClick={() => setShowTermsModal(false)}
                  className="flex-1 py-3 px-4 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-slate-200 text-xs font-semibold transition cursor-pointer"
                >
                  Decline
                </button>
                <button
                  onClick={handleAcceptTerms}
                  className="flex-1 py-3 px-4 rounded-xl bg-gradient-premium text-white text-xs font-bold shadow-lg shadow-violet-500/25 hover:scale-[1.01] transition-transform active:scale-[0.99] cursor-pointer"
                >
                  Accept & Continue
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
