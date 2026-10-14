import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from './api.js'
import { normalize } from './utils.js'

/**
 * Loads every failed session from the server, then keeps the list in sync
 * through a live event stream: inserts and deletes arrive instantly.
 */
export function useSessions({ onInsert, onSignedOut } = {}) {
  const [rows, setRows] = useState([])
  const [faultCodes, setFaultCodes] = useState([])
  const [status, setStatus] = useState('loading') // loading | live | offline | error
  const [error, setError] = useState(null)
  const [lastUpdate, setLastUpdate] = useState(null)
  const [freshIds, setFreshIds] = useState(() => new Set())
  const cb = useRef({ onInsert, onSignedOut })
  cb.current = { onInsert, onSignedOut }

  const markFresh = useCallback((id) => {
    setFreshIds((s) => new Set(s).add(id))
    setTimeout(() => setFreshIds((s) => { const n = new Set(s); n.delete(id); return n }), 8000)
  }, [])

  const load = useCallback(async () => {
    try {
      setError(null)
      const [s, f] = await Promise.all([api('/sessions'), api('/fault-codes')])
      setRows(s.rows.map(normalize))
      setFaultCodes(f.rows)
      setLastUpdate(Date.now())
    } catch (e) {
      if (e.status === 401) return cb.current.onSignedOut?.()
      setError(e.message)
      setStatus('error')
    }
  }, [])

  useEffect(() => {
    load()
    const es = new EventSource('/api/stream')
    es.addEventListener('hello', () => {
      setStatus('live')
      // Re-sync after a reconnect so nothing missed while offline is lost
      load()
    })
    es.addEventListener('insert', (e) => {
      const r = normalize(JSON.parse(e.data))
      setRows((prev) => [r, ...prev.filter((x) => x.id !== r.id)].sort((a, b) => b.ts - a.ts))
      setLastUpdate(Date.now())
      markFresh(r.id)
      cb.current.onInsert?.(r)
    })
    es.addEventListener('delete', (e) => {
      const { id } = JSON.parse(e.data)
      setRows((prev) => prev.filter((x) => x.id !== id))
      setLastUpdate(Date.now())
    })
    es.onerror = () => setStatus('offline') // the browser reconnects by itself
    return () => es.close()
  }, [load, markFresh])

  return { rows, faultCodes, status, error, lastUpdate, freshIds, reload: load }
}
