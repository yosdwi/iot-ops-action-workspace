import { useState } from 'react'
import { Activity, ArrowRight, Mail } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  async function loginGoogle() {
    setBusy(true)
    setMessage('')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    if (error) {
      setMessage(error.message)
      setBusy(false)
    }
  }

  async function sendMagicLink(event) {
    event.preventDefault()
    if (!email.trim()) return
    setBusy(true)
    setMessage('')
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin },
    })
    setBusy(false)
    setMessage(error ? error.message : 'Magic link sudah dikirim. Cek inbox kamu.')
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="brand-mark"><Activity size={25} /></div>
        <div className="eyebrow">IoT Operations</div>
        <h1>Action Workspace</h1>
        <p className="auth-copy">Masuk untuk mengelola ticket, action, dan solve tanpa menunggu spreadsheet reload.</p>

        <button className="button primary full" onClick={loginGoogle} disabled={busy}>
          Continue with Google <ArrowRight size={17} />
        </button>

        <div className="divider"><span>atau email</span></div>

        <form onSubmit={sendMagicLink} className="auth-form">
          <label>Email</label>
          <div className="input-with-icon">
            <Mail size={17} />
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nama@company.com" />
          </div>
          <button className="button secondary full" disabled={busy || !email.trim()}>Kirim magic link</button>
        </form>

        {message && <div className="auth-message">{message}</div>}
        <p className="tiny-copy">Login akun dan identitas operator dibuat terpisah supaya action tetap tercatat ke operator IoT Ops yang dipilih.</p>
      </section>
    </main>
  )
}
