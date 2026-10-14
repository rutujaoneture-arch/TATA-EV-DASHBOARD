import { useEffect, useState } from 'react'
import { api } from './api.js'
import Login from './Login.jsx'
import Dashboard from './Dashboard.jsx'

export default function App() {
  const [user, setUser] = useState(undefined) // undefined = still checking

  useEffect(() => {
    api('/me').then((d) => setUser(d.user)).catch(() => setUser(null))
  }, [])

  const signOut = async () => {
    try { await api('/logout', { method: 'POST' }) } catch { /* already signed out */ }
    setUser(null)
  }

  if (user === undefined) {
    return <div className="splash"><span className="spinner" aria-hidden="true" /> Checking sign-in…</div>
  }
  if (!user) return <Login onSignedIn={setUser} />
  return <Dashboard user={user} onSignOut={signOut} onSessionExpired={() => setUser(null)} />
}
