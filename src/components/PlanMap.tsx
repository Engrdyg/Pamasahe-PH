import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect, useRef } from 'react'
import { KIND_COLOR } from '../lib/planColors'
import type { LineKind, SlimItinerary } from '../lib/planner'
import { DEFAULT_CENTER, type LatLng } from '../lib/routing'

type Field = 'from' | 'to'

export interface PlanMapProps {
  from: LatLng | null
  to: LatLng | null
  itinerary: SlimItinerary | null
  /** Where to get on, transfer and get off, with landmark names. */
  marks?: { lat: number; lng: number; text: string; kind: LineKind }[]
  /** A or B was dragged to a new spot. */
  onMove: (field: Field, p: LatLng) => void
  /**
   * Pin mode: a fixed pin sits in the middle of the map (drawn by the parent)
   * and the map is moved under it. `start` is where to begin; `onCenter`
   * reports the point under the pin whenever the map stops moving.
   */
  pinMode?: { start: LatLng | null; onCenter: (p: LatLng) => void } | null
  /** CSS height of the map (it fills the screen until there are results). */
  height?: string
}

const pinIcon = (label: string, cls: string) =>
  L.divIcon({ className: '', html: `<span class="plan-pin ${cls}"><b>${label}</b></span>`, iconSize: [34, 44], iconAnchor: [17, 42] })

/** Leaflet map for the route planner: draggable A/B pins, ride legs coloured by mode, dashed walks. */
export default function PlanMap({ from, to, itinerary, marks = [], onMove, pinMode = null, height = '380px' }: PlanMapProps) {
  const el = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const layer = useRef<L.LayerGroup | null>(null)
  const lastView = useRef('')
  const dragged = useRef(false)
  const marksKey = marks.map((m) => `${m.lat},${m.lng},${m.text}`).join('|')
  const onMoveRef = useRef(onMove)
  onMoveRef.current = onMove
  const pinning = pinMode != null
  const onCenterRef = useRef(pinMode?.onCenter)
  onCenterRef.current = pinMode?.onCenter

  useEffect(() => {
    if (!el.current || map.current) return
    const m = L.map(el.current, { zoomControl: true }).setView([DEFAULT_CENTER.lat, DEFAULT_CENTER.lng], 12)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(m)
    m.on('moveend', () => {
      const c = m.getCenter()
      onCenterRef.current?.({ lat: c.lat, lng: c.lng })
    })
    layer.current = L.layerGroup().addTo(m)
    map.current = m
    return () => {
      m.remove()
      map.current = null
    }
  }, [])

  // Entering pin mode: start at the field's current point (or keep the view).
  useEffect(() => {
    const m = map.current
    if (!m || !pinning) return
    const start = pinMode?.start
    if (start) m.setView([start.lat, start.lng], Math.max(m.getZoom(), 16))
    const c = m.getCenter()
    onCenterRef.current?.({ lat: c.lat, lng: c.lng })
    // Only when pin mode starts, not on every parent render.
  }, [pinning])

  useEffect(() => {
    const m = map.current
    const g = layer.current
    if (!m || !g) return
    g.clearLayers()
    const bounds: L.LatLngExpression[] = []
    if (itinerary) {
      for (const leg of itinerary.legs) {
        if (leg.type === 'walk') {
          L.polyline([[leg.from.lat, leg.from.lng], [leg.to.lat, leg.to.lng]], { color: '#64748b', weight: 4, dashArray: '2 8', lineCap: 'round' }).addTo(g)
        } else {
          const pts = leg.path.map((p) => [p.lat, p.lng] as [number, number])
          L.polyline(pts, { color: '#fff', weight: 9, opacity: 0.9 }).addTo(g)
          L.polyline(pts, { color: KIND_COLOR[leg.line.kind], weight: 5 }).addTo(g)
          for (const p of [pts[0], pts[pts.length - 1]]) L.circleMarker(p, { radius: 5, color: KIND_COLOR[leg.line.kind], weight: 3, fillColor: '#fff', fillOpacity: 1 }).addTo(g)
          bounds.push(...pts)
        }
      }
    }
    // Labels on the east half of the trip open to the left so they stay on the map.
    const midLng = from && to ? (from.lng + to.lng) / 2 : null
    for (const mk of marks) {
      const left = midLng != null && mk.lng > midLng
      L.circleMarker([mk.lat, mk.lng], { radius: 7, color: '#fff', weight: 3, fillColor: KIND_COLOR[mk.kind], fillOpacity: 1 })
        .bindTooltip(mk.text, { permanent: true, direction: left ? 'left' : 'right', offset: [left ? -10 : 10, 0], className: 'plan-mark' })
        .addTo(g)
    }
    const pin = (p: LatLng, field: Field) => {
      const marker = L.marker([p.lat, p.lng], {
        icon: pinIcon(field === 'from' ? 'A' : 'B', field === 'from' ? 'plan-pin-a' : 'plan-pin-b'),
        draggable: !pinning,
        autoPan: true,
        keyboard: false,
        zIndexOffset: 1000,
      }).addTo(g)
      marker.on('dragend', () => {
        const ll = marker.getLatLng()
        dragged.current = true
        onMoveRef.current(field, { lat: ll.lat, lng: ll.lng })
      })
      bounds.push([p.lat, p.lng])
    }
    if (from) pin(from, 'from')
    if (to) pin(to, 'to')
    if (pinning) return
    const view = `${from?.lat},${from?.lng},${to?.lat},${to?.lng},${itinerary?.minutes}`
    if (view !== lastView.current) {
      lastView.current = view
      // After a drag the user has the map where they want it: don't jump.
      if (dragged.current) {
        if (itinerary) dragged.current = false
      } else if (bounds.length > 1) m.fitBounds(L.latLngBounds(bounds), { padding: [36, 36], maxZoom: 16 })
      else if (from) m.panTo([from.lat, from.lng])
    }
  }, [from, to, itinerary, marksKey, pinning])

  // Leaflet needs to re-measure when the container is resized.
  useEffect(() => {
    map.current?.invalidateSize()
  }, [height])

  return <div ref={el} style={{ height }} className="w-full" data-testid="plan-map" />
}
