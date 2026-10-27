import { useCallback, useEffect, useRef, useState } from 'react'
import type { Mode } from '../engine'
import type { LineKind, SlimItinerary } from './planner'
import type { LatLng } from './routing'

export const ROUTES_URL = `${import.meta.env.BASE_URL}routes/ncr.json`

type Status = 'loading' | 'ready' | 'error'
type Planner = (a: LatLng, b: LatLng, exclude?: LineKind[]) => Promise<SlimItinerary[]>

/**
 * Loads the NCR route network in a Web Worker (or on the main thread where
 * workers are unavailable, e.g. tests) and exposes `plan(a, b)`.
 */
export function usePlanner(modesById: Record<string, Mode>): { status: Status; routes: number; plan: Planner } {
  const [status, setStatus] = useState<Status>('loading')
  const [routes, setRoutes] = useState(0)
  const impl = useRef<Planner | null>(null)

  useEffect(() => {
    let cancelled = false
    let worker: Worker | null = null
    const pending = new Map<number, { resolve: (v: SlimItinerary[]) => void; reject: (e: Error) => void }>()
    let seq = 0
    if (typeof Worker !== 'undefined') {
      worker = new Worker(new URL('./planner.worker.ts', import.meta.url), { type: 'module' })
      worker.onmessage = (e: MessageEvent) => {
        const m = e.data
        if (m.type === 'ready') {
          if (cancelled) return
          setRoutes(m.routes)
          setStatus('ready')
        } else if (m.type === 'result') {
          pending.get(m.id)?.resolve(m.itineraries)
          pending.delete(m.id)
        } else if (m.type === 'error') {
          if (m.id == null) setStatus('error')
          pending.get(m.id)?.reject(new Error(m.message))
          pending.delete(m.id)
        }
      }
      worker.onerror = () => !cancelled && setStatus('error')
      worker.postMessage({ type: 'init', url: new URL(ROUTES_URL, window.location.href).href, modes: modesById })
      impl.current = (a, b, exclude = []) =>
        new Promise((resolve, reject) => {
          const id = ++seq
          pending.set(id, { resolve, reject })
          worker!.postMessage({ type: 'plan', id, a, b, exclude })
        })
    } else {
      void Promise.all([import('./planner'), fetch(ROUTES_URL).then((r) => r.json())])
        .then(([m, file]) => {
          if (cancelled) return
          const net = m.buildNetwork(file, modesById)
          impl.current = async (a, b, exclude = []) => m.plan(net, modesById, a, b, 5, exclude).map(m.slim)
          setRoutes(file.routes.length)
          setStatus('ready')
        })
        .catch(() => !cancelled && setStatus('error'))
    }
    return () => {
      cancelled = true
      worker?.terminate()
    }
  }, [modesById])

  const plan = useCallback<Planner>((a, b, exclude) => (impl.current ? impl.current(a, b, exclude) : Promise.reject(new Error('not ready'))), [])
  return { status, routes, plan }
}
