import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect, useRef } from 'react'
import { KIND_COLOR } from '../lib/planColors'
import type { SlimItinerary } from '../lib/planner'
import { DEFAULT_CENTER, type LatLng } from '../lib/routing'

export interface PlanMapProps {
  from: LatLng | null
  to: LatLng | null
  itinerary: SlimItinerary | null
  onPick: (p: LatLng) => void
}

/** Leaflet map for the route planner: pins, ride legs coloured by mode, dashed walks. */
export default function PlanMap({ from, to, itinerary, onPick }: PlanMapProps) {
  const el = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const layer = useRef<L.LayerGroup | null>(null)
  const onPickRef = useRef(onPick)
  onPickRef.current = onPick

  useEffect(() => {
    if (!el.current || map.current) return
    const m = L.map(el.current, { zoomControl: true }).setView([DEFAULT_CENTER.lat, DEFAULT_CENTER.lng], 12)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(m)
    m.on('click', (e: L.LeafletMouseEvent) => onPickRef.current({ lat: e.latlng.lat, lng: e.latlng.lng }))
    layer.current = L.layerGroup().addTo(m)
    map.current = m
    return () => {
      m.remove()
      map.current = null
    }
  }, [])

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
    const pin = (p: LatLng, color: string, label: string) => {
      L.circleMarker([p.lat, p.lng], { radius: 9, color: '#fff', weight: 2, fillColor: color, fillOpacity: 1 })
        .bindTooltip(label, { permanent: true, direction: 'top', offset: [0, -10] })
        .addTo(g)
      bounds.push([p.lat, p.lng])
    }
    if (from) pin(from, '#0b3d91', 'A')
    if (to) pin(to, '#ffc72c', 'B')
    if (bounds.length > 1) m.fitBounds(L.latLngBounds(bounds), { padding: [28, 28], maxZoom: 16 })
    else if (from) m.panTo([from.lat, from.lng])
  }, [from, to, itinerary])

  return <div ref={el} className="map-canvas" data-testid="plan-map" />
}
