import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { PROVIDERS } from '../lib/providers'
import { useEffect, useRef } from 'react'
import type { SlimItinerary } from '../lib/planner'
import type { LatLng } from '../lib/routing'

// Opening view: Metro Manila (Manila Bay to Marikina, Caloocan to Parañaque)
const METRO_MANILA = { lat: 14.585, lng: 121.03 }

type Field = 'from' | 'to'
export type MarkType = 'board' | 'transfer' | 'alight'
export interface MapMark {
  lat: number
  lng: number
  type: MarkType
  color: string
  text?: string
}

const SYMBOL: Record<MarkType, string> = { board: '▲', transfer: '⇄', alight: '■' }
const markIcon = (type: MarkType, color: string) =>
  L.divIcon({ className: '', html: `<span class="mk mk-${type}" style="--c:${color}"><b>${SYMBOL[type]}</b></span>`, iconSize: [24, 24], iconAnchor: [12, 12] })

export interface PlanMapProps {
  from: LatLng | null
  to: LatLng | null
  itinerary: SlimItinerary | null
  /** One colour per ride, in order (see rideColors). */
  colors?: string[]
  /** Where to get on, transfer and get off; `text` labels it on the map. */
  marks?: MapMark[]
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
  /** Ride (0-based, among rides) to emphasise; the others are dimmed. */
  highlight?: number | null
  /** A ride line was tapped on the map. */
  onSelectRide?: (ride: number) => void
  /** Map tiles failed to load (offline or provider down). */
  onTilesFailed?: () => void
}

const pinIcon = (label: string, cls: string) =>
  L.divIcon({ className: '', html: `<span class="plan-pin ${cls}"><b>${label}</b></span>`, iconSize: [34, 44], iconAnchor: [17, 42] })

/** Leaflet map for the route planner: draggable A/B pins, ride legs coloured by mode, dashed walks. */
export default function PlanMap({ from, to, itinerary, colors = [], marks = [], onMove, pinMode = null, height = '380px', highlight = null, onSelectRide, onTilesFailed }: PlanMapProps) {
  const onTilesFailedRef = useRef(onTilesFailed)
  onTilesFailedRef.current = onTilesFailed
  const onSelectRef = useRef(onSelectRide)
  onSelectRef.current = onSelectRide
  const ridePts = useRef<[number, number][][]>([])
  const el = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const layer = useRef<L.LayerGroup | null>(null)
  const lastView = useRef('')
  const dragged = useRef(false)
  const lastBounds = useRef<L.LatLngBounds | null>(null)
  const marksKey = marks.map((m) => `${m.lat},${m.lng},${m.type},${m.color},${m.text}`).join('|') + colors.join(',')
  const onMoveRef = useRef(onMove)
  onMoveRef.current = onMove
  const pinning = pinMode != null
  const onCenterRef = useRef(pinMode?.onCenter)
  onCenterRef.current = pinMode?.onCenter

  useEffect(() => {
    if (!el.current || map.current) return
    const m = L.map(el.current, { zoomControl: true }).setView([METRO_MANILA.lat, METRO_MANILA.lng], 12)
    const tiles = L.tileLayer(PROVIDERS.tiles.url, { maxZoom: PROVIDERS.tiles.maxZoom, attribution: PROVIDERS.tiles.attribution }).addTo(m)
    // Several failed tiles and none loaded: tell the screen the map is unavailable.
    let loaded = 0
    let failed = 0
    tiles.on('tileload', () => loaded++)
    tiles.on('tileerror', () => {
      if (++failed === 6 && loaded === 0) onTilesFailedRef.current?.()
    })
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
    ridePts.current = []
    if (itinerary) {
      let ride = 0
      for (const leg of itinerary.legs) {
        if (leg.type === 'walk') {
          L.polyline([[leg.from.lat, leg.from.lng], [leg.to.lat, leg.to.lng]], { color: '#475569', weight: 4, dashArray: '2 8', lineCap: 'round' }).addTo(g)
        } else {
          const k = ride++
          const color = colors[k] ?? '#0b3d91'
          const pts = leg.path.map((p) => [p.lat, p.lng] as [number, number])
          ridePts.current.push(pts)
          const dim = highlight != null && highlight !== k
          L.polyline(pts, { color: '#fff', weight: highlight === k ? 13 : 10, opacity: dim ? 0.5 : 0.95 }).addTo(g)
          const line = L.polyline(pts, { color, weight: highlight === k ? 8 : 6, opacity: dim ? 0.35 : 1 }).addTo(g)
          // Tapping a ride on the map selects its instruction (and a wide invisible line makes it easy to hit).
          const hit = L.polyline(pts, { color: '#000', weight: 22, opacity: 0 }).addTo(g)
          for (const x of [line, hit]) x.on('click', () => onSelectRef.current?.(k))
          line.bindTooltip(`${k + 1}`, { permanent: false, direction: 'top' })
          // Stations / stops passed on the way (rail and Busway)
          if (leg.fromStation) for (const p of pts.slice(1, -1)) L.circleMarker(p, { radius: 4, color, weight: 2, fillColor: '#fff', fillOpacity: 1 }).addTo(g)
          bounds.push(...pts)
        }
      }
    }
    // Labels on the east half of the trip open to the left so they stay on the map.
    const midLng = from && to ? (from.lng + to.lng) / 2 : null
    for (const mk of marks) {
      const left = midLng != null && mk.lng > midLng
      const marker = L.marker([mk.lat, mk.lng], { icon: markIcon(mk.type, mk.color), keyboard: false, interactive: false, zIndexOffset: 500 }).addTo(g)
      if (mk.text) marker.bindTooltip(mk.text, { permanent: true, direction: left ? 'left' : 'right', offset: [left ? -12 : 12, 0], className: 'plan-mark' })
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
      } else if (bounds.length > 1) {
        lastBounds.current = L.latLngBounds(bounds)
        m.fitBounds(lastBounds.current, { padding: [36, 36], maxZoom: 16 })
      }
      else if (from) m.panTo([from.lat, from.lng])
    }
  }, [from, to, itinerary, marksKey, pinning, highlight])

  // Zoom to the ride whose instruction was selected.
  useEffect(() => {
    const m = map.current
    const pts = highlight != null ? ridePts.current[highlight] : null
    if (m && pts && pts.length > 1) m.fitBounds(L.latLngBounds(pts), { padding: [48, 48], maxZoom: 17 })
  }, [highlight])

  // Leaflet needs to re-measure when the container is resized.
  // Refit afterwards: the map shrinks when results appear, right after it was fitted.
  useEffect(() => {
    const m = map.current
    if (!m) return
    m.invalidateSize()
    if (lastBounds.current && !pinning) m.fitBounds(lastBounds.current, { padding: [36, 36], maxZoom: 16 })
    else if (!pinning && !from && !to) m.setView([METRO_MANILA.lat, METRO_MANILA.lng], m.getZoom())
  }, [height])

  return <div ref={el} style={{ height }} className="w-full" data-testid="plan-map" />
}
